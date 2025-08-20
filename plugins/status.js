import { createComponentLogger } from "../utils/logger.js"

const log = createComponentLogger("PLUGIN")

export default {
  name: "Status",
  description: "Show bot status and system information",
  commands: ["status", "info", "uptime"],
  category: "both",
  adminOnly: false,
  usage: "• `.status` - Show bot status and system info\n• `.info` - Alias for status\n• `.uptime` - Alias for status",

  async execute(sock, sessionId, args, context) {
    try {
      const uptime = process.uptime()
      const hours = Math.floor(uptime / 3600)
      const minutes = Math.floor((uptime % 3600) / 60)
      const seconds = Math.floor(uptime % 60)

      const response = 
        `🤖 *Bot Status*\n\n` +
        `📱 *Session:* ${sessionId}\n` +
        `⏰ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
        `💻 *Platform:* ${process.platform}\n` +
        `🔧 *Node.js:* ${process.version}\n` +
        `📊 *Memory:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n` +
        `🌐 *Chat Type:* ${context.isGroup ? 'Group' : 'Private'}\n` +
        `👑 *Your Role:* ${context.senderIsAdmin ? 'Admin' : 'Member'}\n\n` +
        `💡 Use \`.help\` to see all available commands`

      log.info(`Status command executed by ${context.sender} in ${context.isGroup ? 'group' : 'private chat'}`)

      return { response }
    } catch (error) {
      log.error("Error in status command:", error)
      return { response: "❌ Error getting bot status" }
    }
  },
}
