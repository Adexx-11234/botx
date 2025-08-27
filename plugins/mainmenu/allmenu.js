import path from "path"

export default {
  name: "allmenu",
  commands: ["allmenu", "allcommands", "commandlist", "help"],
  description: "Display all available commands from all categories with descriptions and beautiful formatting",
  adminOnly: false,

  async execute(sock, sessionId, args, m) {
    try {
      // Import menu system
      const { default: menuSystem } = await import("../../utils/menu-system.js")

      const searchTerm = args.join(" ").toLowerCase()

      // Generate all menu with optional search
      let menuText
      if (searchTerm) {
        menuText = await this.generateSearchResults(menuSystem, searchTerm)
      } else {
        menuText = await menuSystem.generateAllMenu()
      }

      const contextInfo = {
        externalAdReply: {
          title: searchTerm ? `🔍 Search Results: "${searchTerm}"` : "📚 All Commands",
          body: searchTerm ? "Filtered command list" : "Complete list of bot commands",
          thumbnailUrl: "https://i.imgur.com/placeholder.jpg",
          sourceUrl: "https://github.com/yourusername/bot",
          mediaType: 1,
          renderLargerThumbnail: false,
        },
      }

      // Send menu with enhanced formatting
      await sock.sendMessage(m.chat, {
        text: menuText,
        contextInfo,
      }, {quoted: m})

    } catch (error) {
      console.error("[AllMenu] Error:", error)
      await sock.sendMessage(m.chat, {
        text: "❌ Error generating command list. Please try again.\n\n*Usage:*\n• `.allmenu` - Show all commands\n• `.allmenu <search>` - Search commands",
      })
      return { success: false, error: error.message }
    }
  },
}
