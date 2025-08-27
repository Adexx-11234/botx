// Unified WhatsApp event handlers - Single source of truth for all events
import { logger } from "../../utils/logger.js"
import { handleGroupParticipantsUpdate } from "../handlers/upsert.js"

export class EventHandler {
  constructor(sessionManager) {
    this.sessionManager = sessionManager
    this.eventStats = new Map()
  }

  setupEventHandlers(sock, sessionId) {
    logger.info(`[UnifiedEvents] Setting up event handlers for session ${sessionId}`)

    // Connection events
    sock.ev.on("connection.update", (update) => {
      this.trackEvent("connection.update")
      this.handleConnectionUpdate(sessionId, update)
    })

    // Credentials update
    sock.ev.on("creds.update", () => {
      this.trackEvent("creds.update")
      this.handleCredsUpdate(sessionId)
    })

    // Group events - SINGLE HANDLER
    sock.ev.on("groups.upsert", async (groups) => {
      this.trackEvent("groups.upsert")
      try {
        for (const group of groups) {
          logger.info(`[UnifiedEvents] Joined group: ${group.id} - ${group.subject}`)
          await this.handleGroupUpsert(sessionId, group, sock)
        }
      } catch (error) {
        logger.error(`[UnifiedEvents] Error in groups.upsert: ${error.message}`)
      }
    })

    sock.ev.on("groups.update", async (updates) => {
      this.trackEvent("groups.update")
      try {
        for (const update of updates) {
          await this.handleGroupUpdate(sessionId, update, sock)
        }
      } catch (error) {
        logger.error(`[UnifiedEvents] Error in groups.update: ${error.message}`)
      }
    })

    // SINGLE group-participants.update handler with LID resolution
    sock.ev.on("group-participants.update", async (update) => {
      this.trackEvent("group-participants.update")
      try {
        const { id, participants, action } = update
        
        logger.info(`[UnifiedEvents] Group participants ${action}: ${participants.length} participants in ${id}`)
        logger.debug(`[UnifiedEvents] Original participants: ${participants.join(", ")}`)
        
        // Resolve LID participants to actual JIDs if we have a resolveLidToActualJid method
        let resolvedParticipants = participants
        if (this.sessionManager.resolveLidToActualJid) {
          resolvedParticipants = await Promise.all(
            participants.map(async (participant) => {
              if (participant.endsWith('@lid')) {
                try {
                  const resolved = await this.sessionManager.resolveLidToActualJid(sock, id, participant)
                  logger.debug(`[UnifiedEvents] Resolved LID ${participant} to ${resolved}`)
                  return resolved || participant
                } catch (error) {
                  logger.warn(`[UnifiedEvents] Failed to resolve LID ${participant}: ${error.message}`)
                  return participant
                }
              }
              return participant
            })
          )
        }

        // Create enhanced update object
        const enhancedUpdate = {
          ...update,
          participants: resolvedParticipants,
          originalParticipants: participants
        }

        // Create minimal m object for the handler
        const m = {
          chat: id,
          isGroup: true,
          sessionId: sessionId,
          key: {
            id: `SYSTEM_${Date.now()}`,
            remoteJid: id,
            fromMe: false
          },
          fromMe: false
        }

        // Call the unified handler
        await handleGroupParticipantsUpdate(sessionId, enhancedUpdate, sock, m)
        
      } catch (error) {
        logger.error(`[UnifiedEvents] Error in group-participants.update: ${error.message}`)
        logger.error(`[UnifiedEvents] Update details:`, JSON.stringify(update, null, 2))
      }
    })

    // Contact events
    sock.ev.on("contacts.update", (updates) => {
      this.trackEvent("contacts.update")
      this.handleContactsUpdate(sessionId, updates)
    })

    // Presence events
    sock.ev.on("presence.update", (update) => {
      this.trackEvent("presence.update")
      this.handlePresenceUpdate(sessionId, update)
    })

    // Chats events
    sock.ev.on("chats.update", (updates) => {
      this.trackEvent("chats.update")
      this.handleChatsUpdate(sessionId, updates)
    })

    // Call events
    sock.ev.on("call", (calls) => {
      this.trackEvent("call")
      this.handleCalls(sessionId, calls)
    })

    // Blocklist events
    sock.ev.on("blocklist.set", async (blocklist) => {
      this.trackEvent("blocklist.set")
      try {
        await this.handleBlocklistSet(sessionId, blocklist, sock)
      } catch (error) {
        logger.error(`[UnifiedEvents] Error in blocklist.set: ${error.message}`)
      }
    })

    sock.ev.on("blocklist.update", async (update) => {
      this.trackEvent("blocklist.update")
      try {
        const { added, removed } = update
        if (added?.length) {
          logger.info(`[UnifiedEvents] Blocked: ${added.join(", ")}`)
        }
        if (removed?.length) {
          logger.info(`[UnifiedEvents] Unblocked: ${removed.join(", ")}`)
        }
        await this.handleBlocklistUpdate(sessionId, update, sock)
      } catch (error) {
        logger.error(`[UnifiedEvents] Error in blocklist.update: ${error.message}`)
      }
    })

    logger.info(`[UnifiedEvents] Event handlers set up for session ${sessionId}`)
  }

