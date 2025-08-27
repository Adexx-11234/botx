import { createComponentLogger } from "../../utils/logger.js"
import { GroupQueries } from "../../database/query.js"
import AdminChecker from "../../whatsapp/utils/admin-checker.js"

const logger = createComponentLogger("GROUP-LINK")

export default {
  name: "Group Link",
  description: "Get or reset group invite link",
  commands: ["link", "invitelink"],
  category: "group",
  adminOnly: true,
  usage:
    "• `.link` - Get group invite link\n• `.link reset` - Reset group invite link",

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
      const adminChecker = new AdminChecker()
      const isAdmin = await adminChecker.isGroupAdmin(sock, groupJid, m.sender)

      if (!isAdmin) {
        await sock.sendMessage(groupJid, {
          text: "❌ Only admins can use this command!"
        }, { quoted: m })
        return
      }

      switch (action) {
        case "reset":
          // Reset group invite link
          const newInviteCode = await sock.groupRevokeInvite(groupJid)
          const newLink = `https://chat.whatsapp.com/${newInviteCode}`
          
          await sock.sendMessage(groupJid, {
            text: `🔗 *Group Link Reset!*\n\n` +
                  `✅ New invite link generated:\n` +
                  `${newLink}\n\n` +
                  `📝 Previous link is now invalid.`
          }, { quoted: m })
          break

        default:
          // Get current group invite link
          const inviteCode = await sock.groupFetchAllInvitingCodes(groupJid)
          const groupLink = `https://chat.whatsapp.com/${inviteCode[0]?.code || 'Not available'}`
          
          await sock.sendMessage(groupJid, {
            text: `🔗 *Group Invite Link*\n\n` +
                  `${groupLink}\n\n` +
                  `💡 Use \`.link reset\` to generate a new link (invalidates current one)`
          }, { quoted: m })
          break
      }
    } catch (error) {
      logger.error("Error in link command:", error)
      await sock.sendMessage(groupJid, {
        text: "❌ Error managing group link. Make sure bot is admin."
      }, { quoted: m })
    }
  }
}