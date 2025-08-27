import { logger } from "../../utils/logger.js"

// Color codes for enhanced logging
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgBlue: "\x1b[44m",
}

/**
 * MessageLogger Class - Handles enhanced message logging with colors
 */
export class MessageLogger {
  constructor() {
    // No initialization needed for logging
  }

  /**
   * Enhanced message logging with colors and proper formatting
   */
  async logEnhancedMessageEntry(sock, sessionId, m) {
    try {
      // Use the session context we already set
      const telegramId = m.sessionContext?.telegram_id || "Unknown"
      const sender = m.sender || "Unknown"
      const pushName = m.pushName || "Unknown"
      const messageType = m.mtype || "text"
      const content = m.body || m.text || "[Media/No text]"
      const truncatedContent = content.substring(0, 80)

      if (m.isGroup && m.groupMetadata) {
        const groupId = m.chat
        const groupName = m.groupMetadata.subject || "Unknown Group"
        const adminStatus = m.isAdmin ? `${colors.bgBlue} ADMIN ${colors.reset}` : ""
        const ownerStatus = m.isCreator ? `${colors.bgRed} OWNER ${colors.reset}` : ""
        const commandStatus = m.isCommand ? `${colors.bgGreen} CMD ${colors.reset}` : ""

        logger.info(
          `${colors.bright}[MESSAGE]${colors.reset} ` +
            `${colors.cyan}TG:${telegramId}${colors.reset} | ` +
            `${colors.magenta}Group:${groupName}${colors.reset} ${colors.dim}(${groupId})${colors.reset} | ` +
            `${colors.green}${pushName}${colors.reset} ${colors.dim}(${sender})${colors.reset} ` +
            `${adminStatus}${ownerStatus}${commandStatus} | ` +
            `${colors.yellow}Type:${messageType}${colors.reset} | ` +
            `${colors.white}${truncatedContent}${colors.reset}${content.length > 80 ? "..." : ""}`,
        )
      } else {
        const ownerStatus = m.isCreator ? `${colors.bgRed} OWNER ${colors.reset}` : ""
        const commandStatus = m.isCommand ? `${colors.bgGreen} CMD ${colors.reset}` : ""

        logger.info(
          `${colors.bright}[MESSAGE]${colors.reset} ` +
            `${colors.cyan}TG:${telegramId}${colors.reset} | ` +
            `${colors.blue}Private:${pushName}${colors.reset} ${colors.dim}(${sender})${colors.reset} ` +
            `${ownerStatus}${commandStatus} | ` +
            `${colors.yellow}Type:${m.mtype}${colors.reset} | ` +
            `${colors.white}${truncatedContent}${colors.reset}${content.length > 80 ? "..." : ""}`,
        )
      }
    } catch (error) {
      const content = m.body || "[Media]"
      const pushName = m.pushName || "Unknown"
      const truncatedContent = content.substring(0, 80)
      const telegramId = m.sessionContext?.telegram_id || "Unknown"

      if (m.isGroup) {
        const adminStatus = m.isAdmin ? `${colors.bgBlue} ADMIN ${colors.reset}` : ""
        const ownerStatus = m.isCreator ? `${colors.bgRed} OWNER ${colors.reset}` : ""
        const commandStatus = m.isCommand ? `${colors.bgGreen} CMD ${colors.reset}` : ""

        logger.info(
          `${colors.bright}[MESSAGE]${colors.reset} ` +
            `${colors.cyan}TG:${telegramId}${colors.reset} | ` +
            `${colors.magenta}Group:${m.chat}${colors.reset} | ` +
            `${colors.green}${pushName}${colors.reset} ${colors.dim}(${m.sender})${colors.reset} ` +
            `${adminStatus}${ownerStatus}${commandStatus} | ` +
            `${colors.yellow}Type:${m.mtype}${colors.reset} | ` +
            `${colors.white}${truncatedContent}${colors.reset}${content.length > 80 ? "..." : ""}`,
        )
      } else {
        const ownerStatus = m.isCreator ? `${colors.bgRed} OWNER ${colors.reset}` : ""
        const commandStatus = m.isCommand ? `${colors.bgGreen} CMD ${colors.reset}` : ""

        logger.info(
          `${colors.bright}[MESSAGE]${colors.reset} ` +
            `${colors.cyan}TG:${telegramId}${colors.reset} | ` +
            `${colors.blue}Private:${pushName}${colors.reset} ${colors.dim}(${m.sender})${colors.reset} ` +
            `${ownerStatus}${commandStatus} | ` +
            `${colors.yellow}Type:${m.mtype}${colors.reset} | ` +
            `${colors.white}${truncatedContent}${colors.reset}${content.length > 80 ? "..." : ""}`,
        )
      }
    }
  }
}

