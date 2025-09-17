import { MongoClient } from 'mongodb'
import crypto from 'crypto'
import { logger } from '../../utils/logger.js'

export class SessionStorage {
  constructor() {
    this.client = null
    this.db = null
    this.sessions = null
    this.isMongoConnected = false
    this.postgresPool = null
    this.isPostgresConnected = false
    this.encryptionKey = this._getEncryptionKey()
    this.sessionCache = new Map()
    this.writeBuffer = new Map()
    this.retryCount = 0
    this.maxRetries = 2
    
    this._initConnections()
  }

  async _initConnections() {
    await Promise.allSettled([
      this._initMongoDB(),
      this._initPostgres()
    ])
  }

  async _initMongoDB() {
    try {
      const mongoUrl = process.env.MONGODB_URI || 
        'mongodb+srv://Paul112210:qahmr6jy2b4uzBMf@main.uwa6va6.mongodb.net/?retryWrites=true&w=majority&appName=Main'
      
      const connectionOptions = {
        maxPoolSize: 8,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 30000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        heartbeatFrequencyMS: 30000
      }
      
      this.client = new MongoClient(mongoUrl, connectionOptions)
      
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ])
      
      await this.client.db('admin').command({ ping: 1 })
      
      this.db = this.client.db()
      this.sessions = this.db.collection('sessions')
      
      await this.sessions.createIndex({ sessionId: 1 }, { unique: true, background: true })
        .catch(() => {})
      
