import { TelegramMessages } from "../utils/messages.js"
import { TelegramKeyboards } from "../utils/keyboards.js"
import { AdminMiddleware } from "../middleware/admin-check.js"
import { pool } from "../../database/connection.js"
import { logger } from "../../utils/logger.js"

export class AdminHandler {
  constructor(bot, authMiddleware) {
    this.bot = bot
    this.authMiddleware = authMiddleware
    this.adminMiddleware = new AdminMiddleware()
    this.pendingPasswordInputs = new Set()
  }

  async handleAdminPanel(msg) {
    const telegramId = msg.from.id

    try {
      // Check if user is admin
      const isAdmin = await this.adminMiddleware.isAdmin(telegramId)
      if (!isAdmin) {
        return this.bot.sendMessage(msg.chat.id, TelegramMessages.unauthorized())
      }

      // Check if session is active
      if (this.adminMiddleware.isAdminSessionActive(telegramId)) {
        return this.showAdminMenu(msg.chat.id)
      }

      // Check if locked out
      if (this.adminMiddleware.isLockedOut(telegramId)) {
        return this.bot.sendMessage(msg.chat.id, TelegramMessages.adminLockout())
      }

      // Request password
      this.pendingPasswordInputs.add(telegramId)
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.adminLogin(), {
        reply_markup: TelegramKeyboards.backButton("main_menu"),
      })
    } catch (error) {
      logger.error("Error in handleAdminPanel:", error)
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.error("Failed to access admin panel"))
    }
  }

  async handlePasswordInput(msg) {
    const telegramId = msg.from.id
    const password = msg.text

    try {
      // Delete the message for security
      await this.bot.deleteMessage(msg.chat.id, msg.message_id)

      if (!this.pendingPasswordInputs.has(telegramId)) {
        return
      }

      // Verify password
      const isValid = await this.adminMiddleware.verifyAdminPassword(telegramId, password)

      if (isValid) {
        this.adminMiddleware.createAdminSession(telegramId)
        this.pendingPasswordInputs.delete(telegramId)

        await this.bot.sendMessage(msg.chat.id, TelegramMessages.adminLoginSuccess())

        await this.showAdminMenu(msg.chat.id)
      } else {
        const attemptResult = this.adminMiddleware.recordFailedAttempt(telegramId)

        if (attemptResult.locked) {
          this.pendingPasswordInputs.delete(telegramId)
          await this.bot.sendMessage(msg.chat.id, TelegramMessages.adminLockout())
        } else {
          await this.bot.sendMessage(msg.chat.id, TelegramMessages.adminLoginFailed(attemptResult.attemptsLeft))
        }
      }
    } catch (error) {
      logger.error("Error in handlePasswordInput:", error)
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.error("Authentication failed"))
    }
  }

  async showAdminMenu(chatId) {
    await this.bot.sendMessage(chatId, "⚙️ *Admin Panel*\n\nSelect an option:", {
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.adminMenu(),
    })
  }

  async handleAdminStats(msg) {
    const telegramId = msg.from.id

    try {
      const authResult = await this.adminMiddleware.requireAdmin(telegramId)
      if (!authResult.authorized) {
        return this.handleUnauthorized(msg.chat.id, authResult.reason)
      }

      const stats = await this.getSystemStats()
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.adminStats(stats), {
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.backButton("admin_panel"),
      })
    } catch (error) {
      logger.error("Error in handleAdminStats:", error)
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.error("Failed to get statistics"))
    }
  }

  async handleUserManagement(msg) {
    const telegramId = msg.from.id

    try {
      const authResult = await this.adminMiddleware.requireAdmin(telegramId)
      if (!authResult.authorized) {
        return this.handleUnauthorized(msg.chat.id, authResult.reason)
      }

      await this.bot.sendMessage(msg.chat.id, "👥 *User Management*\n\nSelect an option:", {
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.adminUsersMenu(),
      })
    } catch (error) {
      logger.error("Error in handleUserManagement:", error)
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.error("Failed to load user management"))
    }
  }

  async handleListUsers(msg, page = 1) {
    const telegramId = msg.from.id

    try {
      const authResult = await this.adminMiddleware.requireAdmin(telegramId)
      if (!authResult.authorized) {
        return this.handleUnauthorized(msg.chat.id, authResult.reason)
      }

      const limit = 10
      const offset = (page - 1) * limit

      const usersResult = await pool.query(
        `
                SELECT u.telegram_id, u.username AS telegram_username, u.first_name, u.last_name,
                       u.created_at, u.updated_at AS last_seen,
                       s.phone_number AS whatsapp_number, s.is_connected as is_connected
                FROM users u
                LEFT JOIN sessions s ON u.id = s.user_id AND s.is_connected = true
                ORDER BY u.created_at DESC
                LIMIT $1 OFFSET $2
            `,
        [limit, offset],
      )

      const countResult = await pool.query("SELECT COUNT(*) FROM users")
      const totalUsers = Number.parseInt(countResult.rows[0].count)
      const totalPages = Math.ceil(totalUsers / limit)

      if (usersResult.rows.length === 0) {
        return this.bot.sendMessage(msg.chat.id, "No users found.", {
          reply_markup: TelegramKeyboards.backButton("admin_panel"),
        })
      }

      await this.bot.sendMessage(msg.chat.id, TelegramMessages.adminUserList(usersResult.rows, page, totalPages), {
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.paginationKeyboard(page, totalPages, "admin_users"),
      })
    } catch (error) {
      logger.error("Error in handleListUsers:", error)
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.error("Failed to list users"))
    }
  }

  async getSystemStats() {
    try {
      const [usersResult, sessionsResult, activeResult, messagesResult] = await Promise.all([
        pool.query("SELECT COUNT(*) FROM users"),
        pool.query("SELECT COUNT(*) FROM sessions WHERE is_connected = true"),
        pool.query("SELECT COUNT(*) FROM sessions WHERE is_connected = true AND updated_at > NOW() - INTERVAL '1 hour'"),
        pool.query("SELECT COUNT(*) FROM messages WHERE created_at > CURRENT_DATE"),
      ])

      const uptime = process.uptime()
      const hours = Math.floor(uptime / 3600)
      const minutes = Math.floor((uptime % 3600) / 60)

      return {
        totalUsers: Number.parseInt(usersResult.rows[0].count),
        connectedSessions: Number.parseInt(sessionsResult.rows[0].count),
        activeSessions: Number.parseInt(activeResult.rows[0].count),
        messagesToday: Number.parseInt(messagesResult.rows[0].count),
        uptime: `${hours}h ${minutes}m`,
      }
    } catch (error) {
      logger.error("Error getting system stats:", error)
      return {
        totalUsers: 0,
        connectedSessions: 0,
        activeSessions: 0,
        messagesToday: 0,
        uptime: "Unknown",
      }
    }
  }

  async handleUnauthorized(chatId, reason) {
    let message
    switch (reason) {
      case "locked_out":
        message = TelegramMessages.adminLockout()
        break
      case "not_admin":
        message = TelegramMessages.unauthorized()
        break
      case "session_expired":
        message = TelegramMessages.adminLogin()
        break
      default:
        message = TelegramMessages.unauthorized()
    }

    await this.bot.sendMessage(chatId, message)
  }

  isPendingPasswordInput(telegramId) {
    return this.pendingPasswordInputs.has(telegramId)
  }

  clearPendingPasswordInput(telegramId) {
    this.pendingPasswordInputs.delete(telegramId)
  }
}
