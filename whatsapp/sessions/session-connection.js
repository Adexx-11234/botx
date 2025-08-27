import { makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys"
import { baileysConfig } from "../../config/baileys.js"
import { SessionFileManager } from "./session-file-manager.js"
import { useMongoDBAuthState } from "./mongodb-auth-state.js"
import { logger } from "../../utils/logger.js"

export class SessionConnection {
  constructor(mongoClient = null) {
    this.fileManager = new SessionFileManager()
    this.mongoClient = mongoClient
    this.authCache = new Map()
  }

  async create(sessionId, phoneNumber = null, callbacks = {}) {
    try {
      const authState = await this._getAuthState(sessionId)
      if (!authState) return null
      
      const sock = makeWASocket({
        auth: authState.state,
        ...baileysConfig,
        printQRInTerminal: false,
        qrTimeout: 0
      })

      sock.ev.on("creds.update", authState.saveCreds)
      sock.authMethod = authState.method

      if (phoneNumber && !authState.state.creds?.registered) {
        setTimeout(() => this._handlePairing(sock, sessionId, phoneNumber, callbacks), 2000)
      }

      return sock
    } catch (error) {
      return null
    }
  }

  async _getAuthState(sessionId) {
    try {
      // Try MongoDB first if available
      if (this.mongoClient) {
        try {
          const db = this.mongoClient.db()
          const collection = db.collection('auth_baileys')
          const mongoAuth = await useMongoDBAuthState(collection, sessionId)
          
          return {
            state: mongoAuth.state,
            saveCreds: mongoAuth.saveCreds,
            method: 'mongodb'
          }
        } catch (mongoError) {
          // Fallback to file system
        }
      }
      
      // File-based auth state
      this.fileManager.ensureSessionDirectory(sessionId)
      const sessionPath = this.fileManager.getSessionPath(sessionId)
      
      const fileAuth = await useMultiFileAuthState(sessionPath)
      return {
        state: fileAuth.state,
        saveCreds: fileAuth.saveCreds,
        method: 'file'
      }
      
    } catch (error) {
      return null
    }
  }

  async _handlePairing(sock, sessionId, phoneNumber, callbacks) {
    try {
      if (!sock || sock.authState?.creds?.registered) return
      
      const { handlePairing } = await import("../utils/pairing.js")
      await handlePairing(sock, sessionId, phoneNumber, new Map(), callbacks)
    } catch (error) {
      if (callbacks?.onError) callbacks.onError(error)
    }
  }

  async checkAuthAvailability(sessionId) {
    const availability = {
      mongodb: false,
      file: false,
      preferred: 'none'
    }

    // Check MongoDB
    if (this.mongoClient) {
      try {
        const db = this.mongoClient.db()
        const collection = db.collection('auth_baileys')
        const { hasValidAuthData } = await import("./mongodb-auth-state.js")
        availability.mongodb = await hasValidAuthData(collection, sessionId)
      } catch (error) {
        availability.mongodb = false
      }
    }

    // Check file system
    availability.file = this.fileManager.hasValidCredentials(sessionId)

    // Determine preferred method
    availability.preferred = availability.mongodb ? 'mongodb' : 
                            availability.file ? 'file' : 'none'

    return availability
  }

  async cleanupAuthState(sessionId) {
    const results = { mongodb: false, file: false }

    // Clean up MongoDB
    if (this.mongoClient) {
      try {
        const db = this.mongoClient.db()
        const collection = db.collection('auth_baileys')
        const { cleanupSessionAuthData } = await import("./mongodb-auth-state.js")
        results.mongodb = await cleanupSessionAuthData(collection, sessionId)
      } catch (error) {
        results.mongodb = false
      }
    }

    // Clean up files
    results.file = await this.fileManager.cleanupSessionFiles(sessionId)

    return results
  }

  setMongoClient(mongoClient) {
    this.mongoClient = mongoClient
  }
}