// handlers/admin.js - Simplified admin handler using proper message templates
import { TelegramMessages } from "../utils/messages.js"
import { TelegramKeyboards } from "../utils/keyboards.js"
import { AdminMiddleware } from "../middleware/admin-check.js"
import { pool } from "../../database/connection.js"
import { logger } from "../../utils/logger.js"
import { adminConfig } from "../../config/telegram.js"

export class AdminHandler {
  constructor(bot) {
    this.bot = bot
    this.adminMiddleware = new AdminMiddleware()
    this.pendingInputs = new Map()
    this.initializeDefaultAdmin()
  }

  async initializeDefaultAdmin() {
    if (adminConfig.defaultAdminId) {
      try {
        const isAdmin = await this.adminMiddleware.isAdmin(adminConfig.defaultAdminId)
        if (!isAdmin) {
          await this.adminMiddleware.setDefaultAdmin(adminConfig.defaultAdminId)
          logger.info(`Default admin initialized: ${adminConfig.defaultAdminId}`)
        }
      } catch (error) {
        logger.error("Error initializing default admin:", error)
      }
    }
  }

  // Main admin panel handler
  async handlePanel(chatId, userId) {
    try {
      const isAdmin = await this.adminMiddleware.isAdmin(userId)
      if (!isAdmin) {
        return this.bot.sendMessage(chatId, TelegramMessages.unauthorized())
      }

      if (this.adminMiddleware.isAdminSessionActive(userId)) {
        return this.showMainPanel(chatId)
      }

      if (this.adminMiddleware.isLockedOut(userId)) {
        return this.bot.sendMessage(chatId, TelegramMessages.adminLockout())
      }

      this.pendingInputs.set(userId, { type: 'password' })
      await this.bot.sendMessage(chatId, TelegramMessages.adminLogin(), {
        reply_markup: TelegramKeyboards.backButton("main_menu")
      })
    } catch (error) {
      logger.error("Error in handlePanel:", error)
      await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to access admin panel"))
    }
  }

  // Password input handler
  async handlePassword(msg) {
    const userId = msg.from.id
    const password = msg.text

    try {
      await this.bot.deleteMessage(msg.chat.id, msg.message_id)

      const pending = this.pendingInputs.get(userId)
      if (!pending || pending.type !== 'password') return false

      const isValid = await this.adminMiddleware.verifyAdminPassword(userId, password)

      if (isValid) {
        this.adminMiddleware.createAdminSession(userId)
        this.pendingInputs.delete(userId)
        await this.bot.sendMessage(msg.chat.id, TelegramMessages.adminLoginSuccess())
        await this.showMainPanel(msg.chat.id)
      } else {
        const attemptResult = this.adminMiddleware.recordFailedAttempt(userId)
        if (attemptResult.locked) {
          this.pendingInputs.delete(userId)
          await this.bot.sendMessage(msg.chat.id, TelegramMessages.adminLockout())
        } else {
          await this.bot.sendMessage(msg.chat.id, TelegramMessages.adminLoginFailed(attemptResult.attemptsLeft))
        }
      }
      return true
    } catch (error) {
      logger.error("Error in handlePassword:", error)
      return false
    }
  }

  // Main admin panel
  async showMainPanel(chatId) {
    await this.bot.sendMessage(chatId, TelegramMessages.adminPanel(), {
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.adminMenu()
    })
  }

