// plugins/group/anti-link.js - Anti-Link Plugin (Updated)

import { logger } from "../../utils/logger.js"
import { GroupQueries, WarningQueries, ViolationQueries } from "../../database/query.js"
import AdminChecker from "../../whatsapp/utils/admin-checker.js"

export default {
  name: "Anti-Link",
  description: "Detect and remove links with warning system",
  commands: ["antilink"],
  category: "group",
  adminOnly: true,
  usage: "• `.antilink on` - Enable link protection\n• `.antilink off` - Disable link protection\n• `.antilink status` - Check protection status\n• `.antilink reset @user` - Reset user warnings\n• `.antilink list` - Show warning list\n• `.antilink stats` - View statistics",

  async execute(sock, sessionId, args, context) {
    const action = args[0]?.toLowerCase()
    const groupJid = context.from

    if (!context.isGroup) {
      return { response: "❌ This command can only be used in groups!" }
    }

    try {
      switch (action) {
        case "on":
          await GroupQueries.setAntiCommand(groupJid, "antilink", true)
          return { 
            response: "🔗 *Anti-link protection enabled!*\n\n" +
                     "✅ Links will be detected and removed\n" +
                     "⚠️ Users get 4 warnings before removal\n" +
                     "👑 Admins are exempt from link restrictions"
          }

        case "off":
          await GroupQueries.setAntiCommand(groupJid, "antilink", false)
          return { response: "🔗 Anti-link protection disabled." }

        case "status":
          const status = await GroupQueries.isAntiCommandEnabled(groupJid, "antilink")
          const warningStats = await WarningQueries.getWarningStats(groupJid, "antilink")
          return { 
            response: `🔗 *Anti-link Status*\n\n` +
                     `Status: ${status ? "✅ Enabled" : "❌ Disabled"}\n` +
                     `Active Warnings: ${warningStats.totalUsers} users\n` +
                     `Total Warnings: ${warningStats.totalWarnings}\n` +
                     `Max Warnings: ${warningStats.maxWarnings}/4`
          }

        case "reset":
          if (args.length < 2) {
            return { response: "❌ Usage: `.antilink reset @user`" }
          }

          // Extract mentioned user
          const mentionedJid = context.message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
          if (!mentionedJid) {
            return { response: "❌ Please mention a user to reset their warnings" }
          }

          await WarningQueries.resetUserWarnings(groupJid, mentionedJid, "antilink")
          return { 
            response: `✅ Warnings reset for @${mentionedJid.split("@")[0]}`,
            mentions: [mentionedJid]
          }

        case "list":
          const warningList = await WarningQueries.getWarningList(groupJid, "antilink")
          if (warningList.length === 0) {
            return { response: "📋 No active warnings found" }
          }

          let listResponse = "📋 *Active Anti-link Warnings*\n\n"
          warningList.forEach((warn, index) => {
            const userNumber = warn.user_jid.split("@")[0]
            listResponse += `${index + 1}. @${userNumber} - ${warn.warning_count}/4 warnings\n`
          })

          const mentions = warningList.map(w => w.user_jid)
          return { response: listResponse, mentions }

        case "stats":
          const violationStats = await ViolationQueries.getViolationStats(groupJid, "antilink", 7)
          const weekStats = violationStats[0] || { total_violations: 0, unique_violators: 0, kicks: 0, warnings: 0 }
          
          return {
            response: `📊 *Anti-link Statistics (Last 7 days)*\n\n` +
                     `🔗 Links removed: ${weekStats.total_violations}\n` +
                     `👥 Users warned: ${weekStats.unique_violators}\n` +
                     `⚠️ Warnings issued: ${weekStats.warnings}\n` +
                     `🚪 Users kicked: ${weekStats.kicks}`
          }

        default:
          const currentStatus = await GroupQueries.isAntiCommandEnabled(groupJid, "antilink")
          return {
            response:
              "🔗 *Anti-Link Commands*\n\n" +
              "• `.antilink on` - Enable protection\n" +
              "• `.antilink off` - Disable protection\n" +
              "• `.antilink status` - Check status\n" +
              "• `.antilink reset @user` - Reset warnings\n" +
              "• `.antilink list` - Show warning list\n" +
              "• `.antilink stats` - View statistics\n\n" +
              `*Current Status:* ${currentStatus ? "✅ Enabled" : "❌ Disabled"}`
          }
      }
    } catch (error) {
      logger.error("Error in antilink command:", error)
      return { response: "❌ Error managing anti-link settings" }
    }
  },

  // Check if plugin is enabled for this group
  async isEnabled(groupJid) {
    try {
      return await GroupQueries.isAntiCommandEnabled(groupJid, "antilink")
    } catch (error) {
      logger.error(`[Anti-Link] Error checking if enabled: ${error.message}`)
      return false
    }
  },

  // Check if plugin should process this message
  async shouldProcess(context, message) {
    // Only process group messages that contain text
    if (!context.isGroup || !context.text) return false
    
    // Don't process commands
    if (context.isCommand) return false
    
    // Don't process messages from the bot itself
    if (context.message.key.fromMe) return false
    
    // Check for links using comprehensive regex
    return this.detectLinks(context.text)
  },

  // Process message for anti-link functionality
  async processMessage(sock, sessionId, context, message) {
    try {
      await this.handleLinkDetection(sock, sessionId, context)
    } catch (error) {
      logger.error(`[Anti-Link] Error processing message: ${error.message}`)
    }
  },

  async handleLinkDetection(sock, sessionId, context) {
    try {
      const adminChecker = new AdminChecker()
      
      // Check if user is admin (admins are exempt)
      const isAdmin = await adminChecker.isGroupAdmin(sock, context.from, context.sender)
      if (isAdmin) {
        logger.debug(`[Anti-Link] Admin ${context.sender} exempt from link restrictions`)
        return
      }

      // Check if bot is admin (needed to delete messages)
      const botIsAdmin = await adminChecker.isBotAdmin(sock, context.from)
      if (!botIsAdmin) {
        logger.warn(`[Anti-Link] Bot not admin in ${context.from}, cannot delete messages`)
        
        // Send warning but can't delete
        await sock.sendMessage(context.from, {
          text: "🔗 Link detected but bot lacks admin permissions to remove it.\n\n" +
                "Please make bot an admin to enable message deletion."
        })
        return
      }

      // Extract detected links
      const detectedLinks = this.extractLinks(context.text)

      // Delete the message
      try {
        await sock.sendMessage(context.from, { delete: context.key })
        logger.info(`[Anti-Link] Deleted message from ${context.sender} in ${context.from}`)
      } catch (deleteError) {
        logger.error(`[Anti-Link] Failed to delete message: ${deleteError.message}`)
      }

      // Add warning
      const warnings = await WarningQueries.addWarning(
        context.from, 
        context.sender, 
        "antilink",
        "Posted link in restricted group"
      )

      // Create link preview for response
      const linkPreview = detectedLinks[0] ? detectedLinks[0].substring(0, 30) + "..." : "URL pattern"

      let response =
        `🔗 *Link Detected & Removed!*\n\n` +
        `👤 @${context.sender.split("@")[0]}\n` +
        `🔗 Link: ${linkPreview}\n` +
        `⚠️ Warning: ${warnings}/4`

      if (warnings >= 4) {
        // Remove user after 4 warnings
        try {
          await sock.groupParticipantsUpdate(context.from, [context.sender], "remove")
          response += `\n\n❌ *User removed* after reaching 4 warnings.`

          // Reset warnings after removal
          await WarningQueries.resetUserWarnings(context.from, context.sender, "antilink")
          
          logger.info(`[Anti-Link] Removed user ${context.sender} from ${context.from} after 4 warnings`)
        } catch (removeError) {
          logger.error(`[Anti-Link] Failed to remove user: ${removeError.message}`)
          response += `\n\n❌ Failed to remove user (insufficient permissions)`
        }
      } else {
        response += `\n\n📝 ${4 - warnings} warnings remaining before removal.`
      }

      response += `\n\n💡 *Tip:* Admins can send links freely.`

      await sock.sendMessage(context.from, {
        text: response,
        mentions: [context.sender],
      }, { quoted: context.message })

      // Log the violation
      await ViolationQueries.logViolation(
        context.from, 
        context.sender, 
        "antilink",
        context.text, 
        { links: detectedLinks }, 
        warnings >= 4 ? "kick" : "warning",
        warnings,
        context.messageId
      )

      logger.info(`[Anti-Link] Warning issued: ${context.sender} in ${context.from} (${warnings}/4)`)
    } catch (error) {
      logger.error("[Anti-Link] Error handling link detection:", error)
    }
  },

  /**
   * Detect if text contains links
   */
  detectLinks(text) {
    // Primary link regex
    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi
    if (linkRegex.test(text)) return true

    // Common URL patterns without protocols
    const urlPatterns = [
      /\b[a-zA-Z0-9-]+\.(com|net|org|edu|gov|mil|int|co|io|me|tv|info|biz|name|mobi|tel|asia|jobs|travel|cat|pro|aero|museum|coop)\b/gi,
      /\bt\.me\/[^\s]+/gi,           // Telegram links
      /\byoutube\.com\/[^\s]+/gi,    // YouTube links
      /\byoutu\.be\/[^\s]+/gi,       // YouTube short links
      /\bwa\.me\/[^\s]+/gi,          // WhatsApp links
      /\binstagram\.com\/[^\s]+/gi,  // Instagram links
      /\bfacebook\.com\/[^\s]+/gi,   // Facebook links
      /\btwitter\.com\/[^\s]+/gi,    // Twitter links
      /\btiktok\.com\/[^\s]+/gi,     // TikTok links
      /\bdiscord\.gg\/[^\s]+/gi,     // Discord invites
    ]

    return urlPatterns.some(pattern => pattern.test(text))
  },

  /**
   * Extract all links from text
   */
  extractLinks(text) {
    const links = []
    
    // Primary link extraction
    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi
    let match
    while ((match = linkRegex.exec(text)) !== null) {
      links.push(match[0])
    }

    // Extract specific platform links
    const platformPatterns = [
      /\bt\.me\/[^\s]+/gi,
      /\byoutube\.com\/[^\s]+/gi,
      /\byoutu\.be\/[^\s]+/gi,
      /\bwa\.me\/[^\s]+/gi,
      /\binstagram\.com\/[^\s]+/gi,
      /\bfacebook\.com\/[^\s]+/gi,
      /\btwitter\.com\/[^\s]+/gi,
      /\btiktok\.com\/[^\s]+/gi,
      /\bdiscord\.gg\/[^\s]+/gi,
    ]

    platformPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(text)) !== null) {
        if (!links.includes(match[0])) {
          links.push(match[0])
        }
      }
    })

    return links
  }
}