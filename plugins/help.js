import { createComponentLogger } from "../utils/logger.js"
import pluginLoader from "../utils/plugin-loader.js"

const log = createComponentLogger("PLUGIN")

export default {
  name: "Help",
  description: "Show available commands and help information",
  commands: ["help", "menu"],
  category: "both",
  adminOnly: false,
  usage: "• `.help` - Show available commands\n• `.help <command>` - Show detailed help for specific command\n• `.menu` - Alias for help",

  async execute(sock, sessionId, args, context) {
    try {
      const commandFilter = args[0]?.toLowerCase()

      if (commandFilter) {
        return await this.getCommandHelp(commandFilter, context)
      }

      return await this.getGeneralHelp(context)
    } catch (error) {
      log.error("Error in help command:", error)
      return { response: "❌ Error loading help information" }
    }
  },

  async getGeneralHelp(context) {
    const isGroup = context.isGroup
    const isAdmin = context.senderIsAdmin
    
    // Get commands based on context
    let commands = []
    if (isGroup) {
      commands = pluginLoader.getAvailableCommands("group")
    } else {
      commands = pluginLoader.getAvailableCommands("both")
    }

    let response = `📚 *Available Commands*\n\n`

    // Group commands by category
    const categories = {}
    commands.forEach((cmd) => {
      if (!categories[cmd.category]) {
        categories[cmd.category] = []
      }
      categories[cmd.category].push(cmd)
    })

    // Display commands
    Object.entries(categories).forEach(([category, cmds]) => {
      response += `*${category.toUpperCase()} COMMANDS:*\n`
      cmds.forEach((cmd) => {
        const prefix = cmd.adminOnly ? "👑 " : "• "
        const adminNote = cmd.adminOnly ? " (Admin Only)" : ""
        response += `${prefix}.${cmd.command} - ${cmd.description}${adminNote}\n`
      })
      response += "\n"
    })

    response += `💡 *Usage:* Type \`.help <command>\` for detailed help\n`
    response += `📱 *Example:* \`.help ping\`\n\n`

    if (isGroup) {
      response += `⚠️ *Important:* Bot replies in groups must be enabled with \`.grouponly on\``
    }

    return { response }
  },

  async getCommandHelp(commandName, context) {
    const isGroup = context.isGroup
    const commands = isGroup ? 
      pluginLoader.getAvailableCommands("group") : 
      pluginLoader.getAvailableCommands("both")
    
    const command = commands.find((cmd) => 
      cmd.command === commandName
    )

    if (!command) {
      return {
        response: `❓ Command \`.${commandName}\` not found.\n\nUse \`.help\` to see all available commands.`,
      }
    }

    let response = `📖 *Help: .${commandName}*\n\n`
    response += `📝 Description: ${command.description}\n`
    response += `📂 Category: ${command.category}\n`
    response += `👑 Admin Only: ${command.adminOnly ? "Yes" : "No"}\n`
    response += `🤖 Plugin: ${command.name}\n\n`

    // Get the actual plugin to access its metadata
    const plugin = pluginLoader.getPluginByCommand(commandName)
    
    // Show all available commands for this plugin if it has multiple commands
    if (plugin && plugin.commands && plugin.commands.length > 1) {
      const aliases = plugin.commands.filter(cmd => cmd !== commandName)
      if (aliases.length > 0) {
        response += `🔄 *Aliases:* ${aliases.map(cmd => `.${cmd}`).join(', ')}\n\n`
      }
    }

    // Generate usage information dynamically based on plugin metadata
    if (plugin) {
      response += `💡 *Usage:* \`.${commandName}\``
      
      // Add category-specific information
      if (plugin.category === "group") {
        response += `\n🌐 *Available in:* Groups only`
        if (plugin.adminOnly) {
          response += `\n👑 *Requires:* Group admin privileges`
        }
      } else if (plugin.category === "both") {
        response += `\n🌐 *Available in:* Groups and Private Chats`
        if (plugin.adminOnly) {
          response += `\n👑 *Requires:* Admin privileges (group) or owner (private)`
        }
      }
      
      // Add plugin-specific usage hints if available
      if (plugin.usage) {
        response += `\n\n📱 *Usage Examples:*\n${plugin.usage}`
      }
      

    } else {
      response += `\n💡 *Usage:* \`.${commandName}\``
    }

    response += `\n\n🔙 Use \`.commands\` to see all commands or \`.menu\` for main menu`

    return { response }
  },
}
