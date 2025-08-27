// Ultra-fast memory-optimized WhatsApp Event Handler - Zero RAM storage
import { logger } from "../../utils/logger.js"
import { MessageEventHandler } from "../events/message-events.js"
import { ConnectionEventHandler } from "../events/connection-events.js"
import { GroupEventHandler } from "../events/group-events.js"
import { UtilityEventHandler } from "../events/utility-events.js"

export class WhatsAppEventHandler {
  constructor(sessionManager) {
    this.sessionManager = sessionManager
    
    // Use WeakRef for handlers to allow garbage collection
    this.messageHandler = new WeakRef(new MessageEventHandler())
    this.connectionHandler = new WeakRef(new ConnectionEventHandler())
    this.groupHandler = new WeakRef(new GroupEventHandler())
    this.utilityHandler = new WeakRef(new UtilityEventHandler())
    
    // Ultra-minimal tracking - use WeakSet for automatic cleanup
    this.setupInProgress = new WeakSet()
    
    // Use circular buffer for event counting - only keeps last 10 counts
    this.eventBuffer = new Array(10).fill(0)
    this.eventIndex = 0
    this.totalEvents = 0
    
    // Cache for resolved JIDs - WeakMap auto-cleans when objects are GC'd
    this.jidCache = new WeakMap()
    
    // Throttle logging to reduce overhead
    this.lastLogTime = 0
    this.LOG_THROTTLE = 10000 // 10 seconds
  }

  setupAllEventHandlers(sock, sessionId) {
    // Create a weak reference object for tracking
    const trackingObj = { sessionId }
    
    if (this.setupInProgress.has(trackingObj)) {
      return // Skip silently to avoid log spam
    }
    
    this.setupInProgress.add(trackingObj)
    
    try {
      // Set private presence first - fire and forget
      this.setPrivatePresence(sock).catch(() => {}) // Silent fail
      
      // Get handlers from WeakRef (they might be GC'd)
      const msgHandler = this.messageHandler.deref()
      const connHandler = this.connectionHandler.deref()
      const groupHandler = this.groupHandler.deref()
      const utilHandler = this.utilityHandler.deref()
      
      // Only setup if handlers still exist
      if (msgHandler) msgHandler.setup(sock, sessionId, this)
      if (connHandler) connHandler.setup(sock, sessionId, this.sessionManager, this)
      if (groupHandler) groupHandler.setup(sock, sessionId, this)
      if (utilHandler) utilHandler.setup(sock, sessionId, this)
      
      // Minimal connection cleanup - no database calls
      sock.ev.on('connection.update', (update) => {
        if (update.connection === 'close') {
          this.setupInProgress.delete(trackingObj)
          // Don't update database - let it handle itself
        }
      })
      
      // Only log occasionally to reduce I/O
      this.throttledLog(`All handlers setup for ${sessionId}`)
      
    } catch (error) {
      this.setupInProgress.delete(trackingObj)
      // Don't log errors unless critical
      if (error.message.includes('critical')) {
        logger.error(`Handler setup failed: ${error.message}`)
      }
      throw error
    }
  }

  // Throttled logging to reduce I/O overhead
  throttledLog(message) {
    const now = Date.now()
    if (now - this.lastLogTime > this.LOG_THROTTLE) {
      logger.info(`[WhatsAppEvents] ${message}`)
      this.lastLogTime = now
    }
  }

  async setPrivatePresence(sock) {
    if (!sock?.user) return
    
    try {
      await sock.sendPresenceUpdate('unavailable')
    } catch {
      // Silent fail - don't log connection errors
    }
  }

  async resolveLidToActualJid(sock, groupJid, lidJid, messageMetadata = null) {
    if (!lidJid?.endsWith('@lid')) return lidJid
    
    // Check WeakMap cache first
    const cacheKey = { groupJid, lidJid }
    if (this.jidCache.has(cacheKey)) {
      return this.jidCache.get(cacheKey)
    }
    
    try {
      let groupMetadata = messageMetadata
      
      if (!groupMetadata && groupJid?.endsWith('@g.us')) {
        try {
          groupMetadata = await sock.groupMetadata(groupJid)
        } catch {
          return lidJid
        }
      }
      
      if (!groupMetadata?.participants) return lidJid
      
      const participant = groupMetadata.participants.find(p => p.id === lidJid)
      const resolvedJid = participant?.jid || lidJid
      
      // Cache the result
      this.jidCache.set(cacheKey, resolvedJid)
      
      return resolvedJid
    } catch {
      return lidJid
    }
  }

