import { TelegramMessages } from "../utils/messages.js"
import { TelegramKeyboards } from "../utils/keyboards.js"
import { TelegramValidation } from "../utils/validation.js"
import { sessionManager } from "../../whatsapp/session-manager.js"
import { pool } from "../../database/connection.js"
import { logger } from "../../utils/logger.js"

export class ConnectionHandler {
  constructor(bot, authMiddleware) {
    this.bot = bot
    this.authMiddleware = authMiddleware
    this.sessionManager = sessionManager
    this.pendingConnections = new Map()
  }

  async handleConnect(msg) {
    const telegramId = msg.from.id

    try {
      // Check if already connected
      const isConnected = await this.authMiddleware.isUserConnected(telegramId)
      if (isConnected) {
        const session = await this.authMiddleware.getUserSession(telegramId)
        return this.bot.sendMessage(msg.chat.id, TelegramMessages.alreadyConnected(session.phone_number), {
          reply_markup: TelegramKeyboards.mainMenu(),
        })
      }

      // Show connection instructions
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.connectionInstructions(), {
        parse_mode: "Markdown",
        reply_markup: TelegramKeyboards.connectionMenu(),
      })
    } catch (error) {
      logger.error("Error in handleConnect:", error)
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.error("Failed to initiate connection process"))
    }
  }

  async handlePhoneNumberEntry(msg) {
    const telegramId = msg.from.id
    const phoneNumber = msg.text

    console.log("[v0] Starting handlePhoneNumberEntry for:", { telegramId, phoneNumber })

    try {
      // Validate phone number
      const validation = TelegramValidation.validatePhoneNumber(phoneNumber)
      console.log("[v0] Phone validation result:", validation)

      if (!validation.isValid) {
        console.log("[v0] Phone number validation failed")
        return this.bot.sendMessage(msg.chat.id, TelegramMessages.invalidPhoneNumber())
      }

      // Check if phone number is already in use
      console.log("[v0] Checking if phone number already exists:", validation.formatted)
      const existingSession = await pool.query(
        "SELECT * FROM sessions WHERE phone_number = $1 AND is_connected = true",
        [validation.formatted],
      )

      if (existingSession.rows.length > 0) {
        console.log("[v0] Phone number already in use")
        return this.bot.sendMessage(
          msg.chat.id,
          TelegramMessages.error("This phone number is already connected to another account"),
        )
      }

      // Generate pairing code
      console.log("[v0] Generating pairing code for:", { telegramId, phoneNumber: validation.formatted })
      const pairingCode = await this.generatePairingCode(telegramId, validation.formatted)
      console.log("[v0] Pairing code result:", pairingCode)

      if (pairingCode) {
        // Store pending connection
        this.pendingConnections.set(telegramId, {
          phoneNumber: validation.formatted,
          pairingCode,
          timestamp: Date.now(),
        })

        console.log("[v0] Sending pairing code to user")
        // Send pairing code
        await this.bot.sendMessage(msg.chat.id, TelegramMessages.pairingCodeSent(pairingCode), {
          parse_mode: "Markdown",
          reply_markup: TelegramKeyboards.backButton("main_menu"),
        })

        // Set timeout to clean up pending connection
        setTimeout(
          () => {
            this.pendingConnections.delete(telegramId)
          },
          5 * 60 * 1000,
        ) // 5 minutes
      } else {
        console.log("[v0] Failed to generate pairing code")
        await this.bot.sendMessage(msg.chat.id, TelegramMessages.connectionFailed("Failed to generate pairing code"))
      }
    } catch (error) {
      console.log("[v0] Full error in handlePhoneNumberEntry:", error)
      console.log("[v0] Error stack:", error.stack)
      console.log("[v0] Error message:", error.message)
      logger.error("Error in handlePhoneNumberEntry:", error)
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.error("Failed to process phone number"))
    }
  }

  async generatePairingCode(telegramId, phoneNumber) {
    console.log("[v0] Starting generatePairingCode for:", { telegramId, phoneNumber })

    try {
      // Get user ID
      console.log("[v0] Getting user ID from database")
      const userResult = await pool.query("SELECT id FROM users WHERE telegram_id = $1", [telegramId])
      console.log("[v0] User query result:", userResult.rows)

      if (userResult.rows.length === 0) {
        console.log("[v0] User not found in database")
        throw new Error("User not found")
      }

      const userId = userResult.rows[0].id
      console.log("[v0] Found user ID:", userId)

      // Create session in database
      console.log("[v0] Creating session in database")
      const sessionResult = await pool.query(
        `
                INSERT INTO sessions (user_id, session_id, telegram_id, phone_number, is_connected, created_at, updated_at)
                VALUES ($1, $2, $3, $4, false, NOW(), NOW())
                RETURNING *
            `,
        [userId, `session_${telegramId}_${Date.now()}`, telegramId, phoneNumber],
      )
      console.log("[v0] Session created:", sessionResult.rows[0])

      const session = sessionResult.rows[0]

      console.log("[v0] Creating sessions directory")
      const fs = await import("fs")
      const path = await import("path")
      const sessionsDir = path.join(process.cwd(), "sessions")
      if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true })
        logger.info(`Created sessions directory: ${sessionsDir}`)
      }

      console.log("[v0] Calling sessionManager.createSession")
      let resolved = false
      return await new Promise(async (resolve) => {
        try {
          await this.sessionManager.createSession(telegramId, phoneNumber, {
            onPairingCode: async (code) => {
              if (!resolved) {
                resolved = true
                resolve(code)
              }
            },
            onConnectionUpdate: (update) => {
              console.log("[v0] Connection update:", update)
              if (update.status === "connected") {
                this.handleConnectionSuccess(session.session_id, phoneNumber)
              }
            },
          })
        } catch (err) {
          console.log("[v0] Error creating session:", err)
          logger.error("Error creating session for pairing:", err)
          resolve(null)
          return
        }

        // Fallback timeout
        setTimeout(() => {
          if (!resolved) {
            console.log("[v0] Pairing code generation timeout")
            resolved = true
            resolve(null)
          }
        }, 30000)
      })
    } catch (error) {
      console.log("[v0] Full error in generatePairingCode:", error)
      console.log("[v0] Error stack:", error.stack)
      console.log("[v0] Error message:", error.message)
      logger.error("Error generating pairing code:", error)
      return null
    }
  }

  async handleConnectionSuccess(sessionId, phoneNumber) {
    try {
      // Update session as active
      await pool.query("UPDATE sessions SET is_connected = true, updated_at = NOW() WHERE session_id = $1", [
        sessionId,
      ])

      // Get user's Telegram ID
      const result = await pool.query(
        `
                SELECT u.telegram_id, u.first_name
                FROM users u
                JOIN sessions s ON u.id = s.user_id
                WHERE s.session_id = $1
            `,
        [sessionId],
      )

      if (result.rows.length > 0) {
        const { telegram_id, first_name } = result.rows[0]

        // Remove from pending connections
        this.pendingConnections.delete(telegram_id)

        // Send success message
        await this.bot.sendMessage(telegram_id, TelegramMessages.connectionSuccess(phoneNumber), {
          parse_mode: "Markdown",
          reply_markup: TelegramKeyboards.mainMenu(),
        })

        logger.info(`WhatsApp connection successful for user ${telegram_id}: ${phoneNumber}`)
      }
    } catch (error) {
      logger.error("Error handling connection success:", error)
    }
  }

  async handleDisconnect(msg) {
    const telegramId = msg.from.id

    try {
      const session = await this.authMiddleware.getUserSession(telegramId)
      if (!session) {
        return this.bot.sendMessage(msg.chat.id, TelegramMessages.notConnected(), {
          reply_markup: TelegramKeyboards.mainMenu(),
        })
      }

      // Disconnect WhatsApp session
      await this.sessionManager.disconnectSession(session.session_id)

      // Update database
      await pool.query(
        "UPDATE whatsapp_sessions SET is_active = false, disconnected_at = NOW() WHERE session_id = $1",
        [session.session_id],
      )

      await this.bot.sendMessage(msg.chat.id, TelegramMessages.disconnectionSuccess(), {
        reply_markup: TelegramKeyboards.mainMenu(),
      })

      logger.info(`WhatsApp disconnected for user ${telegramId}`)
    } catch (error) {
      logger.error("Error in handleDisconnect:", error)
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.error("Failed to disconnect WhatsApp"))
    }
  }

  async handleStatus(msg) {
    const telegramId = msg.from.id

    try {
      const session = await this.authMiddleware.getUserSession(telegramId)
      const isConnected = session !== null

      let lastSeen = null
      if (isConnected && session.last_activity) {
        lastSeen = new Date(session.last_activity).toLocaleString()
      }

      await this.bot.sendMessage(
        msg.chat.id,
        TelegramMessages.status(isConnected, session?.phone_number, lastSeen),
        {
          parse_mode: "Markdown",
          reply_markup: TelegramKeyboards.mainMenu(),
        },
      )
    } catch (error) {
      logger.error("Error in handleStatus:", error)
      await this.bot.sendMessage(msg.chat.id, TelegramMessages.error("Failed to get status"))
    }
  }
}
