import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: "Menu",
  description: "Show main bot menu with all available buttons",
  commands: ["menu", "start", "bot", "help"],
  category: "both",
  adminOnly: false,
  usage: "• .menu - Show complete menu with all categories",
  async execute(sock, sessionId, args, m) {
    try {
      // Import menu system
      const { default: menuSystem } = await import("../../utils/menu-system.js");
      
      // Get user info
      const userInfo = {
        name: m.pushName || "User",
        id: m.sender,
      };
      
      // Get menu folders
      const folders = await menuSystem.scanMenuFolders();
      const currentTime = new Date();
      const timeGreeting = menuSystem.getTimeGreeting();
      
      // Build caption text
      let captionText = `┌─❖\n`;
      captionText += `│ PAUL BOT\n`;
      captionText += `└┬❖\n`;
      captionText += `┌┤ ${timeGreeting}\n`;
      captionText += `│└────────┈⳹\n`;
      captionText += `│👤 ᴜsᴇʀ: ${userInfo.name}\n`;
      captionText += `│📅 ᴅᴀᴛᴇ: ${currentTime.toLocaleDateString()}\n`;
      captionText += `│⏰ ᴛɪᴍᴇ: ${currentTime.toLocaleTimeString()}\n`;
      captionText += `│🛠 ᴠᴇʀsɪᴏɴ: 1.0.0\n`;
      captionText += `└─────────────┈⳹\n\n`;
      captionText += `🎯 Select a menu category:\n`;
      captionText += `📊 Total Categories: ${folders.length + 1}\n\n`;
      
      // Create buttons using the OLD reliable format that was working
      const buttons = [];
      
      // Add allmenu button first
      buttons.push({
        buttonId: '.allmenu',
        buttonText: { displayText: '📶 ALL MENU' },
        type: 1
      });
      
      // Priority order for menus
      const priorityMenus = [
        'mainmenu', 'groupmenu', 'downloadmenu', 'gamemenu', 
        'aimenu', 'ownermenu', 'convertmenu', 'bugmenu'
      ];
      
      // Sort folders by priority, then alphabetically
      const sortedFolders = folders.sort((a, b) => {
        const aIndex = priorityMenus.indexOf(a.name.toLowerCase());
        const bIndex = priorityMenus.indexOf(b.name.toLowerCase());
        if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      
      // Add menu buttons (limit to prevent button overflow)
      for (let i = 0; i < Math.min(sortedFolders.length, 10); i++) {
        const folder = sortedFolders[i];
        const emoji = menuSystem.getMenuEmoji(folder.name);
        buttons.push({
          buttonId: `.${folder.name.toLowerCase()}`,
          buttonText: { displayText: `${emoji} ${folder.displayName.toUpperCase()}` },
          type: 1
        });
      }
      
      // Handle image with multiple fallback paths
      let wallpaperImage;
      let useLocalFile = false;
      
      try {
        // Try to get user's profile picture first
        wallpaperImage = await sock.profilePictureUrl(m.sender, "image");
        console.log("[Menu] Using user profile picture");
      } catch (err) {
        console.warn("[Menu] Profile picture not found:", err.message);
        
        // Try multiple possible paths for the default image
        const possiblePaths = [
          path.resolve(process.cwd(), "Defaults", "images", "menu.jpg"),
          path.resolve(process.cwd(), "defaults", "images", "menu.jpg"), 
          path.resolve(process.cwd(), "assets", "images", "menu.jpg"),
          path.resolve(process.cwd(), "images", "menu.jpg"),
          path.resolve(process.cwd(), "menu.jpg"),
          "./Defaults/images/menu.jpg",
          "./defaults/images/menu.jpg",
          "./assets/images/menu.jpg",
          "./images/menu.jpg",
          "./menu.jpg"
        ];
        
        let imageFound = false;
        for (const imagePath of possiblePaths) {
          if (fs.existsSync(imagePath)) {
            wallpaperImage = imagePath;
            useLocalFile = true;
            imageFound = true;
            console.log(`[Menu] Using default image from: ${imagePath}`);
            break;
          }
        }
        
        if (!imageFound) {
          console.warn("[Menu] No default image found, using online placeholder");
          wallpaperImage = "https://i.imgur.com/4F8RT6w.jpg"; // Placeholder image
        }
      }
      
      // Create message with proper format
      let buttonMessage;
      
      if (useLocalFile && wallpaperImage) {
        // Use local file
        buttonMessage = {
          image: fs.readFileSync(wallpaperImage),
          caption: captionText,
          footer: "© PAUL BOT •",
          buttons: buttons,
          headerType: 4,
        };
      } else {
        // Use URL (profile pic or placeholder)
        buttonMessage = {
          image: { url: wallpaperImage },
          caption: captionText,
          footer: "© PAUL BOT •",
          buttons: buttons,
          headerType: 4,
        };
      }
      
      await sock.sendMessage(m.chat, buttonMessage, { quoted: m });
      return { success: true };
      
    } catch (error) {
      console.error("[Menu] Error:", error);
      return { success: false, error: error.message };
    }
  },
};