      this.isMongoConnected = true
      this.retryCount = 0
      
    } catch (error) {
      this.isMongoConnected = false
      if (this.retryCount < this.maxRetries) {
        this.retryCount++
        setTimeout(() => this._initMongoDB(), 5000)
      }
    }
  }

  async _initPostgres() {
    try {
      const { pool } = await import('../../config/database.js')
      this.postgresPool = pool
      
      const client = await this.postgresPool.connect()
      await client.query('SELECT 1')
      client.release()
      
      this.isPostgresConnected = true
    } catch (error) {
      this.isPostgresConnected = false
    }
  }

  _getEncryptionKey() {
    const key = process.env.SESSION_ENCRYPTION_KEY || 'default-key-change-in-production'
    return crypto.createHash('sha256').update(key).digest()
  }

  async saveSession(sessionId, sessionData, credentials = null) {
    try {
      const success = await this._saveToMongo(sessionId, sessionData, credentials) ||
                     await this._saveToPostgres(sessionId, sessionData, credentials)
      
      if (success) {
        this.sessionCache.set(sessionId, { ...sessionData, credentials })
        return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  async getSession(sessionId) {
  try {
    // Always fetch fresh data from database first
    const session = await this._getFromMongo(sessionId) || await this._getFromPostgres(sessionId)
    
    if (session) {
      // Only cache if the session is actually valid
      this.sessionCache.set(sessionId, session)
      return session
    } else {
      // If no session found in database, remove from cache
      this.sessionCache.delete(sessionId)
      return null
    }
  } catch (error) {
    // On error, also clear cache to prevent stale data
    this.sessionCache.delete(sessionId)
    return null
  }
}

async getSessionFresh(sessionId) {
  // Force remove from cache first
  this.sessionCache.delete(sessionId)
  return await this.getSession(sessionId)
}

  async updateSession(sessionId, updates) {
    try {
      const bufferId = `${sessionId}_update`
      
      if (this.writeBuffer.has(bufferId)) {
        clearTimeout(this.writeBuffer.get(bufferId).timeout)
        Object.assign(this.writeBuffer.get(bufferId).data, updates)
      } else {
        this.writeBuffer.set(bufferId, { data: updates, timeout: null })
      }
      
      const timeoutId = setTimeout(async () => {
        const bufferedData = this.writeBuffer.get(bufferId)?.data
        if (bufferedData) {
          await this._updateInMongo(sessionId, bufferedData)
          await this._updateInPostgres(sessionId, bufferedData)
          
          if (this.sessionCache.has(sessionId)) {
            Object.assign(this.sessionCache.get(sessionId), bufferedData)
          }
          
          this.writeBuffer.delete(bufferId)
        }
      }, 300)
      
      this.writeBuffer.get(bufferId).timeout = timeoutId
      return true
    } catch (error) {
      return false
    }
  }

  async deleteSession(sessionId) {
  try {
    // Immediately invalidate cache
    this.sessionCache.delete(sessionId)
    this.writeBuffer.delete(`${sessionId}_update`)
    
    // Cancel any pending writes
    const bufferId = `${sessionId}_update`
    if (this.writeBuffer.has(bufferId)) {
      const bufferData = this.writeBuffer.get(bufferId)
      if (bufferData.timeout) {
        clearTimeout(bufferData.timeout)
      }
      this.writeBuffer.delete(bufferId)
    }
    
    const results = await Promise.allSettled([
      this._deleteFromMongo(sessionId),
      this._deleteFromPostgres(sessionId)
    ])
    
    return results.some(r => r.status === 'fulfilled' && r.value)
  } catch (error) {
    return false
  }
}

  async getAllSessions() {
    try {
      if (this.isMongoConnected) {
        return await this._getAllFromMongo()
      } else if (this.isPostgresConnected) {
        return await this._getAllFromPostgres()
      }
      return []
    } catch (error) {
      return []
    }
  }

  // MongoDB operations
  async _saveToMongo(sessionId, sessionData, credentials) {
    if (!this.isMongoConnected) return false
    
    try {
      const encCredentials = credentials ? this._encrypt(credentials) : null
      
      const document = {
        sessionId,
        telegramId: sessionData.telegramId || sessionData.userId,
        phoneNumber: sessionData.phoneNumber,
        isConnected: sessionData.isConnected || false,
        connectionStatus: sessionData.connectionStatus || 'disconnected',
        reconnectAttempts: sessionData.reconnectAttempts || 0,
        credentials: encCredentials,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await this.sessions.replaceOne({ sessionId }, document, { upsert: true })
      return true
    } catch (error) {
      if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
        this.isMongoConnected = false
      }
      return false
    }
  }

  async _getFromMongo(sessionId) {
    if (!this.isMongoConnected) return null
    
    try {
      const session = await this.sessions.findOne({ sessionId })
      if (!session) return null

      return {
        sessionId: session.sessionId,
        userId: session.telegramId,
        telegramId: session.telegramId,
        phoneNumber: session.phoneNumber,
        isConnected: session.isConnected,
        connectionStatus: session.connectionStatus,
        reconnectAttempts: session.reconnectAttempts,
        credentials: session.credentials ? this._decrypt(session.credentials) : null,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    } catch (error) {
      if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
        this.isMongoConnected = false
      }
      return null
    }
  }

  async _updateInMongo(sessionId, updates) {
    if (!this.isMongoConnected) return false
    
    try {
      const updateDoc = { ...updates, updatedAt: new Date() }
      if (updates.credentials) {
        updateDoc.credentials = this._encrypt(updates.credentials)
      }

      const result = await this.sessions.updateOne(
        { sessionId }, 
        { $set: updateDoc }
      )
      
      return result.modifiedCount > 0 || result.matchedCount > 0
    } catch (error) {
      if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
        this.isMongoConnected = false
      }
      return false
    }
  }

  async _deleteFromMongo(sessionId) {
    if (!this.isMongoConnected) return false
    
    try {
      const result = await this.sessions.deleteOne({ sessionId })
      return result.deletedCount > 0
    } catch (error) {
      if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
        this.isMongoConnected = false
      }
      return false
    }
  }

  async _getAllFromMongo() {
    if (!this.isMongoConnected) return []
    
    try {
      const sessions = await this.sessions.find({}).sort({ updatedAt: -1 }).toArray()

      return sessions.map(session => ({
        sessionId: session.sessionId,
        userId: session.telegramId,
        telegramId: session.telegramId,
        phoneNumber: session.phoneNumber,
        isConnected: session.isConnected,
        connectionStatus: session.connectionStatus,
        reconnectAttempts: session.reconnectAttempts,
        hasCredentials: !!session.credentials,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }))
    } catch (error) {
      if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
        this.isMongoConnected = false
      }
      return []
    }
  }

  // PostgreSQL operations
  async _saveToPostgres(sessionId, sessionData, credentials) {
    if (!this.isPostgresConnected) return false
    
    try {
      const encCredentials = credentials ? this._encrypt(credentials) : null
      
      await this.postgresPool.query(`
        INSERT INTO sessions (
          session_id, telegram_id, phone_number, is_connected, 
          session_data, connection_status, reconnect_attempts, 
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (session_id) DO UPDATE SET 
          telegram_id = $2,
          phone_number = COALESCE($3, sessions.phone_number),
          is_connected = $4,
          session_data = COALESCE($5, sessions.session_data),
          connection_status = COALESCE($6, sessions.connection_status),
          reconnect_attempts = COALESCE($7, sessions.reconnect_attempts),
          updated_at = NOW()
      `, [
        sessionId, 
        sessionData.telegramId || sessionData.userId,
        sessionData.phoneNumber, 
        sessionData.isConnected || false,
        encCredentials,
        sessionData.connectionStatus || 'disconnected',
        sessionData.reconnectAttempts || 0
      ])
      
      return true
    } catch (error) {
      return false
    }
  }

  async _getFromPostgres(sessionId) {
    if (!this.isPostgresConnected) return null
    
    try {
      const result = await this.postgresPool.query(
        'SELECT * FROM sessions WHERE session_id = $1', 
        [sessionId]
      )
      
      if (!result.rows.length) return null
      
      const row = result.rows[0]
      return {
        sessionId: row.session_id,
        userId: row.telegram_id,
        telegramId: row.telegram_id,
        phoneNumber: row.phone_number,
        isConnected: row.is_connected,
        connectionStatus: row.connection_status || 'disconnected',
        reconnectAttempts: row.reconnect_attempts || 0,
        credentials: row.session_data ? this._decrypt(row.session_data) : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    } catch (error) {
      return null
    }
  }

  async _updateInPostgres(sessionId, updates) {
    if (!this.isPostgresConnected) return false
    
    try {
      const setParts = []
      const values = [sessionId]
      let paramIndex = 2

      if (updates.isConnected !== undefined) {
        setParts.push(`is_connected = $${paramIndex++}`)
        values.push(updates.isConnected)
      }
      if (updates.connectionStatus) {
        setParts.push(`connection_status = $${paramIndex++}`)
        values.push(updates.connectionStatus)
      }
      if (updates.phoneNumber) {
        setParts.push(`phone_number = $${paramIndex++}`)
        values.push(updates.phoneNumber)
      }
      if (updates.reconnectAttempts !== undefined) {
        setParts.push(`reconnect_attempts = $${paramIndex++}`)
        values.push(updates.reconnectAttempts)
      }
      if (updates.credentials) {
        setParts.push(`session_data = $${paramIndex++}`)
        values.push(this._encrypt(updates.credentials))
      }

      if (setParts.length > 0) {
        await this.postgresPool.query(
          `UPDATE sessions SET ${setParts.join(', ')}, updated_at = NOW() WHERE session_id = $1`,
          values
        )
        return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  async _deleteFromPostgres(sessionId) {
    if (!this.isPostgresConnected) return false
    
    try {
      const result = await this.postgresPool.query(
        'DELETE FROM sessions WHERE session_id = $1', 
        [sessionId]
      )
      return result.rowCount > 0
    } catch (error) {
      return false
    }
  }

  async _getAllFromPostgres() {
    if (!this.isPostgresConnected) return []
    
    try {
      const result = await this.postgresPool.query(`
        SELECT session_id, telegram_id, phone_number, is_connected, 
               connection_status, reconnect_attempts,
               CASE WHEN session_data IS NOT NULL THEN true ELSE false END as has_credentials,
               created_at, updated_at
        FROM sessions 
        ORDER BY updated_at DESC
      `)
      
      return result.rows.map(row => ({
        sessionId: row.session_id,
        userId: row.telegram_id,
        telegramId: row.telegram_id,
        phoneNumber: row.phone_number,
        isConnected: row.is_connected,
        connectionStatus: row.connection_status || 'disconnected',
        reconnectAttempts: row.reconnect_attempts || 0,
        hasCredentials: row.has_credentials,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    } catch (error) {
      return []
    }
  }

  _encrypt(data) {
    try {
      const text = JSON.stringify(data)
      const iv = crypto.randomBytes(12)
      const cipher = crypto.createCipherGCM('aes-256-gcm', this.encryptionKey, iv)
      
      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'), 
        cipher.final()
      ])
      const tag = cipher.getAuthTag()
      
      return Buffer.concat([iv, tag, encrypted]).toString('base64')
    } catch (error) {
      return null
    }
  }

  _decrypt(encryptedData) {
    try {
      const buffer = Buffer.from(encryptedData, 'base64')
      const iv = buffer.subarray(0, 12)
      const tag = buffer.subarray(12, 28)
      const encrypted = buffer.subarray(28)
      
      const decipher = crypto.createDecipherGCM('aes-256-gcm', this.encryptionKey, iv)
      decipher.setAuthTag(tag)
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted), 
        decipher.final()
      ])
      
      return JSON.parse(decrypted.toString('utf8'))
    } catch (error) {
      return null
    }
  }

  get isConnected() {
    return this.isMongoConnected || this.isPostgresConnected
  }

  async close() {
    if (this.client) {
      try {
        await this.client.close()
      } catch (error) {
        // Silent cleanup
      } finally {
        this.isMongoConnected = false
      }
    }
    
    if (this.postgresPool) {
      try {
        await this.postgresPool.end()
      } catch (error) {
        // Silent cleanup
      } finally {
        this.isPostgresConnected = false
      }
    }
  }
}