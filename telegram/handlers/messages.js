import { TelegramMessages } from "../utils/messages.js"
import { TelegramKeyboards } from "../utils/keyboards.js"
import { logger } from "../../utils/logger.js"

export class MessageHandler {
  constructor(bot, connectionHandler, adminHandler, buttonHandler) {
    this.bot = bot
    this.connectionHandler = connectionHandler
    this.adminHandler = adminHandler
    this.buttonHandler = buttonHandler
  }

  async handleMessage(msg) {
    const telegramId = msg.from.id
    const text = msg.text

    try {
      // Handle commands
      if (text.startsWith("/")) {
        return this.handleCommand(msg)
      }

      // Check if admin is expecting password input
      if (this.adminHandler.isPendingPasswordInput(telegramId)) {
        return this.adminHandler.handlePasswordInput(msg)
      }

      // Check user state for multi-step processes
      const userState = this.buttonHandler.getUserState(telegramId)

      switch (userState) {
        case "awaiting_phone":
          await this.handlePhoneNumberInput(msg)
          break

        default:
          // Default response for unrecognized messages
          await this.handleUnrecognizedMessage(msg)
          break
      }
    } catch (error) {
      logger.error("Error handling message:", error)
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.error("Failed to process your message"))
    }
  }

  async handleCommand(msg) {
    const command = msg.text.split(" ")[0].toLowerCase()
    const telegramId = msg.from.id

    // Clear any pending states when a command is issued
    this.buttonHandler.clearUserState(telegramId)
    this.adminHandler.clearPendingPasswordInput(telegramId)

    switch (command) {
      case "/start":
        await this.handleStartCommand(msg)
        break

      case "/connect":
        await this.connectionHandler.handleConnect(msg)
        break

      case "/disconnect":
        await this.connectionHandler.handleDisconnect(msg)
        break

      case "/status":
        await this.connectionHandler.handleStatus(msg)
        break

      case "/admin":
        await this.adminHandler.handleAdminPanel(msg)
        break

      case "/help":
        await this.handleHelpCommand(msg)
        break

      default:
        await this.bot.sendMessage(
          msg.chat.id,
          `❓ Unknown command: ${command}\n\nUse /help to see available commands.`,
          { reply_markup: TelegramKeyboards.mainMenu() },
        )
        break
    }
  }

  async handleStartCommand(msg) {
    const firstName = msg.from.first_name || "User"

    console.log("[v0] Handling /start command for user:", firstName, "ID:", msg.from.id)

    try {
      const result = await this.bot.sendMessage(msg.chat.id, TelegramMessages.welcome(firstName), {
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.mainMenu(),
      })

      console.log("[v0] Start message sent successfully:", result.message_id)
    } catch (error) {
      console.log("[v0] Error sending start message:", error)
      throw error
    }
  }

  async handleHelpCommand(msg) {
    await this.bot.sendMessage(msg.chat.id, TelegramMessages.help(), {
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.mainMenu(),
    })
  }

  async handlePhoneNumberInput(msg) {
    const telegramId = msg.from.id

    // Clear the state
    this.buttonHandler.clearUserState(telegramId)

    // Process the phone number
    await this.connectionHandler.handlePhoneNumberEntry(msg)
  }

  async handleUnrecognizedMessage(msg) {
    await this.bot.sendMessage(
      msg.chat.id,
      `🤔 I didn't understand that message.\n\nUse the buttons below or type /help for available commands.`,
      { reply_markup: TelegramKeyboards.mainMenu() },
    )
  }

  // Handle different types of messages
  async handlePhoto(msg) {
    await this.bot.sendMessage(msg.chat.id, "📷 Photo received, but I can only process text messages for now.", {
      reply_markup: TelegramKeyboards.mainMenu(),
    })
  }

  async handleDocument(msg) {
    await this.bot.sendMessage(msg.chat.id, "📄 Document received, but I can only process text messages for now.", {
      reply_markup: TelegramKeyboards.mainMenu(),
    })
  }

  async handleVoice(msg) {
    await this.bot.sendMessage(
      msg.chat.id,
      "🎤 Voice message received, but I can only process text messages for now.",
      { reply_markup: TelegramKeyboards.mainMenu() },
    )
  }

  async handleSticker(msg) {
    await this.bot.sendMessage(msg.chat.id, "😄 Nice sticker! But I can only process text messages for now.", {
      reply_markup: TelegramKeyboards.mainMenu(),
    })
  }
}
