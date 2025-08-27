// Streamlined Group Message Sender - Focus on fake quoted messages only
import { createComponentLogger } from "../../utils/logger.js"

const log = createComponentLogger("GROUP_MESSAGE_SENDER")

export class GroupMessageSender {
  async sendEnhancedMessage(sock, groupJid, messageData) {
    try {
      const { message, fakeQuotedMessage, participant } = messageData

      if (!message || !participant) {
        throw new Error(`Invalid message data`)
      }

      // Create context info with fake quoted message and mentions
      const contextInfo = {
        mentionedJid: [participant],
        quotedMessage: fakeQuotedMessage.message,
        participant: fakeQuotedMessage.participant || participant,
        remoteJid: groupJid,
        stanzaId: fakeQuotedMessage.key.id,
        quotedMessageId: fakeQuotedMessage.key.id,
        quotedParticipant: fakeQuotedMessage.key.participant || participant
      }

      const messageOptions = {
        text: message,
        contextInfo: contextInfo
      }

      const result = await sock.sendMessage(groupJid, messageOptions)
      log.info(`Enhanced message sent for ${messageData.displayName || participant}`)
      return result

    } catch (error) {
      log.error(`Error sending enhanced message: ${error.message}`)
      throw error // Don't use fallbacks - let the caller handle
    }
  }
}