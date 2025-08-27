// Streamlined Group Participants Handler
import { createComponentLogger } from "../../utils/logger.js"
import { GroupQueries } from "../../database/query.js"
import { normalizeJid } from "../utils/helpers.js"
import { GroupMessageSender } from "../events/group-message-sender.js"

const log = createComponentLogger("GROUP_PARTICIPANTS")

export class GroupParticipantsHandler {
  constructor() {
    this.messageSender = new GroupMessageSender()
  }

  async handleParticipantsUpdate(sock, sessionId, update, m) {
    try {
      const { id: groupJid, participants, action, detailedMessages } = update
      const normalizedParticipants = participants.map((p) => normalizeJid(p))

      log.info(`Group participants ${action}: ${normalizedParticipants.length} in ${groupJid}`)

      switch (action) {
        case "add":
          await this.handleAction(sock, groupJid, "welcome", detailedMessages)
          break
        case "remove":
          await this.handleAction(sock, groupJid, "goodbye", detailedMessages)
          break
        case "promote":
          await this.handlePromotion(sock, groupJid, participants, detailedMessages)
          break
        case "demote":
          await this.handleAction(sock, groupJid, "goodbye", detailedMessages) // Using goodbye setting for demote
          break
      }
    } catch (error) {
      log.error("Error handling group participants update:", error)
    }
  }

  async handleAction(sock, groupJid, settingType, detailedMessages) {
    try {
      const isEnabled = await GroupQueries.isAntiCommandEnabled(groupJid, settingType)
      if (!isEnabled) return

      if (this.hasValidDetailedMessages(detailedMessages)) {
        for (const messageData of detailedMessages) {
          await this.messageSender.sendEnhancedMessage(sock, groupJid, messageData)
        }
      }
    } catch (error) {
      log.error(`Error sending ${settingType} message:`, error)
    }
  }

  async handlePromotion(sock, groupJid, participants, detailedMessages) {
    try {
      const isEnabled = await GroupQueries.isAntiCommandEnabled(groupJid, "welcome")
      if (!isEnabled) return

      // Log admin promotions
      for (const participant of participants) {
        await GroupQueries.logAdminPromotion(groupJid, participant, 'system')
      }

      if (this.hasValidDetailedMessages(detailedMessages)) {
        for (const messageData of detailedMessages) {
          await this.messageSender.sendEnhancedMessage(sock, groupJid, messageData)
        }
      }
    } catch (error) {
      log.error("Error sending promotion message:", error)
    }
  }

  hasValidDetailedMessages(detailedMessages) {
    return detailedMessages && 
           Array.isArray(detailedMessages) && 
           detailedMessages.length > 0 &&
           detailedMessages.every(msg => msg?.message && msg?.participant)
  }
}

export const groupParticipantsHandler = new GroupParticipantsHandler()

export async function handleGroupParticipantsUpdate(sessionId, update, sock, m) {
  await groupParticipantsHandler.handleParticipantsUpdate(sock, sessionId, update, m)
}