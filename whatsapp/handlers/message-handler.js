import { logger } from "../../utils/logger.js"
import { messageProcessor } from "./upsert.js"

export class MessageHandler {
  constructor(client) {
    this.client = client
    this.messageProcessor = messageProcessor
    this.isInitialized = false
  }

  /**
   * Initialize the message handler
   */
  async initialize() {
    if (!this.isInitialized) {
      await this.messageProcessor.initialize()
      this.isInitialized = true
      logger.info("[MessageHandler] Initialized successfully")
    }
  }

  /**
   * Process incoming messages
   */
  async processMessage(sock, sessionId, message, prefix = ".") {
    try {
      await this.initialize()
      return await this.messageProcessor.processMessage(sock, sessionId, message, prefix)
    } catch (error) {
      logger.error(`[MessageHandler] Error processing message: ${error.message}`)
      return { error: error.message }
    }
  }

  /**
   * Send a text message
   */
  async sendText(sock, chatId, text, options = {}) {
    try {
      const message = { text, ...options }
      await sock.sendMessage(chatId, message)
      logger.info(`[MessageHandler] Text message sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending text: ${error.message}`)
      return { error: error.message }
    }
  }

  /**
   * Send an image message
   */
  async sendImage(sock, chatId, image, caption = null, options = {}) {
    try {
      const message = { image, caption, ...options }
      await sock.sendMessage(chatId, message)
      logger.info(`[MessageHandler] Image sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending image: ${error.message}`)
      return { error: error.message }
    }
  }

  /**
   * Send a video message
   */
  async sendVideo(sock, chatId, video, caption = null, options = {}) {
    try {
      const message = { video, caption, ...options }
      await sock.sendMessage(chatId, message)
      logger.info(`[MessageHandler] Video sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending video: ${error.message}`)
      return { error: error.message }
    }
  }

  /**
   * Send an audio message
   */
  async sendAudio(sock, chatId, audio, options = {}) {
    try {
      const message = { audio, ptt: true, ...options }
      await sock.sendMessage(chatId, message)
      logger.info(`[MessageHandler] Audio sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending audio: ${error.message}`)
      return { error: error.message }
    }
  }

  /**
   * Send a document
   */
  async sendDocument(sock, chatId, document, options = {}) {
    try {
      const message = { document, ...options }
      await sock.sendMessage(chatId, message)
      logger.info(`[MessageHandler] Document sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending document: ${error.message}`)
      return { error: error.message }
    }
  }

  /**
   * Send a sticker
   */
  async sendSticker(sock, chatId, sticker, options = {}) {
    try {
      const message = { sticker, ...options }
      await sock.sendMessage(chatId, message)
      logger.info(`[MessageHandler] Sticker sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending sticker: ${error.message}`)
      return { error: error.message }
    }
  }

  /**
   * Send a button message
   */
  async sendButtonMessage(sock, chatId, text, buttons, options = {}) {
    try {
      const message = {
        text,
        buttons,
        ...options
      }
      await sock.sendMessage(chatId, message)
      logger.info(`[MessageHandler] Button message sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending button message: ${error.message}`)
      return { error: error.message }
    }
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(sock, chatId, template, options = {}) {
    try {
      const message = {
        template,
        ...options
      }
      await sock.sendMessage(chatId, message)
      logger.info(`[MessageHandler] Template message sent to ${chatId}`)
      return { success: true }
    } catch (error) {
      logger.error(`[MessageHandler] Error sending template message: ${error.message}`)
      return { error: error.message }
    }
  }

  /**
   * Get message processor instance for advanced operations
   */
  getMessageProcessor() {
    return this.messageProcessor
  }

  /**
   * Check if handler is initialized
   */
  isReady() {
    return this.isInitialized
  }
}