  // Event tracking
  trackEvent(eventName) {
    const current = this.eventStats.get(eventName) || 0
    this.eventStats.set(eventName, current + 1)
  }

  getEventStats() {
    return Object.fromEntries(this.eventStats.entries())
  }

  // Connection handlers
  async handleConnectionUpdate(sessionId, update) {
    const { connection, lastDisconnect, qr } = update

    logger.info(`[UnifiedEvents] Connection update for ${sessionId}: ${connection}`)

    try {
      switch (connection) {
        case "close":
          await this.handleConnectionClose(sessionId, lastDisconnect)
          break

        case "open":
          await this.handleConnectionOpen(sessionId)
          break

        case "connecting":
          logger.info(`[UnifiedEvents] Session ${sessionId} is connecting...`)
          break
      }
    } catch (error) {
      logger.error(`[UnifiedEvents] Error handling connection update: ${error.message}`)
    }
  }

  async handleConnectionClose(sessionId, lastDisconnect) {
    const reason = lastDisconnect?.error?.output?.statusCode
    logger.warn(`[UnifiedEvents] Session ${sessionId} disconnected: ${reason}`)

    if (reason === 401) {
      await this.sessionManager.clearSession(sessionId)
      logger.info(`[UnifiedEvents] Cleared session ${sessionId} due to unauthorized error`)
    }
  }

  async handleConnectionOpen(sessionId) {
    logger.info(`[UnifiedEvents] Session ${sessionId} connected successfully`)

    try {
      await this.sessionManager.database?.updateConnectionStatus(sessionId, true, "connected")
    } catch (error) {
      logger.error(`[UnifiedEvents] Error updating session status: ${error.message}`)
    }
  }

  async handleCredsUpdate(sessionId) {
    logger.info(`[UnifiedEvents] Credentials updated for session ${sessionId}`)

    try {
      await this.sessionManager.updateSessionCredentials?.(sessionId)
    } catch (error) {
      logger.error(`[UnifiedEvents] Error updating credentials: ${error.message}`)
    }
  }

  // Group handlers
  async handleGroupUpsert(sessionId, group, sock) {
    logger.debug(`[UnifiedEvents] Processing group upsert for ${group.id}`)
    // Add any group joining logic here
  }

  async handleGroupUpdate(sessionId, update, sock) {
    logger.debug(`[UnifiedEvents] Processing group update for ${update.id}`)
    
    if (update.announce !== undefined) {
      logger.info(`[UnifiedEvents] Group ${update.id} announcement setting: ${update.announce}`)
    }
    
    // Add any group metadata update logic here
  }

  // Contact handlers
  async handleContactsUpdate(sessionId, updates) {
    for (const update of updates) {
      try {
        logger.debug(`[UnifiedEvents] Contact update: ${update.id} - ${update.name || "unnamed"}`)
      } catch (error) {
        logger.error(`[UnifiedEvents] Error handling contact update: ${error.message}`)
      }
    }
  }

  // Presence handlers
  async handlePresenceUpdate(sessionId, update) {
    try {
      const { id, presences } = update

      for (const [userId, presence] of Object.entries(presences)) {
        logger.debug(`[UnifiedEvents] Presence update: ${userId} is ${presence}`)
      }
    } catch (error) {
      logger.error(`[UnifiedEvents] Error handling presence update: ${error.message}`)
    }
  }

  // Chat handlers
  async handleChatsUpdate(sessionId, updates) {
    for (const update of updates) {
      try {
        logger.debug(`[UnifiedEvents] Chat update: ${update.id} - ${update.conversationTimestamp || "no timestamp"}`)
      } catch (error) {
        logger.error(`[UnifiedEvents] Error handling chat update: ${error.message}`)
      }
    }
  }

  // Call handlers
  async handleCalls(sessionId, calls) {
    for (const call of calls) {
      try {
        const { id, status, fromMe, duration } = call
        logger.info(`[UnifiedEvents] Call ${id}: ${status} (${duration || 0}s) - ${fromMe ? "outgoing" : "incoming"}`)
      } catch (error) {
        logger.error(`[UnifiedEvents] Error handling call: ${error.message}`)
      }
    }
  }

  // Blocklist handlers
  async handleBlocklistSet(sessionId, blocklist, sock) {
    logger.debug(`[UnifiedEvents] Processing blocklist set with ${blocklist.length} entries`)
  }

  async handleBlocklistUpdate(sessionId, update, sock) {
    logger.debug(`[UnifiedEvents] Processing blocklist update`)
  }
}