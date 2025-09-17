// Streamlined Message Processor with fixed caption error
import { logger } from "../../utils/logger.js"
import pluginLoader from "../../utils/plugin-loader.js"
import { serializeMessage } from "../utils/message-serializer.js"
import { MessagePersistence } from "./message-persistence.js"
import { MessageLogger } from "./message-logger.js"
import { ContactManager } from "./contact-manager.js"
import { AdminManager } from "./admin-manager.js"

export class MessageProcessor {
  constructor() {
    this.isInitialized = false
    this.messagePersistence = new MessagePersistence()
    this.messageLogger = new MessageLogger()
    this.contactManager = new ContactManager()
    this.adminManager = new AdminManager()
    this.messageStats = {
      processed: 0,
      blocked: 0,
      commands: 0,
      errors: 0,
    }
  }

  async initialize() {
    if (!this.isInitialized) {
      if (!pluginLoader.isInitialized) {
        await pluginLoader.loadPlugins()
      }
      await this.initializeExistingSessions()
      this.isInitialized = true
    }
  }

  async initializeExistingSessions() {
    try {
      const { sessionManager } = await import("../sessions/session-manager.js")
      const result = await sessionManager.initializeExistingSessions({
        onConnected: (sock) => logger.info(`[MessageProcessor] Session reconnected: ${sock.user?.id}`),
        onError: (error) => logger.error(`[MessageProcessor] Session error: ${error.message}`)
      })
      if (result.initialized > 0) {
        logger.info(`[MessageProcessor] Restored ${result.initialized} sessions`)
      }
    } catch (error) {
      logger.error(`[MessageProcessor] Failed to initialize sessions: ${error.message}`)
    }
  }

 async processMessage(sock, sessionId, m, prefix) {
  try {
    await this.initialize()

    // Add null/undefined check for message object
    if (!m || !m.message) {
      logger.warn(`[MessageProcessor] Invalid message object received for session ${sessionId}`)
      return { processed: false, error: "Invalid message object" }
    }

    // Get session context
    const sessionContext = await this.getSessionContext(sessionId)

    // Try serialization, but continue without it if it fails
    let serializedMessage = m
    try {
      serializedMessage = serializeMessage(sock, m)
      if (!serializedMessage) {
        logger.warn(`[MessageProcessor] Serialization returned null, using original message`)
        serializedMessage = m
      }
    } catch (serializeError) {
      logger.warn(`[MessageProcessor] Message serialization failed, using original: ${serializeError.message}`)
      serializedMessage = m
    }

    // Use the serialized message if successful, otherwise use original
    m = serializedMessage

    // Set context
    m.sessionContext = sessionContext
    m.sessionId = sessionId

    // Extract contact info
    await this.contactManager.extractPushName(sock, m)
    m.quoted = this.extractQuotedMessage(m)

    // Persist and set admin status
    await this.messagePersistence.persistMessage(sessionId, sock, m)
    await this.adminManager.setAdminStatus(sock, m)

    // Process anti-plugins first
    await this.processAllAntiPlugins(sock, sessionId, m)

    if (m._wasDeletedByAntiPlugin) {
      await this.messageLogger.logEnhancedMessageEntry(sock, sessionId, m)
      return { processed: true, deletedByAntiPlugin: true }
    }

    // Handle body extraction manually if serialization failed
    if (!m.body) {
      m.body = this.extractMessageBody(m)
    }

    const isCommand = m.body && m.body.startsWith(prefix)
    m.isCommand = isCommand

    if (isCommand) {
      this.parseCommand(m, prefix)
    }

    await this.messageLogger.logEnhancedMessageEntry(sock, sessionId, m)

    // Handle all types of button/interactive responses
    if (m.message?.listResponseMessage) {
      return await this.handleListResponse(sock, sessionId, m, prefix);
    }

    // Check for any type of button response
    if (m.message?.interactiveResponseMessage || 
        m.message?.templateButtonReplyMessage || 
        m.message?.buttonsResponseMessage) {
      return await this.handleInteractiveResponse(sock, sessionId, m, prefix);
    }

    // Execute command
    if (m.isCommand && m.body && !m._wasDeletedByAntiPlugin) {
      this.messageStats.commands++
      return await this.handleCommand(sock, sessionId, m)
    }

    this.messageStats.processed++
    return { processed: true }
  } catch (error) {
    logger.error(`[MessageProcessor] Error processing message: ${error.message}`)
    this.messageStats.errors++
    return { error: error.message }
  }
}

// Add this helper method to extract message body without full serialization
extractMessageBody(m) {
  if (!m.message) return ""
  
  return m.message.conversation ||
         m.message.extendedTextMessage?.text ||
         m.message.imageMessage?.caption ||
         m.message.videoMessage?.caption ||
         m.message.documentMessage?.caption ||
         (m.message.listResponseMessage && m.message.listResponseMessage.singleSelectReply?.selectedRowId) ||
         (m.message.buttonsResponseMessage && m.message.buttonsResponseMessage.selectedButtonId) ||
         (m.message.templateButtonReplyMessage && m.message.templateButtonReplyMessage.selectedId) ||
         ""
}
    
