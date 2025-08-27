// WhatsApp message handlers
import { logger } from "../../utils/logger.js"

export class MessageHandler {
  constructor(client) {
    this.client = client
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return
    await this.messageProcessor.initialize()
    this.isInitialized = true
    logger.info("[MessageHandler] Initialized successfully")
  }

  async sendText(sock, chatId, text, options = {}) {
    try {
      await sock.sendMessage(chatId, { text, ...options })
      logger.info(`[MessageHandler] Text message sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending text: ${error.message}`)
      return { error: error.message }
    }
  }

  async sendImage(sock, chatId, image, caption = null, options = {}) {
    try {
      await sock.sendMessage(chatId, { image, caption, ...options })
      logger.info(`[MessageHandler] Image sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending image: ${error.message}`)
      return { error: error.message }
    }
  }

  async sendVideo(sock, chatId, video, caption = null, options = {}) {
    try {
      await sock.sendMessage(chatId, { video, caption, ...options })
      logger.info(`[MessageHandler] Video sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending video: ${error.message}`)
      return { error: error.message }
    }
  }

  async sendAudio(sock, chatId, audio, options = {}) {
    try {
      await sock.sendMessage(chatId, { audio, ptt: true, ...options })
      logger.info(`[MessageHandler] Audio sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending audio: ${error.message}`)
      return { error: error.message }
    }
  }

  async sendDocument(sock, chatId, document, options = {}) {
    try {
      await sock.sendMessage(chatId, { document, ...options })
      logger.info(`[MessageHandler] Document sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending document: ${error.message}`)
      return { error: error.message }
    }
  }

  async sendSticker(sock, chatId, sticker, options = {}) {
    try {
      await sock.sendMessage(chatId, { sticker, ...options })
      logger.info(`[MessageHandler] Sticker sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending sticker: ${error.message}`)
      return { error: error.message }
    }
  }

  async sendButtonMessage(sock, chatId, text, buttons, options = {}) {
    try {
      await sock.sendMessage(chatId, { text, buttons, ...options })
      logger.info(`[MessageHandler] Button message sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending button message: ${error.message}`)
      return { error: error.message }
    }
  }

  async sendTemplateMessage(sock, chatId, template, options = {}) {
    try {
      await sock.sendMessage(chatId, { template, ...options })
      logger.info(`[MessageHandler] Template message sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending template message: ${error.message}`)
      return { error: error.message }
    }
  }

  isReady() {
    return this.isInitialized
  }
}
