import { logger } from "../../utils/logger.js"

export class AdminChecker {
  constructor() {
    this.log = logger.child({ component: "ADMIN-CHECKER" })
  }

  /**
   * Check if a user is a group admin
   * @param {Object} sock - Baileys socket
   * @param {string} groupJid - Group JID
   * @param {string} userJid - User JID to check
   * @returns {Promise<boolean>} True if user is admin
   */
  async isGroupAdmin(sock, groupJid, userJid) {
    try {
      if (!groupJid.endsWith("@g.us")) {
        return false // Not a group
      }

      const metadata = await sock.groupMetadata(groupJid)
      const participants = metadata.participants || []
      
      const participant = participants.find(p => p.id === userJid)
      return participant && (participant.admin === "admin" || participant.admin === "superadmin")
    } catch (error) {
      this.log.error(`Error checking admin status for ${userJid} in ${groupJid}:`, error)
      return false
    }
  }

  /**
   * Check if the bot is a group admin
   * @param {Object} sock - Baileys socket
   * @param {string} groupJid - Group JID
   * @returns {Promise<boolean>} True if bot is admin
   */
  async isBotAdmin(sock, groupJid) {
    try {
      if (!groupJid.endsWith("@g.us")) {
        return false // Not a group
      }

      const botJid = sock.user?.id
      if (!botJid) return false

      const metadata = await sock.groupMetadata(groupJid)
      const participants = metadata.participants || []
      
      const participant = participants.find(p => p.id === botJid)
      return participant && (participant.admin === "admin" || participant.admin === "superadmin")
    } catch (error) {
      this.log.error(`Error checking bot admin status in ${groupJid}:`, error)
      return false
    }
  }

  /**
   * Get all admin participants in a group
   * @param {Object} sock - Baileys socket
   * @param {string} groupJid - Group JID
   * @returns {Promise<Array>} Array of admin participants
   */
  async getGroupAdmins(sock, groupJid) {
    try {
      if (!groupJid.endsWith("@g.us")) {
        return [] // Not a group
      }

      const metadata = await sock.groupMetadata(groupJid)
      const participants = metadata.participants || []
      
      return participants.filter(p => p.admin === "admin" || p.admin === "superadmin")
    } catch (error) {
      this.log.error(`Error getting group admins for ${groupJid}:`, error)
      return []
    }
  }

  /**
   * Check if user has specific permission level
   * @param {Object} sock - Baileys socket
   * @param {string} groupJid - Group JID
   * @param {string} userJid - User JID to check
   * @param {string} permission - Permission level: 'admin', 'superadmin', or 'any'
   * @returns {Promise<boolean>} True if user has permission
   */
  async hasPermission(sock, groupJid, userJid, permission = 'any') {
    try {
      if (!groupJid.endsWith("@g.us")) {
        return false // Not a group
      }

      const metadata = await sock.groupMetadata(groupJid)
      const participants = metadata.participants || []
      
      const participant = participants.find(p => p.id === userJid)
      if (!participant) return false

      switch (permission) {
        case 'superadmin':
          return participant.admin === "superadmin"
        case 'admin':
          return participant.admin === "admin" || participant.admin === "superadmin"
        case 'any':
        default:
          return participant.admin === "admin" || participant.admin === "superadmin"
      }
    } catch (error) {
      this.log.error(`Error checking permission for ${userJid} in ${groupJid}:`, error)
      return false
    }
  }

  /**
   * Get group metadata with caching
   * @param {Object} sock - Baileys socket
   * @param {string} groupJid - Group JID
   * @returns {Promise<Object>} Group metadata
   */
  async getGroupMetadata(sock, groupJid) {
    try {
      if (!groupJid.endsWith("@g.us")) {
        return null // Not a group
      }

      return await sock.groupMetadata(groupJid)
    } catch (error) {
      this.log.error(`Error getting group metadata for ${groupJid}:`, error)
      return null
    }
  }
}

export default AdminChecker
