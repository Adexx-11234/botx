import { logger } from "../../utils/logger.js"
import { MessageProcessor } from "../messages/message-processor.js"

// Color codes for enhanced logging
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
}

// Singleton instance
const messageProcessor = new MessageProcessor()

// ==========================================
// MESSAGE EVENT HANDLERS - MAIN ENTRY POINTS
// ==========================================

export async function handleMessagesUpsert(sessionId, messageUpdate, sock) {
  try {
    const { sessionManager } = await import("../sessions/session-manager.js")

    // Skip processing for voluntarily disconnected sessions
    if (sessionManager.isVoluntarilyDisconnected && sessionManager.isVoluntarilyDisconnected(sessionId)) {
      const sessionInfo = await sessionManager.getSessionInfo(sessionId)
      if (!sessionInfo || !sessionInfo.isConnected) {
        return
      }
      if (sessionManager.clearVoluntaryDisconnection) {
        sessionManager.clearVoluntaryDisconnection(sessionId)
      }
    }

    const prefix = process.env.COMMAND_PREFIX || "."

    // Process each message in the batch
    for (const m of messageUpdate.messages) {
      if (!m?.message) {
        continue
      }

      try {
        // Fix timestamp issue - add 1 hour to server time
        if (m.messageTimestamp) {
          const currentTimestamp = Number(m.messageTimestamp)
          m.messageTimestamp = currentTimestamp + 3600 // Add 1 hour (3600 seconds)
        } else {
          // If no timestamp, create one with 1 hour added
          m.messageTimestamp = Math.floor(Date.now() / 1000) + 3600
        }

        // Ensure basic message properties are set correctly
        if (!m.chat && m.key?.remoteJid) {
          m.chat = m.key.remoteJid
        }
        if (!m.sender && m.key?.participant) {
          m.sender = m.key.participant
        } else if (!m.sender && m.key?.remoteJid && !m.key.remoteJid.includes("@g.us")) {
          m.sender = m.key.remoteJid
        }

        // Ensure chat is always a string
        if (typeof m.chat !== "string") {
          continue
        }

        // Add reply helper with proper chat validation
        if (!m.reply) {
          m.reply = async (text, options = {}) => {
            try {
              const chatJid = m.chat || m.key?.remoteJid

              if (!chatJid || typeof chatJid !== "string") {
                throw new Error(`Invalid chat JID: ${typeof chatJid} - ${chatJid}`)
              }

              const messageOptions = {
                quoted: m,
                ...options,
              }

              if (typeof text === "string") {
                return await sock.sendMessage(chatJid, { text }, messageOptions)
              } else if (typeof text === "object") {
                return await sock.sendMessage(chatJid, text, messageOptions)
              }
            } catch (error) {
              logger.error(`[MessageUpsert] Error in m.reply: ${error.message}`)
              throw error
            }
          }
        }

        // Process message through the main pipeline
        await messageProcessor.processMessage(sock, sessionId, m, prefix)
      } catch (messageError) {
        logger.error(
          `${colors.red}[MessageUpsert]${colors.reset} Error processing individual message: ${colors.yellow}${messageError.message}${colors.reset}`,
        )
        continue
      }
    }
  } catch (error) {
    logger.error(
      `${colors.red}[MessageUpsert]${colors.reset} Error processing messages for ${colors.cyan}${sessionId}${colors.reset}: ${colors.yellow}${error.message}${colors.reset}`,
    )
  }
}

export async function handleGroupParticipantsUpdate(sessionId, update, sock, m = null) {
  try {
    const { groupParticipantsHandler } = await import("./group-participants-handler.js")

    if (!m) {
      m = {
        chat: update.id,
        isGroup: true,
      }
    }

    await groupParticipantsHandler.handleParticipantsUpdate(sock, sessionId, update, m)
  } catch (error) {
    logger.error(
      `${colors.red}[GroupParticipants]${colors.reset} Error handling participants update for ${colors.cyan}${sessionId}${colors.reset}: ${colors.yellow}${error.message}${colors.reset}`,
    )
  }
}

export { messageProcessor }