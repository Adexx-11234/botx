// queries/index.js - Database Query Abstraction Layer

import { pool } from "../config/database.js"
import { logger } from "../utils/logger.js"

class QueryManager {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Execute a raw query with error handling
   */
  async execute(query, params = []) {
    try {
      const result = await pool.query(query, params)
      return result
    } catch (error) {
      logger.error(`[QueryManager] Database error: ${error.message}`)
      logger.error(`[QueryManager] Query: ${query}`)
      logger.error(`[QueryManager] Params: ${JSON.stringify(params)}`)
      throw error
    }
  }

  /**
   * Execute query with caching
   */
  async executeWithCache(cacheKey, query, params = [], ttl = this.cacheTimeout) {
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < ttl) {
        return cached.data
      }
      this.cache.delete(cacheKey)
    }

    const result = await this.execute(query, params)
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })

    return result
  }

  /**
   * Clear cache for a specific key or all cache
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
}

const queryManager = new QueryManager()

// ==========================================
// GROUP SETTINGS QUERIES
// ==========================================

export const GroupQueries = {
  /**
   * Get group settings
   */
  async getSettings(groupJid, sessionId) {
    const result = await queryManager.execute(`
      SELECT * FROM groups 
      WHERE jid = $1 AND session_id = $2
    `, [groupJid, sessionId])

    return result.rows[0] || null
  },

  /**
   * Create or update group settings
   */
  async upsertSettings(groupJid, sessionId, settings = {}) {
    const setClause = Object.keys(settings)
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ')
    
    const values = Object.values(settings)

    const query = `
      INSERT INTO groups (jid, session_id, ${Object.keys(settings).join(', ')}, updated_at)
      VALUES ($1, $2, ${Object.keys(settings).map((_, i) => `$${i + 3}`).join(', ')}, CURRENT_TIMESTAMP)
      ON CONFLICT (jid, session_id)
      DO UPDATE SET 
        ${setClause},
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `

    const result = await queryManager.execute(query, [groupJid, sessionId, ...values])
    
    // Clear cache
    queryManager.clearCache(`group_settings_${groupJid}_${sessionId}`)
    
    return result.rows[0]
  },

  /**
   * Enable/disable specific anti-command
   */
  async setAntiCommand(groupJid, commandType, enabled) {
    const columnName = `${commandType}_enabled`
    
    const result = await queryManager.execute(`
      INSERT INTO groups (jid, ${columnName}, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (jid)
      DO UPDATE SET 
        ${columnName} = $2,
        updated_at = CURRENT_TIMESTAMP
      RETURNING ${columnName}
    `, [groupJid, enabled])

    // Clear cache
    queryManager.clearCache(`group_settings_${groupJid}`)
    
    return result.rows[0]?.[columnName] || false
  },

  /**
   * Check if anti-command is enabled (with caching)
   */
  async isAntiCommandEnabled(groupJid, commandType) {
    const cacheKey = `anti_${commandType}_${groupJid}`
    
    const result = await queryManager.executeWithCache(
      cacheKey,
      `SELECT ${commandType}_enabled FROM groups WHERE jid = $1`,
      [groupJid],
      2 * 60 * 1000 // 2 minutes cache
    )

    return result.rows.length > 0 && result.rows[0][`${commandType}_enabled`] === true
  },

  /**
   * Get all enabled anti-commands for a group
   */
  async getEnabledAntiCommands(groupJid) {
    const result = await queryManager.execute(`
      SELECT 
        antilink_enabled, anticall_enabled, antiimage_enabled, antivideo_enabled,
        antiaudio_enabled, antidocument_enabled, antisticker_enabled, 
        antigroupmention_enabled, antidelete_enabled, antiviewonce_enabled,
        antibot_enabled, antispam_enabled, antiraid_enabled,
        welcome_enabled, goodbye_enabled
      FROM groups 
      WHERE jid = $1
    `, [groupJid])

    if (result.rows.length === 0) return {}

    const settings = result.rows[0]
    const enabled = {}

    Object.keys(settings).forEach(key => {
      if (settings[key] === true) {
        enabled[key.replace('_enabled', '')] = true
      }
    })

    return enabled
  }
}

