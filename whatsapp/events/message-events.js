// Message Events Handler - Zero memory storage, ultra-fast processing
import { logger } from "../../utils/logger.js"

export class MessageEventHandler {
  setup(sock, sessionId, mainHandler) {
    this.mainHandler = mainHandler
    this.sessionId = sessionId

    // Auto-cleanup using WeakRef for automatic garbage collection
    const weakSock = new WeakRef(sock)
    const weakMainHandler = new WeakRef(mainHandler)
    
    // messages.upsert - Direct processing, no storage
    sock.ev.on("messages.upsert", async (messageUpdate) => {
      const currentSock = weakSock.deref()
      const currentMainHandler = weakMainHandler.deref()
      if (!currentSock || !currentMainHandler) return
      
      currentMainHandler.trackEvent("messages.upsert")
      
      try {

        // Direct filter and process - no intermediate storage
        const hasValidMessages = messageUpdate.messages.some(m => !m.key.remoteJid?.endsWith('@newsletter'))
        
        if (!hasValidMessages) return

        // Import handler once
        const { handleMessagesUpsert } = await import("../handlers/upsert.js")
        
        // Process each message directly without storing
        const processMessage = async (message) => {
          if (message.key.remoteJid?.endsWith('@newsletter')) return null
          try {
            return await currentMainHandler.processMessageWithLidResolution(message, currentSock)
          } catch (e) {
            return null
          }
        }

        // Stream process without accumulating
        const validMessages = []
        for (const msg of messageUpdate.messages) {
          const processed = await processMessage(msg)
          if (processed) validMessages.push(processed)
        }

        if (validMessages.length > 0) {
          // Direct pass through - no cloning
          messageUpdate.messages = validMessages
          await handleMessagesUpsert(sessionId, messageUpdate, currentSock)
        }
        
        // Clear references immediately
        validMessages.length = 0
      } catch (e) {
        // Minimal error handling - no stack traces in production
        if (process.env.NODE_ENV === 'development') {
          logger.error(`[MsgEv] Upsert error: ${e.message}`)
        }
      }
    })

    // messages.update - Direct processing
    sock.ev.on("messages.update", async (updates) => {
      const currentSock = weakSock.deref()
      const currentMainHandler = weakMainHandler.deref()
      if (!currentSock || !currentMainHandler) return
      
      currentMainHandler.trackEvent("messages.update")
      
      // Process directly without accumulation
      for (const update of updates) {
        if (update.key.fromMe) continue
        
        try {
          // Inline LID resolution if needed
          if (update.key.participant?.endsWith('@lid')) {
            const resolved = await currentMainHandler.resolveLidToActualJid(
              currentSock, 
              update.key.remoteJid, 
              update.key.participant
            )
            update.key.participant = resolved
            update.participant = resolved
          }
          
          // Direct handling - implement inline if simple enough
          await this.handleMessageUpdate(sessionId, update, currentSock)
        } catch (e) {
          continue // Skip failed updates silently
        }
      }
    })

    // messages.delete - Direct processing
    // messages.delete - Direct processing
    sock.ev.on("messages.delete", async (deletions) => {
      const currentSock = weakSock.deref()
      const currentMainHandler = weakMainHandler.deref()
      if (!currentSock || !currentMainHandler) return
      
      currentMainHandler.trackEvent("messages.delete")
      
      // Ensure deletions is always an array
      const deletionArray = Array.isArray(deletions) ? deletions : [deletions]
      
      // Direct processing without accumulation
      for (const deletion of deletionArray) {
        try {
          if (deletion.key && deletion.key.participant?.endsWith('@lid')) {
            const resolved = await currentMainHandler.resolveLidToActualJid(
              currentSock, 
              deletion.key.remoteJid, 
              deletion.key.participant
            )
            deletion.key.participant = resolved
            deletion.participant = resolved
          }
          
          await this.handleMessageDeletion(sessionId, deletion, currentSock)
        } catch (e) {
          continue // Skip failed deletions silently
        }
      }
    })

    // messages.reaction - Direct processing
    sock.ev.on("messages.reaction", async (reactions) => {
      const currentSock = weakSock.deref()
      const currentMainHandler = weakMainHandler.deref()
      if (!currentSock || !currentMainHandler) return
      
      currentMainHandler.trackEvent("messages.reaction")
      
      // Direct processing without accumulation
      for (const reaction of reactions) {
        try {
          if (reaction.key.participant?.endsWith('@lid')) {
            const resolved = await currentMainHandler.resolveLidToActualJid(
              currentSock, 
              reaction.key.remoteJid, 
              reaction.key.participant
            )
            reaction.key.participant = resolved
            reaction.participant = resolved
          }
          
          await this.handleMessageReaction(sessionId, reaction, currentSock)
        } catch (e) {
          continue // Skip failed reactions silently
        }
      }
    })

    // message-receipt.update - Skip entirely since shouldProcessReceipt returns false
    sock.ev.on("message-receipt.update", async (receipts) => {
      // Early return - no processing needed
      return
      
      // Code below kept for future use if needed
      /*
      const currentSock = weakSock.deref()
      const currentMainHandler = weakMainHandler.deref()
      if (!currentSock || !currentMainHandler) return
      
      currentMainHandler.trackEvent("message-receipt.update")
      
      for (const receipt of receipts) {
        if (!this.shouldProcessReceipt(receipt)) continue
        
        try {
          if (receipt.key.participant?.endsWith('@lid')) {
            const resolved = await currentMainHandler.resolveLidToActualJid(
              currentSock, 
              receipt.key.remoteJid, 
              receipt.key.participant
            )
            receipt.key.participant = resolved
            receipt.participant = resolved
          }
          
          await this.handleReceiptUpdate(sessionId, receipt, currentSock)
        } catch (e) {
          continue
        }
      }
      */
    })

    // Log only in development
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[MsgEv] Setup complete: ${sessionId}`)
    }
  }

  // Inline these methods for faster execution
  shouldProcessReceipt(receipt) {
    return false
  }

  async handleMessageUpdate(sessionId, update, sock) {
    // Implement inline processing here
  }

  async handleMessageDeletion(sessionId, deletion, sock) {
    // Implement inline processing here
  }

  async handleMessageReaction(sessionId, reaction, sock) {
    // Implement inline processing here
  }

  async handleReceiptUpdate(sessionId, receipt, sock) {
    // Implement inline processing here
  }
}