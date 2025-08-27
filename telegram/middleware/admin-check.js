// middleware/admin-check.js - Complete admin middleware with enhanced security
import { pool } from "../../database/connection.js"
import { logger } from "../../utils/logger.js"
import { adminConfig } from "../../config/telegram.js"
import sessionManager from "../../whatsapp/sessions/session-manager.js"
import fs from "fs"

export class AdminMiddleware {
  constructor() {
    this.adminSessions = new Map()
    this.loginAttempts = new Map()
    this.lockouts = new Map()
    this.activityLog = new Map()
    
    // Security settings
    this.maxLoginAttempts = adminConfig.maxLoginAttempts || 3
    this.lockoutDuration = adminConfig.lockoutDuration || 15 * 60 * 1000 // 15 minutes
    this.sessionTimeout = adminConfig.sessionTimeout || 30 * 60 * 1000 // 30 minutes

    this.startCleanupInterval()
  }

  // Cleanup old sessions and logs periodically
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupExpiredSessions()
      this.cleanupOldLogs()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  cleanupExpiredSessions() {
    const now = Date.now()
    for (const [telegramId, session] of this.adminSessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.destroyAdminSession(telegramId)
      }
    }
  }

  cleanupOldLogs() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    for (const [telegramId, logs] of this.activityLog.entries()) {
      this.activityLog.set(telegramId, logs.filter(log => log.timestamp > oneDayAgo))
      if (this.activityLog.get(telegramId).length === 0) {
        this.activityLog.delete(telegramId)
      }
    }
  }

  // Basic admin checks
  async isAdmin(telegramId) {
    try {
      const result = await pool.query(
        "SELECT is_admin FROM users WHERE telegram_id = $1 AND is_admin = true",
        [telegramId]
      )
      return result.rows.length > 0
    } catch (error) {
      logger.error("Error checking admin status:", error)
      return false
    }
  }

  isDefaultAdmin(telegramId) {
    return telegramId == adminConfig.defaultAdminId
  }

  async setDefaultAdmin(telegramId) {
    try {
      const result = await pool.query(
        "UPDATE users SET is_admin = true WHERE telegram_id = $1 RETURNING *",
        [telegramId]
      )

      if (result.rows.length > 0) {
        logger.info(`Default admin set: ${telegramId}`)
        return true
      }
      return false
    } catch (error) {
      logger.error("Error setting default admin:", error)
      return false
    }
  }

  // Password verification
  async verifyAdminPassword(telegramId, password) {
    try {
      // Default admin uses environment password
      if (telegramId == adminConfig.defaultAdminId) {
        const defaultPassword = process.env.ADMIN_PASSWORD || "admin123"
        return password === defaultPassword
      }

      // Other admins use their stored password
      const result = await pool.query(
        "SELECT admin_password FROM users WHERE telegram_id = $1 AND is_admin = true",
        [telegramId]
      )

      if (result.rows.length === 0) return false

      const adminPassword = result.rows[0].admin_password
      return adminPassword && password === adminPassword
    } catch (error) {
      logger.error("Error verifying admin password:", error)
      return false
    }
  }

  // Session management
  isAdminSessionActive(telegramId) {
    const session = this.adminSessions.get(telegramId)
    if (!session) return false

    const now = Date.now()
    if (now - session.lastActivity > this.sessionTimeout) {
      this.destroyAdminSession(telegramId)
      return false
    }

    return true
  }

  createAdminSession(telegramId) {
    const now = Date.now()
    this.adminSessions.set(telegramId, {
      loginTime: now,
      lastActivity: now,
      permissions: this.getAdminPermissions(telegramId),
      actionsPerformed: 0
    })

    // Clear failed attempts
    this.loginAttempts.delete(telegramId)
    this.lockouts.delete(telegramId)

    this.logActivity(telegramId, 'login', 'Admin session created')
    logger.info(`Admin session created: ${telegramId}`)
  }

  updateAdminActivity(telegramId) {
    const session = this.adminSessions.get(telegramId)
    if (session) {
      session.lastActivity = Date.now()
      session.actionsPerformed += 1
    }
  }

  destroyAdminSession(telegramId) {
    if (this.adminSessions.has(telegramId)) {
      this.logActivity(telegramId, 'logout', 'Admin session destroyed')
      this.adminSessions.delete(telegramId)
      logger.info(`Admin session destroyed: ${telegramId}`)
    }
  }

  getAdminPermissions(telegramId) {
    if (this.isDefaultAdmin(telegramId)) {
      return {
        canCreateAdmins: true,
        canRemoveAdmins: true,
        canDisconnectAll: true,
        canDeleteUsers: true,
        canViewLogs: true,
        canResetSystem: true,
        canBackupData: true
      }
    }

    return {
      canCreateAdmins: false,
      canRemoveAdmins: false,
      canDisconnectAll: false,
      canDeleteUsers: false,
      canViewLogs: true,
      canResetSystem: false,
      canBackupData: false
    }
  }

  // Security and lockout management
  isLockedOut(telegramId) {
    const lockout = this.lockouts.get(telegramId)
    if (!lockout) return false

    const now = Date.now()
    if (now - lockout.timestamp > this.lockoutDuration) {
      this.lockouts.delete(telegramId)
      this.loginAttempts.delete(telegramId)
      return false
    }

    return true
  }

  recordFailedAttempt(telegramId) {
    const attempts = this.loginAttempts.get(telegramId) || 0
    const newAttempts = attempts + 1

    this.loginAttempts.set(telegramId, newAttempts)
    this.logActivity(telegramId, 'failed_login', `Failed login attempt ${newAttempts}`)

    if (newAttempts >= this.maxLoginAttempts) {
      this.lockouts.set(telegramId, { 
        timestamp: Date.now(),
        reason: 'too_many_attempts',
        attempts: newAttempts
      })
      
      this.logActivity(telegramId, 'lockout', `Account locked after ${newAttempts} failed attempts`)
      logger.warn(`Admin locked out: ${telegramId} after ${newAttempts} attempts`)
      
      return { locked: true, attemptsLeft: 0 }
    }

    return {
      locked: false,
      attemptsLeft: this.maxLoginAttempts - newAttempts
    }
  }

  async requireAdmin(telegramId) {
    // Check lockout status
    if (this.isLockedOut(telegramId)) {
      return { authorized: false, reason: "locked_out" }
    }

    // Check admin status
    const isAdmin = await this.isAdmin(telegramId)
    if (!isAdmin) {
      this.logActivity(telegramId, 'unauthorized_access', 'Non-admin access attempt')
      return { authorized: false, reason: "not_admin" }
    }

    // Check session status
    if (!this.isAdminSessionActive(telegramId)) {
      return { authorized: false, reason: "session_expired" }
    }

    // Update activity
    this.updateAdminActivity(telegramId)
    const session = this.adminSessions.get(telegramId)
    
    return { 
      authorized: true, 
      permissions: session.permissions,
      isDefault: this.isDefaultAdmin(telegramId),
      session: session
    }
  }

  // Admin management operations
  async createAdmin(telegramId, createdBy, password) {
    try {
      // Permission check
      if (!this.isDefaultAdmin(createdBy)) {
        throw new Error("Only the default admin can create other admins")
      }

      // Check if user exists
      const userCheck = await pool.query("SELECT * FROM users WHERE telegram_id = $1", [telegramId])
      if (userCheck.rows.length === 0) {
        throw new Error("User not found. They must use the bot first.")
      }

      const user = userCheck.rows[0]
      if (user.is_admin) {
        throw new Error("User is already an admin")
      }

      // Create admin
      const result = await pool.query(
        `UPDATE users SET 
         is_admin = true, 
         admin_password = $2, 
         admin_created_by = $3,
         admin_created_at = NOW(),
         updated_at = NOW() 
         WHERE telegram_id = $1 
         RETURNING *`,
        [telegramId, password, createdBy]
      )

      this.logActivity(createdBy, 'create_admin', `Created admin: ${telegramId}`)
      logger.info(`Admin created: ${telegramId} by ${createdBy}`)
      
      return { success: true, user: result.rows[0] }
    } catch (error) {
      logger.error("Error creating admin:", error)
      throw error
    }
  }

  async removeAdmin(identifier) {
    try {
      let telegramId = identifier

      // Handle @username format
      if (identifier.startsWith('@')) {
        const username = identifier.substring(1)
        const userResult = await pool.query("SELECT telegram_id FROM users WHERE username = $1 AND is_admin = true", [username])
        
        if (userResult.rows.length === 0) {
          return { success: false, message: "Admin not found with that username" }
        }
        
        telegramId = userResult.rows[0].telegram_id
      }

      // Prevent removing default admin
      if (telegramId == adminConfig.defaultAdminId) {
        return { success: false, message: "Cannot remove the default admin" }
      }

      // Remove admin status
      const result = await pool.query(
        `UPDATE users SET 
         is_admin = false, 
         admin_password = NULL,
         admin_created_by = NULL,
         admin_created_at = NULL,
         updated_at = NOW() 
         WHERE telegram_id = $1 AND is_admin = true
         RETURNING first_name, username`,
        [telegramId]
      )

      if (result.rows.length === 0) {
        return { success: false, message: "Admin not found or already removed" }
      }

      // Destroy their session if active
      this.destroyAdminSession(telegramId)

      const user = result.rows[0]
      const name = user.first_name || user.username || telegramId

      this.logActivity(adminConfig.defaultAdminId, 'remove_admin', `Removed admin: ${telegramId}`)
      logger.info(`Admin removed: ${telegramId}`)

      return { success: true, message: `Admin ${name} has been removed` }
    } catch (error) {
      logger.error("Error removing admin:", error)
      return { success: false, message: "Failed to remove admin" }
    }
  }

  async getAllAdmins() {
    try {
      const result = await pool.query(`
        SELECT telegram_id, username, first_name, last_name, 
               admin_created_at as created_at, admin_created_by
        FROM users 
        WHERE is_admin = true
        ORDER BY admin_created_at ASC NULLS FIRST
      `)
      return result.rows
    } catch (error) {
      logger.error("Error getting all admins:", error)
      return []
    }
  }

  // User and session management
  async disconnectAllUsers(excludeDefault = true) {
    try {
      let query = `
        SELECT DISTINCT s.telegram_id, s.session_id, u.id as user_id, u.first_name
        FROM sessions s 
        JOIN users u ON s.telegram_id = u.telegram_id 
        WHERE s.is_connected = true
      `
      const params = []

      if (excludeDefault && adminConfig.defaultAdminId) {
        query += " AND s.telegram_id != $1"
        params.push(adminConfig.defaultAdminId)
      }

      const sessionsResult = await pool.query(query, params)
      const disconnected = []

      for (const session of sessionsResult.rows) {
        try {
          // Disconnect WhatsApp session
          await sessionManager.disconnectSession(session.session_id)
          
          // Clean up database
          await pool.query("DELETE FROM sessions WHERE session_id = $1", [session.session_id])
          
          if (!excludeDefault || session.telegram_id != adminConfig.defaultAdminId) {
            await pool.query("DELETE FROM users WHERE telegram_id = $1", [session.telegram_id])
          }

          disconnected.push({
            telegram_id: session.telegram_id,
            name: session.first_name || "Unknown"
          })

          logger.info(`Disconnected user: ${session.telegram_id}`)
        } catch (error) {
          logger.error(`Error disconnecting session ${session.session_id}:`, error)
        }
      }

      this.logActivity(adminConfig.defaultAdminId, 'disconnect_all', `Disconnected ${disconnected.length} users`)
      logger.info(`Disconnected ${disconnected.length} users`)
      
      return { success: true, count: disconnected.length, users: disconnected }
    } catch (error) {
      logger.error("Error disconnecting all users:", error)
      throw error
    }
  }

  async disconnectSpecificUser(identifier) {
    try {
      let query, params

      // Check if identifier is a phone number
      if (identifier.match(/^[+\d\s\-()]+$/)) {
        const normalizedPhone = identifier.replace(/\D/g, '')
        query = `
          SELECT s.session_id, s.telegram_id, u.first_name, u.username
          FROM sessions s 
          JOIN users u ON s.telegram_id = u.telegram_id 
          WHERE REPLACE(REPLACE(REPLACE(REPLACE(s.phone_number, '+', ''), '-', ''), ' ', ''), '()', '') LIKE $1 
          AND s.is_connected = true
        `
        params = [`%${normalizedPhone}%`]
      } else {
        // Assume it's a telegram ID
        query = `
          SELECT s.session_id, s.telegram_id, u.first_name, u.username
          FROM sessions s 
          JOIN users u ON s.telegram_id = u.telegram_id 
          WHERE s.telegram_id = $1 AND s.is_connected = true
        `
        params = [identifier]
      }

      const result = await pool.query(query, params)

      if (result.rows.length === 0) {
        return { success: false, message: "No active session found for this user" }
      }

      const session = result.rows[0]

      // Prevent disconnecting default admin
      if (session.telegram_id == adminConfig.defaultAdminId) {
        return { success: false, message: "Cannot disconnect the default admin" }
      }

      try {
        await sessionManager.disconnectSession(session.session_id)
      } catch (sessionError) {
        logger.error(`Session cleanup failed for ${session.session_id}:`, sessionError)
      }

      // Clean up database
      await pool.query("DELETE FROM sessions WHERE session_id = $1", [session.session_id])
      await pool.query("DELETE FROM users WHERE telegram_id = $1", [session.telegram_id])

      const name = session.first_name || session.username || "Unknown"
      
      this.logActivity(adminConfig.defaultAdminId, 'disconnect_user', `Disconnected user: ${session.telegram_id}`)
      logger.info(`Disconnected user: ${session.telegram_id}`)

      return {
        success: true,
        message: `Successfully disconnected user: ${name} (${session.telegram_id})`,
        user: { name, telegram_id: session.telegram_id }
      }
    } catch (error) {
      logger.error("Error disconnecting specific user:", error)
      throw error
    }
  }

  // Activity logging
  logActivity(telegramId, action, details = null) {
    if (!this.activityLog.has(telegramId)) {
      this.activityLog.set(telegramId, [])
    }

    const logs = this.activityLog.get(telegramId)
    logs.push({
      timestamp: Date.now(),
      action: action,
      details: details,
      ip: null // Could be enhanced to track IP
    })

    // Keep only last 50 activities per user
    if (logs.length > 50) {
      logs.splice(0, logs.length - 50)
    }

    this.activityLog.set(telegramId, logs)
  }

  getRecentActivity(telegramId, limit = 10) {
    const logs = this.activityLog.get(telegramId) || []
    return logs.slice(-limit).reverse() // Most recent first
  }

  getAllRecentActivity(limit = 20) {
    const allLogs = []
    
    for (const [telegramId, logs] of this.activityLog.entries()) {
      logs.forEach(log => {
        allLogs.push({
          telegram_id: telegramId,
          ...log
        })
      })
    }

    return allLogs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  // System maintenance
  async getSystemHealth() {
    try {
      const dbHealth = await this.checkDatabaseHealth()
      const sessionHealth = await this.checkSessionHealth()
      const memoryHealth = this.checkMemoryHealth()

      return {
        database: dbHealth,
        sessions: sessionHealth,
        memory: memoryHealth,
        overall: dbHealth.status === 'healthy' && sessionHealth.status === 'healthy' && memoryHealth.status === 'healthy' ? 'healthy' : 'warning'
      }
    } catch (error) {
      logger.error("Error checking system health:", error)
      return {
        database: { status: 'error', message: 'Check failed' },
        sessions: { status: 'error', message: 'Check failed' },
        memory: { status: 'error', message: 'Check failed' },
        overall: 'error'
      }
    }
  }

  async checkDatabaseHealth() {
    try {
      const start = Date.now()
      await pool.query("SELECT 1")
      const responseTime = Date.now() - start

      return {
        status: responseTime < 100 ? 'healthy' : 'warning',
        responseTime: responseTime,
        message: `Database responding in ${responseTime}ms`
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Database connection failed: ${error.message}`
      }
    }
  }

  async checkSessionHealth() {
    try {
      const result = await pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN is_connected = true THEN 1 END) as connected FROM sessions")
      const stats = result.rows[0]

      return {
        status: 'healthy',
        total: parseInt(stats.total),
        connected: parseInt(stats.connected),
        message: `${stats.connected}/${stats.total} sessions active`
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Session check failed: ${error.message}`
      }
    }
  }

  checkMemoryHealth() {
    const memUsage = process.memoryUsage()
    const usedMB = Math.round(memUsage.rss / 1024 / 1024)
    const maxMB = 1024 // Assume 1GB limit

    return {
      status: usedMB < maxMB * 0.8 ? 'healthy' : 'warning',
      used: usedMB,
      max: maxMB,
      percentage: Math.round((usedMB / maxMB) * 100),
      message: `${usedMB}MB / ${maxMB}MB (${Math.round((usedMB / maxMB) * 100)}%)`
    }
  }

  // Cleanup and maintenance operations
  async cleanupSessions() {
    try {
      // Remove orphaned sessions (sessions without users)
      const orphanedResult = await pool.query(`
        DELETE FROM sessions 
        WHERE telegram_id NOT IN (SELECT telegram_id FROM users)
        RETURNING session_id
      `)

      // Remove inactive sessions (not connected for over 24 hours)
      const inactiveResult = await pool.query(`
        DELETE FROM sessions 
        WHERE is_connected = false 
        AND updated_at < NOW() - INTERVAL '24 hours'
        RETURNING session_id
      `)

      const orphanedCount = orphanedResult.rows.length
      const inactiveCount = inactiveResult.rows.length
      const totalCleaned = orphanedCount + inactiveCount

      this.logActivity(adminConfig.defaultAdminId, 'cleanup_sessions', `Cleaned ${totalCleaned} sessions`)
      logger.info(`Session cleanup: ${orphanedCount} orphaned, ${inactiveCount} inactive`)

      return {
        success: true,
        orphaned: orphanedCount,
        inactive: inactiveCount,
        total: totalCleaned
      }
    } catch (error) {
      logger.error("Error during session cleanup:", error)
      throw error
    }
  }

  async optimizeDatabase() {
    try {
      // This is a simplified version - in production you'd want proper database optimization
      await pool.query("VACUUM ANALYZE users")
      await pool.query("VACUUM ANALYZE sessions") 
      await pool.query("VACUUM ANALYZE messages")

      this.logActivity(adminConfig.defaultAdminId, 'optimize_db', 'Database optimization completed')
      logger.info("Database optimization completed")

      return { success: true, message: "Database optimization completed" }
    } catch (error) {
      logger.error("Error during database optimization:", error)
      throw error
    }
  }
}