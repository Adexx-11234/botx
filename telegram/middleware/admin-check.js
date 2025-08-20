import { pool } from "../../database/connection.js"
import { logger } from "../../utils/logger.js"
import { adminConfig } from "../../config/telegram.js"

export class AdminMiddleware {
  constructor() {
    this.adminSessions = new Map()
    this.loginAttempts = new Map()
    this.lockouts = new Map()
  }

  async isAdmin(telegramId) {
    try {
      const result = await pool.query("SELECT * FROM admins WHERE telegram_id = $1 AND is_active = true", [telegramId])
      return result.rows.length > 0
    } catch (error) {
      logger.error("Error checking admin status:", error)
      return false
    }
  }

  async createAdmin(telegramId, createdBy, password) {
    try {
      // Check if admin limit reached
      const adminCount = await pool.query("SELECT COUNT(*) FROM admins WHERE is_active = true")
      if (Number.parseInt(adminCount.rows[0].count) >= adminConfig.maxAdmins) {
        throw new Error("Maximum number of admins reached")
      }

      // Hash password (in production, use bcrypt)
      const hashedPassword = Buffer.from(password).toString("base64")

      const result = await pool.query(
        `
                INSERT INTO admins (telegram_id, password_hash, created_by, created_at, is_active)
                VALUES ($1, $2, $3, NOW(), true)
                RETURNING *
            `,
        [telegramId, hashedPassword, createdBy],
      )

      logger.info(`New admin created: ${telegramId} by ${createdBy}`)
      return result.rows[0]
    } catch (error) {
      logger.error("Error creating admin:", error)
      throw error
    }
  }

  async verifyAdminPassword(telegramId, password) {
    try {
      const result = await pool.query("SELECT password_hash FROM admins WHERE telegram_id = $1 AND is_active = true", [
        telegramId,
      ])

      if (result.rows.length === 0) {
        return false
      }

      // In production, use bcrypt.compare
      const hashedInput = Buffer.from(password).toString("base64")
      return hashedInput === result.rows[0].password_hash
    } catch (error) {
      logger.error("Error verifying admin password:", error)
      return false
    }
  }

  isAdminSessionActive(telegramId) {
    const session = this.adminSessions.get(telegramId)
    if (!session) return false

    const now = Date.now()
    if (now - session.lastActivity > adminConfig.sessionTimeout) {
      this.adminSessions.delete(telegramId)
      return false
    }

    return true
  }

  createAdminSession(telegramId) {
    this.adminSessions.set(telegramId, {
      loginTime: Date.now(),
      lastActivity: Date.now(),
    })

    // Clear any login attempts
    this.loginAttempts.delete(telegramId)
    this.lockouts.delete(telegramId)
  }

  updateAdminActivity(telegramId) {
    const session = this.adminSessions.get(telegramId)
    if (session) {
      session.lastActivity = Date.now()
    }
  }

  destroyAdminSession(telegramId) {
    this.adminSessions.delete(telegramId)
  }

  isLockedOut(telegramId) {
    const lockout = this.lockouts.get(telegramId)
    if (!lockout) return false

    const now = Date.now()
    if (now - lockout.timestamp > adminConfig.lockoutDuration) {
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

    if (newAttempts >= adminConfig.maxLoginAttempts) {
      this.lockouts.set(telegramId, { timestamp: Date.now() })
      return { locked: true, attemptsLeft: 0 }
    }

    return {
      locked: false,
      attemptsLeft: adminConfig.maxLoginAttempts - newAttempts,
    }
  }

  async requireAdmin(telegramId) {
    // Check if locked out
    if (this.isLockedOut(telegramId)) {
      return { authorized: false, reason: "locked_out" }
    }

    // Check if user is admin
    const isAdmin = await this.isAdmin(telegramId)
    if (!isAdmin) {
      return { authorized: false, reason: "not_admin" }
    }

    // Check if session is active
    if (!this.isAdminSessionActive(telegramId)) {
      return { authorized: false, reason: "session_expired" }
    }

    // Update activity
    this.updateAdminActivity(telegramId)
    return { authorized: true }
  }

  async getAllAdmins() {
    try {
      const result = await pool.query(`
                SELECT a.telegram_id, a.created_at, a.is_active,
                       u.telegram_username, u.first_name, u.last_name
                FROM admins a
                LEFT JOIN users u ON a.telegram_id = u.telegram_id
                WHERE a.is_active = true
                ORDER BY a.created_at DESC
            `)
      return result.rows
    } catch (error) {
      logger.error("Error getting all admins:", error)
      return []
    }
  }
}
