import { proto } from '@whiskeysockets/baileys'
import { initAuthCreds } from '@whiskeysockets/baileys'
import { logger } from '../../utils/logger.js'

const BufferJSON = {
  replacer: (k, value) => {
    if (Buffer.isBuffer(value) || value instanceof Uint8Array || value?.type === 'Buffer') {
      return {
        type: 'Buffer',
        data: Buffer.from(value?.data || value).toString('base64'),
      }
    }
    return value
  },
  reviver: (_, value) => {
    if (typeof value === 'object' && !!value && (value.buffer === true || value.type === 'Buffer')) {
      const val = value.data || value.value
      return typeof val === 'string' ? Buffer.from(val, 'base64') : Buffer.from(val || [])
    }
    return value
  },
}

const authCache = new Map()
const writeQueue = new Map()

export const useMongoDBAuthState = async (collection, sessionId) => {
  if (!sessionId || !sessionId.startsWith('session_')) {
    throw new Error(`Invalid sessionId: ${sessionId}`)
  }

  const fixFileName = (file) => file?.replace(/\//g, "__")?.replace(/:/g, "-") || ""

  const readData = async (fileName) => {
    const cacheKey = `${sessionId}:${fileName}`
    
    if (authCache.has(cacheKey)) {
      return authCache.get(cacheKey)
    }

    try {
      const query = { filename: fixFileName(fileName), sessionId: sessionId }
      const data = await collection.findOne(query, { projection: { datajson: 1 } })
      const result = data ? JSON.parse(data.datajson, BufferJSON.reviver) : null
      
      if (result) {
        authCache.set(cacheKey, result)
      }
      
      return result
    } catch (error) {
      return null
    }
  }

  const writeData = async (datajson, fileName) => {
    const cacheKey = `${sessionId}:${fileName}`
    authCache.set(cacheKey, datajson)

    const queueKey = `${sessionId}:${fileName}`
    
    if (writeQueue.has(queueKey)) {
      clearTimeout(writeQueue.get(queueKey))
    }
    
    const timeoutId = setTimeout(async () => {
      try {
        const query = { filename: fixFileName(fileName), sessionId: sessionId }
        const update = {
          $set: {
            filename: fixFileName(fileName),
            sessionId: sessionId,
            datajson: JSON.stringify(datajson, BufferJSON.replacer),
            updatedAt: new Date()
          },
        }
        await collection.updateOne(query, update, { upsert: true })
        writeQueue.delete(queueKey)
      } catch (error) {
        writeQueue.delete(queueKey)
      }
    }, 100)
    
    writeQueue.set(queueKey, timeoutId)
  }

  const removeData = async (fileName) => {
    const cacheKey = `${sessionId}:${fileName}`
    authCache.delete(cacheKey)
    
    try {
      const query = { filename: fixFileName(fileName), sessionId: sessionId }
      await collection.deleteOne(query)
    } catch (error) {
      // Silent error handling
    }
  }

  const existingCreds = await readData("creds.json")
  
  let creds
  if (existingCreds && existingCreds.noiseKey && existingCreds.signedIdentityKey) {
    creds = existingCreds
  } else {
    creds = initAuthCreds()
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {}
          const promises = ids.map(async (id) => {
            let value = await readData(`${type}-${id}.json`)
            if (type === "app-state-sync-key" && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value)
            }
            if (value) data[id] = value
          })
          await Promise.all(promises)
          return data
        },
        set: async (data) => {
          const tasks = []
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id]
              const file = `${category}-${id}.json`
              tasks.push(value ? writeData(value, file) : removeData(file))
            }
          }
          await Promise.allSettled(tasks)
        },
      },
    },
    saveCreds: () => writeData(creds, "creds.json"),
  }
}

export const getAllAuthSessions = async (collection) => {
  try {
    const sessions = await collection.distinct('sessionId', {
      filename: 'creds.json',
      sessionId: { $regex: /^session_/ }
    })
    return sessions || []
  } catch (error) {
    return []
  }
}

export const hasValidAuthData = async (collection, sessionId) => {
  try {
    const creds = await collection.findOne({
      filename: 'creds.json',
      sessionId: sessionId
    }, { projection: { datajson: 1 } })
    
    if (!creds) return false
    
    const credsData = JSON.parse(creds.datajson, BufferJSON.reviver)
    return !!(credsData && credsData.noiseKey && credsData.signedIdentityKey)
  } catch (error) {
    return false
  }
}

export const cleanupSessionAuthData = async (collection, sessionId) => {
  try {
    const result = await collection.deleteMany({ sessionId })
    
    for (const [key] of authCache) {
      if (key.startsWith(`${sessionId}:`)) {
        authCache.delete(key)
      }
    }
    
    for (const [key] of writeQueue) {
      if (key.startsWith(`${sessionId}:`)) {
        clearTimeout(writeQueue.get(key))
        writeQueue.delete(key)
      }
    }
    
    return true
  } catch (error) {
    return false
  }
}

export const getAuthStats = async (collection) => {
  try {
    const [totalDocs, sessions, credsSessions] = await Promise.all([
      collection.countDocuments(),
      collection.distinct('sessionId'),
      collection.distinct('sessionId', { filename: 'creds.json' })
    ])
    
    return {
      totalAuthDocuments: totalDocs,
      totalSessions: sessions.length,
      sessionsWithCreds: credsSessions.length,
      avgDocsPerSession: sessions.length > 0 ? Math.round(totalDocs / sessions.length) : 0,
      cacheSize: authCache.size,
      pendingWrites: writeQueue.size
    }
  } catch (error) {
    return {
      totalAuthDocuments: 0,
      totalSessions: 0,
      sessionsWithCreds: 0,
      avgDocsPerSession: 0,
      cacheSize: 0,
      pendingWrites: 0
    }
  }
}