  async processMessageWithLidResolution(message, sock) {
    if (!message?.key) return message
    
    try {
      const isGroup = message.key.remoteJid?.endsWith('@g.us')
      let groupMetadata = null
      
      if (isGroup) {
        try {
          groupMetadata = await sock.groupMetadata(message.key.remoteJid)
          message.metadata = groupMetadata
        } catch {
          // Continue without metadata
        }
      }
      
      // Process participant JID
      if (message.key.participant?.endsWith('@lid')) {
        message.participant = await this.resolveLidToActualJid(
          sock, 
          message.key.remoteJid, 
          message.key.participant, 
          groupMetadata
        )
      } else {
        message.participant = message.key.participant
      }
      
      // Process quoted participant JID
      const quotedParticipant = message.message?.contextInfo?.participant || 
                               message.message?.extendedTextMessage?.contextInfo?.participant
      
      if (quotedParticipant?.endsWith('@lid')) {
        const resolvedQuoted = await this.resolveLidToActualJid(
          sock, 
          message.key.remoteJid, 
          quotedParticipant, 
          groupMetadata
        )
        
        // Update contextInfo efficiently
        const contexts = [
          message.message?.contextInfo,
          message.message?.extendedTextMessage?.contextInfo
        ].filter(Boolean)
        
        contexts.forEach(ctx => {
          ctx.participant = resolvedQuoted
        })
        
        message.quotedParticipant = resolvedQuoted
      }
      
      return message
    } catch {
      return message
    }
  }

  // Ultra-efficient event tracking with circular buffer
  trackEvent(eventType) {
    // Increment total counter
    this.totalEvents++
    
    // Use circular buffer instead of Map
    this.eventBuffer[this.eventIndex] = (this.eventBuffer[this.eventIndex] || 0) + 1
    this.eventIndex = (this.eventIndex + 1) % 10
    
    // Only log every 100th event and throttle
    if (this.totalEvents % 100 === 0) {
      this.throttledLog(`Total events processed: ${this.totalEvents}`)
    }
  }

  getEventStats() {
    // Return minimal stats
    return { 
      total: this.totalEvents,
      recent: this.eventBuffer.reduce((a, b) => a + b, 0)
    }
  }

  clearEventStats() {
    this.eventBuffer.fill(0)
    this.eventIndex = 0
    this.totalEvents = 0
  }

  // Simplified utility methods - no error logging for common failures
  async markMessageAsRead(sock, messageKey) {
    if (!sock?.user) return
    try {
      await sock.readMessages([messageKey])
    } catch {
      // Silent fail
    }
  }

  async setPresence(sock, status = 'unavailable') {
    if (!sock?.user) return
    try {
      await sock.sendPresenceUpdate(status)
    } catch {
      // Silent fail
    }
  }

  async viewStatus(sock, statusJid, messageKey) {
    if (!sock?.user) return
    try {
      await sock.readMessages([messageKey])
    } catch {
      // Silent fail
    }
  }

  // Remove all database operations for maximum speed
  // Database updates are now completely eliminated

  isSocketReady(sock) {
    return !!(sock?.user && sock.readyState === sock.ws?.OPEN)
  }

  async waitForSocketReady(sock, timeout = 3000) {
    if (this.isSocketReady(sock)) return true
    
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => resolve(false), timeout)
      
      const cleanup = () => {
        clearTimeout(timeoutId)
        sock.ev.off('connection.update', handler)
      }
      
      const handler = (update) => {
        if (update.connection === 'open') {
          cleanup()
          resolve(true)
        }
      }
      
      sock.ev.once('connection.update', handler)
    })
  }

  cleanup(sessionId) {
    // Minimal cleanup - let WeakRef/WeakSet handle memory management
    this.clearEventStats()
    
    // Force garbage collection of cached data
    if (global.gc) {
      global.gc()
    }
  }

  // New method: Force cleanup of all references
  forceCleanup() {
    // Clear all caches
    this.jidCache = new WeakMap()
    this.setupInProgress = new WeakSet()
    this.clearEventStats()
    
    // Suggest garbage collection
    if (global.gc) {
      global.gc()
    }
  }

  // New method: Get memory usage stats
  getMemoryStats() {
    if (process.memoryUsage) {
      const usage = process.memoryUsage()
      return {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(usage.external / 1024 / 1024) + 'MB'
      }
    }
    return { status: 'unavailable' }
  }
}