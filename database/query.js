// queries/index.js - Fixed Database Query Abstraction Layer
// Updated to work with the new schema and proper constraints

import { pool } from "../config/database.js";
import { logger } from "../utils/logger.js";

class QueryManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Execute a raw query with error handling
   */
  async execute(query, params = []) {
    try {
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      logger.error(`[QueryManager] Database error: ${error.message}`);
      logger.error(`[QueryManager] Query: ${query}`);
      logger.error(`[QueryManager] Params: ${JSON.stringify(params)}`);
      throw error;
    }
  }

  /**
   * Execute query with caching
   */
  async executeWithCache(
    cacheKey,
    query,
    params = [],
    ttl = this.cacheTimeout
  ) {
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    const result = await this.execute(query, params);
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Clear cache for a specific key or all cache
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

const queryManager = new QueryManager();

// ==========================================
// GROUP SETTINGS QUERIES - FIXED VERSION
// ==========================================

export const GroupQueries = {
  /**
   * Get group settings
   */
  async getSettings(groupJid) {
    try {
      const result = await queryManager.execute(
        `SELECT * FROM groups WHERE jid = $1`,
        [groupJid]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(
        `[GroupQueries] Error getting settings for ${groupJid}: ${error.message}`
      );
      return null;
    }
  },

  /**
   * Create or update group settings - FIXED VERSION
   */
  async upsertSettings(groupJid, settings = {}) {
    try {
      // Handle empty settings case
      if (Object.keys(settings).length === 0) {
        const result = await queryManager.execute(
          `INSERT INTO groups (jid, updated_at)
           VALUES ($1, CURRENT_TIMESTAMP)
           ON CONFLICT (jid)
           DO UPDATE SET updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [groupJid]
        );
        return result.rows[0];
      }

      // Build dynamic query for multiple settings
      const columns = Object.keys(settings);
      const values = Object.values(settings);
      const placeholders = columns.map((_, i) => `$${i + 2}`).join(", ");
      const updateSet = columns
        .map((col, i) => `${col} = $${i + 2}`)
        .join(", ");

      const query = `
        INSERT INTO groups (jid, ${columns.join(", ")}, updated_at)
        VALUES ($1, ${placeholders}, CURRENT_TIMESTAMP)
        ON CONFLICT (jid)
        DO UPDATE SET 
          ${updateSet},
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await queryManager.execute(query, [groupJid, ...values]);

      // Clear related cache
      queryManager.clearCache(`group_settings_${groupJid}`);

      return result.rows[0];
    } catch (error) {
      logger.error(`[GroupQueries] Error in upsertSettings: ${error.message}`);
      throw error;
    }
  },

  /**
   * Enable/disable specific anti-command - COMPLETELY FIXED
   */
  async setAntiCommand(groupJid, commandType, enabled) {
    const columnName = `${commandType}_enabled`;

    try {
      logger.info(
        `[GroupQueries] Setting ${commandType} to ${enabled} for group ${groupJid}`
      );

      const result = await queryManager.execute(
        `INSERT INTO groups (jid, ${columnName}, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (jid)
         DO UPDATE SET 
           ${columnName} = $2,
           updated_at = CURRENT_TIMESTAMP
         RETURNING ${columnName}`,
        [groupJid, enabled]
      );

      // Clear all related cache
      queryManager.clearCache(`group_settings_${groupJid}`);
      queryManager.clearCache(`anti_${commandType}_${groupJid}`);

      const returnValue = result.rows[0]?.[columnName] || false;
      logger.info(
        `[GroupQueries] Successfully set ${commandType} to ${returnValue} for ${groupJid}`
      );

      return returnValue;
    } catch (error) {
      logger.error(
        `[GroupQueries] Error setting ${commandType}: ${error.message}`
      );
      throw error;
    }
  },

  /**
   * Check if anti-command is enabled (with caching) - IMPROVED
   */
  async isAntiCommandEnabled(groupJid, commandType) {
    const columnName = `${commandType}_enabled`;
    try {
      // Ensure row exists so settings are persisted, not ephemeral
      await queryManager.execute(
        `INSERT INTO groups (jid, updated_at) VALUES ($1, CURRENT_TIMESTAMP)
         ON CONFLICT (jid) DO NOTHING`,
        [groupJid]
      );

      const result = await queryManager.execute(
        `SELECT ${columnName} FROM groups WHERE jid = $1`,
        [groupJid]
      );

      const isEnabled =
        result.rows.length > 0 && result.rows[0][columnName] === true;
      logger.debug(
        `[GroupQueries] ${commandType} enabled for ${groupJid}: ${isEnabled}`
      );

      return isEnabled;
    } catch (error) {
      logger.error(
        `[GroupQueries] Error checking if ${commandType} enabled: ${error.message}`
      );
      return false; // Default to disabled on error
    }
  },

  /**
   * Get all enabled anti-commands for a group
   */
  async getEnabledAntiCommands(groupJid) {
    try {
      const result = await queryManager.execute(
        `SELECT 
          antilink_enabled, anticall_enabled, antiimage_enabled, antivideo_enabled,
          antiaudio_enabled, antidocument_enabled, antisticker_enabled, 
          antigroupmention_enabled, antidelete_enabled, antiviewonce_enabled,
          antibot_enabled, antispam_enabled, antiraid_enabled,
          autowelcome_enabled, autokick_enabled,
          welcome_enabled, goodbye_enabled
        FROM groups 
        WHERE jid = $1`,
        [groupJid]
      );

      if (result.rows.length === 0) return {};

      const settings = result.rows[0];
      const enabled = {};

      Object.keys(settings).forEach((key) => {
        if (settings[key] === true) {
          enabled[key.replace("_enabled", "")] = true;
        }
      });

      return enabled;
    } catch (error) {
      logger.error(
        `[GroupQueries] Error getting enabled anti-commands: ${error.message}`
      );
      return {};
    }
  },

  /**
   * Ensure group exists in database - IMPROVED
   */
  async ensureGroupExists(groupJid, groupName = null) {
    try {
      const result = await queryManager.execute(
        `INSERT INTO groups (jid, name, created_at, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (jid) 
         DO UPDATE SET 
           name = COALESCE($2, groups.name),
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [groupJid, groupName]
      );

      logger.debug(`[GroupQueries] Ensured group exists: ${groupJid}`);
      return result.rows[0];
    } catch (error) {
      logger.error(
        `[GroupQueries] Error ensuring group exists: ${error.message}`
      );
      throw error;
    }
  },

  /**
   * Delete group from database
   */
  async deleteGroup(groupJid) {
    try {
      await queryManager.execute(`DELETE FROM groups WHERE jid = $1`, [
        groupJid,
      ]);
      // Clear all related cache
      queryManager.clearCache(`group_settings_${groupJid}`);
      logger.info(`[GroupQueries] Deleted group: ${groupJid}`);
    } catch (error) {
      logger.error(`[GroupQueries] Error deleting group: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update group metadata
   */
  async updateGroupMeta(groupJid, metadata = {}) {
    try {
      const { name, description, participantsCount, isBotAdmin } = metadata;

      await queryManager.execute(
        `UPDATE groups 
         SET name = COALESCE($2, name),
             description = COALESCE($3, description),
             participants_count = COALESCE($4, participants_count),
             is_bot_admin = COALESCE($5, is_bot_admin),
             updated_at = CURRENT_TIMESTAMP
         WHERE jid = $1`,
        [groupJid, name, description, participantsCount, isBotAdmin]
      );

      queryManager.clearCache(`group_settings_${groupJid}`);
    } catch (error) {
      logger.error(
        `[GroupQueries] Error updating group meta: ${error.message}`
      );
    }
  },
};

// ==========================================
// WARNING SYSTEM QUERIES - ENHANCED
// ==========================================

export const WarningQueries = {
  /**
   * Add or increment warning - FIXED
   */
  async addWarning(groupJid, userJid, warningType, reason = null) {
    try {
      const result = await queryManager.execute(
        `INSERT INTO warnings (user_jid, group_jid, warning_type, warning_count, reason, last_warning_at, created_at)
         VALUES ($1, $2, $3, 1, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_jid, group_jid, warning_type)
         DO UPDATE SET 
           warning_count = warnings.warning_count + 1,
           reason = COALESCE($4, warnings.reason),
           last_warning_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         RETURNING warning_count`,
        [userJid, groupJid, warningType, reason]
      );

      const warningCount = result.rows[0]?.warning_count || 1;
      logger.info(
        `[WarningQueries] Added ${warningType} warning for ${userJid} in ${groupJid}: ${warningCount}/4`
      );
      return warningCount;
    } catch (error) {
      logger.error(`[WarningQueries] Error adding warning: ${error.message}`);
      throw error;
    }
  },

  /**
   * Reset user warnings for specific type or all
   */
  async resetUserWarnings(groupJid, userJid, warningType = null) {
    try {
      let query, params;

      if (warningType) {
        query = `DELETE FROM warnings WHERE group_jid = $1 AND user_jid = $2 AND warning_type = $3`;
        params = [groupJid, userJid, warningType];
      } else {
        query = `DELETE FROM warnings WHERE group_jid = $1 AND user_jid = $2`;
        params = [groupJid, userJid];
      }

      const result = await queryManager.execute(query, params);
      logger.info(
        `[WarningQueries] Reset ${
          warningType || "all"
        } warnings for ${userJid} in ${groupJid} (${result.rowCount} removed)`
      );

      return result.rowCount;
    } catch (error) {
      logger.error(
        `[WarningQueries] Error resetting warnings: ${error.message}`
      );
      throw error;
    }
  },

  /**
   * Get warning count for user and type
   */
  async getWarningCount(groupJid, userJid, warningType) {
    try {
      const result = await queryManager.execute(
        `SELECT warning_count FROM warnings
         WHERE group_jid = $1 AND user_jid = $2 AND warning_type = $3`,
        [groupJid, userJid, warningType]
      );

      return result.rows[0]?.warning_count || 0;
    } catch (error) {
      logger.error(
        `[WarningQueries] Error getting warning count: ${error.message}`
      );
      return 0;
    }
  },

  /**
   * Get warning statistics for group
   */
  async getWarningStats(groupJid, warningType = null) {
    try {
      let query, params;

      if (warningType) {
        query = `
          SELECT 
            COUNT(DISTINCT user_jid) as total_users,
            SUM(warning_count) as total_warnings,
            AVG(warning_count) as avg_warnings,
            MAX(warning_count) as max_warnings
          FROM warnings
          WHERE group_jid = $1 AND warning_type = $2
        `;
        params = [groupJid, warningType];
      } else {
        query = `
          SELECT 
            COUNT(DISTINCT user_jid) as total_users,
            SUM(warning_count) as total_warnings,
            AVG(warning_count) as avg_warnings,
            MAX(warning_count) as max_warnings
          FROM warnings
          WHERE group_jid = $1
        `;
        params = [groupJid];
      }

      const result = await queryManager.execute(query, params);

      return {
        totalUsers: parseInt(result.rows[0]?.total_users) || 0,
        totalWarnings: parseInt(result.rows[0]?.total_warnings) || 0,
        avgWarnings: parseFloat(result.rows[0]?.avg_warnings) || 0,
        maxWarnings: parseInt(result.rows[0]?.max_warnings) || 0,
      };
    } catch (error) {
      logger.error(
        `[WarningQueries] Error getting warning stats: ${error.message}`
      );
      return {
        totalUsers: 0,
        totalWarnings: 0,
        avgWarnings: 0,
        maxWarnings: 0,
      };
    }
  },

  /**
   * Get warning list for group
   */
  async getWarningList(groupJid, warningType = null, limit = 10) {
    try {
      let query, params;

      if (warningType) {
        query = `
          SELECT user_jid, warning_count, reason, last_warning_at
          FROM warnings
          WHERE group_jid = $1 AND warning_type = $2
          ORDER BY last_warning_at DESC
          LIMIT $3
        `;
        params = [groupJid, warningType, limit];
      } else {
        query = `
          SELECT user_jid, warning_type, warning_count, reason, last_warning_at
          FROM warnings
          WHERE group_jid = $1
          ORDER BY last_warning_at DESC
          LIMIT $2
        `;
        params = [groupJid, limit];
      }

      const result = await queryManager.execute(query, params);
      return result.rows;
    } catch (error) {
      logger.error(
        `[WarningQueries] Error getting warning list: ${error.message}`
      );
      return [];
    }
  },
};

// ==========================================
// VIOLATION LOGGING QUERIES - ENHANCED
// ==========================================

export const ViolationQueries = {
  /**
   * Log a violation for analytics
   */
  async logViolation(
    groupJid,
    userJid,
    violationType,
    messageContent,
    detectedContent,
    actionTaken,
    warningNumber,
    messageId
  ) {
    try {
      await queryManager.execute(
        `INSERT INTO violations (
          user_jid, group_jid, violation_type, 
          message_content, detected_content, action_taken, 
          warning_number, message_id, violated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        [
          userJid,
          groupJid,
          violationType,
          messageContent?.substring(0, 500), // Truncate long messages
          JSON.stringify(detectedContent || {}),
          actionTaken,
          warningNumber,
          messageId,
        ]
      );

      logger.debug(
        `[ViolationQueries] Logged ${violationType} violation for ${userJid} in ${groupJid}`
      );
    } catch (error) {
      logger.error(
        `[ViolationQueries] Error logging violation: ${error.message}`
      );
    }
  },

  /**
   * Get violation statistics
   */
  async getViolationStats(groupJid, violationType = null, days = 30) {
    try {
      let query, params;

      if (violationType) {
        query = `
          SELECT 
            COUNT(*) as total_violations,
            COUNT(DISTINCT user_jid) as unique_violators,
            COUNT(*) FILTER (WHERE action_taken = 'kick') as kicks,
            COUNT(*) FILTER (WHERE action_taken = 'warning') as warnings
          FROM violations
          WHERE group_jid = $1 AND violation_type = $2
            AND violated_at > CURRENT_DATE - INTERVAL '${days} days'
        `;
        params = [groupJid, violationType];
      } else {
        query = `
          SELECT 
            violation_type,
            COUNT(*) as total_violations,
            COUNT(DISTINCT user_jid) as unique_violators,
            COUNT(*) FILTER (WHERE action_taken = 'kick') as kicks
          FROM violations
          WHERE group_jid = $1
            AND violated_at > CURRENT_DATE - INTERVAL '${days} days'
          GROUP BY violation_type
          ORDER BY total_violations DESC
        `;
        params = [groupJid];
      }

      const result = await queryManager.execute(query, params);
      return result.rows;
    } catch (error) {
      logger.error(
        `[ViolationQueries] Error getting violation stats: ${error.message}`
      );
      return [];
    }
  },
};

// ==========================================
// MESSAGE QUERIES - ENHANCED
// ==========================================

export const MessageQueries = {
  /**
   * Store message in database - FIXED
   */
  async storeMessage(messageData) {
    try {
      const {
        id,
        fromJid,
        senderJid,
        timestamp,
        content,
        media,
        mediaType,
        sessionId,
        userId,
        isViewOnce,
        fromMe,
      } = messageData;

      const result = await queryManager.execute(
        `INSERT INTO messages (
          id, from_jid, sender_jid, timestamp, content, media, 
          media_type, session_id, user_id, is_view_once, from_me, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        ON CONFLICT (id, session_id)
        DO UPDATE SET 
          content = COALESCE($5, messages.content),
          is_deleted = false
        RETURNING n_o`,
        [
          id,
          fromJid,
          senderJid,
          timestamp,
          content,
          media,
          mediaType,
          sessionId,
          userId,
          isViewOnce,
          fromMe,
        ]
      );

      return result.rows[0]?.n_o;
    } catch (error) {
      logger.error(`[MessageQueries] Error storing message: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get recent messages from a chat
   */
  async getRecentMessages(chatJid, sessionId, limit = 50) {
    try {
      const result = await queryManager.execute(
        `SELECT * FROM messages
         WHERE from_jid = $1 AND session_id = $2
           AND is_deleted = false
         ORDER BY timestamp DESC
         LIMIT $3`,
        [chatJid, sessionId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error(
        `[MessageQueries] Error getting recent messages: ${error.message}`
      );
      return [];
    }
  },

  /**
   * Mark message as deleted
   */
  async markDeleted(messageId, sessionId) {
    try {
      await queryManager.execute(
        `UPDATE messages 
         SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND session_id = $2`,
        [messageId, sessionId]
      );
    } catch (error) {
      logger.error(
        `[MessageQueries] Error marking message deleted: ${error.message}`
      );
    }
  },

  /**
   * Search messages by content
   */
  async searchMessages(chatJid, sessionId, searchTerm, limit = 20) {
    try {
      const result = await queryManager.execute(
        `SELECT * FROM messages
         WHERE from_jid = $1 AND session_id = $2 
           AND content ILIKE $3
           AND is_deleted = false
         ORDER BY timestamp DESC
         LIMIT $4`,
        [chatJid, sessionId, `%${searchTerm}%`, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error(
        `[MessageQueries] Error searching messages: ${error.message}`
      );
      return [];
    }
  },
};

// ==========================================
// ANALYTICS QUERIES - ENHANCED
// ==========================================

export const AnalyticsQueries = {
  /**
   * Update daily group analytics - FIXED
   */
  async updateGroupAnalytics(groupJid, updates) {
    try {
      const columns = Object.keys(updates);
      const values = Object.values(updates);
      const placeholders = columns.map((_, i) => `$${i + 3}`).join(", ");
      const updateSet = columns
        .map((col, i) => `${col} = ${col} + $${i + 3}`)
        .join(", ");

      await queryManager.execute(
        `INSERT INTO group_analytics (
          group_jid, date, ${columns.join(", ")}
        )
        VALUES ($1, $2, ${placeholders})
        ON CONFLICT (group_jid, date)
        DO UPDATE SET ${updateSet}`,
        [groupJid, new Date().toISOString().split("T")[0], ...values]
      );
    } catch (error) {
      logger.error(
        `[AnalyticsQueries] Error updating analytics: ${error.message}`
      );
    }
  },

  /**
   * Get group analytics for date range
   */
  async getGroupAnalytics(groupJid, days = 30) {
    try {
      const result = await queryManager.execute(
        `SELECT * FROM group_analytics
         WHERE group_jid = $1
           AND date > CURRENT_DATE - INTERVAL '${days} days'
         ORDER BY date DESC`,
        [groupJid]
      );

      return result.rows;
    } catch (error) {
      logger.error(
        `[AnalyticsQueries] Error getting analytics: ${error.message}`
      );
      return [];
    }
  },
};

// ==========================================
// UTILITY FUNCTIONS - ENHANCED
// ==========================================

export const Utils = {
  /**
   * Clean old data
   */
  async cleanupOldData(days = 90) {
    try {
      const result = await queryManager.execute(`SELECT cleanup_old_data($1)`, [
        days,
      ]);

      return result.rows[0]?.cleanup_old_data || 0;
    } catch (error) {
      logger.error(`[Utils] Error cleaning up old data: ${error.message}`);
      return 0;
    }
  },

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    const stats = {};
    const tables = [
      "users",
      "sessions",
      "messages",
      "groups",
      "warnings",
      "violations",
      "group_analytics",
      "settings",
    ];

    for (const table of tables) {
      try {
        const result = await queryManager.execute(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        stats[table] = parseInt(result.rows[0].count);
      } catch (error) {
        stats[table] = 0;
      }
    }

    return stats;
  },

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const result = await queryManager.execute("SELECT NOW() as current_time");
      logger.info(
        `[Utils] Database connection OK: ${result.rows[0].current_time}`
      );
      return true;
    } catch (error) {
      logger.error(`[Utils] Database connection failed: ${error.message}`);
      return false;
    }
  },

  /**
   * Verify all constraints exist
   */
  async verifyConstraints() {
    try {
      const result = await queryManager.execute(`
        SELECT 
          conname as constraint_name,
          conrelid::regclass as table_name,
          contype as constraint_type
        FROM pg_constraint 
        WHERE contype = 'u' 
        AND conrelid::regclass::text IN (
          'users', 'sessions', 'groups', 'messages', 
          'warnings', 'settings', 'group_analytics'
        )
        ORDER BY table_name, constraint_name
      `);

      logger.info("[Utils] Unique constraints found:");
      result.rows.forEach((row) => {
        logger.info(`  ${row.table_name}: ${row.constraint_name}`);
      });

      return result.rows;
    } catch (error) {
      logger.error(`[Utils] Error verifying constraints: ${error.message}`);
      return [];
    }
  },
};

export default queryManager;
