// WhatsApp helper utilities
import {
  jidDecode,
  areJidsSameUser,
  downloadContentFromMessage as baileyDownloadContent,
  getContentType as baileysGetContentType,
} from "@whiskeysockets/baileys"

export class WhatsAppHelpers {
  // JID utilities
  static formatJid(jid) {
    if (!jid) return null

    // Remove any extra characters and ensure proper format
    const cleaned = jid.replace(/[^\d@.]/g, "")

    // Check if it's a group JID
    if (cleaned.includes("@g.us")) {
      return cleaned
    }

    // Check if it's a user JID
    if (cleaned.includes("@s.whatsapp.net")) {
      return cleaned
    }

    // If it's just a phone number, format it properly
    if (/^\d+$/.test(cleaned)) {
      return `${cleaned}@s.whatsapp.net`
    }

    return cleaned
  }

  static isGroupJid(jid) {
    return jid && jid.endsWith("@g.us")
  }

  static isUserJid(jid) {
    return jid && jid.endsWith("@s.whatsapp.net")
  }

  static getPhoneNumber(jid) {
    if (!jid) return null

    const decoded = jidDecode(jid)
    return decoded?.user || null
  }

  static sameUser(jid1, jid2) {
    return areJidsSameUser(jid1, jid2)
  }

  // Message utilities
  static extractMessageText(message) {
    if (!message) return null

    // Handle different message types
    if (message.conversation) {
      return message.conversation
    }

    if (message.extendedTextMessage?.text) {
      return message.extendedTextMessage.text
    }

    if (message.imageMessage?.caption) {
      return message.imageMessage.caption || null
    }

    if (message.videoMessage?.caption) {
      return message.videoMessage.caption || null
    }

    if (message.documentMessage?.caption) {
      return message.documentMessage.caption || null
    }

    return null
  }

  static getMessageType(message) {
    if (!message) return "unknown"

    const types = [
      "conversation",
      "extendedTextMessage",
      "imageMessage",
      "videoMessage",
      "audioMessage",
      "documentMessage",
      "stickerMessage",
      "locationMessage",
      "contactMessage",
      "reactionMessage",
      "pollCreationMessage",
      "pollUpdateMessage",
    ]

    for (const type of types) {
      if (message[type]) {
        return type
      }
    }

    return "unknown"
  }

  static getMessageAge(timestamp) {
    if (!timestamp) return 0
    const now = Math.floor(Date.now() / 1000)
    return now - timestamp
  }

  static isOldMessage(timestamp, maxAge = 300) {
    return this.getMessageAge(timestamp) > maxAge
  }

  // Phone number utilities
  static formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null

    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, "")

    // Check if it's a valid phone number
    if (cleaned.length < 10 || cleaned.length > 15) {
      return null
    }

    // Add country code if missing (assume +1 for US/Canada)
    if (cleaned.length === 10) {
      return `+1${cleaned}`
    }

    // If it already has country code, format it
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+${cleaned}`
    }

    // If it has international format, add +
    if (cleaned.length >= 10) {
      return `+${cleaned}`
    }

    return null
  }

  static validatePhoneNumber(phoneNumber) {
    const formatted = this.formatPhoneNumber(phoneNumber)
    return formatted !== null
  }

  // Rate limiting utilities
  static createRateLimitKey(jid) {
    // Create a rate limit key based on JID
    return jid.replace(/[^\w]/g, "_")
  }

  // Time utilities
  static getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000)
  }

  static formatTimestamp(timestamp) {
    if (!timestamp) return "Unknown"

    const date = new Date(timestamp * 1000)
    return date.toLocaleString()
  }

  static getRelativeTime(timestamp) {
    if (!timestamp) return "Unknown"

    const now = Math.floor(Date.now() / 1000)
    const diff = now - timestamp

    if (diff < 60) return `${diff} seconds ago`
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
    if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`

    return `${Math.floor(diff / 2592000)} months ago`
  }
}

export function normalizeJid(jid) {
  if (!jid) return null

  try {
    const decoded = jidDecode(jid)
    if (decoded?.user) {
      // Convert @lid to proper @s.whatsapp.net format
      if (jid.includes("@lid")) {
        return `${decoded.user}@s.whatsapp.net`
      }
      // Handle group JIDs
      if (decoded.server === "g.us") {
        return `${decoded.user}@g.us`
      }
      // Handle regular user JIDs
      if (decoded.server === "s.whatsapp.net") {
        return `${decoded.user}@s.whatsapp.net`
      }
    }
  } catch (error) {
    // Fallback to original formatJid if jidDecode fails
    console.warn(`[JID] Failed to decode JID ${jid}:`, error.message)
  }

  // Fallback to original logic
  return WhatsAppHelpers.formatJid(jid)
}

export const formatJid = WhatsAppHelpers.formatJid.bind(WhatsAppHelpers)
export const isGroupJid = WhatsAppHelpers.isGroupJid.bind(WhatsAppHelpers)
export const isUserJid = WhatsAppHelpers.isUserJid.bind(WhatsAppHelpers)
export const getPhoneNumber = WhatsAppHelpers.getPhoneNumber.bind(WhatsAppHelpers)
export const sameUser = WhatsAppHelpers.sameUser.bind(WhatsAppHelpers)
export const extractMessageText = WhatsAppHelpers.extractMessageText.bind(WhatsAppHelpers)
export const getMessageType = WhatsAppHelpers.getMessageType.bind(WhatsAppHelpers)

export const downloadContentFromMessage = baileyDownloadContent
export const getContentType = baileysGetContentType
