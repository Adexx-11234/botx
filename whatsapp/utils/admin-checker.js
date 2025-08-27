import { logger } from "../../utils/logger.js"
import { groupMetadataManager } from "./group-metadata.js"

export class AdminChecker {
  constructor() {
    this.log = logger.child({ component: "ADMIN-CHECKER" })
  }

  /**
   * Normalize JID to ensure consistent comparison
   * Enhanced to handle LID format
   */
  normalizeJid(jid) {
    if (!jid) return ""
    
    // Don't normalize LIDs - let GroupMetadataManager handle them
    if (jid.endsWith('@lid')) {
      return jid
    }
    
    // Handle colon format like "1234567890:16@s.whatsapp.net"
    if (jid.includes(':')) {
      jid = jid.split(':')[0]
    }
    
    // Add @s.whatsapp.net if not present and it's a phone number
    if (/^\d+$/.test(jid)) {
      return `${jid}@s.whatsapp.net`
    }
    
    return jid.includes("@") ? jid : `${jid}@s.whatsapp.net`
  }

  /**
   * Check if user is group admin
   * Now supports LID resolution through GroupMetadataManager
   */
  async isGroupAdmin(sock, groupJid, userJid) {
    try {
      if (!groupJid.endsWith("@g.us")) {
        return false // Not a group
      }

      // Let GroupMetadataManager handle normalization and LID resolution
      console.log("[v0] Utils AdminChecker - Checking user admin:", userJid, "in group:", groupJid)
      const result = await groupMetadataManager.isGroupAdmin(sock, groupJid, userJid)
      console.log("[v0] Utils AdminChecker - User admin result:", result)
      return result
    } catch (error) {
      this.log.error(`Error checking admin status for ${userJid} in ${groupJid}:`, error)
      return false
    }
  }

  /**
   * Check if bot is group admin
   */
  async isBotAdmin(sock, groupJid) {
    try {
      if (!groupJid.endsWith("@g.us")) {
        return false // Not a group
      }

      const rawBotId = sock.user?.id || ""
      const botNumber = this.normalizeJid(rawBotId.split(":")[0])
      
      console.log("[v0] Utils AdminChecker Bot JID Debug - Raw ID:", rawBotId)
      console.log("[v0] Utils AdminChecker Bot JID Debug - After split:", rawBotId.split(":")[0])
      console.log("[v0] Utils AdminChecker Bot JID Debug - Normalized:", botNumber)
      
      const result = await groupMetadataManager.isBotAdmin(sock, groupJid)
      console.log("[v0] Utils AdminChecker - Bot admin result:", result)
      return result
    } catch (error) {
      this.log.error(`Error checking bot admin status in ${groupJid}:`, error)
      return false
    }
  }

  /**
   * Check if user is group owner
   * Now supports LID resolution
   */
  async isGroupOwner(sock, groupJid, userJid) {
    try {
      if (!groupJid.endsWith("@g.us")) {
        return false // Not a group
      }

      return await groupMetadataManager.isGroupOwner(sock, groupJid, userJid)
    } catch (error) {
      this.log.error(`Error checking owner status for ${userJid} in ${groupJid}:`, error)
      return false
    }
  }

  /**
   * Get group admins
   */
  async getGroupAdmins(sock, groupJid) {
    try {
      if (!groupJid.endsWith("@g.us")) {
        return []
      }

      return await groupMetadataManager.getGroupAdmins(sock, groupJid)
    } catch (error) {
      this.log.error(`Error getting group admins for ${groupJid}:`, error)
      return []
    }
  }

  /**
   * Resolve LID to actual JID if needed
   * Convenience method for other parts of the system
   */
  async resolveJid(sock, groupJid, jid) {
    try {
      return await groupMetadataManager.getActualJid(sock, groupJid, jid)
    } catch (error) {
      this.log.error(`Error resolving JID ${jid}:`, error)
      return jid
    }
  }

  /**
   * Get participant display name (handles LIDs)
   */
  async getParticipantName(sock, groupJid, participantJid) {
    try {
      return await groupMetadataManager.getParticipantName(sock, groupJid, participantJid)
    } catch (error) {
      this.log.error(`Error getting participant name for ${participantJid}:`, error)
      return "@User"
    }
  }
}

export const adminChecker = new AdminChecker()
export default AdminChecker
