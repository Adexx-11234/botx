import { TelegramMessages } from "../utils/messages.js"
import { TelegramKeyboards } from "../utils/keyboards.js"
import { logger } from "../../utils/logger.js"

export class ButtonHandler {
  constructor(bot, connectionHandler, adminHandler) {
    this.bot = bot
    this.connectionHandler = connectionHandler
    this.adminHandler = adminHandler
    this.userStates = new Map()
  }

  async handleCallbackQuery(callbackQuery) {
    const { data, from, message } = callbackQuery
    const telegramId = from.id
    const chatId = message.chat.id
    const messageId = message.message_id

    try {
      // Answer callback query to remove loading state
      await this.bot.answerCallbackQuery(callbackQuery.id)

      // Route to appropriate handler
      switch (data) {
        case "main_menu":
          await this.showMainMenu(chatId, messageId)
          break

        case "connect_whatsapp":
          await this.handleConnectButton(chatId, messageId, telegramId)
          break

        case "enter_phone":
          await this.handleEnterPhoneButton(chatId, messageId, telegramId)
          break

        case "disconnect_whatsapp":
          await this.handleDisconnectButton(chatId, messageId, telegramId)
          break

        case "check_status":
          await this.handleStatusButton(chatId, messageId, telegramId)
          break

        case "show_help":
          await this.handleHelpButton(chatId, messageId)
          break

        case "admin_panel":
          await this.handleAdminPanelButton(chatId, messageId, telegramId)
          break

        case "admin_users":
          await this.handleAdminUsersButton(chatId, messageId, telegramId)
          break

        case "admin_stats":
          await this.handleAdminStatsButton(chatId, messageId, telegramId)
          break

        case "admin_list_users":
          await this.handleListUsersButton(chatId, messageId, telegramId)
          break

        default:
          if (data.startsWith("admin_users_page_")) {
            const page = Number.parseInt(data.split("_").pop())
            await this.handleUsersPageButton(chatId, messageId, telegramId, page)
          } else if (data.startsWith("confirm_")) {
            await this.handleConfirmButton(chatId, messageId, telegramId, data)
          } else if (data.startsWith("cancel_")) {
            await this.handleCancelButton(chatId, messageId, telegramId, data)
          } else {
            logger.warn(`Unknown callback data: ${data}`)
          }
          break
      }
    } catch (error) {
      logger.error("Error handling callback query:", error)
      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: "An error occurred. Please try again.",
        show_alert: true,
      })
    }
  }

  async showMainMenu(chatId, messageId) {
    await this.bot.editMessageText("🤖 *WhatsApp-Telegram Bot Platform*\n\nSelect an option:", {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.mainMenu(),
    })
  }

  async handleConnectButton(chatId, messageId, telegramId) {
    // Check if already connected
    const isConnected = await this.connectionHandler.authMiddleware.isUserConnected(telegramId)
    if (isConnected) {
      const session = await this.connectionHandler.authMiddleware.getUserSession(telegramId)
      return this.bot.editMessageText(TelegramMessages.alreadyConnected(session.phone_number), {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.mainMenu(),
      })
    }

    await this.bot.editMessageText(TelegramMessages.connectionInstructions(), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.connectionMenu(),
    })
  }

  async handleEnterPhoneButton(chatId, messageId, telegramId) {
    // Set user state to expect phone number
    this.userStates.set(telegramId, "awaiting_phone")

    await this.bot.editMessageText(TelegramMessages.enterPhoneNumber(), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.backButton("connect_whatsapp"),
    })
  }

  async handleDisconnectButton(chatId, messageId, telegramId) {
    const session = await this.connectionHandler.authMiddleware.getUserSession(telegramId)
    if (!session) {
      return this.bot.editMessageText(TelegramMessages.notConnected(), {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: TelegramKeyboards.mainMenu(),
      })
    }

    await this.bot.editMessageText(
      `⚠️ *Confirm Disconnection*\n\nAre you sure you want to disconnect your WhatsApp account (${session.phone_number})?\n\nThis action cannot be undone.`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.confirmationKeyboard("disconnect", session.session_id),
      },
    )
  }

  async handleStatusButton(chatId, messageId, telegramId) {
    const session = await this.connectionHandler.authMiddleware.getUserSession(telegramId)
    const isConnected = session !== null

    let lastSeen = null
    if (isConnected && session.last_activity) {
      lastSeen = new Date(session.last_activity).toLocaleString()
    }

    await this.bot.editMessageText(TelegramMessages.status(isConnected, session?.phone_number, lastSeen), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.backButton("main_menu"),
    })
  }

  async handleHelpButton(chatId, messageId) {
    await this.bot.editMessageText(TelegramMessages.help(), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: TelegramKeyboards.backButton("main_menu"),
    })
  }

  async handleAdminPanelButton(chatId, messageId, telegramId) {
    // Create a mock message object for the admin handler
    const mockMsg = {
      from: { id: telegramId },
      chat: { id: chatId },
    }

    await this.adminHandler.handleAdminPanel(mockMsg)
  }

  async handleAdminUsersButton(chatId, messageId, telegramId) {
    const mockMsg = {
      from: { id: telegramId },
      chat: { id: chatId },
    }

    await this.adminHandler.handleUserManagement(mockMsg)
  }

  async handleAdminStatsButton(chatId, messageId, telegramId) {
    const mockMsg = {
      from: { id: telegramId },
      chat: { id: chatId },
    }

    await this.adminHandler.handleAdminStats(mockMsg)
  }

  async handleListUsersButton(chatId, messageId, telegramId) {
    const mockMsg = {
      from: { id: telegramId },
      chat: { id: chatId },
    }

    await this.adminHandler.handleListUsers(mockMsg, 1)
  }

  async handleUsersPageButton(chatId, messageId, telegramId, page) {
    const mockMsg = {
      from: { id: telegramId },
      chat: { id: chatId },
    }

    await this.adminHandler.handleListUsers(mockMsg, page)
  }

  async handleConfirmButton(chatId, messageId, telegramId, data) {
    const parts = data.split("_")
    const action = parts[1]
    const sessionId = parts[2]

    if (action === "disconnect") {
      // Create mock message for disconnect handler
      const mockMsg = {
        from: { id: telegramId },
        chat: { id: chatId },
      }

      await this.connectionHandler.handleDisconnect(mockMsg)
    }
  }

  async handleCancelButton(chatId, messageId, telegramId, data) {
    await this.showMainMenu(chatId, messageId)
  }

  getUserState(telegramId) {
    return this.userStates.get(telegramId)
  }

  setUserState(telegramId, state) {
    this.userStates.set(telegramId, state)
  }

  clearUserState(telegramId) {
    this.userStates.delete(telegramId)
  }
}
