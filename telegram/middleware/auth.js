// telegram/middleware/auth.js - Fixed to use db operations
import { db } from "../../database/db.js"
import { logger } from "../../utils/logger.js"

export class AuthMiddleware {
  constructor() {
    this.userSessions = new Map()
  }

  async authenticateUser(telegramId, userInfo = null) {
    try {
      console.log("[AUTH] Authenticating user:", telegramId)

      // Use db operations instead of direct pool queries
      let user = await db.getUserById(telegramId)
      console.log("[AUTH] User query result:", user ? "Found" : "Not found")

      if (!user) {
        console.log("[AUTH] Creating new user for:", telegramId)
        
        // Create new user using db operations
        user = await db.getOrCreateUser(telegramId, userInfo)
        console.log("[AUTH] New user created successfully:", user.id)

        return {
          isAuthenticated: true,
          isNewUser: true,
          user: user,
        }
      }

      console.log("[AUTH] Existing user authenticated:", telegramId)

      return {
        isAuthenticated: true,
        isNewUser: false,
        user: user,
      }
    } catch (error) {
      console.log("[AUTH] Authentication error:", error)
      logger.error("Auth middleware error:", error)

      // Don't block the user, but log the error
      return {
        isAuthenticated: true, // Allow through even with DB errors
        isNewUser: true,
        error: error.message,
      }
    }
  }

  async getUserSession(telegramId) {
    try {
      return await db.getUserSession(telegramId)
    } catch (error) {
      logger.error("Error getting user session:", error)
      return null
    }
  }

  async isUserConnected(telegramId) {
    const session = await this.getUserSession(telegramId)
    return session !== null && session.is_connected
  }

  middleware() {
    return async (msg, metadata) => {
      const telegramId = msg.from.id
      const username = msg.from.username
      const firstName = msg.from.first_name
      const lastName = msg.from.last_name

      console.log("[AUTH] Processing message from:", { telegramId, username, firstName })

      try {
        // Authenticate user with their info
        const authResult = await this.authenticateUser(telegramId, msg.from)

        if (!authResult.isAuthenticated) {
          console.log("[AUTH] User authentication failed, blocking message")
          return false // Block the message
        }

        console.log("[AUTH] User authenticated successfully:", {
          telegramId,
          isNewUser: authResult.isNewUser,
        })

        // Add user info to metadata
        metadata.user = authResult.user
        metadata.isNewUser = authResult.isNewUser

        return true // Allow the message to proceed
      } catch (error) {
        console.log("[AUTH] Middleware error:", error)
        logger.error("Auth middleware error:", error)

        // In case of errors, allow the message through to prevent blocking users
        return true
      }
    }
  }
}