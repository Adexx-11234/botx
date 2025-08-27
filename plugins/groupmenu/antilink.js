import { createComponentLogger } from "../../utils/logger.js"
import { GroupQueries, WarningQueries, ViolationQueries } from "../../database/query.js"
import AdminChecker from "../../whatsapp/utils/admin-checker.js"

const logger = createComponentLogger("ANTI-LINK")

export default {
  name: "Anti-Link",
  description: "Detect and remove links with warning system",
  commands: ["antilink"],
  category: "group",
  adminOnly: true,
  usage:
    "• `.antilink on` - Enable link protection\n• `.antilink off` - Disable link protection\n• `.antilink status` - Check protection status\n• `.antilink reset @user` - Reset user warnings\n• `.antilink list` - Show warning list\n• `.antilink stats` - View statistics",

  async execute(sock, sessionId, args, m) {
    const action = args[0]?.toLowerCase()
    const groupJid = m.chat

    if (!m.isGroup) {
      await sock.sendMessage(groupJid, {
        text: "❌ This command can only be used in groups!"
      }, { quoted: m })
      return
    }

    try {
      switch (action) {
        case "on":
          await GroupQueries.setAntiCommand(groupJid, "antilink", true)
          await sock.sendMessage(groupJid, {
            text:
              "🔗 *Anti-link protection enabled!*\n\n" +
              "✅ Links will be detected and removed\n" +
              "⚠️ Users get 4 warnings before removal\n" +
              "👑 Admins are exempt from link restrictions"
          }, { quoted: m })
          break

        case "off":
          await GroupQueries.setAntiCommand(groupJid, "antilink", false)
          await sock.sendMessage(groupJid, {
            text: "🔗 Anti-link protection disabled."
          }, { quoted: m })
          break

        case "status":
          const status = await GroupQueries.isAntiCommandEnabled(groupJid, "antilink")
          const warningStats = await WarningQueries.getWarningStats(groupJid, "antilink")
          await sock.sendMessage(groupJid, {
            text:
              `🔗 *Anti-link Status*\n\n` +
              `Status: ${status ? "✅ Enabled" : "❌ Disabled"}\n` +
              `Active Warnings: ${warningStats.totalUsers} users\n` +
              `Total Warnings: ${warningStats.totalWarnings}\n` +
              `Max Warnings: ${warningStats.maxWarnings}/4`
          }, { quoted: m })
          break

        case "reset":
          if (args.length < 2) {
            await sock.sendMessage(groupJid, {
              text: "❌ Usage: `.antilink reset @user`"
            }, { quoted: m })
            return
          }

          const mentionedJid = m.message?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
          if (!mentionedJid) {
            await sock.sendMessage(groupJid, {
              text: "❌ Please mention a user to reset their warnings"
            }, { quoted: m })
            return
          }

          await WarningQueries.resetUserWarnings(groupJid, mentionedJid, "antilink")
          await sock.sendMessage(groupJid, {
            text: `✅ Warnings reset for @${mentionedJid.split("@")[0]}`,
            mentions: [mentionedJid]
          }, { quoted: m })
          break

        case "list":
          const warningList = await WarningQueries.getWarningList(groupJid, "antilink")
          if (warningList.length === 0) {
            await sock.sendMessage(groupJid, {
              text: "📋 No active warnings found"
            }, { quoted: m })
            return
          }

          let listResponse = "📋 *Active Anti-link Warnings*\n\n"
          warningList.forEach((warn, index) => {
            const userNumber = warn.user_jid.split("@")[0]
            listResponse += `${index + 1}. @${userNumber} - ${warn.warning_count}/4 warnings\n`
          })

          const mentions = warningList.map((w) => w.user_jid)
          await sock.sendMessage(groupJid, {
            text: listResponse,
            mentions: mentions
          }, { quoted: m })
          break

        case "stats":
          const violationStats = await ViolationQueries.getViolationStats(groupJid, "antilink", 7)
          const weekStats = violationStats[0] || { total_violations: 0, unique_violators: 0, kicks: 0, warnings: 0 }

          await sock.sendMessage(groupJid, {
            text:
              `📊 *Anti-link Statistics (Last 7 days)*\n\n` +
              `👥 Users warned: ${weekStats.unique_violators}\n` +
              `⚠️ Warnings issued: ${weekStats.warnings}\n` +
              `🚪 Users kicked: ${weekStats.kicks}`
          }, { quoted: m })
          break

        default:
          const currentStatus = await GroupQueries.isAntiCommandEnabled(groupJid, "antilink")
          await sock.sendMessage(groupJid, {
            text:
              "🔗 *Anti-Link Commands*\n\n" +
              "• `.antilink on` - Enable protection\n" +
              "• `.antilink off` - Disable protection\n" +
              "• `.antilink status` - Check status\n" +
              "• `.antilink reset @user` - Reset warnings\n" +
              "• `.antilink list` - Show warning list\n" +
              "• `.antilink stats` - View statistics\n\n" +
              `*Current Status:* ${currentStatus ? "✅ Enabled" : "❌ Disabled"}`
          }, { quoted: m })
          break
      }
    } catch (error) {
      logger.error("Error in antilink command:", error)
      await sock.sendMessage(groupJid, {
        text: "❌ Error managing anti-link settings"
      }, { quoted: m })
    }
  },

  async isEnabled(groupJid) {
    try {
      return await GroupQueries.isAntiCommandEnabled(groupJid, "antilink")
    } catch (error) {
      logger.error("Error checking if antilink enabled:", error)
      return false
    }
  },

  async shouldProcess(m) {
    if (!m.isGroup || !m.text) return false
    if (m.isCommand) return false
    if (m.key?.fromMe) return false
    return this.detectLinks(m.text)
  },

  async processMessage(sock, sessionId, m) {
    try {
      await this.handleLinkDetection(sock, sessionId, m)
    } catch (error) {
      logger.error("Error processing antilink message:", error)
    }
  },

  async handleLinkDetection(sock, sessionId, m) {
    try {
      const adminChecker = new AdminChecker()
      const groupJid = m.chat
      
      if (!groupJid) {
        logger.warn("No group JID available for antilink processing")
        return
      }

      const isAdmin = await adminChecker.isGroupAdmin(sock, groupJid, m.sender)
      if (isAdmin) {
        return
      }

      const botIsAdmin = await adminChecker.isBotAdmin(sock, groupJid)
      if (!botIsAdmin) {
        try {
          await sock.sendMessage(groupJid, {
            text: "🔗 Link detected but bot lacks admin permissions to remove it.\n\nPlease make bot an admin to enable message deletion."
          })
        } catch (error) {
          logger.error("Failed to send no-permission message:", error)
        }
        return
      }

      const detectedLinks = this.extractLinks(m.text)
      
      const messageInfo = {
        sender: m.sender,
        text: m.text,
        id: m.key.id
      }

      let warnings
      try {
        warnings = await WarningQueries.addWarning(
          groupJid,
          messageInfo.sender,
          "antilink",
          "Posted link in restricted group"
        )
      } catch (error) {
        logger.error("Failed to add warning:", error)
        warnings = 1
      }

      try {
        await sock.sendMessage(groupJid, { delete: m.key })
        m._wasDeletedByAntiPlugin = true
      } catch (error) {
        logger.error("Failed to delete message:", error)
        m._wasDeletedByAntiPlugin = true
      }

      await new Promise(resolve => setTimeout(resolve, 800))

      let response =
        `🔗 *Link Detected & Removed!*\n\n` +
        `👤 @${messageInfo.sender.split("@")[0]}\n` +
        `⚠️ Warning: ${warnings}/4`

      if (warnings >= 4) {
        try {
          await sock.groupParticipantsUpdate(groupJid, [messageInfo.sender], "remove")
          response += `\n\n❌ *User removed* after reaching 4 warnings.`
          await WarningQueries.resetUserWarnings(groupJid, messageInfo.sender, "antilink")
        } catch (error) {
          logger.error("Failed to remove user:", error)
          response += `\n\n❌ Failed to remove user (insufficient permissions)`
        }
      } else {
        response += `\n\n📝 ${4 - warnings} warnings remaining before removal.`
      }

      response += `\n\n💡 *Tip:* Admins can send links freely.`

      try {
        await sock.sendMessage(groupJid, {
          text: response,
          mentions: [messageInfo.sender]
        })
      } catch (error) {
        logger.error("Failed to send warning message:", error)
        try {
          await sock.sendMessage(groupJid, {
            text: response.replace(`@${messageInfo.sender.split("@")[0]}`, messageInfo.sender.split("@")[0])
          })
        } catch (fallbackError) {
          logger.error("Failed to send fallback message:", fallbackError)
        }
      }

      try {
        await ViolationQueries.logViolation(
          groupJid,
          messageInfo.sender,
          "antilink",
          messageInfo.text,
          { links: detectedLinks },
          warnings >= 4 ? "kick" : "warning",
          warnings,
          messageInfo.id
        )
      } catch (error) {
        logger.error("Failed to log violation:", error)
      }
      
    } catch (error) {
      logger.error("Error handling link detection:", error)
    }
  },

  detectLinks(text) {
    // Clean text and normalize spaces
    const cleanText = text.trim().replace(/\s+/g, ' ')
    
    // More precise link detection patterns
    const linkPatterns = [
      // HTTP/HTTPS URLs
      /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/[^\s]*)?/gi,
      
      // www. URLs
      /\bwww\.(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/gi,
      
      // Domain with common TLDs (more restrictive)
      /\b[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:com|net|org|edu|gov|mil|co|io|me|tv|info|biz|app|dev|tech|online|site|website|store|shop)\b(?:\/[^\s]*)?/gi,
      
      // Specific platform patterns
      /\bt\.me\/[a-zA-Z0-9_]+/gi,
      /\byoutube\.com\/watch\?v=[a-zA-Z0-9_-]+/gi,
      /\byoutu\.be\/[a-zA-Z0-9_-]+/gi,
      /\bwa\.me\/[0-9]+/gi,
      /\binstagram\.com\/[a-zA-Z0-9_.]+/gi,
      /\bfacebook\.com\/[a-zA-Z0-9.]+/gi,
      /\btwitter\.com\/[a-zA-Z0-9_]+/gi,
      /\btiktok\.com\/@?[a-zA-Z0-9_.]+/gi,
      /\bdiscord\.gg\/[a-zA-Z0-9]+/gi,
      /\bbit\.ly\/[a-zA-Z0-9]+/gi,
      /\btinyurl\.com\/[a-zA-Z0-9]+/gi
    ]

    // Check each pattern
    for (const pattern of linkPatterns) {
      if (pattern.test(cleanText)) {
        return true
      }
    }

    // Additional check for suspicious patterns that might be disguised links
    const suspiciousPatterns = [
      // Spaced out URLs
      /h\s*t\s*t\s*p\s*s?\s*:\s*\/\s*\/\s*[^\s]+/gi,
      // Dotted domains without proper spacing
      /[a-zA-Z0-9]\.[a-zA-Z0-9]\.[a-zA-Z]{2,}/g
    ]

    for (const pattern of suspiciousPatterns) {
      const matches = cleanText.match(pattern)
      if (matches) {
        // Verify it's actually a link and not just dots in numbers/text
        for (const match of matches) {
          const cleaned = match.replace(/\s+/g, '')
          if (this.isValidUrl(cleaned)) {
            return true
          }
        }
      }
    }

    return false
  },

  extractLinks(text) {
    const links = new Set()
    const cleanText = text.trim().replace(/\s+/g, ' ')
    
    const linkPatterns = [
      /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/[^\s]*)?/gi,
      /\bwww\.(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/gi,
      /\b[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:com|net|org|edu|gov|mil|co|io|me|tv|info|biz|app|dev|tech|online|site|website|store|shop)\b(?:\/[^\s]*)?/gi,
      /\bt\.me\/[a-zA-Z0-9_]+/gi,
      /\byoutube\.com\/watch\?v=[a-zA-Z0-9_-]+/gi,
      /\byoutu\.be\/[a-zA-Z0-9_-]+/gi,
      /\bwa\.me\/[0-9]+/gi,
      /\binstagram\.com\/[a-zA-Z0-9_.]+/gi,
      /\bfacebook\.com\/[a-zA-Z0-9.]+/gi,
      /\btwitter\.com\/[a-zA-Z0-9_]+/gi,
      /\btiktok\.com\/@?[a-zA-Z0-9_.]+/gi,
      /\bdiscord\.gg\/[a-zA-Z0-9]+/gi,
      /\bbit\.ly\/[a-zA-Z0-9]+/gi,
      /\btinyurl\.com\/[a-zA-Z0-9]+/gi
    ]

    linkPatterns.forEach(pattern => {
      let match
      pattern.lastIndex = 0 // Reset regex state
      while ((match = pattern.exec(cleanText)) !== null) {
        const link = match[0].trim()
        if (link && this.isValidUrl(link)) {
          links.add(link)
        }
      }
    })

    return Array.from(links)
  },

  isValidUrl(text) {
    // Remove common false positives
    if (!text || text.length < 4) return false
    
    // Skip if it's just numbers with dots (like IP addresses in normal text)
    if (/^\d+\.\d+(\.\d+)*$/.test(text)) return false
    
    // Skip if it looks like a version number or decimal
    if (/^\d+\.\d+$/.test(text) && !text.includes('/')) return false
    
    // Skip if it's just file extensions
    if (/^\.[a-z]{2,4}$/i.test(text)) return false
    
    // Must contain at least one valid TLD or be a recognized platform
    const validPatterns = [
      /^https?:\/\//i,
      /^www\./i,
      /\.(com|net|org|edu|gov|mil|co|io|me|tv|info|biz|app|dev|tech|online|site|website|store|shop)(\b|\/)/i,
      /^(t\.me|wa\.me|bit\.ly|tinyurl\.com|youtube\.com|youtu\.be|instagram\.com|facebook\.com|twitter\.com|tiktok\.com|discord\.gg)\//i
    ]

    return validPatterns.some(pattern => pattern.test(text))
  }
}