  // Handle admin actions
  async handleAction(query) {
    const chatId = query.message.chat.id
    const userId = query.from.id
    const action = query.data

    try {
      const authResult = await this.adminMiddleware.requireAdmin(userId)
      if (!authResult.authorized) {
        return this.handleUnauthorized(chatId, authResult.reason)
      }

      switch (action) {
        case "admin_panel":
          await this.showMainPanel(chatId)
          break
        case "admin_stats":
          await this.showStats(chatId)
          break
        case "admin_users":
          await this.showUsersMenu(chatId)
          break
        case "admin_users_list":
          await this.showUsers(chatId, 1)
          break
        case "admin_manage":
          await this.showAdminManagement(chatId)
          break
        case "admin_add":
          await this.handleAddAdmin(chatId, userId)
          break
        case "admin_remove":
          await this.handleRemoveAdmin(chatId, userId)
          break
        case "admin_list":
          await this.showAdminsList(chatId)
          break
        case "admin_sessions":
          await this.showSessionsMenu(chatId)
          break
        case "admin_system":
          await this.showSystemMenu(chatId)
          break
        case "admin_health":
          await this.showHealthCheck(chatId)
          break
        case "admin_maintenance":
          await this.showMaintenanceMenu(chatId)
          break
        case "admin_disconnect_all":
          await this.confirmDisconnectAll(chatId)
          break
        case "admin_disconnect_all_confirm":
          await this.executeDisconnectAll(chatId)
          break
        case "admin_disconnect_user":
          await this.requestDisconnectUser(chatId, userId)
          break
        case "admin_messages":
          await this.showMessagesMenu(chatId)
          break
        case "admin_logs":
          await this.showLogsMenu(chatId)
          break
        case "admin_logout":
          await this.handleLogout(chatId, userId)
          break
        default:
          if (action.startsWith('admin_users_')) {
            const page = parseInt(action.split('_')[2])
            await this.showUsers(chatId, page)
          }
      }
    } catch (error) {
      logger.error("Error in handleAction:", error)
      await this.bot.sendMessage(chatId, TelegramMessages.error("Action failed"))
    }
  }

  // Statistics
  async showStats(chatId) {
    try {
      const stats = await this.getStats()
      await this.bot.sendMessage(chatId, TelegramMessages.adminStats(stats), {
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.backButton("admin_panel")
      })
    } catch (error) {
      logger.error("Error showing stats:", error)
      await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to load statistics"))
    }
  }

  // Users menu
  async showUsersMenu(chatId) {
    await this.bot.sendMessage(chatId, "User Management\n\nSelect an option:", {
      reply_markup: TelegramKeyboards.adminUsersMenu()
    })
  }

