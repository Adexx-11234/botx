import { Browsers } from "@whiskeysockets/baileys"
import NodeCache from "node-cache"
import { logger } from "../utils/logger.js"

const groupCache = new NodeCache({ stdTTL: 3600 }) // 1 hour cache

export const baileysConfig = {
  // Browser configuration for better compatibility
  browser: Browsers.macOS("Desktop"),

  // Enable full history sync for more message history
  syncFullHistory: true,

  // Cached group metadata for performance
  cachedGroupMetadata: async (jid) => {
    const cached = groupCache.get(jid)
    if (cached) {
      logger.debug(`[Baileys] Using cached group metadata for ${jid}`)
      return cached
    }
    return null
  },

  // Message retry configuration
  retryRequestDelayMs: 350,
  maxMsgRetryCount: 5,

  // Connection configuration
  connectTimeoutMs: 60000,
  defaultQueryTimeoutMs: 60000,

  // Keep alive configuration
  keepAliveIntervalMs: 10000,

  // Logging configuration
  logger: logger.child({ component: "baileys" }),

  // Print QR in terminal for debugging
  printQRInTerminal: process.env.NODE_ENV === "development",

  // Message configuration
  getMessage: async (key) => {
    // This will be implemented with the message store
    return { conversation: "Message not found" }
  },
}

// Group cache management
export const updateGroupCache = (jid, metadata) => {
  groupCache.set(jid, metadata)
  logger.debug(`[Baileys] Updated group cache for ${jid}`)
}

export const clearGroupCache = (jid) => {
  groupCache.del(jid)
  logger.debug(`[Baileys] Cleared group cache for ${jid}`)
}

export const getGroupCache = (jid) => {
  return groupCache.get(jid)
}
