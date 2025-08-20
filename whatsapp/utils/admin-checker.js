import { logger } from "../../utils/logger.js"

export class AdminChecker {
  constructor() {
    this.log = logger.child({ component: "ADMIN-CHECKER" })
  }

  /**
   * Normalize JID format - handles various WhatsApp ID formats
   */
  normalizeJid(jid) {
    if (!jid) return ""
    
    // Handle full user IDs like "1234567890:1@s.whatsapp.net"
    if (jid.includes(":")) {
      jid = jid.split(":")[0]
    }
    
    // Add @s.whatsapp.net if not present
    return jid.includes("@") ? jid : `${jid}@s.whatsapp.net`
  }

  /**
   * Get group admins using robust extraction method
   */
  getGroupAdmins(participants) {
    let admins = []
    
    if (!participants || !Array.isArray(participants)) {
      return []
    }
    
    for (let participant of participants) {
      if (participant.admin === "superadmin" || participant.admin === "admin") {
        // Try both id and jid fields, normalize them
        const adminId = participant.id || participant.jid
        if (adminId) {
          admins.push(this.normalizeJid(adminId))
        }
      }
    }
    
    return admins
  }

  /**
   * Check if a user is a group admin with comprehensive debugging
   * @param {Object} sock - Baileys socket
   * @param {string} groupJid - Group JID
   * @param {string} userJid - User JID to check
   * @returns {Promise<boolean>} True if user is admin
   */
  async isGroupAdmin(sock, groupJid, userJid) {
    try {
      if (!groupJid.endsWith("@g.us")) {
        this.log.debug(`Not a group: ${groupJid}`)
        return false // Not a group
      }

      this.log.info(`[AdminChecker] === CHECKING ADMIN STATUS ===`)
      this.log.info(`[AdminChecker] Group: ${groupJid}`)
      this.log.info(`[AdminChecker] Raw User JID: ${userJid}`)

      const metadata = await sock.groupMetadata(groupJid)
      const participants = metadata.participants || []
      
      this.log.info(`[AdminChecker] Found ${participants.length} participants`)

      // Normalize the user JID we're checking
      const normalizedUserJid = this.normalizeJid(userJid)
      this.log.info(`[AdminChecker] Normalized User JID: ${normalizedUserJid}`)

      // Debug all participants
      participants.forEach((p, index) => {
        this.log.info(`[AdminChecker] Participant ${index}: id=${p.jid}, jid=${p.jid}, admin=${p.admin}`)
      })

      // Method 1: Direct participant lookup
      const directMatch = participants.find(p => {
        const pId = this.normalizeJid(p.jid || "")
        const pJid = this.normalizeJid(p.jid || "")
        return (pId === normalizedUserJid || pJid === normalizedUserJid) && 
               (p.admin === "admin" || p.admin === "superadmin")
      })

      // Method 2: Using getGroupAdmins
      const admins = this.getGroupAdmins(participants)
      const adminListMatch = admins.includes(normalizedUserJid) || admins.includes(userJid)

      // Method 3: Raw comparison (fallback)
      const rawMatch = participants.some(p => 
        (p.jid === userJid || p.jid === userJid) && 
        (p.admin === "admin" || p.admin === "superadmin")
      )

      this.log.info(`[AdminChecker] Admin list: ${JSON.stringify(admins)}`)
      this.log.info(`[AdminChecker] Direct match: ${!!directMatch}`)
      this.log.info(`[AdminChecker] Admin list match: ${adminListMatch}`)
      this.log.info(`[AdminChecker] Raw match: ${rawMatch}`)

      const isAdmin = !!directMatch || adminListMatch || rawMatch
      this.log.info(`[AdminChecker] FINAL RESULT: ${isAdmin}`)
      this.log.info(`[AdminChecker] === END ADMIN CHECK ===`)

      return isAdmin

    } catch (error) {
      this.log.error(`Error checking admin status for ${userJid} in ${groupJid}:`, error)
      return false
    }
  }

  /**
   * Check if the bot is a group admin with enhanced detection
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
      if (!botJid) {
        this.log.error("No bot user ID available")
        return false
      }

      this.log.info(`[AdminChecker] === CHECKING BOT ADMIN STATUS ===`)
      this.log.info(`[AdminChecker] Bot ID: ${botJid}`)

      const botNumber = this.normalizeJid(botJid.split(":")[0])
      this.log.info(`[AdminChecker] Bot Number: ${botNumber}`)

      const metadata = await sock.groupMetadata(groupJid)
      const participants = metadata.participants || []
      
      // Enhanced bot admin check
      const isBotAdmin = participants.some((p) => {
        const participantId = this.normalizeJid(p.jid || "")
        const participantJid = this.normalizeJid(p.jid || "")
        
        const idMatch = participantId === botNumber
        const jidMatch = participantJid === botNumber
        const isAdmin = (p.admin === "admin" || p.admin === "superadmin")
        
        if (idMatch || jidMatch) {
          this.log.info(`[AdminChecker] Bot participant found: id=${p.jid}, admin=${p.admin}`)
        }
        
        return (idMatch || jidMatch) && isAdmin
      })

      this.log.info(`[AdminChecker] Bot is admin: ${isBotAdmin}`)
      this.log.info(`[AdminChecker] === END BOT ADMIN CHECK ===`)

      return isBotAdmin

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
      
      const adminParticipants = participants.filter(p => p.admin === "admin" || p.admin === "superadmin")
      
      this.log.debug(`Found ${adminParticipants.length} admins in group ${groupJid}`)
      
      return adminParticipants
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
      
      const normalizedUserJid = this.normalizeJid(userJid)
      
      const participant = participants.find(p => {
        const pId = this.normalizeJid(p.jid || "")
        const pJid = this.normalizeJid(p.jid || "")
        return pId === normalizedUserJid || pJid === normalizedUserJid || 
               p.jid === userJid || p.jid === userJid
      })

      if (!participant) {
        this.log.debug(`Participant not found: ${userJid}`)
        return false
      }

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
   * Get group metadata with error handling
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

  /**
   * Comprehensive admin check using multiple methods
   * @param {Object} sock - Baileys socket
   * @param {string} groupJid - Group JID
   * @param {string} userJid - User JID to check
   * @returns {Promise<boolean>} True if user is admin
   */
  async isAdminComprehensive(sock, groupJid, userJid) {
    try {
      if (!groupJid.endsWith("@g.us")) {
        return false
      }

      // Try multiple approaches
      const methods = [
        () => this.isGroupAdmin(sock, groupJid, userJid),
        () => this.hasPermission(sock, groupJid, userJid, 'any'),
      ]

      for (const method of methods) {
        try {
          const result = await method()
          if (result) {
            this.log.info(`Admin check passed using method: ${method.name}`)
            return true
          }
        } catch (error) {
          this.log.warn(`Admin check method failed: ${error.message}`)
        }
      }

      return false
    } catch (error) {
      this.log.error(`Comprehensive admin check failed: ${error.message}`)
      return false
    }
  }
}

export default AdminChecker