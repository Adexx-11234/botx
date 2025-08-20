import { logger } from "../../utils/logger.js"
import { GroupHandler } from "./groups.js"

export class EventHandler {
  constructor(sessionManager) {
    this.sessionManager = sessionManager
    this.groupHandler = new GroupHandler()
  }

  setupEventHandlers(sock, sessionId) {
    logger.info(`[Events] Setting up event handlers for session ${sessionId}`)

    // Connection events
    sock.ev.on("connection.update", (update) => {
      this.handleConnectionUpdate(sessionId, update)
    })

    // Credentials update
    sock.ev.on("creds.update", () => {
      this.handleCredsUpdate(sessionId)
    })

    // Group events
    sock.ev.on("groups.update", (updates) => {
      this.handleGroupsUpdate(sessionId, updates)
    })

    sock.ev.on("group-participants.update", (update) => {
      this.handleGroupParticipantsUpdate(sessionId, update)
    })

    // Contact events
    sock.ev.on("contacts.update", (updates) => {
      this.handleContactsUpdate(sessionId, updates)
    })

    // Presence events
    sock.ev.on("presence.update", (update) => {
      this.handlePresenceUpdate(sessionId, update)
    })

    // Chats events
    sock.ev.on("chats.update", (updates) => {
      this.handleChatsUpdate(sessionId, updates)
    })

    // Message events are handled by the main upsert handler
    // sock.ev.on("messages.upsert", (messageInfo) => {
    //   this.handleMessagesUpsert(sessionId, messageInfo)
    // })

    // Call events
    sock.ev.on("call", (calls) => {
      this.handleCalls(sessionId, calls)
    })

    logger.info(`[Events] Event handlers set up for session ${sessionId}`)
  }

  async handleConnectionUpdate(sessionId, update) {
    const { connection, lastDisconnect, qr } = update

    logger.info(`[Events] Connection update for ${sessionId}: ${connection}`)

    try {
      // Handle specific connection states
      switch (connection) {
        case "close":
          await this.handleConnectionClose(sessionId, lastDisconnect)
          break

        case "open":
          await this.handleConnectionOpen(sessionId)
          break

        case "connecting":
          logger.info(`[Events] Session ${sessionId} is connecting...`)
          break
      }
    } catch (error) {
      logger.error(`[Events] Error handling connection update: ${error.message}`)
    }
  }

  async handleConnectionClose(sessionId, lastDisconnect) {
    const reason = lastDisconnect?.error?.output?.statusCode
    logger.warn(`[Events] Session ${sessionId} disconnected: ${reason}`)

    // Clear session data if unauthorized
    if (reason === 401) {
      await this.sessionManager.clearSession(sessionId)
      logger.info(`[Events] Cleared session ${sessionId} due to unauthorized error`)
    }
  }

  async handleConnectionOpen(sessionId) {
    logger.info(`[Events] Session ${sessionId} connected successfully`)
    
    try {
      // Update session status
      await this.sessionManager.updateSessionStatus(sessionId, "connected")
    } catch (error) {
      logger.error(`[Events] Error updating session status: ${error.message}`)
    }
  }

  async handleCredsUpdate(sessionId) {
    logger.info(`[Events] Credentials updated for session ${sessionId}`)
    
    try {
      // Update session credentials
      await this.sessionManager.updateSessionCredentials(sessionId)
    } catch (error) {
      logger.error(`[Events] Error updating credentials: ${error.message}`)
    }
  }

  async handleGroupsUpdate(sessionId, updates) {
    for (const update of updates) {
      try {
        logger.info(`[Events] Group update for ${update.id}: ${update.announce || "unknown"}`)
        
        // Handle group metadata changes
        if (update.announce !== undefined) {
          logger.info(`[Events] Group ${update.id} announcement setting: ${update.announce}`)
        }
      } catch (error) {
        logger.error(`[Events] Error handling group update: ${error.message}`)
      }
    }
  }

  async handleGroupParticipantsUpdate(sessionId, update) {
    const { id, participants, action } = update

    try {
      switch (action) {
        case "add":
          await this.groupHandler.handleGroupJoin(sessionId, id, participants)
          break

        case "remove":
          await this.groupHandler.handleGroupLeave(sessionId, id, participants)
          break

        case "promote":
          await this.groupHandler.handleGroupPromote(sessionId, id, participants)
          break

        case "demote":
          await this.groupHandler.handleGroupDemote(sessionId, id, participants)
          break

        default:
          logger.debug(`[Events] Unknown group participant action: ${action}`)
      }
    } catch (error) {
      logger.error(`[Events] Error handling group participants update: ${error.message}`)
    }
  }

  async handleContactsUpdate(sessionId, updates) {
    for (const update of updates) {
      try {
        logger.debug(`[Events] Contact update: ${update.id} - ${update.name || "unnamed"}`)
      } catch (error) {
        logger.error(`[Events] Error handling contact update: ${error.message}`)
      }
    }
  }

  async handlePresenceUpdate(sessionId, update) {
    try {
      const { id, presences } = update
      
      for (const [userId, presence] of Object.entries(presences)) {
        logger.debug(`[Events] Presence update: ${userId} is ${presence}`)
      }
    } catch (error) {
      logger.error(`[Events] Error handling presence update: ${error.message}`)
    }
  }

  async handleChatsUpdate(sessionId, updates) {
    for (const update of updates) {
      try {
        logger.debug(`[Events] Chat update: ${update.id} - ${update.conversationTimestamp || "no timestamp"}`)
      } catch (error) {
        logger.error(`[Events] Error handling chat update: ${error.message}`)
      }
    }
  }

  async handleCalls(sessionId, calls) {
    for (const call of calls) {
      try {
        const { id, status, fromMe, duration } = call
        logger.info(`[Events] Call ${id}: ${status} (${duration || 0}s) - ${fromMe ? "outgoing" : "incoming"}`)
      } catch (error) {
        logger.error(`[Events] Error handling call: ${error.message}`)
      }
    }
  }
}
