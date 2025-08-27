import { logger } from "../../utils/logger.js"
import { normalizeJid } from "../utils/helpers.js"

/**
 * ContactManager Class - Handles contact information and pushName extraction
 */
export class ContactManager {
  constructor() {
    this.contactStore = new Map() // Cache for contact names/pushNames
  }

  /**
   * Extract pushName from various sources with fallback mechanisms
   */
  async extractPushName(sock, m) {
    try {
      let pushName = null
      const senderJid = m.sender

      // Method 1: Direct from message (most reliable when available)
      if (m.pushName) {
        pushName = m.pushName
      }

      // Method 2: From message notify (common in newer versions)
      else if (m.message && m.message.pushName) {
        pushName = m.message.pushName
      }

      // Method 3: From key notify
      else if (m.key && m.key.notify) {
        pushName = m.key.notify
      }

      // Method 4: Check contact store cache
      else if (this.contactStore.has(senderJid)) {
        const cached = this.contactStore.get(senderJid)
        if (cached.pushName && Date.now() - cached.timestamp < 300000) {
          // 5 minutes cache
          pushName = cached.pushName
        }
      }

      // Method 5: Try to get from sock store if available
      else if (sock.store && sock.store.contacts && sock.store.contacts[senderJid]) {
        const contact = sock.store.contacts[senderJid]
        pushName = contact.notify || contact.name || contact.pushName
      }

      // Method 6: Extract from participant info (groups)
      else if (m.isGroup && m.participants) {
        const participant = m.participants.find((p) => normalizeJid(p.jid) === normalizeJid(senderJid))
        if (participant && participant.notify) {
          pushName = participant.notify
        }
      }

      // Method 7: Try to get from WhatsApp contact query (last resort)
      if (!pushName && sock.onWhatsApp) {
        try {
          const phoneNumber = senderJid.split("@")[0]
          const [result] = await sock.onWhatsApp(phoneNumber)
          if (result && result.notify) {
            pushName = result.notify
          }
        } catch (error) {
          // Silently handle WhatsApp query errors
        }
      }

      // Set pushName with fallback
      m.pushName = pushName || this.generateFallbackName(senderJid)

      // Cache the result for future use
      this.contactStore.set(senderJid, {
        pushName: m.pushName,
        timestamp: Date.now(),
      })
    } catch (error) {
      // Ensure pushName is always set, even on error
      m.pushName = this.generateFallbackName(m.sender)
    }
  }

  /**
   * Generate fallback name when pushName is not available
   */
  generateFallbackName(jid) {
    if (!jid) return "Unknown"

    const phoneNumber = jid.split("@")[0]
    if (phoneNumber && phoneNumber.length > 4) {
      // Show last 4 digits for privacy
      return `User ${phoneNumber.slice(-4)}`
    }
    return "Unknown User"
  }

  /**
   * Clear old entries from contact store to prevent memory leaks
   */
  cleanupContactStore() {
    const now = Date.now()
    const maxAge = 1800000 // 30 minutes

    for (const [jid, data] of this.contactStore.entries()) {
      if (now - data.timestamp > maxAge) {
        this.contactStore.delete(jid)
      }
    }
  }

  /**
   * Get contact cache size for statistics
   */
  getContactCacheSize() {
    return this.contactStore.size
  }

  /**
   * Clear all cached contacts
   */
  clearContactCache() {
    this.contactStore.clear()
  }

  /**
   * Get cached contact information
   */
  getCachedContact(jid) {
    return this.contactStore.get(jid)
  }

  /**
   * Manually cache a contact
   */
  cacheContact(jid, pushName) {
    this.contactStore.set(jid, {
      pushName: pushName,
      timestamp: Date.now(),
    })
  }
}