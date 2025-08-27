// Streamlined Group Events Handler
import chalk from "chalk"
import { handleGroupParticipantsUpdate } from "../handlers/upsert.js"

export class GroupEventHandler {
  setup(sock, sessionId, mainHandler) {
    this.mainHandler = mainHandler

    // groups.upsert - Joined new groups
    sock.ev.on("groups.upsert", async (groups) => {
      this.mainHandler.trackEvent("groups.upsert")
      for (const group of groups) {
        console.log(chalk.green(`[GroupEvents] Joined group: ${group.id} - ${group.subject}`))
      }
    })

    // groups.update - Group metadata changes
    sock.ev.on("groups.update", async (updates) => {
      this.mainHandler.trackEvent("groups.update")
      for (const update of updates) {
        if (update.subject) {
          console.log(chalk.blue(`[GroupEvents] Group ${update.id} subject changed to: ${update.subject}`))
        }
      }
    })

    // group-participants.update - Enhanced handler with fake quotes
    sock.ev.on("group-participants.update", async (update) => {
      this.mainHandler.trackEvent("group-participants.update")
      try {
        const { id, participants, action } = update
        
        console.log(chalk.yellow(`[GroupEvents] Group participants ${action}: ${participants.length} participants in ${id}`))
        
        // Create timestamp with timezone fix first
        const currentTimestamp = Math.floor(Date.now() / 1000) + 3600 // Add 1 hour for server timezone fix
        
        // Enhanced LID resolution and message creation
        let enhancedMessages = []
        
        for (const participant of participants) {
          const resolvedData = await this.resolveParticipant(sock, id, participant)
          const messageText = await this.createActionMessage(action, resolvedData.displayName, id, sock, currentTimestamp)
          const fakeQuotedMessage = this.createFakeQuotedMessage(action, resolvedData.displayName, resolvedData.jid, id)
          
          enhancedMessages.push({
            participant: resolvedData.jid,
            message: messageText,
            fakeQuotedMessage: fakeQuotedMessage,
            displayName: resolvedData.displayName
          })
        }

        // Enhanced update object
        const enhancedUpdate = {
          ...update,
          participants: enhancedMessages.map(m => m.participant),
          detailedMessages: enhancedMessages
        }

        // Create system message object
        const m = {
          chat: id,
          isGroup: true,
          sessionId: sessionId,
          key: {
            id: `SYSTEM_${Date.now()}_${action}`,
            remoteJid: id,
            fromMe: false,
            participant: enhancedMessages[0]?.participant
          },
          fromMe: false,
          messageTimestamp: currentTimestamp,
          message: { conversation: `System notification: ${action} event` }
        }

        await handleGroupParticipantsUpdate(sessionId, enhancedUpdate, sock, m)
        
      } catch (error) {
        console.log(chalk.red(`[GroupEvents] Error in group-participants.update: ${error.message}`))
      }
    })

    console.log(chalk.cyan(`[GroupEvents] All group event handlers set up for session ${sessionId}`))
  }

  async resolveParticipant(sock, groupJid, participant) {
    let resolvedJid = participant
    let displayName = participant.includes("@") ? `@${participant.split("@")[0]}` : "@User"
    
    if (participant.endsWith('@lid')) {
      try {
        // Use main handler's proper LID resolution
        if (this.mainHandler.resolveLidToActualJid) {
          const resolved = await this.mainHandler.resolveLidToActualJid(sock, groupJid, participant)
          if (resolved && !resolved.endsWith('@lid')) {
            resolvedJid = resolved
            displayName = `@${resolved.split("@")[0]}`
          }
        }
        
        // Get display name from group metadata using the resolved JID
        const groupMetadata = await sock.groupMetadata(groupJid)
        const participantInfo = groupMetadata.participants?.find(p => 
          p.id === participant && p.jid // Find by LID and get actual JID
        )
        
        if (participantInfo) {
          if (participantInfo.jid) resolvedJid = participantInfo.jid
          if (participantInfo.notify) displayName = `@${participantInfo.notify}`
          else displayName = `@${participantInfo.jid.split("@")[0]}`
        }
        
      } catch (error) {
        // Silent fail for LID resolution
      }
    } else {
      // For regular JIDs, try to get display name
      try {
        const groupMetadata = await sock.groupMetadata(groupJid)
        const participantInfo = groupMetadata.participants?.find(p => p.id === participant)
        if (participantInfo?.notify) displayName = `@${participantInfo.notify}`
      } catch (error) {
        // Silent fail for display name resolution
      }
    }
    
    return { jid: resolvedJid, displayName }
  }

  async createActionMessage(action, displayName, groupJid, sock, messageTimestamp) {
    const themeemoji = "🌟"
    
    // Get group name
    let groupName = "this group"
    try {
      const groupMetadata = await sock.groupMetadata(groupJid)
      groupName = groupMetadata.subject || "this group"
    } catch (error) {
      // Silent fail, use default group name
    }
    
    // Use provided timestamp or create one with timezone fix
    const timestamp = messageTimestamp || (Math.floor(Date.now() / 1000) + 3600)
    const messageDate = new Date(timestamp * 1000)
    const currentTime = messageDate.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })
    const currentDate = messageDate.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })

    const messages = {
      add: `╚»˙·٠${themeemoji}●♥ WELCOME ♥●${themeemoji}٠·˙«╝\n\n✨ Welcome ${displayName}! ✨\n\nWelcome to ⚡${groupName}⚡! 🎉\n\n🕐 Joined at: ${currentTime}, ${currentDate}\n\n> © PAUL Bot`,
      remove: `╚»˙·٠${themeemoji}●♥ GOODBYE ♥●${themeemoji}٠·˙«╝\n\n✨ Goodbye ${displayName}! ✨\n\nYou'll be missed from ⚡${groupName}⚡! 🥲\n\n🕐 Left at: ${currentTime}, ${currentDate}\n\n> © PAUL Bot`,
      promote: `╚»˙·٠${themeemoji}●♥ PROMOTION ♥●${themeemoji}٠·˙«╝\n\n👑 Congratulations ${displayName}!\n\nYou have been promoted to admin in ⚡${groupName}⚡! 🎉\n\nPlease use your powers responsibly.\n\n🕐 Promoted at: ${currentTime}, ${currentDate}\n\n> © PAUL Bot`,
      demote: `╚»˙·٠${themeemoji}●♥ DEMOTION ♥●${themeemoji}٠·˙«╝\n\n📉 ${displayName} have been demoted from admin in ⚡${groupName}⚡.\n\nYou can still participate normally.\n\n🕐 Demoted at: ${currentTime}, ${currentDate}\n\n> © PAUL Bot`
    }

    return messages[action] || `Group ${action} notification for ${displayName} in ⚡${groupName}⚡`
  }

  createFakeQuotedMessage(action, displayName, participantJid, groupJid) {
    const actionMessages = {
      add: `${displayName} joined the group`,
      remove: `${displayName} left the group`, 
      promote: `${displayName} was promoted to admin`,
      demote: `${displayName} was demoted from admin`
    }

    return {
      key: {
        id: `FAKE_QUOTE_${Date.now()}`,
        remoteJid: groupJid,
        fromMe: false,
        participant: participantJid
      },
      message: {
        conversation: actionMessages[action] || `${action} event`
      },
      participant: participantJid
    }
  }
}