 async getSessionContext(sessionId) {
  try {
    const { UserQueries } = await import("../../database/query.js")
    
    // Handle both positive and negative session IDs from session name
    const sessionIdMatch = sessionId.match(/session_(-?\d+)/)
    if (sessionIdMatch) {
      const telegramId = Number.parseInt(sessionIdMatch[1])
      
      // Try to get user by telegram_id from users table
      let user = await UserQueries.getUserByTelegramId(telegramId)
      
      // If user doesn't exist, create them (especially for negative IDs - web sessions)
      if (!user) {
        try {
          user = await UserQueries.ensureUserInUsersTable(telegramId, {
            is_active: true
          })
        } catch (error) {
          logger.warn(`[MessageProcessor] Failed to create user for telegram_id ${telegramId}: ${error.message}`)
        }
      }
      
      if (user) {
        return {
          telegram_id: user.telegram_id,
          session_id: sessionId,
          username: user.username || null,
          phone_number: user.phone_number || null,
          id: user.id,
          isWebSession: telegramId < 0
        }
      }
      
      // For negative IDs (web-paired sessions), mark as web session
      if (telegramId < 0) {
        return {
          telegram_id: "Web Session",
          session_id: sessionId,
          username: null,
          phone_number: null,
          isWebSession: true,
          originalId: telegramId,
          id: telegramId
        }
      }
      
      return {
        telegram_id: telegramId,
        session_id: sessionId,
        username: null,
        phone_number: null,
        id: telegramId
      }
    }

    return {
      telegram_id: "Unknown",
      session_id: sessionId,
      username: null,
      phone_number: null,
      id: null
    }
  } catch (error) {
    logger.error(`[MessageProcessor] Error in getSessionContext: ${error.message}`)
    return {
      telegram_id: "Unknown",
      session_id: sessionId,
      username: null,
      phone_number: null,
      id: null
    }
  }
}

  parseCommand(m, prefix) {
    const commandText = m.body.slice(prefix.length).trim()
    const [cmd, ...args] = commandText.split(/\s+/)

    m.command = {
      name: cmd.toLowerCase(),
      args: args,
      raw: commandText,
      fullText: m.body,
    }
  }

  extractQuotedMessage(m) {
    let quoted = null

    const extractFromContextInfo = (contextInfo) => {
      if (!contextInfo?.quotedMessage) return null

      return {
        key: {
          remoteJid: contextInfo.remoteJid || m.chat,
          fromMe: contextInfo.fromMe || false,
          id: contextInfo.stanzaId,
          participant: contextInfo.participant,
        },
        message: contextInfo.quotedMessage,
        sender: contextInfo.participant || contextInfo.remoteJid,
        body: this.extractQuotedMessageText(contextInfo.quotedMessage),
      }
    }

    if (m.message?.extendedTextMessage?.contextInfo) {
      quoted = extractFromContextInfo(m.message.extendedTextMessage.contextInfo)
    }

    if (!quoted) {
      const messageTypes = [
        "imageMessage", "videoMessage", "audioMessage", "documentMessage",
        "stickerMessage", "locationMessage", "contactMessage"
      ]

      for (const msgType of messageTypes) {
        if (m.message?.[msgType]?.contextInfo) {
          quoted = extractFromContextInfo(m.message[msgType].contextInfo)
          if (quoted) break
        }
      }
    }

    return quoted
  }

  extractQuotedMessageText(quotedMessage) {
    if (!quotedMessage) return ""
    
    return quotedMessage.conversation ||
           quotedMessage.extendedTextMessage?.text ||
           quotedMessage.imageMessage?.caption ||
           quotedMessage.videoMessage?.caption ||
           quotedMessage.documentMessage?.caption ||
           (quotedMessage.stickerMessage && "[Sticker]") ||
           (quotedMessage.audioMessage && "[Audio]") ||
           (quotedMessage.imageMessage && "[Image]") ||
           (quotedMessage.videoMessage && "[Video]") ||
           (quotedMessage.documentMessage && "[Document]") ||
           (quotedMessage.contactMessage && "[Contact]") ||
           (quotedMessage.locationMessage && "[Location]") ||
           ""
  }

