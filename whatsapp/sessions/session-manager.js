import { makeWASocket, DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import { baileysConfig } from "../../config/baileys.js"
import { SessionStorage } from "./session-storage.js"
import { useMongoDBAuthState } from "./mongodb-auth-state.js"
import { WhatsAppEventHandler } from "../handlers/whatsapp-events.js"
import { SessionConnection } from "./session-connection.js"
import { logger } from "../../utils/logger.js"
import path from 'path'
import fs from 'fs'

class WhatsAppSessionManager {
  constructor(telegramBot = null, sessionDir = './sessions') {
    this.storage = new SessionStorage()
    this.activeSockets = new Map()
    this.initializingSessions = new Set()
    this.reconnectingSessions = new Set()
    this.telegramBot = telegramBot
    this.sessionDir = sessionDir
    this.mongoClient = null
    this.isInitialized = false
    this.eventHandlersEnabled = false
    this.maxSessions = 50
    this.concurrencyLimit = 5
    
    // Track connection listeners to prevent duplicates
    this.connectionListeners = new Map()
    
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true })
    }
  }

  async waitForMongoDB(maxWaitTime = 10000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitTime) {
      if (this.storage.isMongoConnected && this.storage.client) {
        this.mongoClient = this.storage.client
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    return false
  }

  async _getAuthState(sessionId) {
    let state, saveCreds, authMethod = 'file'
    
    if (this.mongoClient) {
      try {
        const db = this.mongoClient.db()
        const collection = db.collection('auth_baileys')
        const mongoAuth = await useMongoDBAuthState(collection, sessionId)
        
        state = mongoAuth.state
        saveCreds = mongoAuth.saveCreds
        authMethod = 'mongodb'
      } catch (mongoError) {
        // Fallback to file auth
      }
    }
    
    if (!state) {
      const authPath = path.join(this.sessionDir, sessionId)
      if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true })
      }
      
      const fileAuth = await useMultiFileAuthState(authPath)
      state = fileAuth.state
      saveCreds = fileAuth.saveCreds
      authMethod = 'file'
    }
    
    return { state, saveCreds, authMethod }
  }

  async createSession(userId, phoneNumber = null, callbacks = {}, isReconnect = false) {
    const sessionId = `session_${userId}`
    
    // Prevent duplicate initialization
    if (this.initializingSessions.has(sessionId)) {
      logger.debug(`Session ${sessionId} already initializing`)
      return this.activeSockets.get(sessionId)
    }
    
    if (this.activeSockets.has(sessionId) && !isReconnect) {
      logger.debug(`Session ${sessionId} already exists`)
      return this.activeSockets.get(sessionId)
    }

    if (this.activeSockets.size >= this.maxSessions) {
      throw new Error(`Maximum sessions limit (${this.maxSessions}) reached`)
    }

    this.initializingSessions.add(sessionId)
    
    try {
      // Clean up existing session if this is a reconnect
      if (isReconnect) {
        await this._cleanupExistingSession(sessionId)
      }
      
      const { state, saveCreds, authMethod } = await this._getAuthState(sessionId)
      const isRegistered = state?.creds?.registered || false
      
      const sock = makeWASocket({
        auth: state,
        ...baileysConfig,
        printQRInTerminal: false,
        qrTimeout: 0
      })

      // Set socket properties
      sock.ev.on('creds.update', saveCreds)
      sock.authMethod = authMethod
      sock.isRegistered = isRegistered
      sock.sessionId = sessionId
      sock.eventHandlersSetup = false // Track if event handlers are set up

      this.activeSockets.set(sessionId, sock)
      
      // Setup connection handler ONLY - no event handlers yet
      this._setupConnectionHandler(sock, sessionId, callbacks)

      await this.storage.saveSession(sessionId, {
        userId,
        telegramId: userId,
        phoneNumber,
        isConnected: false,
        connectionStatus: 'connecting',
        reconnectAttempts: 0
      })

      // Handle pairing for new unregistered sessions
      if (phoneNumber && !isRegistered && !isReconnect) {
        setTimeout(() => this._handlePairing(sock, sessionId, phoneNumber, callbacks), 2000)
      }

      return sock
    } catch (error) {
      logger.error(`Failed to create session ${sessionId}:`, error)
      throw error
    } finally {
      this.initializingSessions.delete(sessionId)
    }
  }

  async enableEventHandlers() {
    this.eventHandlersEnabled = true
    logger.info('Event handlers enabled globally')
  }

  _setupConnectionHandler(sock, sessionId, callbacks) {
  // Remove existing listener to prevent duplicates
  if (this.connectionListeners.has(sessionId)) {
    const existingHandler = this.connectionListeners.get(sessionId)
    if (sock.ev && typeof sock.ev.removeListener === 'function') {
      sock.ev.removeListener('connection.update', existingHandler)
    } else if (sock.ev && typeof sock.ev.off === 'function') {
      sock.ev.off('connection.update', existingHandler)
    }
  }
  
  const connectionHandler = async (update) => {
    await this._handleConnectionUpdate(sessionId, update, callbacks)
  }
  
  // Store reference and add listener
  this.connectionListeners.set(sessionId, connectionHandler)
  
  if (sock.ev && typeof sock.ev.on === 'function') {
    sock.ev.on('connection.update', connectionHandler)
  }
}

  _setupEventHandlers(sock, sessionId, callbacks) {
    if (!sock || sock.eventHandlersSetup) return
    
    try {
      const eventHandler = new WhatsAppEventHandler(this)
      eventHandler.setupAllEventHandlers(sock, sessionId)
      sock.eventHandlersSetup = true
      logger.info(`Event handlers set up for ${sessionId}`)
    } catch (error) {
      logger.error(`Failed to setup event handlers for ${sessionId}:`, error)
    }
  }

  async _handleConnectionUpdate(sessionId, update, callbacks) {
    const { connection, lastDisconnect, qr } = update
    const userId = sessionId.replace('session_', '')
    const sock = this.activeSockets.get(sessionId)

    try {
      if (qr && callbacks?.onQR) {
        callbacks.onQR(qr)
      }

      if (connection === 'open') {
        if (!sock) {
          logger.error(`Socket not found for ${sessionId}`)
          return
        }
        
        // Remove from reconnecting sessions
        this.reconnectingSessions.delete(sessionId)
        
        const phoneNumber = sock?.user?.id?.split('@')[0]
        
        await this.storage.updateSession(sessionId, {
          isConnected: true,
          phoneNumber: phoneNumber ? `+${phoneNumber}` : null,
          connectionStatus: 'connected',
          reconnectAttempts: 0
        })

        logger.info(`✓ ${sessionId} connected (+${phoneNumber || 'unknown'})`)

        // NOW setup event handlers - only after successful connection
        if (this.eventHandlersEnabled && !sock.eventHandlersSetup) {
          this._setupEventHandlers(sock, sessionId, callbacks)
        }

        // Notify telegram bot (only once)
        if (this.telegramBot && phoneNumber && callbacks?.onConnected) {
          this.telegramBot.sendConnectionSuccess(userId, `+${phoneNumber}`)
            .catch(err => logger.error(`Telegram notification failed: ${err.message}`))
          
          callbacks.onConnected(sock)
        }

      } else if (connection === 'close') {
        const reason = lastDisconnect?.error?.message || 'Unknown'
        logger.info(`✗ ${sessionId} disconnected: ${reason}`)
        
        await this.storage.updateSession(sessionId, { 
          isConnected: false,
          connectionStatus: 'disconnected'
        })
        
        const shouldReconnect = await this._shouldReconnect(lastDisconnect, sessionId)
        if (shouldReconnect && !this.reconnectingSessions.has(sessionId)) {
          this.reconnectingSessions.add(sessionId)
          setTimeout(() => this._reconnect(sessionId, callbacks), 3000)
        } else if (!shouldReconnect) {
          await this.disconnectSession(sessionId, true) // Force cleanup
        }
      } else if (connection === 'connecting') {
        await this.storage.updateSession(sessionId, { connectionStatus: 'connecting' })
      }
    } catch (error) {
      logger.error(`Connection error for ${sessionId}:`, error)
    }
  }

  async _shouldReconnect(lastDisconnect, sessionId) {
    if (!lastDisconnect?.error || !(lastDisconnect.error instanceof Boom)) {
      return true
    }
    
    const statusCode = lastDisconnect.error.output?.statusCode
    const session = await this.storage.getSession(sessionId)
    const reconnectCount = session?.reconnectAttempts || 0
    
    const permanentDisconnects = [
      DisconnectReason.loggedOut,
      DisconnectReason.badSession,
      DisconnectReason.multideviceMismatch
    ]
    
    // Stream errors should be reconnected with limit
    if (statusCode === 515) {
      return reconnectCount < 10
    }
    
    // All 401 errors should trigger cleanup
    if (statusCode === 401) {
      setImmediate(() => {
        this.performCompleteUserCleanup(sessionId).catch(error => {
          logger.error(`Auto cleanup failed for ${sessionId}:`, error)
        })
      })
      return false
    }
    
    return !permanentDisconnects.includes(statusCode) && reconnectCount < 5
  }

  async _reconnect(sessionId, callbacks) {
    if (!this.reconnectingSessions.has(sessionId)) {
      return // Already handled
    }

    try {
      const session = await this.storage.getSession(sessionId)
      if (!session) {
        this.reconnectingSessions.delete(sessionId)
        return
      }

      const newAttempts = (session.reconnectAttempts || 0) + 1
      await this.storage.updateSession(sessionId, {
        reconnectAttempts: newAttempts,
        connectionStatus: 'reconnecting'
      })

      logger.info(`Reconnecting ${sessionId} (attempt #${newAttempts})`)
      await this.createSession(session.userId, session.phoneNumber, callbacks, true)
      
    } catch (error) {
      logger.error(`Reconnect failed for ${sessionId}:`, error)
      const session = await this.storage.getSession(sessionId)
      const delay = Math.min(30000, 5000 * Math.pow(2, (session?.reconnectAttempts || 0)))
      setTimeout(() => this._reconnect(sessionId, callbacks), delay)
    }
  }

  async _handlePairing(sock, sessionId, phoneNumber, callbacks) {
    try {
      if (!this.activeSockets.has(sessionId) || sock.isRegistered) {
        return
      }
      
      const { handlePairing } = await import("../utils/pairing.js")
      await handlePairing(sock, sessionId, phoneNumber, new Map(), callbacks)
    } catch (error) {
      logger.error(`Pairing error for ${sessionId}:`, error)
      if (callbacks?.onError) callbacks.onError(error)
    }
  }

  async initializeExistingSessions() {
    try {
      await this.waitForMongoDB()
      
      const allSessionIds = await this._getAllUniqueSessionIds()
      
      if (!allSessionIds.size) {
        this.isInitialized = true
        setTimeout(() => this.enableEventHandlers(), 3000)
        return { initialized: 0, total: 0 }
      }

      const sessionArray = Array.from(allSessionIds).slice(0, this.maxSessions)
      let initializedCount = 0
      
      const processSession = async (sessionId) => {
        const userId = sessionId.replace('session_', '')
        
        try {
          const sessionData = await this.storage.getSession(sessionId)
          
          await this.createSession(userId, sessionData?.phoneNumber, {
            onConnected: (sock) => {
              initializedCount++
              const phone = sock?.user?.id?.split('@')[0] || 'Unknown'
              logger.info(`✓ ${sessionId} (+${phone}) [${initializedCount}/${sessionArray.length}]`)
            }
          })
          
        } catch (error) {
          logger.error(`Failed to process session ${sessionId}:`, error)
        }
      }
      
      // Process sessions in batches
      for (let i = 0; i < sessionArray.length; i += this.concurrencyLimit) {
        const batch = sessionArray.slice(i, i + this.concurrencyLimit)
        await Promise.all(batch.map(processSession))
        
        if (i + this.concurrencyLimit < sessionArray.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      this.isInitialized = true
      logger.info(`Session initialization: ${initializedCount}/${sessionArray.length} connected`)
      
      // Enable event handlers after delay
      setTimeout(() => this.enableEventHandlers(), 3000)
      
      return { initialized: initializedCount, total: sessionArray.length }
    } catch (error) {
      logger.error('Session initialization failed:', error)
      return { initialized: 0, total: 0 }
    }
  }

  async performCompleteUserCleanup(sessionId) {
    const userId = sessionId.replace('session_', '')
    const results = { socket: false, database: false, authState: false }

    try {
      // Remove from tracking first
      this.reconnectingSessions.delete(sessionId)
      this.initializingSessions.delete(sessionId)
      
      // Cleanup socket PROPERLY
      const sock = this.activeSockets.get(sessionId)
      if (sock) {
        try {
          // Remove all event listeners
          if (sock.ev && typeof sock.ev.removeAllListeners === 'function') {
      sock.ev.removeAllListeners()
    }
          
          // Remove connection listener
          if (this.connectionListeners.has(sessionId)) {
      const existingHandler = this.connectionListeners.get(sessionId)
      if (sock.ev && typeof sock.ev.off === 'function') {
        sock.ev.off('connection.update', existingHandler)
      }
      this.connectionListeners.delete(sessionId)
    }
          
          // Close WebSocket connection
          if (sock.ws) {
            if (sock.ws.readyState === sock.ws.OPEN) {
              sock.ws.close(1000, 'Session cleanup')
            }
            sock.ws = null
          }
          
          // Clear socket reference
          sock.user = null
          sock.eventHandlersSetup = false
          
          results.socket = true
          logger.debug(`Socket cleanup successful for ${sessionId}`)
        } catch (error) {
          logger.error(`Socket cleanup error for ${sessionId}:`, error)
        }
      }
      
      // Remove from active sockets
      this.activeSockets.delete(sessionId)
      
      // Clear storage cache
      if (this.storage.sessionCache) {
        this.storage.sessionCache.delete(sessionId)
      }

      // Clear write buffer
      if (this.storage.writeBuffer) {
        const bufferId = `${sessionId}_update`
        if (this.storage.writeBuffer.has(bufferId)) {
          clearTimeout(this.storage.writeBuffer.get(bufferId).timeout)
          this.storage.writeBuffer.delete(bufferId)
        }
      }

      // Database cleanup
      try {
        await this.storage.deleteSession(sessionId)
        results.database = true
      } catch (error) {
        logger.error(`Database cleanup error for ${sessionId}:`, error)
      }

      // Auth state cleanup
      try {
        const sessionConnection = new SessionConnection(this.mongoClient)
        const authCleanupResults = await sessionConnection.cleanupAuthState(sessionId)
        results.authState = authCleanupResults.mongodb || authCleanupResults.file
      } catch (error) {
        logger.error(`Auth cleanup error for ${sessionId}:`, error)
      }

      // Notify telegram
      if (this.telegramBot) {
        try {
          await this.telegramBot.sendMessage(userId, "🔴 WhatsApp session disconnected and cleaned up.")
        } catch (error) {
          // Silent fail
        }
      }

      logger.info(`Complete cleanup for ${sessionId}:`, results)
      return results

    } catch (error) {
      logger.error(`Cleanup failed for ${sessionId}:`, error)
      return results
    }
  }

  async _getAllUniqueSessionIds() {
    const [sessions, sessionDirs, mongoSessions] = await Promise.all([
      this.storage.getAllSessions().then(sessions => 
        sessions.map(s => s.sessionId).filter(id => id?.startsWith('session_'))
      ).catch(() => []),
      
      Promise.resolve(
        fs.existsSync(this.sessionDir) 
          ? fs.readdirSync(this.sessionDir).filter(dir => dir.startsWith('session_'))
          : []
      ),
      
      this.mongoClient ? this._getMongoAuthSessions().catch(() => []) : Promise.resolve([])
    ])
    
    return new Set([...sessions, ...sessionDirs, ...mongoSessions])
  }

  async _getMongoAuthSessions() {
    try {
      const db = this.mongoClient.db()
      const authCollection = db.collection('auth_baileys')
      const { getAllAuthSessions } = await import("./mongodb-auth-state.js")
      return await getAllAuthSessions(authCollection)
    } catch (error) {
      return []
    }
  }

  async disconnectSession(sessionId, forceCleanup = false) {
    if (forceCleanup) {
      return await this.performCompleteUserCleanup(sessionId)
    }

    this.reconnectingSessions.delete(sessionId)
    this.initializingSessions.delete(sessionId)

    const sock = this.activeSockets.get(sessionId)
    
    if (sock) {
      try {
        sock.ev.removeAllListeners()
        if (this.connectionListeners.has(sessionId)) {
          sock.ev.removeListener('connection.update', this.connectionListeners.get(sessionId))
          this.connectionListeners.delete(sessionId)
        }
        if (sock.ws && sock.ws.readyState === sock.ws.OPEN) {
          sock.ws.close()
        }
      } catch (error) {
        // Silent error
      }
    }

    this.activeSockets.delete(sessionId)
    await this.storage.deleteSession(sessionId)
  }

  async _cleanupExistingSession(sessionId) {
    try {
      const existingSession = await this.storage.getSession(sessionId)
      if (existingSession && !existingSession.isConnected) {
        await this.disconnectSession(sessionId)
      }
    } catch (error) {
      // Silent error
    }
  }

  // Utility methods
  getSession(sessionId) {
    return this.activeSockets.get(sessionId)
  }

  async getSessionByWhatsAppJid(jid) {
    if (!jid) return null

    const phoneNumber = jid.split('@')[0].split(':')[0]
    for (const [sessionId, sock] of this.activeSockets) {
      if (sock?.user?.id) {
        const sessionPhone = sock.user.id.split('@')[0]
        if (sessionPhone === phoneNumber) {
          await this.storage.updateSession(sessionId, { lastActivity: new Date() })
          return sock
        }
      }
    }
    return null
  }

  async getAllSessions() {
    return await this.storage.getAllSessions()
  }

  async isSessionConnected(sessionId) {
    const session = await this.storage.getSession(sessionId)
    return session?.isConnected || false
  }
  
  async isReallyConnected(sessionId) {
    const sock = this.activeSockets.get(sessionId)
    const session = await this.storage.getSession(sessionId)
    
    return !!(sock && sock.user && session?.isConnected)
  }

  async getStats() {
    const allSessions = await this.storage.getAllSessions()
    const connectedSessions = allSessions.filter(s => s.isConnected)
    
    return {
      totalSessions: allSessions.length,
      connectedSessions: connectedSessions.length,
      activeSockets: this.activeSockets.size,
      reconnectingSessions: this.reconnectingSessions.size,
      eventHandlersEnabled: this.eventHandlersEnabled,
      maxSessions: this.maxSessions,
      isInitialized: this.isInitialized,
      storage: this.storage.isConnected ? 'Connected' : 'Disconnected'
    }
  }

  async cleanup() {
    let cleanupCount = 0
    for (const sessionId of this.activeSockets.keys()) {
      await this.disconnectSession(sessionId, true) // Force cleanup
      cleanupCount++
    }
    
    this.reconnectingSessions.clear()
    this.connectionListeners.clear()
    
    await this.storage.close()
    this.mongoClient = null
    this.isInitialized = false
    this.eventHandlersEnabled = false
  }
}

let instance = null

export function initializeSessionManager(telegramBot, sessionDir = './sessions') {
  if (!instance) {
    instance = new WhatsAppSessionManager(telegramBot, sessionDir)
  }
  return instance
}

export function getSessionManager() {
  if (!instance) {
    instance = new WhatsAppSessionManager(null, './sessions')
  }
  return instance
}

export const sessionManager = getSessionManager()
export default getSessionManager