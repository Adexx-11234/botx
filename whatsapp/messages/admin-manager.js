import { logger } from "../../utils/logger.js"
import { normalizeJid } from "../utils/helpers.js"

// Color codes for enhanced logging
const colors = {
  reset: "\x1b[0m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  dim: "\x1b[2m",
}

/**
 * AdminManager Class - Handles admin status detection and management
 */
export class AdminManager {
  constructor() {
    this.adminCache = new Map() // Cache for admin status to reduce API calls
  }

  /**
   * Set admin status for message sender and bot
   */
  async setAdminStatus(sock, m) {
    try {
      // Private chats: both user and bot are considered admins
      if (!m.isGroup) {
        m.isAdmin = true
        m.isBotAdmin = true
        m.isCreator = this.checkIsBotOwner(sock, m.sender)
        return
      }

      // Group chats: check actual admin status
      const cacheKey = `${m.chat}_${m.sender}`
      const cached = this.adminCache.get(cacheKey)

      // Use cache if available and not older than 5 minutes
      if (cached && Date.now() - cached.timestamp < 300000) {
        m.isAdmin = cached.isAdmin
        m.isBotAdmin = cached.isBotAdmin
        m.isCreator = this.checkIsBotOwner(sock, m.sender)
        m.groupMetadata = cached.groupMetadata
        m.participants = cached.participants
        return
      }

      // Fetch group metadata
      const groupMetadata = await sock.groupMetadata(m.chat)
      const participants = groupMetadata.participants || []

      // Get normalized JIDs for comparison
      const botJid = this.normalizeJidWithDecoding(sock, sock.user?.id)
      const senderJid = this.normalizeJidWithDecoding(sock, m.sender)

      // Check admin status against participant list
      m.isAdmin = this.checkAdminStatus(participants, senderJid)
      m.isBotAdmin = this.checkAdminStatus(participants, botJid)
      m.isCreator = this.checkIsBotOwner(sock, m.sender)

      // Attach group metadata for other functions to use
      m.groupMetadata = groupMetadata
      m.participants = participants

      // Cache the results
      this.adminCache.set(cacheKey, {
        isAdmin: m.isAdmin,
        isBotAdmin: m.isBotAdmin,
        groupMetadata: groupMetadata,
        participants: participants,
        timestamp: Date.now(),
      })

      // Cache bot admin status separately for quicker access
      this.adminCache.set(`${m.chat}_bot`, {
        isBotAdmin: m.isBotAdmin,
        timestamp: Date.now(),
      })
    } catch (error) {
      // Fallback: assume no admin privileges on error
      m.isAdmin = false
      m.isBotAdmin = false
      m.isCreator = this.checkIsBotOwner(sock, m.sender)
    }
  }

  /**
   * Check if user is the bot owner using sock.user.id
   */
  checkIsBotOwner(sock, userJid) {
    try {
      if (!sock?.user?.id || !userJid) {
        return false
      }

      // Extract bot's phone number from sock.user.id
      const botNumber = sock.user.id.split(":")[0]
      const botJid = `${botNumber}@s.whatsapp.net`

      // Normalize user JID for comparison
      const normalizedUserJid = userJid.includes("@") ? userJid : `${userJid}@s.whatsapp.net`

      const isOwner = botJid === normalizedUserJid
      return isOwner
    } catch (error) {
      return false
    }
  }

  /**
   * Normalize JID with decoding support
   */
  normalizeJidWithDecoding(sock, jid) {
    if (!jid) return null
    const decoded = sock.decodeJid ? sock.decodeJid(jid) : jid
    return normalizeJid(decoded)
  }

  /**
   * Check if a participant has admin status
   */
  checkAdminStatus(participants, targetJid) {
    return participants.some((p) => {
      const participantJid = normalizeJid(p.jid)
      return participantJid === targetJid && (p.admin === "admin" || p.admin === "superadmin")
    })
  }

  /**
   * Get cached bot admin status for a group
   */
  getBotAdminStatus(chatId) {
    const cached = this.adminCache.get(`${chatId}_bot`)
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.isBotAdmin
    }
    return null
  }

  /**
   * Clear admin cache for maintenance
   */
  cleanupAdminCache() {
    const now = Date.now()
    const maxAge = 600000 // 10 minutes

    for (const [key, data] of this.adminCache.entries()) {
      if (now - data.timestamp > maxAge) {
        this.adminCache.delete(key)
      }
    }
  }

  /**
   * Get admin cache size for statistics
   */
  getAdminCacheSize() {
    return this.adminCache.size
  }

  /**
   * Clear all cached admin data
   */
  clearAdminCache() {
    this.adminCache.clear()
  }

  /**
   * Manually set admin status in cache
   */
  cacheAdminStatus(chatId, userJid, isAdmin, isBotAdmin = null) {
    const cacheKey = `${chatId}_${userJid}`
    this.adminCache.set(cacheKey, {
      isAdmin: isAdmin,
      isBotAdmin: isBotAdmin,
      timestamp: Date.now(),
    })
  }
}