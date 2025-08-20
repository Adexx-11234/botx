// whatsapp/utils/admin-checker.js - Enhanced Admin Checker

import { GroupQueries } from "../../queries/index.js"
import { logger } from "../../utils/logger.js"

export default class AdminChecker {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 2 * 60 * 1000 // 2 minutes cache
  }

  /**
   * Normalize JID to ensure consistent comparison
   */
  normalizeJid(jid) {
    if (!jid) return ""
    return jid.includes("@") ? jid : `${jid}@s.whatsapp.net`
  }

  /**
   * Get group metadata with caching
   */
  async getGroupMetadata(sock, groupJid) {
    const cacheKey = `metadata_${groupJid}`
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }
      this.cache.delete(cacheKey)
    }

    try {
      const metadata = await sock.groupMetadata(groupJid)
      this.cache.set(cacheKey, {
        data: metadata,
        timestamp: Date.now()
      })
      return metadata
    } catch (error) {
      logger.error(`[AdminChecker] Error fetching group metadata for ${groupJid}: ${error.message}`)
      return null
    }
  }

  /**
   * Extract group admins from participants
   */
  getGroupAdmins(participants) {
    if (!Array.isArray(participants)) return []
    
    return participants
      .filter(p => p.admin === "admin" || p.admin === "superadmin")
      .map(p => this.normalizeJid(p.id) || this.normalizeJid(p.jid))
      .filter(jid => jid) // Remove empty JIDs
  }

  /**
   * Check if user is group admin (comprehensive check)
   */
  async isGroupAdmin(sock, groupJid, userJid) {
    try {
      const normalizedUserJid = this.normalizeJid(userJid)
      const groupMetadata = await this.getGroupMetadata(sock, groupJid)
      
      if (!groupMetadata || !groupMetadata.participants) {
        logger.warn(`[AdminChecker] No group metadata or participants for ${groupJid}`)
        return false
      }

      // Method 1: Check through admin list
      const groupAdmins = this.getGroupAdmins(groupMetadata.participants)
      const isAdminByList = groupAdmins.includes(normalizedUserJid)

      // Method 2: Direct participant lookup (more reliable)
      const userParticipant = groupMetadata.participants.find(p => {
        const participantId = this.normalizeJid(p.jid)
        const participantJid = this.normalizeJid(p.jid)
        return participantId === normalizedUserJid || participantJid === normalizedUserJid
      })

      const isReallyAdmin = userParticipant && (
        userParticipant.admin === "admin" || 
        userParticipant.admin === "superadmin"
      )

      // Method 3: Check if user is group owner
      const groupOwner = this.normalizeJid(groupMetadata.owner || "")
      const isGroupOwner = groupOwner ? groupOwner === normalizedUserJid : isAdminByList

      const result = isAdminByList || isReallyAdmin || isGroupOwner

      logger.debug(`[AdminChecker] Admin check for ${normalizedUserJid} in ${groupJid}: ${result}`)
      return result

    } catch (error) {
      logger.error(`[AdminChecker] Error checking admin status: ${error.message}`)
      return false
    }
  }

  /**
   * Check if bot is admin in group
   */
  async isBotAdmin(sock, groupJid) {
    try {
      const botNumber = this.normalizeJid((sock.user?.id || "").split(":")[0])
      const groupMetadata = await this.getGroupMetadata(sock, groupJid)
      
      if (!groupMetadata || !groupMetadata.participants) {
        logger.warn(`[AdminChecker] No group metadata for bot admin check in ${groupJid}`)
        return false
      }

      // Robust bot admin check
      const isBotAdmin = groupMetadata.participants.some(p => {
        const participantId = this.normalizeJid(p.jid)
        const participantJid = this.normalizeJid(p.jid)
        const botJid = this.normalizeJid(botNumber)
        
        return (
          (participantId === botJid || participantJid === botJid) && 
          (p.admin === "admin" || p.admin === "superadmin")
        )
      })

      logger.debug(`[AdminChecker] Bot admin status in ${groupJid}: ${isBotAdmin}`)
      return isBotAdmin

    } catch (error) {
      logger.error(`[AdminChecker] Error checking bot admin status: ${error.message}`)
      return false
    }
  }

  /**
   * Get comprehensive group information
   */
  async getGroupInfo(sock, groupJid, userJid = null) {
    try {
      const groupMetadata = await this.getGroupMetadata(sock, groupJid)
      
      if (!groupMetadata) {
        return {
          groupName: "",
          participants: [],
          groupAdmins: [],
          groupOwner: "",
          botIsAdmin: false,
          userIsAdmin: false,
          userIsOwner: false,
          metadata: null
        }
      }

      const groupName = groupMetadata.subject || ""
      const participants = groupMetadata.participants || []
      const groupAdmins = this.getGroupAdmins(participants)
      const groupOwner = this.normalizeJid(groupMetadata.owner || "")
      
      // Bot admin status
      const botNumber = this.normalizeJid((sock.user?.id || "").split(":")[0])
      const botIsAdmin = participants.some(p => {
        const participantId = this.normalizeJid(p.id)
        const participantJid = this.normalizeJid(p.jid)
        const botJid = this.normalizeJid(botNumber)
        
        return (
          (participantId === botJid || participantJid === botJid) && 
          (p.admin === "admin" || p.admin === "superadmin")
        )
      })

      let userIsAdmin = false
      let userIsOwner = false

      if (userJid) {
        const normalizedUserJid = this.normalizeJid(userJid)
        
        // Check if user is admin
        const userParticipant = participants.find(p => {
          const participantId = this.normalizeJid(p.jid)
          const participantJid = this.normalizeJid(p.jid)
          return participantId === normalizedUserJid || participantJid === normalizedUserJid
        })

        userIsAdmin = userParticipant && (
          userParticipant.admin === "admin" || 
          userParticipant.admin === "superadmin"
        )

        // Check if user is owner (fallback to admin list if owner not set)
        userIsOwner = groupOwner ? 
          groupOwner === normalizedUserJid : 
          groupAdmins.includes(normalizedUserJid)
      }

      return {
        groupName,
        participants,
        groupAdmins,
        groupOwner,
        botIsAdmin,
        userIsAdmin: userIsAdmin || userIsOwner, // Owner is also considered admin
        userIsOwner,
        metadata: groupMetadata
      }

    } catch (error) {
      logger.error(`[AdminChecker] Error getting group info: ${error.message}`)
      return {
        groupName: "",
        participants: [],
        groupAdmins: [],
        groupOwner: "",
        botIsAdmin: false,
        userIsAdmin: false,
        userIsOwner: false,
        metadata: null
      }
    }
  }

  /**
   * Check if user has permission (admin or owner)
   */
  async hasPermission(sock, groupJid, userJid, includeCreator = false, creatorJid = null) {
    try {
      const groupInfo = await this.getGroupInfo(sock, groupJid, userJid)
      const normalizedUserJid = this.normalizeJid(userJid)
      
      // Check if user is bot itself
      const botNumber = this.normalizeJid((sock.user?.id || "").split(":")[0])
      const isBotSender = normalizedUserJid === botNumber

      // Check if user is system creator/owner
      const isCreator = includeCreator && creatorJid && 
        this.normalizeJid(creatorJid) === normalizedUserJid

      const hasPermission = isCreator || groupInfo.userIsAdmin || groupInfo.userIsOwner || isBotSender

      logger.debug(`[AdminChecker] Permission check for ${normalizedUserJid}: ${hasPermission}`)
      return {
        hasPermission,
        isCreator,
        isAdmin: groupInfo.userIsAdmin,
        isOwner: groupInfo.userIsOwner,
        isBotSender,
        groupInfo
      }

    } catch (error) {
      logger.error(`[AdminChecker] Error checking permissions: ${error.message}`)
      return {
        hasPermission: false,
        isCreator: false,
        isAdmin: false,
        isOwner: false,
        isBotSender: false,
        groupInfo: null
      }
    }
  }

  /**
   * Check if user can perform admin actions (needs both user and bot to be admin)
   */
  async canPerformAdminActions(sock, groupJid, userJid) {
    try {
      const groupInfo = await this.getGroupInfo(sock, groupJid, userJid)
      
      const userCanAct = groupInfo.userIsAdmin || groupInfo.userIsOwner
      const botCanAct = groupInfo.botIsAdmin
      
      return {
        canAct: userCanAct && botCanAct,
        userIsAdmin: userCanAct,
        botIsAdmin: botCanAct,
        reason: !userCanAct ? "user_not_admin" : !botCanAct ? "bot_not_admin" : "ok"
      }

    } catch (error) {
      logger.error(`[AdminChecker] Error checking admin action permissions: ${error.message}`)
      return {
        canAct: false,
        userIsAdmin: false,
        botIsAdmin: false,
        reason: "error"
      }
    }
  }

  /**
   * Clear cache for specific group or all cache
   */
  clearCache(groupJid = null) {
    if (groupJid) {
      const cacheKey = `metadata_${groupJid}`
      this.cache.delete(cacheKey)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout,
      keys: Array.from(this.cache.keys())
    }
  }
}