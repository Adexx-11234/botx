import { createComponentLogger } from "../../utils/logger.js"
import { GroupQueries } from "../../database/query.js"
import AdminChecker from "../../whatsapp/utils/admin-checker.js"

const logger = createComponentLogger("GROUPONLY")

export default {
  name: "Group Only",
  description: "Control bot responses in groups - restrict to admins only",
  commands: ["grouponly", "go"],
  category: "group",
  adminOnly: true,
  usage: "• `.grouponly on` - Enable group-only mode (admins only)\n• `.grouponly off` - Disable group-only mode\n• `.grouponly public` - Allow all members to use commands\n• `.grouponly status` - Check current mode",

  /**
   * Main command execution
   */
  async execute(sock, sessionId, args, m) {
    try {
      if (!this.validateInputs(sock, m)) return

      const action = args[0]?.toLowerCase()
      const groupJid = m.chat

      // Ensure this is a group
      if (!this.isGroupMessage(m)) {
        await sock.sendMessage(groupJid, {
          text: "❌ This command can only be used in groups!"
        }, { quoted: m })
        return
      }

      // Check admin permissions
      if (!(await this.checkAdminPermission(sock, groupJid, m.sender, m))) return

      // Handle command actions
      switch (action) {
        case "on":
          await this.enableGroupOnly(sock, groupJid, m)
          break
        case "off":
          await this.disableGroupOnly(sock, groupJid, m)
          break
        case "public":
          await this.enablePublicMode(sock, groupJid, m)
          break
        case "status":
          await this.showStatus(sock, groupJid, m)
          break
        default:
          await this.showHelp(sock, groupJid, m)
          break
      }
    } catch (error) {
      logger.error("Error executing grouponly command:", error)
      await this.sendErrorMessage(sock, m.chat, m)
    }
  },

  /**
   * Check if bot should process commands in this group
   */
  async shouldProcessCommand(sock, m) {
    try {
      // Always allow bot owner
      if (this.isBotOwner(sock, m.sender)) return true

      // Only apply restrictions in groups
      if (!this.isGroupMessage(m)) return true

      const groupJid = m.chat

      // Get group settings
      const groupSettings = await GroupQueries.getGroupSettings(groupJid)
      
      // If grouponly is disabled, allow all commands
      if (!groupSettings?.grouponly_enabled) {
        // Check if this is bot owner trying to use commands when bot is "disabled"
        if (this.isBotOwner(sock, m.sender)) {
          return true
        }
        
        // For non-owners, send "disabled" message and block
        await this.sendBotDisabledMessage(sock, groupJid, m)
        return false
      }

      // If grouponly is enabled but public_mode is true, allow all members
      if (groupSettings.public_mode) {
        return true
      }

      // If grouponly is enabled and public_mode is false, only allow admins
      const isAdmin = await this.isUserAdmin(sock, groupJid, m.sender)
      if (!isAdmin) {
        await this.sendAdminOnlyMessage(sock, groupJid, m)
        return false
      }

      return true
    } catch (error) {
      logger.error("Error checking if should process command:", error)
      return true // Default to allowing on error
    }
  },

  // ===================
  // VALIDATION METHODS
  // ===================

  validateInputs(sock, m) {
    if (!sock || !m || !m.chat || !m.sender) {
      logger.warn("Invalid inputs provided")
      return false
    }
    return true
  },

  isGroupMessage(m) {
    return m?.isGroup === true || (m?.chat && m.chat.endsWith('@g.us'))
  },

  isBotOwner(sock, userJid) {
    try {
      if (!sock?.user?.id || !userJid) return false

      let botUserId = sock.user.id
      if (botUserId.includes(':')) {
        botUserId = botUserId.split(':')[0]
      }
      if (botUserId.includes('@')) {
        botUserId = botUserId.split('@')[0]
      }

      let userNumber = userJid
      if (userNumber.includes(':')) {
        userNumber = userNumber.split(':')[0]
      }
      if (userNumber.includes('@')) {
        userNumber = userNumber.split('@')[0]
      }

      return botUserId === userNumber
    } catch (error) {
      logger.error("Error checking bot owner status:", error)
      return false
    }
  },

  // ===================
  // PERMISSION METHODS
  // ===================

  async isUserAdmin(sock, groupJid, userJid) {
    try {
      const adminChecker = new AdminChecker()
      return await adminChecker.isGroupAdmin(sock, groupJid, userJid)
    } catch (error) {
      logger.error("Error checking user admin status:", error)
      return false
    }
  },

  async checkAdminPermission(sock, groupJid, userJid, m) {
    const isAdmin = await this.isUserAdmin(sock, groupJid, userJid)
    const isOwner = this.isBotOwner(sock, userJid)
    
    if (!isAdmin && !isOwner) {
      await sock.sendMessage(groupJid, {
        text: "❌ Only group admins can manage group-only settings!"
      }, { quoted: m })
      return false
    }
    return true
  },

  // ===================
  // COMMAND HANDLERS
  // ===================

  async enableGroupOnly(sock, groupJid, m) {
    await GroupQueries.updateGroupSettings(groupJid, {
      grouponly_enabled: true,
      public_mode: false
    })
    
    await sock.sendMessage(groupJid, {
      text: "🔒 *Group-Only Mode Enabled!*\n\n" +
            "✅ Bot is now active in this group\n" +
            "👑 Only admins can use commands\n" +
            "💡 Use `.grouponly public` to allow all members\n" +
            "❌ Use `.grouponly off` to disable bot responses"
    }, { quoted: m })
  },

  async disableGroupOnly(sock, groupJid, m) {
    await GroupQueries.updateGroupSettings(groupJid, {
      grouponly_enabled: false,
      public_mode: true
    })
    
    await sock.sendMessage(groupJid, {
      text: "🔓 *Group-Only Mode Disabled!*\n\n" +
            "❌ Bot responses are now disabled in this group\n" +
            "💡 Only the bot owner can use commands\n" +
            "✅ Use `.grouponly on` to re-enable for admins"
    }, { quoted: m })
  },

  async enablePublicMode(sock, groupJid, m) {
    await GroupQueries.updateGroupSettings(groupJid, {
      grouponly_enabled: true,
      public_mode: true
    })
    
    await sock.sendMessage(groupJid, {
      text: "🌍 *Public Mode Enabled!*\n\n" +
            "✅ Bot is active in this group\n" +
            "👥 All members can use commands\n" +
            "🔒 Use `.grouponly on` to restrict to admins only"
    }, { quoted: m })
  },

  async showStatus(sock, groupJid, m) {
    try {
      const settings = await GroupQueries.getGroupSettings(groupJid)
      
      let status = "❌ Disabled (Bot responses blocked)"
      let details = "Only bot owner can use commands"
      
      if (settings?.grouponly_enabled) {
        if (settings.public_mode) {
          status = "🌍 Public Mode"
          details = "All group members can use commands"
        } else {
          status = "🔒 Admin Only Mode"
          details = "Only group admins can use commands"
        }
      }
      
      await sock.sendMessage(groupJid, {
        text: `🤖 *Bot Group Status*\n\n` +
              `Status: ${status}\n` +
              `Details: ${details}\n\n` +
              `*Available Commands:*\n` +
              `• \`.grouponly on\` - Enable admin-only mode\n` +
              `• \`.grouponly public\` - Enable public mode\n` +
              `• \`.grouponly off\` - Disable bot responses`
      }, { quoted: m })
    } catch (error) {
      logger.error("Error showing status:", error)
      await this.sendErrorMessage(sock, groupJid, m)
    }
  },

  async showHelp(sock, groupJid, m) {
    const settings = await GroupQueries.getGroupSettings(groupJid)
    const currentStatus = settings?.grouponly_enabled 
      ? (settings.public_mode ? "🌍 Public" : "🔒 Admin Only") 
      : "❌ Disabled"
    
    await sock.sendMessage(groupJid, {
      text: "🤖 *Group-Only Commands*\n\n" +
            "• `.grouponly on` - Enable admin-only mode\n" +
            "• `.grouponly off` - Disable bot responses\n" +
            "• `.grouponly public` - Allow all members\n" +
            "• `.grouponly status` - Check current mode\n\n" +
            `*Current Status:* ${currentStatus}\n\n` +
            "🔍 *What this does:* Controls who can use bot commands in groups"
    }, { quoted: m })
  },

  async sendErrorMessage(sock, groupJid, m) {
    try {
      await sock.sendMessage(groupJid, {
        text: "❌ Error managing group-only settings"
      }, { quoted: m })
    } catch (error) {
      logger.error("Failed to send error message:", error)
    }
  },

  // ===================
  // RESPONSE MESSAGES
  // ===================

  async sendBotDisabledMessage(sock, groupJid, m) {
    try {
      await sock.sendMessage(groupJid, {
        text: "🤖 *Bot is currently disabled in groups*\n\n" +
              "❌ Group responses are turned off\n" +
              "👑 Ask a group admin to type `.grouponly on`\n" +
              "💡 This will enable bot commands for admins\n\n" +
              "📱 You can still use the bot in private chat!"
      }, { quoted: m })
    } catch (error) {
      logger.error("Failed to send bot disabled message:", error)
    }
  },

  async sendAdminOnlyMessage(sock, groupJid, m) {
    try {
      await sock.sendMessage(groupJid, {
        text: "🔒 *Admin-Only Mode Active*\n\n" +
              "❌ Only group admins can use commands\n" +
              "👑 Ask an admin to type `.grouponly public`\n" +
              "💡 This will allow all members to use commands\n\n" +
              "📱 You can still use the bot in private chat!"
      }, { quoted: m })
    } catch (error) {
      logger.error("Failed to send admin only message:", error)
    }
  }
}