import { logger } from "../utils/logger.js"
import { GroupQueries } from "../database/query.js"

export default {
  name: "Group Events",
  description: "Manage welcome, goodbye, promotion, and demotion messages",
  commands: ["groupevents", "welcome", "goodbye", "promote", "demote"],
  category: "group",
  adminOnly: true,
  usage: "• `.welcome on/off` - Enable/disable welcome messages\n• `.goodbye on/off` - Enable/disable goodbye messages\n• `.groupevents status` - Check all event settings",

  async execute(sock, sessionId, args, context) {
    const command = args[0]?.toLowerCase()
    const action = args[1]?.toLowerCase()
    const groupJid = context.from

    if (!context.isGroup) {
      return { response: "❌ This command can only be used in groups!" }
    }

    try {
      switch (command) {
        case "welcome":
          if (!action || !["on", "off", "status"].includes(action)) {
            return { response: "❌ Usage: `.welcome on/off/status`" }
          }
          return await this.handleWelcomeCommand(groupJid, action)

        case "goodbye":
          if (!action || !["on", "off", "status"].includes(action)) {
            return { response: "❌ Usage: `.goodbye on/off/status`" }
          }
          return await this.handleGoodbyeCommand(groupJid, action)

        case "groupevents":
          if (action === "status") {
            return await this.getGroupEventsStatus(groupJid)
          }
          return await this.getGroupEventsHelp()

        default:
          return await this.getGroupEventsHelp()
      }
    } catch (error) {
      logger.error("Error in groupevents command:", error)
      return { response: "❌ Error managing group event settings" }
    }
  },

  async handleWelcomeCommand(groupJid, action) {
    switch (action) {
      case "on":
        await GroupQueries.setAntiCommand(groupJid, "welcome", true)
        return { 
          response: "✨ *Welcome messages enabled!*\n\n" +
                   "New members will receive personalized welcome messages when they join the group."
        }

      case "off":
        await GroupQueries.setAntiCommand(groupJid, "welcome", false)
        return { response: "✨ Welcome messages disabled." }

      case "status":
        const welcomeStatus = await GroupQueries.isAntiCommandEnabled(groupJid, "welcome")
        return { 
          response: `✨ *Welcome Status*\n\n` +
                   `Status: ${welcomeStatus ? "✅ Enabled" : "❌ Disabled"}`
        }
    }
  },

  async handleGoodbyeCommand(groupJid, action) {
    switch (action) {
      case "on":
        await GroupQueries.setAntiCommand(groupJid, "goodbye", true)
        return { 
          response: "✨ *Goodbye messages enabled!*\n\n" +
                   "Members will receive goodbye messages when they leave the group."
        }

      case "off":
        await GroupQueries.setAntiCommand(groupJid, "goodbye", false)
        return { response: "✨ Goodbye messages disabled." }

      case "status":
        const goodbyeStatus = await GroupQueries.isAntiCommandEnabled(groupJid, "goodbye")
        return { 
          response: `✨ *Goodbye Status*\n\n` +
                   `Status: ${goodbyeStatus ? "✅ Enabled" : "❌ Disabled"}`
        }
    }
  },

  async getGroupEventsStatus(groupJid) {
    const welcomeStatus = await GroupQueries.isAntiCommandEnabled(groupJid, "welcome")
    const goodbyeStatus = await GroupQueries.isAntiCommandEnabled(groupJid, "goodbye")

    return {
      response: `🎭 *Group Events Status*\n\n` +
               `✨ Welcome Messages: ${welcomeStatus ? "✅ Enabled" : "❌ Disabled"}\n` +
               `✨ Goodbye Messages: ${goodbyeStatus ? "✅ Enabled" : "❌ Disabled"}\n\n` +
               `Use \`.welcome on/off\` or \`.goodbye on/off\` to manage these features.`
    }
  },

  async getGroupEventsHelp() {
    return {
      response: "🎭 *Group Events Commands*\n\n" +
               "• `.welcome on/off` - Enable/disable welcome messages\n" +
               "• `.goodbye on/off` - Enable/disable goodbye messages\n" +
               "• `.groupevents status` - Check all event settings\n\n" +
               "These commands control automatic messages for group events like members joining/leaving."
    }
  },

  // Check if welcome plugin is enabled for this group
  async isWelcomeEnabled(groupJid) {
    try {
      return await GroupQueries.isAntiCommandEnabled(groupJid, "welcome")
    } catch (error) {
      logger.error(`[GroupEvents] Error checking if welcome enabled: ${error.message}`)
      return false
    }
  },

  // Check if goodbye plugin is enabled for this group
  async isGoodbyeEnabled(groupJid) {
    try {
      return await GroupQueries.isAntiCommandEnabled(groupJid, "goodbye")
    } catch (error) {
      logger.error(`[GroupEvents] Error checking if goodbye enabled: ${error.message}`)
      return false
    }
  },

  // Create welcome message for new members
  async createWelcomeMessage(groupMetadata, participants) {
    const groupName = groupMetadata.subject || "this group"
    const participantNames = participants.map((p) => `@${p.split("@")[0]}`)
    const currentTime = new Date().toLocaleTimeString("en-US", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit" 
    })
    const currentDate = new Date().toLocaleDateString("en-US", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric" 
    })

    let message = `✨ Welcome ${participantNames.join(", ")}! ✨\n\n`
    message += `Welcome to ⚡${groupName}⚡! 🎉\n\n`
    message += `We're now ${groupMetadata.participants?.length || 0} members.\n\n`
    message += `Joined at: ${currentTime}, ${currentDate}\n\n`
    message += `> © Paul Bot`

    return message
  },

  // Create goodbye message for members who left
  async createGoodbyeMessage(groupMetadata, participants) {
    const groupName = groupMetadata.subject || "this group"
    const participantNames = participants.map((p) => `@${p.split("@")[0]}`)
    const currentTime = new Date().toLocaleTimeString("en-US", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit" 
    })
    const currentDate = new Date().toLocaleDateString("en-US", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric" 
    })

    let message = `✨ Goodbye ${participantNames.join(", ")}! ✨\n\n`
    message += `You'll be missed in ⚡${groupName}⚡! 🥲\n\n`
    message += `We're now ${groupMetadata.participants?.length || 0} members.\n\n`
    message += `Left at: ${currentTime}, ${currentDate}\n\n`
    message += `> © Paul Bot`

    return message
  },

  // Create promotion message
  async createPromotionMessage(participants) {
    const participantNames = participants.map((p) => `@${p.split("@")[0]}`)

    let message = `👑 Congratulations ${participantNames.join(", ")}!\n\n`
    message += `You have been promoted to admin in this group. `
    message += `Please use your new powers responsibly.`

    return message
  },

  // Create demotion message
  async createDemotionMessage(participants) {
    const participantNames = participants.map((p) => `@${p.split("@")[0]}`)

    let message = `📉 ${participantNames.join(", ")} have been demoted from admin.\n\n`
    message += `You can still participate in the group normally.`

    return message
  }
}
