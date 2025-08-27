import { UserQueries } from "../../database/query.js"

export default {
  name: "Anti-ViewOnce",
  description: "Enable or disable automatic ViewOnce message forwarding to your personal chat",
  commands: ["antiviewonce", "avon", "avoff"],
  category: "utility",
  adminOnly: false,
  usage: `• \`.antiviewonce on\` - Enable forwarding\n• \`.antiviewonce off\` - Disable forwarding  \n• \`.antiviewonce status\` - Check status`,

  _normalizeWhatsAppJid(jid) {
    if (!jid) return jid
    return jid.replace(/:\d+@/, "@")
  },

  async execute(sock, sessionId, args, m) {
    try {
      const senderJid = this._normalizeWhatsAppJid(m.sender)
      const chatJid = m.key.remoteJid

      if (chatJid?.endsWith("@g.us")) {
        return {
          response: "❌ This command can only be used in private chats. Please message me directly.",
          mentions: [],
        }
      }

      const action = args[0]?.toLowerCase()

      if (!action || !["on", "off", "enable", "disable", "status"].includes(action)) {
        return {
          response: `❌ Invalid usage. Use:\n• \`.antiviewonce on\` - Enable forwarding\n• \`.antiviewonce off\` - Disable forwarding  \n• \`.antiviewonce status\` - Check status`,
          mentions: [],
        }
      }

      const telegramId = m.sessionContext?.telegram_id || null

      if (!telegramId) {
        return {
          response: "❌ Unable to identify your Telegram account. Please ensure you're properly connected.",
          mentions: [],
        }
      }

      if (action === "status") {
        const isEnabled = await UserQueries.isAntiViewOnceEnabled(senderJid, telegramId)
        return {
          response: `🔍 *Anti-ViewOnce Status*\n\nStatus: ${isEnabled ? "✅ Enabled" : "❌ Disabled"}\n\n${isEnabled ? "ViewOnce messages from anywhere will be forwarded to you." : "ViewOnce messages will not be forwarded."}`,
          mentions: [],
        }
      }

      const enable = ["on", "enable"].includes(action)

      try {
        await UserQueries.setAntiViewOnce(senderJid, enable, telegramId)

        const status = enable ? "enabled" : "disabled"
        const emoji = enable ? "✅" : "❌"

        return {
          response: `${emoji} *Anti-ViewOnce ${status.toUpperCase()}*\n\nViewOnce message forwarding has been ${status}.\n\n${enable ? "🔍 ViewOnce messages from any chat will now be forwarded to you here." : "⏸️ ViewOnce messages will no longer be forwarded."}`,
          mentions: [],
        }
      } catch (dbError) {
        console.error("[AntiViewOnce] Database error:", dbError)
        return {
          response: "❌ Failed to update anti-viewonce settings. Please try again.",
          mentions: [],
        }
      }
    } catch (error) {
      console.error("[AntiViewOnce] Plugin error:", error)
      return {
        response: "❌ An error occurred while processing the command.",
        mentions: [],
      }
    }
  },
}