  async handleInteractiveResponse(sock, sessionId, m, prefix) {
  try {
    let selectedCommand = null;
    
    // Handle different button response types
    
    // 1. Native flow response (your current implementation)
    if (m.message?.interactiveResponseMessage?.nativeFlowResponseMessage) {
      const flowResponse = m.message.interactiveResponseMessage.nativeFlowResponseMessage;
      const paramsJson = flowResponse.paramsJson;

      if (paramsJson) {
        try {
          const params = JSON.parse(paramsJson);
          selectedCommand = params.id;
        } catch (parseError) {
          logger.error("[MessageProcessor] Failed to parse flow response:", parseError);
        }
      }
    }
    
    // 2. Template button reply (what you're actually receiving)
    else if (m.message?.templateButtonReplyMessage) {
      selectedCommand = m.message.templateButtonReplyMessage.selectedId;
      logger.info(`[MessageProcessor] Template button clicked: ${selectedCommand}`);
    }
    
    // 3. Button response message
    else if (m.message?.buttonsResponseMessage) {
      selectedCommand = m.message.buttonsResponseMessage.selectedButtonId;
      logger.info(`[MessageProcessor] Button response: ${selectedCommand}`);
    }
    
    // 4. Interactive response with selected reply
    else if (m.message?.interactiveResponseMessage) {
      // Check for different interactive response structures
      const response = m.message.interactiveResponseMessage;
      
      if (response.selectedButtonId) {
        selectedCommand = response.selectedButtonId;
      } else if (response.selectedId) {
        selectedCommand = response.selectedId;
      } else if (response.body?.text) {
        selectedCommand = response.body.text;
      }
    }

    // Process the selected command if found
    if (selectedCommand) {
      // Check if it's a valid command (starts with prefix)
      if (selectedCommand.startsWith(prefix)) {
        logger.info(`[MessageProcessor] Processing button command: ${selectedCommand}`);
        
        // Set the message body to the selected command
        m.body = selectedCommand;
        m.isCommand = true;
        this.parseCommand(m, prefix);
        
        // Execute the command
        return await this.handleCommand(sock, sessionId, m);
      } else {
        // Handle non-command button responses
        logger.info(`[MessageProcessor] Non-command button response: ${selectedCommand}`);
        return { processed: true, buttonResponse: selectedCommand };
      }
    }

    return { processed: true, interactiveResponse: true };
  } catch (error) {
    logger.error(`[MessageProcessor] Error handling interactive response: ${error.message}`);
    return { processed: false, error: error.message };
  }
}

  async handleListResponse(sock, sessionId, m, prefix) {
    const selectedRowId = m.message.listResponseMessage.singleSelectReply.selectedRowId

    if (selectedRowId?.startsWith(prefix)) {
      m.body = selectedRowId
      m.isCommand = true
      this.parseCommand(m, prefix)
      return await this.handleCommand(sock, sessionId, m)
    }

    return { processed: true, listResponse: true }
  }

  async handleCommand(sock, sessionId, m) {
    const command = m.command.name

    try {
      const exec = await pluginLoader.executeCommand(sock, sessionId, command, m.command.args, m)

      if (exec?.ignore) {
        return { processed: true, ignored: true }
      } else if (exec?.success) {
        await this.sendCommandResponse(sock, m, exec.result || exec)
      }
    } catch (error) {
      // Silent error handling
    }

    return { processed: true, commandExecuted: true }
  }

  async sendCommandResponse(sock, m, result) {
    if (!result?.response) return

    const messageOptions = { quoted: m }

    if (result.mentions && Array.isArray(result.mentions)) {
      messageOptions.mentions = result.mentions
    }

    try {
      if (result.isList && result.response.sections) {
        await sock.sendMessage(m.chat, result.response, messageOptions)
      } else if (result.media) {
        const mediaMessage = {
          [result.mediaType || "image"]: result.media,
          caption: result.response,
        }
        await sock.sendMessage(m.chat, mediaMessage, messageOptions)
      } else {
        await sock.sendMessage(m.chat, { text: result.response }, messageOptions)
      }
    } catch (error) {
      logger.error(`[MessageProcessor] Failed to send response: ${error.message}`)
    }
  }

  async processAllAntiPlugins(sock, sessionId, m) {
    try {
      await pluginLoader.processAntiPlugins(sock, sessionId, m)
    } catch (error) {
      // Silent error handling
    }
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      messageStats: { ...this.messageStats },
      pluginStats: pluginLoader.getPluginStats(),
      contactCacheSize: this.contactManager.getContactCacheSize(),
    }
  }

  resetStats() {
    this.messageStats = {
      processed: 0,
      blocked: 0,
      commands: 0,
      errors: 0,
    }
  }

  performMaintenance() {
    this.contactManager.cleanupContactStore()
  }
}