import { createComponentLogger } from "../utils/logger.js"
import pluginLoader from "../utils/plugin-loader.js"

const log = createComponentLogger("PLUGIN")

export default {
  name: "Commands",
  description: "Show all available commands organized by category",
  commands: ["commands", "cmd", "allcommands"],
  category: "both",
  adminOnly: false,
  usage: "• `.commands` - Show all available commands\n• `.cmd` - Alias for commands\n• `.allcommands` - Alias for commands",

  async execute(sock, sessionId, args, context) {
    try {
      const isGroup = context.isGroup
      
      // Get all commands based on context
      const allCommands = pluginLoader.getAvailableCommands()
      
      // Organize commands by category
      const categories = {
        group: [],
        both: []
      }
      
      allCommands.forEach(cmd => {
        if (cmd.category === 'group' || cmd.category === 'both') {
          if (cmd.category === 'group' && !isGroup) return // Skip group commands in private chats
          categories[cmd.category].push(cmd)
        }
      })
      
      let response = `📚 *Available Commands*\n\n`
      
      // Add group commands if in a group
      if (isGroup && categories.group.length > 0) {
        response += `*👥 GROUP COMMANDS:*\n`
        categories.group.forEach(cmd => {
          const prefix = cmd.adminOnly ? "👑 " : "• "
          const adminNote = cmd.adminOnly ? " (Admin Only)" : ""
          response += `${prefix}.${cmd.command} - ${cmd.description}${adminNote}\n`
        })
        response += "\n"
      }
      
      // Add universal commands
      if (categories.both.length > 0) {
        response += `*🌐 UNIVERSAL COMMANDS:*\n`
        categories.both.forEach(cmd => {
          const prefix = cmd.adminOnly ? "👑 " : "• "
          const adminNote = cmd.adminOnly ? " (Admin Only)" : ""
          response += `${prefix}.${cmd.command} - ${cmd.description}${adminNote}\n`
        })
        response += "\n"
      }
      
      // Add usage instructions
      response += `💡 *Usage:* Type \`.help <command>\` for detailed help\n`
      response += `📱 *Example:* \`.help ping\`\n\n`
      
      if (isGroup) {
        response += `⚠️ *Important:* Bot replies in groups must be enabled with \`.grouponly on\`\n`
        response += `👑 *Admin commands* require group admin privileges`
      }
      
      response += `\n🔙 Use \`.menu\` to return to main menu`

      log.info(`Commands list shown to ${context.sender} in ${isGroup ? 'group' : 'private chat'}`)

      return { response }
    } catch (error) {
      log.error("Error in commands command:", error)
      return { response: "❌ Error loading commands list" }
    }
  },
}
