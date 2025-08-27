import { logger } from "../../utils/logger.js"
import { updateGroupCache, clearGroupCache } from "../../config/baileys.js"

export class GroupMetadataManager {
  constructor() {
    this.log = logger.child({ component: "GROUP-METADATA" })
    this.cache = new Map() // Local cache for frequently accessed data
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Normalize JID format - handles various WhatsApp ID formats including lid
   */
  normalizeJid(jid) {
    if (!jid) return ""

    let cleanJid = jid

    // Handle full user IDs like "1234567890:1@s.whatsapp.net"
    if (cleanJid.includes(":")) {
      cleanJid = cleanJid.split(":")[0]
    }

    // Add @s.whatsapp.net if not present and it's a phone number
    if (/^\d+$/.test(cleanJid)) {
      return `${cleanJid}@s.whatsapp.net`
    }

    return cleanJid
  }

  /**
   * Resolve LID to actual phone number JID using group metadata
   */
  async resolveLidToJid(sock, groupJid, lidJid) {
    try {
      if (!lidJid.endsWith('@lid')) {
        return lidJid // Not a LID, return as-is
      }

      const metadata = await this.getGroupMetadata(sock, groupJid)
      if (!metadata?.participants) {
        return lidJid
      }

      // Find participant by LID and get their actual JID
      const participant = metadata.participants.find(p => p.id === lidJid)
      if (participant && participant.jid) {
        this.log.debug(`Resolved LID ${lidJid} to JID ${participant.jid}`)
        return participant.jid
      }

      this.log.warn(`Could not resolve LID ${lidJid} to actual JID`)
      return lidJid
    } catch (error) {
      this.log.error(`Error resolving LID ${lidJid}:`, error)
      return lidJid
    }
  }

  /**
   * Get group metadata with caching
   */
  async getGroupMetadata(sock, groupJid) {
    try {
      if (!groupJid || !groupJid.endsWith("@g.us")) {
        return null
      }

      // Check local cache first
      const cached = this.cache.get(groupJid)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        this.log.debug(`Using cached metadata for ${groupJid}`)
        return cached.data
      }

      // Fetch fresh metadata
      const metadata = await sock.groupMetadata(groupJid)

      // Update cache
      this.updateLocalCache(groupJid, metadata)
      updateGroupCache(groupJid, metadata)

      return metadata
    } catch (error) {
      this.log.error(`Error getting group metadata for ${groupJid}:`, error)
      return null
    }
  }

  /**
   * Get group participants
   */
  async getGroupParticipants(sock, groupJid) {
    try {
      const metadata = await this.getGroupMetadata(sock, groupJid)
      return metadata?.participants || []
    } catch (error) {
      this.log.error(`Error getting group participants for ${groupJid}:`, error)
      return []
    }
  }

  /**
   * Get group admins using proper JID checking
   */
  async getGroupAdmins(sock, groupJid) {
    try {
      const participants = await this.getGroupParticipants(sock, groupJid)
      return participants.filter((p) => p.admin === "admin" || p.admin === "superadmin")
    } catch (error) {
      this.log.error(`Error getting group admins for ${groupJid}:`, error)
      return []
    }
  }

  /**
   * Check if user is admin (alias for isGroupAdmin for consistency)
   */
  async isUserAdmin(sock, groupJid, userJid) {
    return await this.isGroupAdmin(sock, groupJid, userJid)
  }

  /**
   * Check if user is group admin using JID with LID resolution
   */
  async isGroupAdmin(sock, groupJid, userJid) {
    try {
      const participants = await this.getGroupParticipants(sock, groupJid)
      
      // Resolve LID if necessary
      const resolvedUserJid = await this.resolveLidToJid(sock, groupJid, userJid)
      const normalizedUserJid = this.normalizeJid(resolvedUserJid)

      return participants.some((p) => {
        // Check both the participant's id (which might be LID) and jid (actual phone number)
        const participantId = p.id || p.jid
        const participantJid = p.jid || p.id
        
        const normalizedParticipantId = this.normalizeJid(participantId)
        const normalizedParticipantJid = this.normalizeJid(participantJid)
        
        const hasAdminRole = p.admin === "admin" || p.admin === "superadmin"
        
        // Check against both ID and JID to handle LID cases
        const isMatch = (normalizedParticipantId === normalizedUserJid || 
                        normalizedParticipantJid === normalizedUserJid ||
                        participantId === userJid ||
                        participantJid === userJid)
        
        return isMatch && hasAdminRole
      })
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
      const botJid = sock.user?.id
      if (!botJid) return false

      const botNumber = this.normalizeJid(botJid.split(":")[0])
      return await this.isGroupAdmin(sock, groupJid, botNumber)
    } catch (error) {
      this.log.error(`Error checking bot admin status in ${groupJid}:`, error)
      return false
    }
  }

