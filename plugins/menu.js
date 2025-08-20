import { createComponentLogger } from "../utils/logger.js";
import {
  getCurrentTimeAndGreeting,
  formatUptime,
  getLatency,
} from "../utils/time-utils.js";
import pluginLoader from "../utils/plugin-loader.js";

const log = createComponentLogger("PLUGIN");

export default {
  name: "Menu",
  description: "Show main bot menu with user info and bot stats",
  commands: ["menu", "start", "bot"],
  category: "both",
  adminOnly: false,
  usage:
    "• `.menu` - Show main bot menu with interactive button\n• `.start` - Alias for menu\n• `.bot` - Alias for menu",

  async execute(sock, sessionId, args, context) {
    try {
      // Use default wallpaper to avoid 429 rate limiting errors
      let wallpaperImage = "https://i.imgur.com/example.jpg";

      // Optionally try to get profile picture with better error handling
      try {
        // Add a small delay and timeout to avoid rate limiting
        const profilePicture = await Promise.race([
          sock.profilePictureUrl(context.sender, "image"),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 3000)
          ),
        ]);
        if (profilePicture) {
          wallpaperImage = profilePicture;
        }
      } catch (err) {
        log.warn("Could not get profile picture, using default:", err.message);
        // Keep using default wallpaper
      }

      const { time, date, greeting } = getCurrentTimeAndGreeting();
      const uptime = formatUptime(process.uptime());
      const latency = getLatency();

      // Get user info with better JID handling
      const sender = context.sender;
      let userName = "User";

      try {
        // Handle JID parsing more safely
        if (sender && sender.includes("@")) {
          userName = sender.split("@")[0];
        } else {
          // Fallback for different JID formats
          userName = sender || "User";
        }
      } catch (jidError) {
        log.warn("Error parsing JID for username:", jidError.message);
        userName = "User";
      }

      const isGroup = context.isGroup;
      const userRole = context.senderIsAdmin ? "Admin" : "Member";

      // Get bot stats
      const stats = pluginLoader.getPluginStats();
      const totalPlugins = stats.totalPlugins;
      const totalCommands = stats.totalCommands;

      // Create beautiful menu
      const menu = `╭━━━✦══✦━━━╮
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
│ 🌐 Chat Type: ${isGroup ? "Group" : "Private"}
│ 👑 Your Role: ${userRole}
│  Prefix: [ . ]
│  
╰━━━✦══✦━━━╯

💡 Click the button below to see all available commands!`;

      // Create button for detailed commands
      const buttons = [
        {
          buttonId: "allcommands",
          buttonText: {
            displayText: "📚 All Commands",
          },
          type: 1,
        },
      ];

      const buttonMessage = {
        image: { url: wallpaperImage },
        caption: menu,
        footer: "WhatsApp-Telegram Bot",
        buttons,
        headerType: 1,
        viewOnce: true,
      };

      // Get chat ID safely
      const chatId =
        context.chat ||
        context.chatId ||
        context.from ||
        context.key?.remoteJid;
      const messageToQuote = context.message || context.msg || context.m;

      // Send the message directly using sock.sendMessage
      await sock.sendMessage(chatId, buttonMessage, {
        quoted: messageToQuote,
      });

      log.info(`Menu command executed by ${context.sender}`);
    } catch (error) {
      log.error("Error in menu command:", error);

      try {
        // Try to send error message
        const chatId =
          context.chat ||
          context.chatId ||
          context.from ||
          context.key?.remoteJid;
        const messageToQuote = context.message || context.msg || context.m;

        await sock.sendMessage(
          chatId,
          {
            text: "❌ Error loading menu. Please try again later.",
          },
          {
            quoted: messageToQuote,
          }
        );
      } catch (sendError) {
        log.error("Failed to send error message:", sendError);
      }
    }
  },
};
