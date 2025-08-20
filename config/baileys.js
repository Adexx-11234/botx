import { Browsers } from "@whiskeysockets/baileys";
import NodeCache from "node-cache";
import { logger } from "../utils/logger.js";
import pino from "pino";
const groupCache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

export const baileysConfig = {
  // Override/add specific configurations
  // Logging configuration
  logger: logger.child({ component: "baileys" }),
  version: [2, 3000, 1023223821],
  browser: Browsers.macOS("Chrome"), // Override browser if needed
  // Cached group metadata for performance
  cachedGroupMetadata: async (jid) => {
    const cached = groupCache.get(jid);
    if (cached) {
      logger.debug(`[Baileys] Using cached group metadata for ${jid}`);
      return cached;
    }
    return null;
  },
  markOnlineOnConnect: true, // CRITICAL: Set to true
  syncFullHistory: true, // Override config if needed
  emitOwnEvents: false,
  fireInitQueries: true, // CRITICAL: Enable for better message sync
  defaultQueryTimeoutMs: 20000, // Increased timeout
  keepAliveIntervalMs: 25000, // More frequent pings
  connectTimeoutMs: 25000,

  // CRITICAL: Enhanced getMessage with better error handling
  // Message configuration
  getMessage: async (key) => {
    // This will be implemented with the message store
    return { conversation: "Message not found" };
  },

  // Better connection options
  generateHighQualityLinkPreview: true,
};

// Group cache management
export const updateGroupCache = (jid, metadata) => {
  groupCache.set(jid, metadata);
  logger.debug(`[Baileys] Updated group cache for ${jid}`);
};

export const clearGroupCache = (jid) => {
  groupCache.del(jid);
  logger.debug(`[Baileys] Cleared group cache for ${jid}`);
};

export const getGroupCache = (jid) => {
  return groupCache.get(jid);
};
