import { createComponentLogger } from "../utils/logger.js"
import { getCurrentTimeAndGreeting, formatUptime, getLatency } from "../utils/time-utils.js"
import pluginLoader from "../utils/plugin-loader.js"

const log = createComponentLogger("PLUGIN")

export default {
  name: "Menu",
  description: "Show main bot menu with user info and bot stats",
  commands: ["menu", "start", "bot"],
  category: "both",
  adminOnly: false,
  usage: "• `.menu` - Show main bot menu with interactive button\n• `.start` - Alias for menu\n• `.bot` - Alias for menu",

  async execute(sock, sessionId, args, context) {
    try {
      const { time, date, greeting } = getCurrentTimeAndGreeting()
      const uptime = formatUptime(process.uptime())
      const latency = getLatency()
      
      // Get user info
      const sender = context.sender
      const userName = sender.split('@')[0]
      const isGroup = context.isGroup
      const userRole = context.senderIsAdmin ? 'Admin' : 'Member'
      
      // Get bot stats
      const stats = pluginLoader.getPluginStats()
      const totalPlugins = stats.totalPlugins
      const totalCommands = stats.totalCommands
      
      // Create beautiful menu
      const menu = 
`╭━━━✦══✦━━━╮
│  Hi, ${userName}                      
│ ✨ ${greeting}               
│  Latency: ${latency.toFixed(2)} ms        
│ ⏱️ Uptime: ${uptime}
│  Time: ${time}  
│   Date: ${date}    
╰━━━✦══✦━━━╯
╭━━━✦══✦━━━╮  
│ Bot Information
│ 🤖 Total Plugins: ${totalPlugins}   
│ 📝 Total Commands: ${totalCommands}                      
│ 🌐 Chat Type: ${isGroup ? 'Group' : 'Private'}
│ 👑 Your Role: ${userRole}
│  Prefix: [ . ]
│  
╰━━━✦══✦━━━╯

💡 Click the button below to see all available commands!`

      // Create button for detailed commands
      const buttons = [
        {
          buttonId: "allcommands",
          buttonText: {
            displayText: "📚 All Commands"
          },
          type: 1
        }
      ]

      const buttonMessage = {
        image: { url: "https://i.imgur.com/example.jpg" }, // You can replace with your bot's image
        caption: menu,
        footer: "WhatsApp-Telegram Bot",
        buttons,
        headerType: 1,
        viewOnce: true
      }

      log.info(`Menu command executed by ${context.sender}`)

      return { 
        response: buttonMessage,
        isButton: true
      }
    } catch (error) {
      log.error("Error in menu command:", error)
      return { response: "❌ Error loading menu" }
    }
  },
}