// ==========================================
// WARNING SYSTEM QUERIES
// ==========================================

export const WarningQueries = {
  /**
   * Add or increment warning
   */
  async addWarning(groupJid, userJid, warningType, reason = null) {
    const result = await queryManager.execute(`
      INSERT INTO warnings (user_jid, group_jid, warning_type, warning_count, reason, last_warning_at, created_at)
      VALUES ($1, $2, $3, 1, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_jid, group_jid, warning_type)
      DO UPDATE SET 
        warning_count = warnings.warning_count + 1,
        reason = COALESCE($4, warnings.reason),
        last_warning_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING warning_count
    `, [userJid, groupJid, warningType, reason])

    const warningCount = result.rows[0]?.warning_count || 1
    
    logger.info(`[WarningQueries] Added ${warningType} warning for ${userJid} in ${groupJid}: ${warningCount}/4`)
    return warningCount
  },

  /**
   * Reset user warnings for specific type
   */
  async resetUserWarnings(groupJid, userJid, warningType = null) {
    let query, params

    if (warningType) {
      query = `DELETE FROM warnings WHERE group_jid = $1 AND user_jid = $2 AND warning_type = $3`
      params = [groupJid, userJid, warningType]
    } else {
      query = `DELETE FROM warnings WHERE group_jid = $1 AND user_jid = $2`
      params = [groupJid, userJid]
    }

    await queryManager.execute(query, params)
    
    logger.info(`[WarningQueries] Reset ${warningType || 'all'} warnings for ${userJid} in ${groupJid}`)
  },

  /**
   * Get warning count for user and type
   */
  async getWarningCount(groupJid, userJid, warningType) {
    const result = await queryManager.execute(`
      SELECT warning_count FROM warnings
      WHERE group_jid = $1 AND user_jid = $2 AND warning_type = $3
    `, [groupJid, userJid, warningType])

    return result.rows[0]?.warning_count || 0
  },

  /**
   * Get warning statistics for group
   */
  async getWarningStats(groupJid, warningType = null) {
    let query, params

    if (warningType) {
      query = `
        SELECT 
          COUNT(DISTINCT user_jid) as total_users,
          SUM(warning_count) as total_warnings,
          AVG(warning_count) as avg_warnings,
          MAX(warning_count) as max_warnings
        FROM warnings
        WHERE group_jid = $1 AND warning_type = $2
      `
      params = [groupJid, warningType]
    } else {
      query = `
        SELECT 
          COUNT(DISTINCT user_jid) as total_users,
          SUM(warning_count) as total_warnings,
          AVG(warning_count) as avg_warnings,
          MAX(warning_count) as max_warnings
        FROM warnings
        WHERE group_jid = $1
      `
      params = [groupJid]
    }

    const result = await queryManager.execute(query, params)

    return {
      totalUsers: parseInt(result.rows[0]?.total_users) || 0,
      totalWarnings: parseInt(result.rows[0]?.total_warnings) || 0,
      avgWarnings: parseFloat(result.rows[0]?.avg_warnings) || 0,
      maxWarnings: parseInt(result.rows[0]?.max_warnings) || 0
    }
  },

  /**
   * Get warning list for group
   */
  async getWarningList(groupJid, warningType = null, limit = 10) {
    let query, params

    if (warningType) {
      query = `
        SELECT user_jid, warning_count, reason, last_warning_at
        FROM warnings
        WHERE group_jid = $1 AND warning_type = $2
        ORDER BY last_warning_at DESC
        LIMIT $3
      `
      params = [groupJid, warningType, limit]
    } else {
      query = `
        SELECT user_jid, warning_type, warning_count, reason, last_warning_at
        FROM warnings
        WHERE group_jid = $1
        ORDER BY last_warning_at DESC
        LIMIT $2
      `
      params = [groupJid, limit]
    }

    const result = await queryManager.execute(query, params)
    return result.rows
  }
}

// ==========================================
// VIOLATION LOGGING QUERIES
// ==========================================

