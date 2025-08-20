import TelegramBot from "node-telegram-bot-api"
import { telegramConfig, botCommands } from "../config/telegram.js"
import { AuthMiddleware } from "./middleware/auth.js"
import { ConnectionHandler } from "./handlers/connection.js"
import { AdminHandler } from "./handlers/admin.js"
import { ButtonHandler } from "./handlers/buttons.js"
import { MessageHandler } from "./handlers/messages.js"
import { logger } from "../utils/logger.js"

export class WhatsAppTelegramBot {
  constructor() {
    this.bot = null
    this.isInitialized = false
    this.authMiddleware = new AuthMiddleware()
    this.connectionHandler = null
    this.adminHandler = null
    this.buttonHandler = null
    this.messageHandler = null

    logger.info("Telegram bot instance created")
  }

  async initialize() {
    try {
      if (!telegramConfig.token) {
        logger.error("TELEGRAM_BOT_TOKEN environment variable is required")
        return false
      }

      // Initialize bot
      this.bot = new TelegramBot(telegramConfig.token, { polling: telegramConfig.polling })

      // Initialize handlers
      this.connectionHandler = new ConnectionHandler(this.bot, this.authMiddleware)
      this.adminHandler = new AdminHandler(this.bot, this.authMiddleware)
      this.buttonHandler = new ButtonHandler(this.bot, this.connectionHandler, this.adminHandler)
      this.messageHandler = new MessageHandler(this.bot, this.connectionHandler, this.adminHandler, this.buttonHandler)

      // Set bot commands
      await this.bot.setMyCommands(botCommands)

      // Setup event handlers
      this.setupEventHandlers()

      // Setup error handling
      this.setupErrorHandling()

      this.startPeriodicTasks()

      this.isInitialized = true
      logger.info("Telegram bot initialized successfully")

      return true
    } catch (error) {
      logger.error("Failed to initialize Telegram bot:", error)
      return false
    }
  }

  setupEventHandlers() {
    // Handle all messages
    this.bot.on("message", async (msg) => {
      try {
        console.log("[v0] Received message:", {
          text: msg.text,
          from: msg.from.id,
          chat: msg.chat.id,
          type: msg.chat.type,
        })

        // Apply authentication middleware
        const metadata = {}
        const shouldProcess = await this.authMiddleware.middleware()(msg, metadata)

        if (!shouldProcess) {
          console.log("[v0] Message blocked by auth middleware:", { telegramId: msg.from.id })
          logger.warn("Message blocked by auth middleware", { telegramId: msg.from.id })
          return
        }

        console.log("[v0] Message passed auth, routing to handler")

        // Route to message handler
        await this.messageHandler.handleMessage(msg)

        console.log("[v0] Message handled successfully")
      } catch (error) {
        console.log("[v0] Error handling message:", error)
        logger.error("Error handling message:", error)
        await this.bot.sendMessage(msg.chat.id, "An error occurred while processing your message. Please try again.")
      }
    })

    // Handle callback queries (button presses)
    this.bot.on("callback_query", async (callbackQuery) => {
      try {
        await this.buttonHandler.handleCallbackQuery(callbackQuery)
      } catch (error) {
        logger.error("Error handling callback query:", error)
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: "An error occurred. Please try again.",
          show_alert: true,
        })
      }
    })

    // Handle different message types
    this.bot.on("photo", async (msg) => {
      await this.messageHandler.handlePhoto(msg)
    })

    this.bot.on("document", async (msg) => {
      await this.messageHandler.handleDocument(msg)
    })

    this.bot.on("voice", async (msg) => {
      await this.messageHandler.handleVoice(msg)
    })

    this.bot.on("sticker", async (msg) => {
      await this.messageHandler.handleSticker(msg)
    })

    // Handle new chat members (bot added to group)
    this.bot.on("new_chat_members", async (msg) => {
      const botInfo = await this.bot.getMe()
      const newMembers = msg.new_chat_members

      if (newMembers.some((member) => member.id === botInfo.id)) {
        await this.bot.sendMessage(
          msg.chat.id,
          "👋 Hello! I'm a WhatsApp-Telegram bridge bot. Please use me in private messages for security reasons.\n\nSend me a private message to get started!",
        )
      }
    })

    logger.info("Event handlers setup complete")
  }

  setupErrorHandling() {
    // Handle polling errors
    this.bot.on("polling_error", (error) => {
      logger.error("Telegram polling error:", error)
    })

    // Handle webhook errors
    this.bot.on("webhook_error", (error) => {
      logger.error("Telegram webhook error:", error)
    })

    // Handle general errors
    this.bot.on("error", (error) => {
      logger.error("Telegram bot error:", error)
    })

    // Handle process errors
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", { promise, reason })
    })

    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error)
      // Do not exit; keep the server running
    })

    logger.info("Error handling setup complete")
  }

  startPeriodicTasks() {
    // Clean up expired sessions every 10 minutes
    setInterval(
      () => {
        try {
          this.connectionHandler?.sessionManager?.cleanup()
        } catch (error) {
          logger.error("Error during periodic cleanup:", error)
        }
      },
      10 * 60 * 1000,
    )

    // Health check every 5 minutes
    setInterval(
      async () => {
        try {
          await this.bot.getMe()
          logger.debug("Bot health check passed")
        } catch (error) {
          logger.error("Bot health check failed:", error)
        }
      },
      5 * 60 * 1000,
    )
  }

  async sendMessage(chatId, message, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error("Bot not initialized")
      }

      return await this.bot.sendMessage(chatId, message, options)
    } catch (error) {
      logger.error("Error sending message:", error)
      throw error
    }
  }

  async editMessage(chatId, messageId, text, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error("Bot not initialized")
      }

      return await this.bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        ...options,
      })
    } catch (error) {
      logger.error("Error editing message:", error)
      throw error
    }
  }

  async deleteMessage(chatId, messageId) {
    try {
      if (!this.isInitialized) {
        throw new Error("Bot not initialized")
      }

      return await this.bot.deleteMessage(chatId, messageId)
    } catch (error) {
      logger.error("Error deleting message:", error)
      throw error
    }
  }

  async getBotInfo() {
    try {
      if (!this.isInitialized) {
        throw new Error("Bot not initialized")
      }

      return await this.bot.getMe()
    } catch (error) {
      logger.error("Error getting bot info:", error)
      throw error
    }
  }

  async stop() {
    try {
      if (this.bot) {
        await this.bot.stopPolling()
        logger.info("Telegram bot stopped")
      }
    } catch (error) {
      logger.error("Error stopping bot:", error)
    }
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      botToken: telegramConfig.token ? "Set" : "Not Set",
      handlersInitialized: !!(this.connectionHandler && this.adminHandler && this.buttonHandler && this.messageHandler),
    }
  }
}

// Note: Do not create a default instance here to avoid duplicate initialization
