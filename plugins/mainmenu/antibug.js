import { createComponentLogger } from "../../utils/logger.js"
import { GroupQueries, ViolationQueries } from "../../database/query.js"
import AdminChecker from "../../whatsapp/utils/admin-checker.js"

const logger = createComponentLogger("ANTI-VIRTEX")

export default {
  name: "Anti-Virtex",
  description: "Automatically detect and handle virtex/bug messages to protect users",
  commands: ["antivirtex", "antibug"],
  adminOnly: false,
 category: "both",
  usage:
    "• `.antivirtex status` - Check protection status\n• **Note:** Protection is always enabled by default",

  async execute(sock, sessionId, args, m) {
    const action = args[0]?.toLowerCase()

    try {
      switch (action) {
        case "status":
          if (m.isGroup) {
            return {
              response:
                "🛡️ *Anti-Virtex Status*\n\n" +
                "✅ **Always Enabled** - Protection is active 24/7\n\n" +
                "🔍 **Detection Coverage:**\n" +
                "• Long text messages (>4000 chars)\n" +
                "• Native flow message exploits\n" +
                "• Sticker pack bombs\n" +
                "• Status broadcast exploits\n" +
                "• Button message exploits\n" +
                "• View-once message exploits\n" +
                "• Unicode/special character bombs\n\n" +
                "⚡ **Auto Actions:**\n" +
                "• Delete malicious messages\n" +
                "• Remove violators from groups\n" +
                "• Block & clear chat in DMs\n" +
                "• Log all incidents"
            }
          } else {
            return {
              response:
                "🛡️ *Anti-Virtex Protection*\n\n" +
                "✅ **Always Active** in all chats\n" +
                "🔒 Virtex senders will be **blocked immediately**\n" +
                "🗑️ Chat history will be **cleared automatically**"
            }
          }

        default:
          return {
            response:
              "🛡️ *Anti-Virtex Protection*\n\n" +
              "**This protection runs automatically!**\n\n" +
              "📱 **Private Chats:** Block + Clear chat\n" +
              "👥 **Groups:** Delete message + Remove user\n" +
              "🛡️ **Admins:** Always protected\n\n" +
              "Use `.antivirtex status` to see details"
          }
      }
    } catch (error) {
      logger.error("Error in antivirtex command:", error)
      return { response: "❌ Error checking anti-virtex status" }
    }
  },

  async isEnabled(groupJid) {
    // Always enabled - no need to check database
    return true
  },

  async shouldProcess(m) {
    // Process all messages (groups and private chats)
    return true
  },

  async processMessage(sock, sessionId, m) {
    try {
      // Always check for virtex (enabled by default everywhere)
      
      // Skip if sender is the bot itself
      if (m.sender === sock.user?.id || m.sender?.includes(sock.user?.id?.split('@')[0])) {
        return
      }

      // For groups: Skip if sender is admin (unless it's a severe exploit)
      if (m.isGroup) {
        const adminChecker = new AdminChecker()
        const isAdmin = await adminChecker.isGroupAdmin(sock, m.chat, m.sender)
        const isBotAdmin = await adminChecker.isBotAdmin(sock, m.chat)
        
        // Skip admin check for severe exploits that could crash the entire group
        const isSevereExploit = await this.isSevereExploit(m)
        
        if (isAdmin && !isSevereExploit) {
          logger.info(`Skipping virtex check for admin: ${m.sender}`)
          return
        }
        
        // Skip if bot is not admin (can't take action)
        if (!isBotAdmin && !isSevereExploit) {
          return
        }
      }
      
      // Detect virtex/bug messages
      const virtexResult = await this.detectVirtex(m)
      
      if (virtexResult.isVirtex) {
        await this.handleVirtexDetection(sock, m, virtexResult)
      }
      
    } catch (error) {
      logger.error("Error processing message for virtex detection:", error)
    }
  },

  async detectVirtex(m) {
    try {
      const detectionReasons = []
      
      // 1. Check message text length (original detection)
      if (m.body && m.body.length > 4000) {
        detectionReasons.push("long_text")
        logger.warn(`Long text detected: ${m.body.length} characters from ${m.sender}`)
      }
      
      // 2. Check native flow message exploits
      if (m.msg?.nativeFlowMessage?.messageParamsJson?.length > 3500) {
        detectionReasons.push("native_flow_exploit")
        logger.warn(`Native flow exploit detected from ${m.sender}`)
      }
      
      // 3. Check for sticker pack bombs
      if (m.msg?.stickerPackMessage) {
        const stickerPack = m.msg.stickerPackMessage
        if (stickerPack.name && stickerPack.name.length > 1000) {
          detectionReasons.push("sticker_pack_bomb")
          logger.warn(`Sticker pack bomb detected from ${m.sender}`)
        }
      }
      
      // 4. Check for button message exploits
      if (m.msg?.buttonsMessage) {
        const buttons = m.msg.buttonsMessage
        if (buttons.contentText && buttons.contentText.includes("\u0000".repeat(1000))) {
          detectionReasons.push("button_exploit")
          logger.warn(`Button exploit detected from ${m.sender}`)
        }
        
        // Check for excessive button text
        if (buttons.buttons) {
          for (const button of buttons.buttons) {
            if (button.buttonText?.displayText?.length > 10000) {
              detectionReasons.push("button_text_bomb")
              logger.warn(`Button text bomb detected from ${m.sender}`)
              break
            }
          }
        }
      }
      
      // 5. Check for view-once message exploits
      if (m.msg?.viewOnceMessage) {
        const viewOnce = m.msg.viewOnceMessage
        if (viewOnce.message?.stickerMessage?.contextInfo?.mentionedJid?.length > 1000) {
          detectionReasons.push("viewonce_mention_bomb")
          logger.warn(`View-once mention bomb detected from ${m.sender}`)
        }
      }
      
      // 6. Check for excessive mentions
      if (m.mentionedJid && m.mentionedJid.length > 100) {
        detectionReasons.push("mention_bomb")
        logger.warn(`Mention bomb detected: ${m.mentionedJid.length} mentions from ${m.sender}`)
      }
      
      // 7. Check for unicode/special character bombs
      if (m.body) {
        const specialCharCount = (m.body.match(/[^\x00-\x7F]/g) || []).length
        const totalLength = m.body.length
        
        if (specialCharCount > 1000 || (specialCharCount / totalLength > 0.5 && totalLength > 100)) {
          detectionReasons.push("unicode_bomb")
          logger.warn(`Unicode bomb detected from ${m.sender}`)
        }
        
        // Check for specific problematic characters
        const problematicPatterns = [
          /\u0000{100,}/, // Null character spam
          /[\uD800-\uDFFF]{50,}/, // Surrogate pairs spam
          /[ꦾ]{100,}/, // Specific problematic unicode
          /[𐍃𐌍𐌉𐌕𐌂𐌇]{50,}/, // Ancient script spam
        ]
        
        for (const pattern of problematicPatterns) {
          if (pattern.test(m.body)) {
            detectionReasons.push("problematic_unicode")
            logger.warn(`Problematic unicode pattern detected from ${m.sender}`)
            break
          }
        }
      }
      
      // 8. Check message structure for exploits
      if (m.msg) {
        const msgString = JSON.stringify(m.msg)
        if (msgString.length > 50000) {
          detectionReasons.push("large_message_object")
          logger.warn(`Large message object detected from ${m.sender}`)
        }
      }
      
      // 9. Check for status broadcast exploits
      if (m.key?.remoteJid === "status@broadcast" && m.msg?.contextInfo?.mentionedJid?.length > 100) {
        detectionReasons.push("status_broadcast_exploit")
        logger.warn(`Status broadcast exploit detected from ${m.sender}`)
      }
      
      return {
        isVirtex: detectionReasons.length > 0,
        reasons: detectionReasons,
        severity: this.calculateSeverity(detectionReasons)
      }
      
    } catch (error) {
      logger.error("Error detecting virtex:", error)
      return { isVirtex: false, reasons: [], severity: "low" }
    }
  },
  
  calculateSeverity(reasons) {
    const severeReasons = [
      "native_flow_exploit",
      "sticker_pack_bomb", 
      "viewonce_mention_bomb",
      "button_exploit",
      "status_broadcast_exploit"
    ]
    
    const moderateReasons = [
      "long_text",
      "mention_bomb",
      "button_text_bomb"
    ]
    
    if (reasons.some(reason => severeReasons.includes(reason))) {
      return "severe"
    } else if (reasons.some(reason => moderateReasons.includes(reason))) {
      return "moderate"
    } else {
      return "low"
    }
  },
  
  async isSevereExploit(m) {
    const virtexResult = await this.detectVirtex(m)
    return virtexResult.isVirtex && virtexResult.severity === "severe"
  },

  async handleVirtexDetection(sock, m, virtexResult) {
    try {
      const { reasons, severity } = virtexResult
      const reasonText = reasons.join(", ")
      
      logger.warn(`Virtex detected from ${m.sender}: ${reasonText} (severity: ${severity})`)
      
      if (m.isGroup) {
        // GROUP CHAT HANDLING
        await this.handleGroupVirtex(sock, m, reasonText, severity)
      } else {
        // PRIVATE CHAT HANDLING
        await this.handlePrivateVirtex(sock, m, reasonText, severity)
      }
      
    } catch (error) {
      logger.error("Error handling virtex detection:", error)
    }
  },
  
  async handleGroupVirtex(sock, m, reasonText, severity) {
    try {
      const adminChecker = new AdminChecker()
      const isBotAdmin = await adminChecker.isBotAdmin(sock, m.chat)
      const isSenderAdmin = await adminChecker.isGroupAdmin(sock, m.chat, m.sender)
      
      // Always delete the malicious message first
      try {
        await sock.sendMessage(m.chat, { 
          delete: { 
            remoteJid: m.chat, 
            fromMe: false, 
            id: m.key.id, 
            participant: m.sender 
          }
        })
        logger.info(`Deleted virtex message from ${m.sender} in ${m.chat}`)
      } catch (deleteError) {
        logger.error("Failed to delete virtex message:", deleteError)
      }
      
      // Track virtex incidents in this group
      await this.trackVirtexIncident(m.chat, m.sender, severity)
      
      if (isBotAdmin) {
        // BOT IS ADMIN - Take full protective action
        
        // Lock the group immediately to prevent further spam
        await this.lockGroup(sock, m.chat, `Virtex attack detected (${reasonText})`)
        
        let actionTaken = "Group locked"
        
        if (isSenderAdmin) {
          // Admin sent virtex - remove them regardless
          try {
            await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
            actionTaken += ", Admin removed"
            logger.warn(`Removed admin ${m.sender} for sending virtex in ${m.chat}`)
          } catch (removeError) {
            logger.error("Failed to remove admin:", removeError)
            actionTaken += ", Failed to remove admin"
          }
        } else {
          // Regular user sent virtex - remove them
          try {
            await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
            actionTaken += ", User removed"
            logger.info(`Removed user ${m.sender} for sending virtex in ${m.chat}`)
          } catch (removeError) {
            logger.error("Failed to remove user:", removeError)
            actionTaken += ", Failed to remove user"
          }
        }
        
        // Send comprehensive warning message
        const warningMessage = {
          text: `🚨 *VIRTEX ATTACK - GROUP LOCKED!*\n\n` +
                `👤 Attacker: @${m.sender.split('@')[0]}\n` +
                `${isSenderAdmin ? '👑 Status: Admin (REMOVED)' : '👤 Status: Member (REMOVED)'}\n` +
                `🔍 Detection: ${reasonText}\n` +
                `⚠️ Severity: ${severity.toUpperCase()}\n` +
                `🔒 Action: ${actionTaken}\n\n` +
                `🛡️ *Group is now protected and locked*\n` +
                `⏰ Admins can unlock when safe`,
          mentions: [m.sender]
        }
        
        await sock.sendMessage(m.chat, warningMessage)
        
        // Unlock after a delay (30 seconds) if no more incidents
        setTimeout(async () => {
          const recentIncidents = await this.getRecentIncidents(m.chat)
          if (recentIncidents <= 1) { // Only the current incident
            await this.unlockGroup(sock, m.chat, "Auto-unlock after virtex cleared")
          }
        }, 30000)
        
      } else {
        // BOT IS NOT ADMIN - Limited actions
        
        // Check if this group is getting excessive virtex
        const recentIncidents = await this.getRecentIncidents(m.chat)
        
        // Send warning (no locking capability)
        const warningMessage = {
          text: `🚨 *VIRTEX DETECTED!*\n\n` +
                `👤 Sender: @${m.sender.split('@')[0]}\n` +
                `🔍 Type: ${reasonText}\n` +
                `⚠️ Severity: ${severity.toUpperCase()}\n` +
                `🗑️ Action: Message deleted\n\n` +
                `⚠️ *Bot needs admin to protect group fully*\n` +
                `📊 Recent incidents: ${recentIncidents}`,
          mentions: [m.sender]
        }
        
        await sock.sendMessage(m.chat, warningMessage)
        
        // If getting excessive (5+ incidents in 10 minutes), exit group
        if (recentIncidents >= 5) {
          await sock.sendMessage(m.chat, {
            text: `🚨 *EXCESSIVE VIRTEX ATTACKS DETECTED!*\n\n` +
                  `📊 ${recentIncidents} incidents in recent minutes\n` +
                  `🚫 Bot cannot protect without admin privileges\n` +
                  `🏃‍♂️ Leaving group for safety\n\n` +
                  `💡 *To prevent this:* Make bot admin before virtex attacks`
          })
          
          // Wait a moment then leave
          setTimeout(async () => {
            try {
              await sock.groupLeave(m.chat)
              logger.warn(`Left group ${m.chat} due to excessive virtex attacks without admin privileges`)
            } catch (leaveError) {
              logger.error("Failed to leave group:", leaveError)
            }
          }, 3000)
        }
      }
      
      // Log the violation with detailed context
      await ViolationQueries.logViolation(
        m.chat,
        m.sender,
        "antivirtex",
        `Virtex attack: ${reasonText} (${isBotAdmin ? 'bot_admin' : 'bot_not_admin'})`,
        { 
          reasons: reasonText, 
          severity,
          botIsAdmin: isBotAdmin,
          senderIsAdmin: isSenderAdmin,
          recentIncidents: await this.getRecentIncidents(m.chat)
        },
        isBotAdmin ? (isSenderAdmin ? "remove_admin" : "remove_user") : "message_delete_only",
        0,
        null
      )
      
    } catch (error) {
      logger.error("Error handling group virtex:", error)
    }
  },
  
  // Track virtex incidents per group
  virtexIncidents: new Map(),
  
  async trackVirtexIncident(groupJid, sender, severity) {
    const now = Date.now()
    const groupKey = groupJid
    
    if (!this.virtexIncidents.has(groupKey)) {
      this.virtexIncidents.set(groupKey, [])
    }
    
    const incidents = this.virtexIncidents.get(groupKey)
    
    // Add new incident
    incidents.push({
      sender,
      severity,
      timestamp: now
    })
    
    // Clean old incidents (older than 10 minutes)
    const validIncidents = incidents.filter(incident => 
      now - incident.timestamp < 10 * 60 * 1000
    )
    
    this.virtexIncidents.set(groupKey, validIncidents)
    
    logger.info(`Tracked virtex incident in ${groupJid}: ${validIncidents.length} recent incidents`)
  },
  
  async getRecentIncidents(groupJid) {
    const incidents = this.virtexIncidents.get(groupJid) || []
    const now = Date.now()
    
    // Count incidents in last 10 minutes
    const recentIncidents = incidents.filter(incident => 
      now - incident.timestamp < 10 * 60 * 1000
    )
    
    return recentIncidents.length
  },
  
  async lockGroup(sock, groupJid, reason) {
    try {
      // Update group settings to restrict messaging
      await sock.groupSettingUpdate(groupJid, 'announcement')
      
      logger.info(`Locked group ${groupJid}: ${reason}`)
      
      // Send lock notification
      await sock.sendMessage(groupJid, {
        text: `🔒 *GROUP LOCKED*\n\n` +
              `📝 Reason: ${reason}\n` +
              `⏰ Status: Only admins can send messages\n` +
              `🔓 Will auto-unlock if safe, or admins can unlock manually`
      })
      
    } catch (error) {
      logger.error("Failed to lock group:", error)
    }
  },
  
  async unlockGroup(sock, groupJid, reason) {
    try {
      // Update group settings to allow everyone to message
      await sock.groupSettingUpdate(groupJid, 'not_announcement')
      
      logger.info(`Unlocked group ${groupJid}: ${reason}`)
      
      // Send unlock notification
      await sock.sendMessage(groupJid, {
        text: `🔓 *GROUP UNLOCKED*\n\n` +
              `📝 Reason: ${reason}\n` +
              `✅ Status: Everyone can send messages again\n` +
              `🛡️ Virtex protection remains active`
      })
      
    } catch (error) {
      logger.error("Failed to unlock group:", error)
    }
  },
  
  async handlePrivateVirtex(sock, m, reasonText, severity) {
    try {
      // Send warning message first (before blocking)
      // Wait a moment for message to send
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Clear chat history with this user
      try {
        await sock.chatModify({ delete: true, lastMessages: [{ key: m.key, messageTimestamp: m.messageTimestamp }] }, m.sender)
      } catch (error) {
        logger.error("Error clearing chat history:", error)
        // Try alternative method to clear chat
        try {
          await sock.sendMessage(m.sender, { delete: { remoteJid: m.sender, fromMe: false, id: m.key.id }})
        } catch (deleteError) {
          logger.error("Error deleting message:", deleteError)
        }
      }
      
      // Block the user
      await sock.updateBlockStatus(m.sender, "block")
      
      logger.warn(`Blocked and cleared chat with virtex sender: ${m.sender} (${reasonText})`)
      
      // Log the incident
      await ViolationQueries.logViolation(
        m.sender, // Use sender as chat ID for private chats
        m.sender,
        "antivirtex",
        `Private chat virtex: ${reasonText}`,
        { reasons: reasonText, severity },
        "block_and_clear",
        0,
        null
      )
      
    } catch (error) {
      logger.error("Error handling private virtex:", error)
      
      // Fallback: at least try to block the user
      try {
        await sock.updateBlockStatus(m.sender, "block")
        logger.info(`Fallback: Successfully blocked virtex sender: ${m.sender}`)
      } catch (blockError) {
        logger.error("Fallback block also failed:", blockError)
      }
    }
  }
}