  /**
   * Get group name
   */
  async getGroupName(sock, groupJid) {
    try {
      const metadata = await this.getGroupMetadata(sock, groupJid)
      return metadata?.subject || ""
    } catch (error) {
      this.log.error(`Error getting group name for ${groupJid}:`, error)
      return ""
    }
  }

  /**
   * Get group owner
   */
  async getGroupOwner(sock, groupJid) {
    try {
      const metadata = await this.getGroupMetadata(sock, groupJid)
      return metadata?.owner || ""
    } catch (error) {
      this.log.error(`Error getting group owner for ${groupJid}:`, error)
      return ""
    }
  }

  /**
   * Check if user is group owner with LID resolution
   */
  async isGroupOwner(sock, groupJid, userJid) {
    try {
      const owner = await this.getGroupOwner(sock, groupJid)
      
      // Resolve LID if necessary
      const resolvedUserJid = await this.resolveLidToJid(sock, groupJid, userJid)
      const normalizedUserJid = this.normalizeJid(resolvedUserJid)
      const normalizedOwner = this.normalizeJid(owner)

      // Also check direct LID match
      return normalizedOwner === normalizedUserJid || owner === userJid
    } catch (error) {
      this.log.error(`Error checking owner status for ${userJid} in ${groupJid}:`, error)
      return false
    }
  }

  /**
   * Get actual phone number JID from LID or regular JID
   * This is useful for mentions and other operations that need the real JID
   */
  async getActualJid(sock, groupJid, inputJid) {
    try {
      if (inputJid.endsWith('@lid')) {
        return await this.resolveLidToJid(sock, groupJid, inputJid)
      }
      return inputJid
    } catch (error) {
      this.log.error(`Error getting actual JID for ${inputJid}:`, error)
      return inputJid
    }
  }

  /**
   * Get display name for participant (handles LID participants)
   */
  async getParticipantName(sock, groupJid, participantJid) {
    try {
      const participants = await this.getGroupParticipants(sock, groupJid)
      const participant = participants.find(p => 
        p.id === participantJid || 
        p.jid === participantJid ||
        this.normalizeJid(p.jid || p.id) === this.normalizeJid(participantJid)
      )
      
      if (participant) {
        // Use the actual JID for display
        const actualJid = participant.jid || participant.id
        if (actualJid && actualJid.includes("@")) {
          return `@${actualJid.split("@")[0]}`
        }
      }
      
      // Fallback
      if (participantJid && participantJid.includes("@")) {
        return `@${participantJid.split("@")[0]}`
      }
      
      return "@User"
    } catch (error) {
      this.log.error(`Error getting participant name for ${participantJid}:`, error)
      return "@User"
    }
  }

  /**
   * Update local cache
   */
  updateLocalCache(groupJid, metadata) {
    this.cache.set(groupJid, {
      data: metadata,
      timestamp: Date.now(),
    })
  }

  /**
   * Clear cache for specific group
   */
  clearCache(groupJid) {
    this.cache.delete(groupJid)
    clearGroupCache(groupJid)
    this.log.debug(`Cleared cache for ${groupJid}`)
  }

  /**
   * Clean up old cache entries
   */
  cleanupCache() {
    const now = Date.now()
    for (const [groupJid, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.cache.delete(groupJid)
      }
    }
  }
}

// Create singleton instance
const groupMetadataManagerInstance = new GroupMetadataManager()

export const groupMetadataManager = groupMetadataManagerInstance
export const GroupMetadataManagerClass = GroupMetadataManager
export default groupMetadataManagerInstance
