import { createComponentLogger } from "../../utils/logger.js"
const log = createComponentLogger("PLUGIN")

export default {
  name: "Tag All",
  description: "Tag all members in the group",
  commands: ["tagall", "everyone", "all"],
  category: "group",
  adminOnly: true,
  usage: "• `.tagall` - Tag all members with default message\n• `.tagall Meeting in 5 minutes` - Tag all members with custom message",

  async execute(sock, sessionId, args, context) {
    try {
      // Check if command is used in a group
      if (!context.isGroup) {
        return { response: "❌ This command can only be used in groups!" }
      }

      // Get group metadata to retrieve member list
      const groupMetadata = await sock.groupMetadata(context.from)
      const participants = groupMetadata.participants

      // Filter out bots and get only regular members
      const members = participants
        .filter(participant => !participant.id.includes('bot'))
        .map(participant => participant.id)

      if (members.length === 0) {
        return { response: "❌ No members found in this group!" }
      }

      // Create the message with optional custom text
      const customMessage = args.join(' ') || 'Group notification'
      
      const response = 
        `📢 *${customMessage}*\n\n` +
        `👥 Tagging all ${members.length} members:\n\n` +
        `${members.map(member => `@${member.split('@')[0]}`).join(' ')}`

      log.info(`TagAll command executed in group: ${context.from} by ${context.sender}`)

      return { 
        response,
        mentions: members // This will mention all the users
      }
    } catch (error) {
      log.error("Error in tagall command:", error)
      return { response: "❌ Error tagging group members. Make sure the bot has admin privileges." }
    }
  },
}
