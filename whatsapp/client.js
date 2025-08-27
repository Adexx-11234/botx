// Simplified WhatsApp client - delegates everything to session manager
import { logger } from "../utils/logger.js"
import { sessionManager } from "./sessions/session-manager.js"

export class WhatsAppClient {
  constructor(pluginManager) {
    this.sessionManager = sessionManager
    this.pluginManager = pluginManager
    this.telegramBot = null
    this.isInitialized = false
    this.initTime = null
  }

  setTelegramBot(telegramBot) {
    this.telegramBot = telegramBot
    // Pass telegram bot to session manager for connection notifications
    if (this.sessionManager) {
      this.sessionManager.telegramBot = telegramBot
    }
  }

  // Create session - delegates to session manager
  async createSession(userId, phoneNumber = null, callbacks = {}) {
    try {
      return await this.sessionManager.createSession(userId, phoneNumber, callbacks)
    } catch (error) {
      logger.error(`[WhatsApp] Error creating session ${userId}: ${error.message}`)
      throw error
    }
  }

  // Disconnect session - delegates to session manager  
  async disconnectSession(sessionId) {
    try {
      return await this.sessionManager.disconnectSession(sessionId)
    } catch (error) {
      logger.error(`[WhatsApp] Error disconnecting session ${sessionId}: ${error.message}`)
      return false
    }
  }

  // Complete user cleanup - delegates to session manager
  async performCompleteUserCleanup(userId) {
    return await this.sessionManager.performCompleteUserCleanup(userId)
  }

  // Session info methods - delegate to session manager
  getSession(sessionId) {
    return this.sessionManager.getSession(sessionId)
  }

  async getSessionByWhatsAppJid(jid) {
    return await this.sessionManager.getSessionByWhatsAppJid(jid)
  }

  async getAllSessions() {
    return await this.sessionManager.getAllSessions()
  }

  async isSessionConnected(sessionId) {
    return await this.sessionManager.isSessionConnected(sessionId)
  }

  generateSessionId(userId) {
    return this.sessionManager.generateSessionId(userId)
  }

  // Cleanup
  async cleanup() {
    logger.info("[WhatsApp] Cleaning up WhatsApp client...")
    
    if (this.sessionManager) {
      await this.sessionManager.cleanup()
    }
    
    this.isInitialized = false
    logger.info("[WhatsApp] WhatsApp client cleanup completed")
  }

  // Stats
  getStats() {
    const sessionStats = this.sessionManager.getStats ? this.sessionManager.getStats() : {}
    
    return {
      ...sessionStats,
      uptime: this.isInitialized ? Date.now() - this.initTime : 0,
      initialized: this.isInitialized
    }
  }
}