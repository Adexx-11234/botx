export default {
  name: "Menu",
  description: "Show main bot menu with list of available commands",
  commands: ["menu", "start", "bot", "help"],
  category: "both",
  adminOnly: false,
  usage: "• `.menu` - Show complete menu with all categories",

  async execute(sock, sessionId, args, m) {
    try {
      // Import menu system
      const { default: menuSystem } = await import("../../utils/menu-system.js");
      
      // Get user information
      const userInfo = this.getUserInfo(m);
      
      // Get menu folders and current time
      const folders = await menuSystem.scanMenuFolders();
      const currentTime = new Date();
      const timeGreeting = menuSystem.getTimeGreeting();
      
      // Build header caption
      const headerCaption = this.buildHeaderCaption(userInfo, currentTime, timeGreeting, folders.length);
      
      // Create essential buttons (only ping and allmenu)
      const essentialButtons = this.createEssentialButtons();
      
      // Create list sections for all menu categories
      const listSections = await this.createListSections(folders, menuSystem);
      
      // Get user's profile picture
      const wallpaperImage = await this.getUserProfilePicture(sock, m.sender);
      
      // Send combined message with buttons and list
      await this.sendCombinedMessage(sock, m, headerCaption, essentialButtons, listSections, wallpaperImage);
      
      return { success: true };
      
    } catch (error) {
      console.error("[Menu] Error:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Extract user information from message
   */
  getUserInfo(m) {
    return {
      name: m.pushName || "User",
      id: m.sender,
    };
  },

  /**
   * Build the header caption with bot info and user details
   */
  buildHeaderCaption(userInfo, currentTime, timeGreeting, totalCategories) {
    let caption = `┌─❖\n`;
    caption += `│ PAUL BOT\n`;
    caption += `└┬❖\n`;
    caption += `┌┤ ${timeGreeting}\n`;
    caption += `│└────────┈⳹\n`;
    caption += `│👤 ᴜsᴇʀ: ${userInfo.name}\n`;
    caption += `│📅 ᴅᴀᴛᴇ: ${currentTime.toLocaleDateString()}\n`;
    caption += `│⏰ ᴛɪᴍᴇ: ${currentTime.toLocaleTimeString()}\n`;
    caption += `│🛠 ᴠᴇʀsɪᴏɴ: 1.0.0\n`;
    caption += `└─────────────┈⳹\n\n`;
    caption += `🎯 Quick Actions & Menu Categories:\n`;
    caption += `📊 Total Categories: ${totalCategories + 1}\n`;
    caption += `📋 Use buttons for quick actions or browse the detailed menu list\n`;
    
    return caption;
  },

  /**
   * Create essential buttons (ping and allmenu only)
   */
  createEssentialButtons() {
    return [
      {
        buttonId: '.ping',
        buttonText: { displayText: '🏓 PING' },
        type: 1
      },
      {
        buttonId: '.allmenu',
        buttonText: { displayText: '📶 ALL MENU' },
        type: 1
      }
    ];
  },

  /**
   * Create list sections for all menu categories
   */
  async createListSections(folders, menuSystem) {
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

    // Create list sections
    const sections = [];
    
    // Main section with core commands
    const coreRows = [
      {
        title: "📶 All Menu",
        description: "Display all available commands",
        rowId: ".allmenu"
      },
      {
        title: "🏓 Ping",
        description: "Check bot response time",
        rowId: ".ping"
      }
    ];

    sections.push({
      title: "🎯 Core Commands",
      rows: coreRows
    });

    // Create sections for each menu category
    for (const folder of sortedFolders) {
      const emoji = menuSystem.getMenuEmoji(folder.name);
      const rows = [
        {
          title: `${emoji} ${folder.displayName}`,
          description: `Access ${folder.displayName.toLowerCase()} commands`,
          rowId: `.${folder.name.toLowerCase()}`
        }
      ];

      // If folder has commands, add them to the section
      if (folder.commands && folder.commands.length > 0) {
        // Add up to 10 commands per section (WhatsApp limit)
        const commandsToShow = folder.commands.slice(0, 9); // Leave space for main menu item
        
        for (const command of commandsToShow) {
          rows.push({
            title: `• ${command.name}`,
            description: command.description || "No description available",
            rowId: `.${command.name}`
          });
        }
      }

      sections.push({
        title: `${emoji} ${folder.displayName.toUpperCase()}`,
        rows: rows
      });
    }

    return sections;
  },

  /**
   * Get user's profile picture or return default
   */
  async getUserProfilePicture(sock, sender) {
    try {
      return await sock.profilePictureUrl(sender, "image");
    } catch (err) {
      console.warn("[Menu] Using default image:", err.message);
      return "../../Defaults/images/menu.jpg";
    }
  },

  /**
   * Send combined message with buttons and list together as ONE message
   */
  async sendCombinedMessage(sock, m, caption, buttons, sections, image) {
    const combinedMessage = {
      image: { url: image },
      caption: caption,
      footer: "© PAUL BOT • Use quick buttons above or select from detailed menu below",
      title: "🤖 Paul Bot Complete Menu",
      buttonText: "📂 Browse All Commands",
      buttons: buttons,
      sections: sections,
      headerType: 4, // Image header
    };

    await sock.sendMessage(m.chat, combinedMessage, { quoted: m });
  }
};