  // User list
  async showUsers(chatId, page = 1) {
    try {
      const limit = 8
      const offset = (page - 1) * limit

      const usersResult = await pool.query(`
        SELECT u.telegram_id, u.username, u.first_name, u.is_admin,
               u.created_at, s.phone_number, s.is_connected
        FROM users u
        LEFT JOIN sessions s ON u.id = s.user_id
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset])

      const countResult = await pool.query("SELECT COUNT(*) FROM users")
      const totalUsers = parseInt(countResult.rows[0].count)
      const totalPages = Math.ceil(totalUsers / limit)

      if (usersResult.rows.length === 0) {
        return this.bot.sendMessage(chatId, "No users found.", {
          reply_markup: TelegramKeyboards.backButton("admin_panel")
        })
      }

      await this.bot.sendMessage(chatId, TelegramMessages.adminUserList(usersResult.rows, page, totalPages), {
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.paginationKeyboard(page, totalPages, "admin_users")
      })
    } catch (error) {
      logger.error("Error showing users:", error)
      await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to load users"))
    }
  }

  // Admin management
  async showAdminManagement(chatId) {
    await this.bot.sendMessage(chatId, TelegramMessages.adminManageAdmins(), {
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.adminManagementKeyboard()
    })
  }

  async handleAddAdmin(chatId, userId) {
    if (!this.adminMiddleware.isDefaultAdmin(userId)) {
      return this.bot.sendMessage(chatId, TelegramMessages.error("Only the default admin can add other admins"))
    }

    this.pendingInputs.set(userId, { type: 'add_admin' })
    await this.bot.sendMessage(chatId, TelegramMessages.adminAddAdmin(), {
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.backButton("admin_manage")
    })
  }

  async handleRemoveAdmin(chatId, userId) {
    if (!this.adminMiddleware.isDefaultAdmin(userId)) {
      return this.bot.sendMessage(chatId, TelegramMessages.error("Only the default admin can remove other admins"))
    }

    this.pendingInputs.set(userId, { type: 'remove_admin' })
    await this.bot.sendMessage(chatId, TelegramMessages.adminRemoveAdmin(), {
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.backButton("admin_manage")
    })
  }

  async showAdminsList(chatId) {
    try {
      const admins = await this.adminMiddleware.getAllAdmins()
      await this.bot.sendMessage(chatId, TelegramMessages.adminListAdmins(admins), {
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.backButton("admin_manage")
      })
    } catch (error) {
      logger.error("Error showing admins list:", error)
      await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to load admins list"))
    }
  }

  // Sessions menu
  async showSessionsMenu(chatId) {
    await this.bot.sendMessage(chatId, "Session Management\n\nSelect an option:", {
      reply_markup: TelegramKeyboards.sessionsMenu()
    })
  }

  // System menu
  async showSystemMenu(chatId) {
    await this.bot.sendMessage(chatId, "System Management\n\nSelect an option:", {
      reply_markup: TelegramKeyboards.systemMenu()
    })
  }

  async showHealthCheck(chatId) {
    try {
      const health = await this.adminMiddleware.getSystemHealth()
      await this.bot.sendMessage(chatId, TelegramMessages.healthCheck(health), {
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.backButton("admin_system")
      })
    } catch (error) {
      logger.error("Error showing health check:", error)
      await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to perform health check"))
    }
  }

  // Maintenance
  async showMaintenanceMenu(chatId) {
    await this.bot.sendMessage(chatId, TelegramMessages.maintenancePanel(), {
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.maintenanceMenu()
    })
  }

  async confirmDisconnectAll(chatId) {
    await this.bot.sendMessage(chatId, TelegramMessages.disconnectAllConfirmation(), {
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.disconnectAllConfirmation()
    })
  }

  async executeDisconnectAll(chatId) {
    try {
      await this.bot.sendMessage(chatId, "Disconnecting all users...")
      
      const result = await this.adminMiddleware.disconnectAllUsers(true)
      
      await this.bot.sendMessage(chatId, TelegramMessages.operationSuccess(`Disconnected ${result.count} users successfully`), {
        reply_markup: TelegramKeyboards.backButton("admin_maintenance")
      })
    } catch (error) {
      logger.error("Error disconnecting all users:", error)
      await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to disconnect all users"))
    }
  }

  async requestDisconnectUser(chatId, userId) {
    this.pendingInputs.set(userId, { type: 'disconnect_user' })
    await this.bot.sendMessage(chatId, TelegramMessages.disconnectSpecificUser(), {
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.backButton("admin_users")
    })
  }

  // Messages menu
  async showMessagesMenu(chatId) {
    await this.bot.sendMessage(chatId, "Message Management\n\nSelect an option:", {
      reply_markup: TelegramKeyboards.messagesMenu()
    })
  }

  // Logs menu
  async showLogsMenu(chatId) {
    await this.bot.sendMessage(chatId, "Logs & Monitoring\n\nSelect an option:", {
      reply_markup: TelegramKeyboards.logsMenu()
    })
  }

  // Input processing
  async processInput(msg) {
    const userId = msg.from.id
    const input = msg.text.trim()
    const pending = this.pendingInputs.get(userId)

    if (!pending) return false

    try {
      switch (pending.type) {
        case 'password':
          return await this.handlePassword(msg)
          
        case 'add_admin':
          await this.processAddAdmin(msg, input)
          break
          
        case 'remove_admin':
          await this.processRemoveAdmin(msg, input)
          break
          
        case 'disconnect_user':
          await this.processDisconnectUser(msg, input)
          break
          
        default:
          return false
      }

      this.pendingInputs.delete(userId)
      return true
    } catch (error) {
      logger.error("Error processing input:", error)
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.error("Failed to process input"))
      this.pendingInputs.delete(userId)
      return true
    }
  }

  async processAddAdmin(msg, input) {
    const chatId = msg.chat.id
    
    try {
      let targetTelegramId = input

      if (input.startsWith("@")) {
        const username = input.substring(1)
        const userResult = await pool.query("SELECT telegram_id FROM users WHERE username = $1", [username])

        if (userResult.rows.length === 0) {
          return this.bot.sendMessage(chatId, TelegramMessages.error("User not found. They must use the bot first."))
        }

        targetTelegramId = userResult.rows[0].telegram_id
      }

      const userResult = await pool.query("SELECT * FROM users WHERE telegram_id = $1", [targetTelegramId])
      if (userResult.rows.length === 0) {
        return this.bot.sendMessage(chatId, TelegramMessages.error("User not found. They must use the bot first."))
      }

      const user = userResult.rows[0]
      if (user.is_admin) {
        return this.bot.sendMessage(chatId, TelegramMessages.error("User is already an admin."))
      }

      this.pendingInputs.set(msg.from.id, { type: 'admin_password', targetTelegramId, user })
      await this.bot.sendMessage(chatId, TelegramMessages.setAdminPassword(user), {
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.backButton("admin_manage")
      })
    } catch (error) {
      logger.error("Error processing add admin:", error)
      await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to add admin"))
    }
  }

  async processRemoveAdmin(msg, input) {
    const chatId = msg.chat.id
    
    try {
      const result = await this.adminMiddleware.removeAdmin(input)
      
      if (result.success) {
        await this.bot.sendMessage(chatId, TelegramMessages.operationSuccess(result.message), {
          reply_markup: TelegramKeyboards.backButton("admin_manage")
        })
      } else {
        await this.bot.sendMessage(chatId, TelegramMessages.error(result.message))
      }
    } catch (error) {
      logger.error("Error processing remove admin:", error)
      await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to remove admin"))
    }
  }

  async processDisconnectUser(msg, input) {
    const chatId = msg.chat.id
    
    try {
      const result = await this.adminMiddleware.disconnectSpecificUser(input)
      
      if (result.success) {
        await this.bot.sendMessage(chatId, TelegramMessages.operationSuccess(result.message), {
          reply_markup: TelegramKeyboards.backButton("admin_users")
        })
      } else {
        await this.bot.sendMessage(chatId, TelegramMessages.error(result.message))
      }
    } catch (error) {
      logger.error("Error processing disconnect user:", error)
      await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to disconnect user"))
    }
  }

  // Helper methods
  async getStats() {
    try {
      const [users, sessions, messages, system] = await Promise.all([
        pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 day' THEN 1 END) as active_today, COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_week FROM users"),
        pool.query("SELECT COUNT(*) as connected, COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 hour' THEN 1 END) as active FROM sessions WHERE is_connected = true"),
        pool.query("SELECT COUNT(*) as today, COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as week FROM messages WHERE created_at > CURRENT_DATE"),
        this.getSystemInfo()
      ])

      const totalUsers = parseInt(users.rows[0].total) || 0
      const messagesToday = parseInt(messages.rows[0].today) || 0
      
      return {
        totalUsers,
        activeToday: parseInt(users.rows[0].active_today) || 0,
        newThisWeek: parseInt(users.rows[0].new_week) || 0,
        connectedSessions: parseInt(sessions.rows[0].connected) || 0,
        activeSessions: parseInt(sessions.rows[0].active) || 0,
        connectionRate: totalUsers > 0 ? Math.round((parseInt(sessions.rows[0].connected) / totalUsers) * 100) : 0,
        messagesToday,
        messagesWeek: parseInt(messages.rows[0].week) || 0,
        avgMessages: totalUsers > 0 ? Math.round(messagesToday / totalUsers) : 0,
        uptime: system.uptime,
        memoryUsage: system.memoryUsage
      }
    } catch (error) {
      logger.error("Error getting stats:", error)
      return {
        totalUsers: 0, activeToday: 0, newThisWeek: 0,
        connectedSessions: 0, activeSessions: 0, connectionRate: 0,
        messagesToday: 0, messagesWeek: 0, avgMessages: 0,
        uptime: "Unknown", memoryUsage: 0
      }
    }
  }

  getSystemInfo() {
    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    
    return {
      uptime: `${hours}h ${minutes}m`,
      memoryUsage: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
  }

  async handleUnauthorized(chatId, reason) {
    const messages = {
      locked_out: TelegramMessages.adminLockout(),
      not_admin: TelegramMessages.unauthorized(),
      session_expired: TelegramMessages.adminLogin()
    }
    
    await this.bot.sendMessage(chatId, messages[reason] || messages.not_admin)
  }

  async handleLogout(chatId, userId) {
    this.adminMiddleware.destroyAdminSession(userId)
    this.pendingInputs.delete(userId)
    await this.bot.sendMessage(chatId, TelegramMessages.operationSuccess("Logged out successfully"), {
      reply_markup: TelegramKeyboards.backButton("main_menu")
    })
  }

  // State management
  isPendingPassword(userId) {
    const pending = this.pendingInputs.get(userId)
    return pending && pending.type === 'password'
  }

  isPendingInput(userId) {
    return this.pendingInputs.has(userId)
  }

  clearPending(userId) {
    this.pendingInputs.delete(userId)
  }
}