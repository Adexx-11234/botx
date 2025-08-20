import { createComponentLogger } from "../../utils/logger.js"
const log = createComponentLogger("PLUGIN")

export default {
  name: "Ping",
  description: "Check server status and response time",
  commands: ["ping"],
  category: "both",
  adminOnly: false,
  usage: "• `.ping` - Check server status and response time",

  async execute(sock, sessionId, args, context) {
    const startTime = Date.now()

    try {
      // Get system stats
      const uptime = process.uptime()
      const memUsage = process.memoryUsage()
      const responseTime = Date.now() - startTime

      const response =
        `🏓 *Pong!*\n\n` +
        `⚡ Response Time: ${responseTime}ms\n` +
        `⏱️ Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m\n` +
        `💾 Memory: ${Math.round(memUsage.used / 1024 / 1024)}MB\n` +
        `🔧 Session: ${sessionId}\n` +
        `📊 Status: ✅ Online`

      log.info(`Ping command executed in ${context.isGroup ? 'group' : 'private'}: ${context.from}`)

      return { response }
    } catch (error) {
      log.error("Error in ping command:", error)
      return { response: "❌ Error checking server status" }
    }
  },
}
