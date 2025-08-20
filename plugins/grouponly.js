import { logger } from "../utils/logger.js"
import { pool } from "../config/database.js"

export default {
  name: "Group Only",
  description: "Enable/disable bot replies in groups (CRITICAL: Default OFF)",
  commands: ["grouponly"],
  category: "group",
  adminOnly: true,
  usage: "• `.grouponly on` - Enable bot replies in groups\n• `.grouponly off` - Disable bot replies in groups\n• `.grouponly status` - Check current status",

  async execute(sock, sessionId, args, context) {
    const action = args[0]?.toLowerCase()
    const groupJid = context.from

    if (!context.isGroup) {
      return { response: "❌ This command can only be used in groups!" }
    }

    try {
      switch (action) {
        case "on":
          await this.enableGroupOnly(groupJid)
          return {
            response:
              "✅ *Group replies enabled!*\n\n" +
              "The bot will now respond to commands in this group.\n\n" +
              "⚠️ Use `.grouponly off` to disable.",
          }

        case "off":
          await this.disableGroupOnly(groupJid)
          return {
            response:
              "❌ *Group replies disabled!*\n\n" +
              "The bot will no longer respond to commands in this group.\n\n" +
              "✅ Use `.grouponly on` to re-enable.",
          }

        case "status":
          const status = await this.getGroupOnlyStatus(groupJid)
          return {
            response:
              `🤖 *Bot Reply Status:*\n\n` +
              `Current: ${status ? "✅ Enabled" : "❌ Disabled"}\n\n` +
              `${status ? "Bot will respond to commands" : "Bot will ignore commands"}`,
          }

        default:
          const currentStatus = await this.getGroupOnlyStatus(groupJid)
          return {
            response:
              "🤖 *Group Only Commands:*\n\n" +
              "• `.grouponly on` - Enable bot replies\n" +
              "• `.grouponly off` - Disable bot replies\n" +
              "• `.grouponly status` - Check current status\n\n" +
              `Current Status: ${currentStatus ? "✅ Enabled" : "❌ Disabled"}\n\n` +
              "⚠️ *Important:* By default, the bot does NOT reply in groups until enabled.",
          }
      }
    } catch (error) {
      logger.error("Error in grouponly command:", error)
      return { response: "❌ Error managing group reply settings" }
    }
  },

  async enableGroupOnly(groupJid) {
    await pool.query(
      `
      INSERT INTO groups (jid, grouponly_enabled, updated_at)
      VALUES ($1, true, NOW())
      ON CONFLICT (jid)
      DO UPDATE SET grouponly_enabled = true, updated_at = NOW()
    `,
      [groupJid],
    )

    logger.info(`Group replies enabled for group ${groupJid}`)
  },

  async disableGroupOnly(groupJid) {
    await pool.query(
      `
      UPDATE groups 
      SET grouponly_enabled = false, updated_at = NOW()
      WHERE jid = $1
    `,
      [groupJid],
    )

    logger.info(`Group replies disabled for group ${groupJid}`)
  },

  async getGroupOnlyStatus(groupJid) {
    const result = await pool.query(
      `
      SELECT grouponly_enabled FROM groups
      WHERE jid = $1
    `,
      [groupJid],
    )

    // Default is FALSE - bot doesn't reply in groups unless explicitly enabled
    return result.rows.length > 0 ? result.rows[0].grouponly_enabled : false
  },
}