export const ViolationQueries = {
  /**
   * Log a violation for analytics
   */
  async logViolation(groupJid, userJid, violationType, messageContent, detectedContent, actionTaken, warningNumber, messageId) {
    try {
      await queryManager.execute(`
        INSERT INTO violations (
          user_jid, group_jid, violation_type, 
          message_content, detected_content, action_taken, 
          warning_number, message_id, violated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `, [
        userJid,
        groupJid,
        violationType,
        messageContent?.substring(0, 500), // Truncate long messages
        JSON.stringify(detectedContent),
        actionTaken,
        warningNumber,
        messageId
      ])

      logger.debug(`[ViolationQueries] Logged ${violationType} violation for ${userJid} in ${groupJid}`)
    } catch (error) {
      logger.error(`[ViolationQueries] Error logging violation: ${error.message}`)
    }
  },

  /**
   * Get violation statistics
   */
  async getViolationStats(groupJid, violationType = null, days = 30) {
    let query, params

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
      `
      params = [groupJid, violationType]
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
      `
      params = [groupJid]
    }

    const result = await queryManager.execute(query, params)
    return result.rows
  }
}

// ==========================================
// MESSAGE QUERIES
// ==========================================

export const MessageQueries = {
  /**
   * Get recent messages from a chat
   */
  async getRecentMessages(chatJid, sessionId, limit = 50) {
    const result = await queryManager.execute(`
      SELECT * FROM messages
      WHERE from_jid = $1 AND session_id = $2
      ORDER BY timestamp DESC
      LIMIT $3
    `, [chatJid, sessionId, limit])

    return result.rows
  },

  /**
   * Mark message as deleted
   */
  async markDeleted(messageId, sessionId) {
    await queryManager.execute(`
      UPDATE messages 
      SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND session_id = $2
    `, [messageId, sessionId])
  },

  /**
   * Search messages by content
   */
  async searchMessages(chatJid, sessionId, searchTerm, limit = 20) {
    const result = await queryManager.execute(`
      SELECT * FROM messages
      WHERE from_jid = $1 AND session_id = $2 
        AND content ILIKE $3
        AND is_deleted = false
      ORDER BY timestamp DESC
      LIMIT $4
    `, [chatJid, sessionId, `%${searchTerm}%`, limit])

    return result.rows
  }
}

// ==========================================
// ANALYTICS QUERIES
// ==========================================

export const AnalyticsQueries = {
  /**
   * Update daily group analytics
   */
  async updateGroupAnalytics(groupJid, sessionId, updates) {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = ${key} + $${index + 4}`)
      .join(', ')
    
    const values = Object.values(updates)

    await queryManager.execute(`
      INSERT INTO group_analytics (
        group_jid, session_id, date, ${Object.keys(updates).join(', ')}
      )
      VALUES ($1, $2, CURRENT_DATE, ${Object.keys(updates).map((_, i) => `$${i + 4}`).join(', ')})
      ON CONFLICT (group_jid, session_id, date)
      DO UPDATE SET 
        ${setClause}
    `, [groupJid, sessionId, new Date().toISOString().split('T')[0], ...values])
  },

  /**
   * Get group analytics for date range
   */
  async getGroupAnalytics(groupJid, sessionId, days = 30) {
    const result = await queryManager.execute(`
      SELECT * FROM group_analytics
      WHERE group_jid = $1 AND session_id = $2
        AND date > CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY date DESC
    `, [groupJid, sessionId])

    return result.rows
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export const Utils = {
  /**
   * Clean old data
   */
  async cleanupOldData(days = 90) {
    const result = await queryManager.execute(`
      SELECT cleanup_old_data($1)
    `, [days])

    return result.rows[0]?.cleanup_old_data || 0
  },

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    const stats = {}

    // Table row counts
    const tables = ['users', 'sessions', 'messages', 'groups', 'warnings', 'violations', 'group_analytics']
    
    for (const table of tables) {
      try {
        const result = await queryManager.execute(`SELECT COUNT(*) as count FROM ${table}`)
        stats[table] = parseInt(result.rows[0].count)
      } catch (error) {
        stats[table] = 0
      }
    }

    return stats
  }
}

export default queryManager