// telegram/handlers/connection.js - WhatsApp Connection Handler
import { TelegramMessages } from "../utils/messages.js"
import { TelegramKeyboards } from "../utils/keyboards.js"
import { validatePhone } from "../utils/validation.js"
import { getSessionManager } from "../../whatsapp/sessions/session-manager.js"
import { SessionStorage } from "../../whatsapp/sessions/session-storage.js"
import { createComponentLogger } from "../../utils/logger.js"

const logger = createComponentLogger("CONNECTION_HANDLER")

export class ConnectionHandler {
  constructor(bot) {
    this.bot = bot
    this.pendingConnections = new Map()
    this.sessionManager = getSessionManager()
    this.storage = new SessionStorage()
  }

  /**
 * Handle initial connection request
 */
async handleConnect(chatId, userId, userInfo) {
  try {
    const sessionId = `session_${userId}`
    
    // Check if user is actually connected (both storage and active socket)
    const isReallyConnected = await this.sessionManager.isReallyConnected(sessionId)
    
    if (isReallyConnected) {
      const session = await this.storage.getSession(sessionId)
      return this.bot.sendMessage(
        chatId,
        TelegramMessages.alreadyConnected(session.phoneNumber),
        { 
          parse_mode: "Markdown",
          reply_markup: TelegramKeyboards.mainMenu() 
        }
      )
    }

    // Clean up any stale session data before starting new connection
    const existingSession = await this.storage.getSession(sessionId)
    if (existingSession && !isReallyConnected) {
      logger.info(`Cleaning up stale session data for ${sessionId}`)
      await this.sessionManager.performCompleteUserCleanup(sessionId)
    }

    // Start connection flow
    this.pendingConnections.set(userId, { 
      step: 'phone',
      timestamp: Date.now(),
      userInfo
    })
    
    await this.bot.sendMessage(
      chatId,
      TelegramMessages.askPhoneNumber(),
      { 
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.connecting()
      }
    )

    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      if (this.pendingConnections.has(userId)) {
        this.pendingConnections.delete(userId)
      }
    }, 300000) // 5 minutes

  } catch (error) {
    logger.error("Connection initiation error:", error)
    await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to start connection"))
  }
}

  /**
   * Handle phone number input during connection flow
   */
  async handlePhoneNumber(msg) {
    const userId = msg.from.id
    const chatId = msg.chat.id
    const phone = msg.text.trim()

    // Check if user is in connection flow
    const pending = this.pendingConnections.get(userId)
    if (!pending || pending.step !== 'phone') {
      return false
    }

    try {
      // Validate phone number format
      const validation = validatePhone(phone)
      if (!validation.isValid) {
        await this.bot.sendMessage(
          chatId, 
          TelegramMessages.invalidPhone(),
          {
            parse_mode: "Markdown",
            reply_markup: TelegramKeyboards.connecting()
          }
        )
        return true
      }

      // Check if phone number is already registered
      const existingSession = await this.storage.getSessionByPhone?.(validation.formatted)
      if (existingSession) {
        await this.bot.sendMessage(
          chatId, 
          TelegramMessages.phoneInUse()
        )
        this.pendingConnections.delete(userId)
        return true
      }

      // Update pending state to waiting for code generation
      this.pendingConnections.set(userId, { 
        step: 'generating',
        phone: validation.formatted,
        userInfo: pending.userInfo,
        timestamp: Date.now()
      })

      // Show loading message
      const loadingMsg = await this.bot.sendMessage(
        chatId,
        TelegramMessages.connecting(),
        { parse_mode: "Markdown" }
      )

      // Generate pairing code
      const result = await this.generatePairingCode(userId, validation.formatted, pending.userInfo)
      
      // Delete loading message
      await this.bot.deleteMessage(chatId, loadingMsg.message_id)

      if (result.success) {
        await this.bot.sendMessage(
          chatId,
          TelegramMessages.showPairingCode(result.code),
          { 
            parse_mode: "Markdown",
            reply_markup: TelegramKeyboards.codeOptions(result.code)
          }
        )

        // Update state to waiting for connection
        this.pendingConnections.set(userId, { 
          step: 'waiting_connection',
          phone: validation.formatted,
          code: result.code,
          userInfo: pending.userInfo,
          timestamp: Date.now()
        })

        // Cleanup after code expires (2 minutes)
        setTimeout(() => {
          if (this.pendingConnections.get(userId)?.code === result.code) {
            this.pendingConnections.delete(userId)
          }
        }, 120000) // 2 minutes

      } else {
        await this.bot.sendMessage(
          chatId, 
          TelegramMessages.error(result.error || "Could not generate pairing code. Please try again.")
        )
        this.pendingConnections.delete(userId)
      }

      return true

    } catch (error) {
      logger.error("Phone number handling error:", error)
      await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to process phone number"))
      this.pendingConnections.delete(userId)
      return true
    }
  }

  /**
   * Generate WhatsApp pairing code
   */
  async generatePairingCode(userId, phoneNumber, userInfo) {
    try {
      const sessionId = `session_${userId}`

      logger.info(`Generating pairing code for ${phoneNumber} (user: ${userId})`)

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Code generation timeout"))
        }, 45000) // 45 seconds timeout

        // Create session with callbacks
        this.sessionManager.createSession(userId, phoneNumber, {
          onPairingCode: (code) => {
            clearTimeout(timeout)
            logger.info(`Pairing code generated for ${userId}: ${code}`)
            resolve({ success: true, code })
          },
          
          onConnected: async (socket) => {
            logger.info(`WhatsApp connection successful for user ${userId}: ${phoneNumber}`)
            await this.handleConnectionSuccess(sessionId, phoneNumber, userId)
          },
          
          onError: (error) => {
            clearTimeout(timeout)
            logger.error("Session creation error:", error)
            resolve({ success: false, error: error.message })
          }
        }).catch(error => {
          clearTimeout(timeout)
          logger.error("Session creation failed:", error)
          resolve({ success: false, error: error.message })
        })
      })

    } catch (error) {
      logger.error("Pairing code generation error:", error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Handle successful WhatsApp connection
   */
  async handleConnectionSuccess(sessionId, phoneNumber, userId) {
    try {
      logger.info(`WhatsApp connection successful for user ${userId}: ${phoneNumber}`)

      // Clear pending connection
      this.pendingConnections.delete(userId)

      // Send success notification using the existing connected message
      await this.bot.sendMessage(
        userId, 
        TelegramMessages.connected(phoneNumber),
        {
          parse_mode: 'Markdown',
          reply_markup: TelegramKeyboards.backButton("main_menu")
        }
      )

    } catch (error) {
      logger.error("Connection success handler error:", error)
    }
  }

  /**
   * Handle disconnect request
   */
  async handleDisconnect(chatId, userId) {
    try {
      const session = await this.storage.getSession(`session_${userId}`)
      
      if (!session || !session.isConnected) {
        return this.bot.sendMessage(
          chatId,
          TelegramMessages.notConnected(),
          { 
            parse_mode: "Markdown",
            reply_markup: TelegramKeyboards.mainMenu() 
          }
        )
      }

      // Show confirmation dialog
      await this.bot.sendMessage(
        chatId,
        TelegramMessages.confirmDisconnect(session.phoneNumber),
        { 
          parse_mode: "Markdown",
          reply_markup: TelegramKeyboards.confirmDisconnect()
        }
      )

    } catch (error) {
      logger.error("Disconnect request error:", error)
      await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to process disconnect request"))
    }
  }

  /**
   * Confirm and execute disconnection
   */
  async confirmDisconnect(chatId, userId) {
  let processingMsg;
  try {
    const session = await this.storage.getSession(`session_${userId}`)
    
    // Show processing message
    processingMsg = await this.bot.sendMessage(
      chatId, 
      TelegramMessages.disconnecting(session?.phoneNumber || "WhatsApp")
    )

    const sessionId = `session_${userId}`

    // Disconnect WhatsApp session - pass sessionId not userId
    await this.sessionManager.performCompleteUserCleanup(sessionId)

    // Delete processing message
    await this.bot.deleteMessage(chatId, processingMsg.message_id)

    // Send success message
    await this.bot.sendMessage(
      chatId,
      TelegramMessages.disconnected(),
      { 
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.mainMenu() 
      }
    )

    logger.info(`User ${userId} disconnected successfully`)

  } catch (error) {
    logger.error("Disconnect confirmation error:", error)
    if (processingMsg) {
      await this.bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {})
    }
    await this.bot.sendMessage(
      chatId, 
      TelegramMessages.error("Failed to disconnect. Please try again.")
    )
  }
}

  /**
   * Handle status check request
   */

async handleStatus(chatId, userId) {
  try {
    const sessionId = `session_${userId}`
    
    // Use the more reliable connection check
    const isConnected = await this.sessionManager.isReallyConnected(sessionId)
    const session = await this.storage.getSession(sessionId)
    
    await this.bot.sendMessage(
      chatId,
      TelegramMessages.status(isConnected, session?.phoneNumber),
      { 
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.mainMenu()
      }
    )

  } catch (error) {
    logger.error("Status check error:", error)
    await this.bot.sendMessage(chatId, TelegramMessages.error("Failed to check status"))
  }
}

  /**
   * Check if user has pending connection
   */
  isPendingConnection(userId) {
    return this.pendingConnections.has(userId)
  }

  /**
   * Get pending connection info
   */
  getPendingConnection(userId) {
    return this.pendingConnections.get(userId)
  }

  /**
   * Clear pending connection
   */
  clearPending(userId) {
    this.pendingConnections.delete(userId)
  }

  /**
   * Get all pending connections (for admin/debugging)
   */
  getAllPending() {
    return Array.from(this.pendingConnections.entries())
  }
}