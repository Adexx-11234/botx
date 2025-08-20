import { pool } from "../../database/connection.js"
import { logger } from "../../utils/logger.js"

export class AuthMiddleware {
  constructor() {
    this.userSessions = new Map()
  }

  async authenticateUser(telegramId) {
    try {
      const result = await pool.query("SELECT * FROM users WHERE telegram_id = $1", [telegramId])

      if (result.rows.length === 0) {
        // Create new user
        await this.createUser(telegramId)
        return { isAuthenticated: true, isNewUser: true }
      }

      // Update activity timestamp
      await pool.query("UPDATE users SET updated_at = NOW() WHERE telegram_id = $1", [telegramId])

      return {
        isAuthenticated: true,
        isNewUser: false,
        user: result.rows[0],
      }
    } catch (error) {
      logger.error("Auth middleware error:", error)
      return { isAuthenticated: false, error: error.message }
    }
  }

  async createUser(telegramId, username = null, firstName = null, lastName = null) {
    try {
      const result = await pool.query(
        `
                INSERT INTO users (telegram_id, username, first_name, last_name, created_at, updated_at)
                VALUES ($1, $2, $3, $4, NOW(), NOW())
                RETURNING *
            `,
        [telegramId, username, firstName, lastName],
      )

      logger.info(`New user created: ${telegramId}`)
      return result.rows[0]
    } catch (error) {
      logger.error("Error creating user:", error)
      throw error
    }
  }

  async getUserSession(telegramId) {
    try {
      const result = await pool.query(
        `
                SELECT s.*, u.username AS telegram_username, u.first_name 
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE u.telegram_id = $1 AND s.is_connected = true
            `,
        [telegramId],
      )

      return result.rows[0] || null
    } catch (error) {
      logger.error("Error getting user session:", error)
      return null
    }
  }

  async isUserConnected(telegramId) {
    const session = await this.getUserSession(telegramId)
    return session !== null
  }

  async updateUserInfo(telegramId, username, firstName, lastName) {
    try {
      await pool.query(
        `
                UPDATE users 
                SET username = $2, first_name = $3, last_name = $4, updated_at = NOW()
                WHERE telegram_id = $1
            `,
        [telegramId, username, firstName, lastName],
      )
    } catch (error) {
      logger.error("Error updating user info:", error)
    }
  }

  middleware() {
    return async (msg, metadata) => {
      const telegramId = msg.from.id
      const username = msg.from.username
      const firstName = msg.from.first_name
      const lastName = msg.from.last_name

      // Authenticate user
      const authResult = await this.authenticateUser(telegramId)

      if (!authResult.isAuthenticated) {
        return false // Block the message
      }

      // Update user info if changed
      if (!authResult.isNewUser) {
        await this.updateUserInfo(telegramId, username, firstName, lastName)
      }

      // Add user info to metadata
      metadata.user = authResult.user
      metadata.isNewUser = authResult.isNewUser

      return true // Allow the message to proceed
    }
  }
}
