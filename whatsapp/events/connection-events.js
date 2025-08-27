// Connection Events Handler - Handles connection and chat-related events
import { logger } from "../../utils/logger.js"
import { normalizeJid } from "../utils/helpers.js"

export class ConnectionEventHandler {
  setup(sock, sessionId, sessionManager, mainHandler) {
    this.sessionManager = sessionManager
    this.mainHandler = mainHandler

    // Connection events
    this.setupConnectionEvents(sock, sessionId)
    
    // Chat events
    this.setupChatEvents(sock, sessionId)
    
    // Contact events
    this.setupContactEvents(sock, sessionId)
    
    // Call events
    this.setupCallEvents(sock, sessionId)
    
    // Presence events
    this.setupPresenceEvents(sock, sessionId)
    
    // Status events (prevent auto-viewing)
    this.setupStatusEvents(sock, sessionId)
  }

  setupConnectionEvents(sock, sessionId) {
    // connection.update - Connection state changes
    sock.ev.on("connection.update", async (update) => {
      this.mainHandler.trackEvent("connection.update")
      
      if (update.connection === 'open') {
        logger.info(`[ConnectionEvents] Connection opened for session ${sessionId}`)
        await this.mainHandler.setPrivatePresence(sock)
      }
      
      // Use the correct method to handle connection updates
      await this.sessionManager._handleConnectionUpdate(sessionId, update)
    })

    // creds.update - Credentials updates
    sock.ev.on("creds.update", async () => {
      await this.mainHandler.setPrivatePresence(sock)
      this.mainHandler.trackEvent("creds.update")
    })
  }

  setupChatEvents(sock, sessionId) {
    // chats.upsert - New chats opened
    sock.ev.on("chats.upsert", async (chats) => {
      this.mainHandler.trackEvent("chats.upsert")
      await this.mainHandler.setPrivatePresence(sock)
      try {
        for (const chat of chats) {
          await this.handleChatUpsert(sessionId, chat, sock)
        }
      } catch (error) {
        logger.error(`[ConnectionEvents] Error in chats.upsert: ${error.message}`)
      }
    })

    // chats.update - Chat updates (controlled to prevent auto-read)
    sock.ev.on("chats.update", async (updates) => {
      this.mainHandler.trackEvent("chats.update")
      try {
        await this.mainHandler.setPrivatePresence(sock)
        for (const update of updates) {
          // Don't automatically mark chats as read
          if (update.unreadCount !== undefined) {
            // Log unread count but don't auto-mark as read
          }
          
          await this.handleChatUpdate(sessionId, update, sock)
        }
      } catch (error) {
        logger.error(`[ConnectionEvents] Error in chats.update: ${error.message}`)
      }
    })

    // chats.delete - Chat deletions
    sock.ev.on("chats.delete", async (deletions) => {
      this.mainHandler.trackEvent("chats.delete")
      try {
        for (const deletion of deletions) {
          await this.handleChatDeletion(sessionId, deletion, sock)
        }
      } catch (error) {
        logger.error(`[ConnectionEvents] Error in chats.delete: ${error.message}`)
      }
    })
  }

  setupContactEvents(sock, sessionId) {
    // contacts.upsert - New contacts added
    sock.ev.on("contacts.upsert", async (contacts) => {
      this.mainHandler.trackEvent("contacts.upsert")
      try {
        for (const contact of contacts) {
          const normalizedId = normalizeJid(contact.id)
          await this.handleContactUpsert(sessionId, contact, sock)
        }
      } catch (error) {
        logger.error(`[ConnectionEvents] Error in contacts.upsert: ${error.message}`)
      }
    })

    // contacts.update - Contact details changed
    sock.ev.on("contacts.update", async (updates) => {
      this.mainHandler.trackEvent("contacts.update")
      try {
        for (const update of updates) {
          const normalizedId = normalizeJid(update.id)
          await this.handleContactUpdate(sessionId, update, sock)
        }
      } catch (error) {
        logger.error(`[ConnectionEvents] Error in contacts.update: ${error.message}`)
      }
    })
  }

  setupCallEvents(sock, sessionId) {
    // call - Universal call event
    sock.ev.on("call", async (calls) => {
      this.mainHandler.trackEvent("call")
      try {
        for (const call of calls) {
          const { id, from, status, isVideo, isGroup } = call
          
          await this.handleCall(sessionId, call, sock)
        }
      } catch (error) {
        logger.error(`[ConnectionEvents] Error in call event: ${error.message}`)
      }
    })
  }

  setupPresenceEvents(sock, sessionId) {
    // presence.update - User presence changes (controlled)
    sock.ev.on("presence.update", async (update) => {
      this.mainHandler.trackEvent("presence.update")
      try {
        const { id, presences } = update
        for (const [userId, presence] of Object.entries(presences)) {
          const normalizedUserId = normalizeJid(userId)
          // Don't automatically respond with our presence
          await this.handlePresenceUpdate(sessionId, { id, userId: normalizedUserId, presence }, sock)
        }
      } catch (error) {
        logger.error(`[ConnectionEvents] Error in presence.update: ${error.message}`)
      }
    })
  }

  setupStatusEvents(sock, sessionId) {
    // Intercept status updates to prevent auto-viewing
    sock.ev.on("messages.upsert", async (messageUpdate) => {
      try {
        const statusMessages = messageUpdate.messages.filter(msg => 
          msg.key.remoteJid === 'status@broadcast'
        )

        if (statusMessages.length > 0) {
          return
        }
      } catch (error) {
        logger.error(`[ConnectionEvents] Error in status handling: ${error.message}`)
      }
    })
  }

  // Event handlers - implement as needed
  async handleChatUpsert(sessionId, chat, sock) {
  }

  async handleChatUpdate(sessionId, update, sock) {
  }

  async handleChatDeletion(sessionId, deletion, sock) {
  }

  async handleContactUpsert(sessionId, contact, sock) {
  }

  async handleContactUpdate(sessionId, update, sock) {
  }

  async handleCall(sessionId, call, sock) {
  }

  async handlePresenceUpdate(sessionId, presence, sock) {
  }
}