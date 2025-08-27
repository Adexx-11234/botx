// telegram/bot.js - Clean Telegram Bot Implementation
import TelegramBot from "node-telegram-bot-api"
import { createComponentLogger } from "../utils/logger.js"
import { ConnectionHandler } from "./handlers/connection.js"
import { AdminHandler } from "./handlers/admin.js"
import { TelegramMessages } from "./utils/messages.js"
import { TelegramKeyboards } from "./utils/keyboards.js"

const logger = createComponentLogger("TELEGRAM_BOT")

export class WhatsAppTelegramBot {
  constructor() {
    this.bot = null
    this.isRunning = false
    this.userStates = new Map()
    
    // Initialize handlers
    this.connectionHandler = null
    this.adminHandler = null
  }

  async initialize() {
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN
      if (!token) {
        logger.error("TELEGRAM_BOT_TOKEN not found in environment variables")
        return false
      }

      logger.info("Initializing Telegram bot...")

      // Create bot instance
      this.bot = new TelegramBot(token, { polling: false })
      
      // Initialize handlers
      this.connectionHandler = new ConnectionHandler(this.bot)
      this.adminHandler = new AdminHandler(this.bot)
      
      // Clear webhook and start polling
      await this.clearWebhookAndStartPolling()
      
      // Set bot commands
      await this.setBotCommands()
      
      // Setup event listeners
      this.setupEventListeners()
      
      this.isRunning = true
      logger.info("Telegram bot initialized successfully")
      return true
      
    } catch (error) {
      logger.error("Failed to initialize Telegram bot:", error.message)
      return false
    }
  }

  async clearWebhookAndStartPolling() {
    try {
      await this.bot.setWebHook('')
      logger.info("Webhook cleared successfully")
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      await this.bot.startPolling({ restart: true })
      logger.info("Polling started successfully")
      
    } catch (error) {
      logger.warn("Standard webhook clearing failed, trying alternative method:", error.message)
      
      try {
        const token = process.env.TELEGRAM_BOT_TOKEN
        this.bot = new TelegramBot(token, { polling: true })
        logger.info("Bot recreated with direct polling")
        
      } catch (pollingError) {
        logger.error("All polling methods failed:", pollingError.message)
        throw pollingError
      }
    }
  }

  async setBotCommands() {
    try {
      const commands = [
        { command: "start", description: "Start the bot and show main menu" },
        { command: "connect", description: "Connect your WhatsApp account" },
        { command: "status", description: "Check connection status" },
        { command: "disconnect", description: "Disconnect WhatsApp" },
        { command: "admin", description: "Admin panel (admins only)" },
        { command: "help", description: "Show help information" }
      ]
      
      await this.bot.setMyCommands(commands)
      logger.info("Bot commands set successfully")
      
    } catch (error) {
      logger.warn("Failed to set bot commands:", error.message)
    }
  }

  setupEventListeners() {
    // Text messages
    this.bot.on('message', async (msg) => {
      try {
        if (!msg.text) return
        
        const chatId = msg.chat.id
        const userId = msg.from.id
        const text = msg.text.trim()
        
        logger.info(`Message from ${userId}: ${text}`)
        
        // Handle admin password input first
        if (this.adminHandler.isPendingInput(userId)) {
          const handled = await this.adminHandler.processInput(msg)
          if (handled) return
        }
        
        // Handle connection phone input
        if (this.connectionHandler.isPendingConnection(userId)) {
          const handled = await this.connectionHandler.handlePhoneNumber(msg)
          if (handled) return
        }
        
        // Handle commands
        if (text.startsWith('/')) {
          await this.handleCommand(msg)
          return
        }
        
        // Default: show main menu
        await this.showMainMenu(chatId, null, msg.from)
        
      } catch (error) {
        logger.error("Error handling message:", error)
        await this.sendErrorMessage(msg.chat.id)
      }
    })

    // Callback queries (button presses)
    this.bot.on('callback_query', async (query) => {
      try {
        await this.bot.answerCallbackQuery(query.id)
        
        const data = query.data
        const chatId = query.message.chat.id
        const userId = query.from.id
        
        // Route to appropriate handler
        if (data.startsWith('admin_')) {
          await this.adminHandler.handleAction(query)
        } else if (['connect', 'connect_phone', 'disconnect', 'disconnect_confirm', 'status'].includes(data)) {
          await this.handleConnectionCallback(query)
        } else {
          await this.handleGeneralCallback(query)
        }
        
      } catch (error) {
        logger.error("Error handling callback query:", error)
        try {
          await this.bot.answerCallbackQuery(query.id, {
            text: "An error occurred",
            show_alert: true
          })
        } catch (answerError) {
          logger.error("Failed to answer callback query:", answerError)
        }
      }
    })

    // Polling errors
    this.bot.on('polling_error', (error) => {
      logger.error("Polling error:", error.message)
      this.handlePollingError(error)
    })

    this.bot.on('error', (error) => {
      logger.error("Bot error:", error)
    })
  }

  // Command Handlers
  async handleCommand(msg) {
    const command = msg.text.split(' ')[0].toLowerCase()
    const chatId = msg.chat.id
    const userId = msg.from.id
    
    // Clear any pending states
    this.clearUserState(userId)
    
    switch (command) {
      case '/start':
        await this.handleStartCommand(msg)
        break
      case '/connect':
        await this.connectionHandler.handleConnect(chatId, userId, msg.from)
        break
      case '/status':
        await this.connectionHandler.handleStatus(chatId, userId)
        break
      case '/disconnect':
        await this.connectionHandler.handleDisconnect(chatId, userId)
        break
      case '/admin':
        await this.adminHandler.handlePanel(chatId, userId)
        break
      case '/help':
        await this.handleHelpCommand(msg)
        break
      default:
        await this.handleUnknownCommand(msg)
    }
  }

  async handleStartCommand(msg) {
    const firstName = msg.from.first_name || "there"
    const welcomeText = TelegramMessages.welcome(firstName)

    await this.bot.sendMessage(msg.chat.id, welcomeText, {
      parse_mode: 'Markdown',
      reply_markup: TelegramKeyboards.mainMenu()
    })
  }

  async handleHelpCommand(msg) {
    const helpText = TelegramMessages.help()

    await this.bot.sendMessage(msg.chat.id, helpText, {
      parse_mode: 'Markdown',
      reply_markup: TelegramKeyboards.backButton()
    })
  }

  async handleUnknownCommand(msg) {
    await this.bot.sendMessage(msg.chat.id, 
      "Unknown command. Use /help to see available commands.", {
      reply_markup: TelegramKeyboards.mainMenu()
    })
  }

  // Callback Handlers
  async handleConnectionCallback(query) {
    const data = query.data
    const chatId = query.message.chat.id
    const userId = query.from.id
    
    switch (data) {
      case 'connect':
        await this.deleteMessage(chatId, query.message.message_id)
        await this.connectionHandler.handleConnect(chatId, userId, query.from)
        break
      case 'connect_phone':
        await this.deleteMessage(chatId, query.message.message_id)
        await this.requestPhoneNumber(chatId, userId)
        break
      case 'status':
        await this.deleteMessage(chatId, query.message.message_id)
        await this.connectionHandler.handleStatus(chatId, userId)
        break
      case 'disconnect':
        await this.deleteMessage(chatId, query.message.message_id)
        await this.connectionHandler.handleDisconnect(chatId, userId)
        break
      case 'disconnect_confirm':
        await this.deleteMessage(chatId, query.message.message_id)
        await this.connectionHandler.confirmDisconnect(chatId, userId)
        break
    }
  }

  async handleGeneralCallback(query) {
    const data = query.data
    const chatId = query.message.chat.id
    
    switch (data) {
      case 'main_menu':
        await this.showMainMenu(chatId, query.message.message_id, query.from)
        break
      case 'help':
        await this.handleHelpCommand({ chat: query.message.chat })
        break
      case 'cancel':
        this.clearUserState(query.from.id)
        await this.showMainMenu(chatId, query.message.message_id, query.from)
        break
    }
  }

  async requestPhoneNumber(chatId, userId) {
    const phoneText = TelegramMessages.askPhoneNumber()

    await this.bot.sendMessage(chatId, phoneText, {
      parse_mode: 'Markdown',
      reply_markup: TelegramKeyboards.backButton("main_menu")
    })

    this.setUserState(userId, 'waiting_phone')
  }

  // UI Helpers
  async showMainMenu(chatId, messageId = null, userInfo = null) {
    // Use welcome message if we have user info, otherwise use simple menu text
    const menuText = userInfo ? 
      TelegramMessages.welcome(userInfo.first_name || "there") : 
      "Choose an option:"

    const options = {
      parse_mode: userInfo ? 'Markdown' : undefined,
      reply_markup: TelegramKeyboards.mainMenu()
    }

    if (messageId) {
      try {
        await this.bot.editMessageText(menuText, {
          chat_id: chatId,
          message_id: messageId,
          ...options
        })
      } catch (error) {
        await this.bot.sendMessage(chatId, menuText, options)
      }
    } else {
      await this.bot.sendMessage(chatId, menuText, options)
    }
  }

  // Utility Methods
  async sendErrorMessage(chatId) {
    await this.bot.sendMessage(chatId, 
      TelegramMessages.error(), {
      reply_markup: TelegramKeyboards.mainMenu()
    })
  }

  async deleteMessage(chatId, messageId) {
    try {
      await this.bot.deleteMessage(chatId, messageId)
    } catch (error) {
      logger.debug("Could not delete message:", error.message)
    }
  }

  handlePollingError(error) {
    logger.error("Polling error occurred:", error.message)
    
    setTimeout(async () => {
      try {
        if (this.bot && this.isRunning) {
          logger.info("Attempting to restart polling...")
          await this.bot.stopPolling()
          await new Promise(resolve => setTimeout(resolve, 2000))
          await this.bot.startPolling({ restart: true })
          logger.info("Polling restarted successfully")
        }
      } catch (restartError) {
        logger.error("Failed to restart polling:", restartError.message)
      }
    }, 5000)
  }

  // State Management
  getUserState(userId) {
    return this.userStates.get(userId)
  }

  setUserState(userId, state) {
    this.userStates.set(userId, state)
  }

  clearUserState(userId) {
    this.userStates.delete(userId)
    
    // Clear handler states too
    if (this.connectionHandler) {
      this.connectionHandler.clearPending(userId)
    }
    if (this.adminHandler) {
      this.adminHandler.clearPending(userId)
    }
  }

  // Public API Methods
  async sendMessage(chatId, text, options = {}) {
    try {
      return await this.bot.sendMessage(chatId, text, options)
    } catch (error) {
      logger.error("Failed to send message:", error)
      throw error
    }
  }

  async sendConnectionSuccess(userId, phoneNumber) {
    const successText = TelegramMessages.connected(phoneNumber)

    try {
      await this.bot.sendMessage(userId, successText, {
        parse_mode: 'Markdown',
        reply_markup: TelegramKeyboards.mainMenu()
      })
    } catch (error) {
      logger.error("Error sending connection success message:", error)
    }
  }

  // Stats and Info
  getStats() {
    return {
      isRunning: this.isRunning,
      activeStates: this.userStates.size,
      connectionHandler: !!this.connectionHandler,
      adminHandler: !!this.adminHandler
    }
  }

  // Lifecycle
  async stop() {
    try {
      this.isRunning = false
      if (this.bot) {
        await this.bot.stopPolling()
        logger.info("Telegram bot stopped successfully")
      }
    } catch (error) {
      logger.error("Error stopping bot:", error)
    }
  }

  get isInitialized() {
    return this.bot !== null && this.isRunning
  }
}