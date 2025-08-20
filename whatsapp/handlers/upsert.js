// ==========================================
// MESSAGE PROCESSOR - CENTRALIZED SYSTEM (FIXED)
// ==========================================

import { logger } from "../../utils/logger.js";
import pluginLoader from "../../utils/plugin-loader.js";
import { getMessageInfo, shouldBlockMessage } from "../utils/message-types.js";

class MessageProcessor {
  constructor() {
    this.messageMiddleware = [];
    this.isInitialized = false;
  }

  /**
   * Initialize the message processor
   */
  async initialize() {
    if (!this.isInitialized) {
      // Ensure plugins are loaded
      if (!pluginLoader.isInitialized) {
        await pluginLoader.loadPlugins();
      }
      this.isInitialized = true;
      logger.info("[MessageProcessor] Initialized successfully");
    }
  }

  /**
   * Register middleware functions
   */
  use(middleware) {
    this.messageMiddleware.push(middleware);
  }

  /**
   * Main message processing pipeline
   */
  async processMessage(sock, sessionId, message, prefix) {
    try {
      await this.initialize();

      // Extract message text
      const messageText = this.extractMessageText(message);

      // Get message info and check if blocked
      const messageInfo = getMessageInfo(message, messageText, null, null);

      if (messageInfo.isBlocked) {
        logger.info(
          `[MessageProcessor] Blocked message from ${sessionId}: ${messageInfo.blockReason}`
        );
        return { blocked: true, reason: messageInfo.blockReason };
      }

      // Handle button interactions
      if (message.message?.buttonsResponseMessage) {
        return await this.handleButtonInteraction(
          sock,
          sessionId,
          message,
          prefix
        );
      }

      if (!messageText) return { processed: false };

      // Build context
      const context = await this.deriveContext(
        sock,
        sessionId,
        message,
        messageText,
        prefix
      );

      // Run middleware
      for (const middleware of this.messageMiddleware) {
        const result = await middleware(sock, sessionId, context, message);
        if (result?.stop) return result;
      }

      // Process anti-plugins FIRST (before commands)
      // This ensures anti-spam, anti-link etc. work even on command messages
      await this.processAntiPlugins(sock, sessionId, context, message);

      // Handle commands (after anti-plugins have processed)
      if (context.isCommand) {
        return await this.handleCommand(sock, sessionId, context, message);
      }

      return { processed: true };
    } catch (error) {
      logger.error(
        `[MessageProcessor] Error processing message: ${error.message}`
      );
      return { error: error.message };
    }
  }

  /**
   * Process all anti-plugins for this message
   */
  async processAntiPlugins(sock, sessionId, context, message) {
    try {
      await pluginLoader.processAntiPlugins(sock, sessionId, context, message);
    } catch (error) {
      logger.error(
        `[MessageProcessor] Error processing anti-plugins: ${error.message}`
      );
    }
  }

  extractMessageText(message) {
    const msg = message.message;
    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption) return msg.imageMessage.caption;
    if (msg.videoMessage?.caption) return msg.videoMessage.caption;
    if (msg.documentMessage?.caption) return msg.documentMessage.caption;
    if (msg.buttonsResponseMessage?.selectedDisplayText)
      return msg.buttonsResponseMessage.selectedDisplayText;
    return null;
  }

  async handleButtonInteraction(sock, sessionId, message, prefix) {
    const buttonId = message.message.buttonsResponseMessage.selectedButtonId;
    logger.info(
      `[MessageProcessor] Button clicked: ${buttonId} by ${sessionId}`
    );

    if (buttonId === "allcommands") {
      try {
        const context = await this.deriveContext(
          sock,
          sessionId,
          message,
          "commands",
          prefix
        );
        const exec = await pluginLoader.executeCommand(
          sock,
          sessionId,
          "commands",
          [],
          context
        );

        if (exec?.success) {
          const result = exec.result || exec;
          if (result.response) {
            await sock.sendMessage(
              context.from,
              { text: result.response },
              { quoted: message }
            );
          }
        }
      } catch (err) {
        logger.error(`[MessageProcessor] Button command error: ${err.message}`);
      }
    }

    return { processed: true, buttonInteraction: true };
  }

  async handleCommand(sock, sessionId, context, message) {
    const command = context.command.command;
    const plugin = pluginLoader.getPluginByCommand(command);

    // Check admin privileges if plugin requires it
    if (plugin && plugin.adminOnly && !context.senderIsAdmin) {
      await sock.sendMessage(
        context.from,
        {
          text: "❌ This command requires admin privileges!",
        },
        { quoted: message }
      );
      return { processed: true, adminRequired: true };
    }

    try {
      const exec = await pluginLoader.executeCommand(
        sock,
        sessionId,
        command,
        context.command.args,
        context
      );

      if (exec?.ignore) {
        // Command not found - ignore silently
        return { processed: true, ignored: true };
      } else if (exec?.success) {
        const result = exec.result || exec;
        await this.sendCommandResponse(sock, context, message, result);
      } else if (exec?.error) {
        await sock.sendMessage(
          context.from,
          { text: `❌ ${exec.error}` },
          { quoted: message }
        );
      }
    } catch (err) {
      logger.error(`[MessageProcessor] Plugin command error: ${err.message}`);
      await sock.sendMessage(
        context.from,
        { text: "❌ Error executing command" },
        { quoted: message }
      );
    }

    return { processed: true, commandExecuted: true };
  }

  async sendCommandResponse(sock, context, message, result) {
    if (!result.response) return;

    const messageOptions = { quoted: message };

    // Handle mentions
    if (result.mentions && Array.isArray(result.mentions)) {
      messageOptions.mentions = result.mentions;
    }

    // Handle button responses
    if (result.isButton && result.response.buttons) {
      await sock.sendMessage(context.from, result.response, messageOptions);
    } else {
      // Handle media responses
      if (result.media) {
        const mediaMessage = {
          [result.mediaType || "image"]: result.media,
          caption: result.response,
        };
        await sock.sendMessage(context.from, mediaMessage, messageOptions);
      } else {
        // Regular text response
        await sock.sendMessage(
          context.from,
          { text: result.response },
          messageOptions
        );
      }
    }
  }

  // FIXED: Improved admin checking logic
  async deriveContext(sock, sessionId, message, messageText, prefix) {
    const chatId = message.key.remoteJid;
    const isCommand = messageText.startsWith(prefix);
    const sender = message.key.participant || message.key.remoteJid;

    const context = {
      from: chatId,
      sender,
      isGroup: chatId.endsWith("@g.us"),
      isCommand,
      text: messageText,
      messageId: message.key.id,
      message: message,
      command: null,
      timestamp: message.messageTimestamp || Math.floor(Date.now() / 1000),
      key: message.key,
      sessionId, // Add sessionId to context
    };

    // Parse command if it's a command message
    if (isCommand) {
      const raw = messageText.slice(prefix.length);
      const [cmd, ...rest] = raw.trim().split(/\s+/);
      context.command = {
        command: (cmd || "").toLowerCase(),
        args: rest,
        raw: raw.trim(),
      };
    }

    // FIXED: Enhanced admin status derivation with comprehensive debugging
    try {
      if (context.isGroup) {
        logger.info(`[MessageProcessor] === ADMIN CHECK DEBUG START ===`);

        // Get bot number properly
        const botId = sock.user?.id || "";
        const botNumber = this.normalizeJid(botId.split(":")[0]);
        const rawSender = context.sender;
        const senderJid = this.normalizeJid(context.sender);

        logger.info(`[MessageProcessor] Raw sender: ${rawSender}`);
        logger.info(
          `[MessageProcessor] Bot ID: ${botId}, Bot Number: ${botNumber}`
        );
        logger.info(`[MessageProcessor] Sender normalized: ${senderJid}`);

        // Get group metadata
        const meta = await sock.groupMetadata(chatId);
        const participants = Array.isArray(meta?.participants)
          ? meta.participants
          : [];

        logger.info(`[MessageProcessor] Group: ${chatId}`);
        logger.info(
          `[MessageProcessor] Found ${participants.length} participants`
        );

        // Extract admins using multiple methods for comparison
        const admins = this.getGroupAdmins(participants);
        const adminParticipants = participants.filter(
          (p) => p.admin === "admin" || p.admin === "superadmin"
        );

        logger.info(
          `[MessageProcessor] Admin JIDs from getGroupAdmins: ${JSON.stringify(
            admins
          )}`
        );
        logger.info(
          `[MessageProcessor] Admin participants count: ${adminParticipants.length}`
        );

        // Multiple admin check methods
        const method1 = admins.includes(senderJid);
        const method2 = admins.includes(rawSender);
        const method3 = adminParticipants.some(
          (p) =>
            this.normalizeJid(p.jid || p.jid || "") === senderJid ||
            p.jid === rawSender ||
            p.jid === rawSender
        );

        logger.info(
          `[MessageProcessor] Admin check method 1 (normalized): ${method1}`
        );
        logger.info(
          `[MessageProcessor] Admin check method 2 (raw): ${method2}`
        );
        logger.info(
          `[MessageProcessor] Admin check method 3 (direct): ${method3}`
        );

        // Use the most permissive result
        context.senderIsAdmin = method1 || method2 || method3;

        // Check if bot is admin
        context.botIsAdmin = participants.some((p) => {
          const participantId = this.normalizeJid(p.jid || "");
          const participantJid = this.normalizeJid(p.jid || "");

          const idMatch = participantId === botNumber;
          const jidMatch = participantJid === botNumber;
          const isAdmin = p.admin === "admin" || p.admin === "superadmin";

          if (idMatch || jidMatch) {
            logger.info(
              `[MessageProcessor] Bot match found: id=${p.id}, admin=${p.admin}`
            );
          }

          return (idMatch || jidMatch) && isAdmin;
        });

        logger.info(
          `[MessageProcessor] FINAL - Sender is admin: ${context.senderIsAdmin}`
        );
        logger.info(
          `[MessageProcessor] FINAL - Bot is admin: ${context.botIsAdmin}`
        );
        logger.info(`[MessageProcessor] === ADMIN CHECK DEBUG END ===`);

        // Add group metadata to context
        context.groupMetadata = meta;
        context.participants = participants;
        context.admins = admins;
      } else {
        // In private chats, sender is always "admin"
        context.senderIsAdmin = true;
        context.botIsAdmin = true;
        logger.debug(
          `[MessageProcessor] Private chat - sender marked as admin`
        );
      }
    } catch (error) {
      logger.error(
        `[MessageProcessor] Error deriving admin status: ${error.message}`
      );
      logger.error(`[MessageProcessor] Stack trace: ${error.stack}`);
      context.senderIsAdmin = false;
      context.botIsAdmin = false;
    }

    return context;
  }

  // FIXED: Use the working getGroupAdmins function from your example
  getGroupAdmins(participants) {
    let admins = [];

    if (!participants || !Array.isArray(participants)) {
      return [];
    }

    for (let participant of participants) {
      if (participant.admin === "superadmin" || participant.admin === "admin") {
        // Try both id and jid fields, normalize them
        const adminId = participant.jid;
        if (adminId) {
          admins.push(this.normalizeJid(adminId));
        }
      }
    }

    return admins;
  }

  // FIXED: Enhanced JID normalization
  normalizeJid(jid) {
    if (!jid) return "";
    // Handle the case where jid might be a full user ID like "1234567890:1@s.whatsapp.net"
    if (jid.includes(":")) {
      jid = jid.split(":")[0];
    }
    // Add @s.whatsapp.net if not present
    return jid.includes("@") ? jid : `${jid}@s.whatsapp.net`;
  }

  /**
   * Get processor statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      middlewareCount: this.messageMiddleware.length,
      pluginStats: pluginLoader.getPluginStats(),
    };
  }
}

// Create singleton instance
const messageProcessor = new MessageProcessor();

export { messageProcessor };

// ==========================================
// UPDATED MESSAGE UPSERT HANDLER
// ==========================================

async function persistMessage(sessionId, sock, message) {
  try {
    const { pool } = await import("../../config/database.js");
    const id = message.key.id;
    const from_jid = message.key.remoteJid;
    const sender_jid = message.key.participant || message.key.remoteJid;
    const timestamp = Number(
      message.messageTimestamp || Math.floor(Date.now() / 1000)
    );
    const content =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      message.message?.videoMessage?.caption ||
      "";

    // Enhanced media detection
    const media_type = message.message?.imageMessage
      ? "image"
      : message.message?.videoMessage
      ? "video"
      : message.message?.audioMessage
      ? "audio"
      : message.message?.documentMessage
      ? "document"
      : message.message?.stickerMessage
      ? "sticker"
      : null;

    const media =
      message.message?.imageMessage ||
      message.message?.videoMessage ||
      message.message?.audioMessage ||
      message.message?.documentMessage ||
      message.message?.stickerMessage ||
      (message.message?.viewOnceMessageV2
        ? { viewOnceMessageV2: message.message.viewOnceMessageV2 }
        : null) ||
      null;

    const from_me = Boolean(message.key.fromMe);
    const user_id = sock.user?.id || "";

    await pool.query(
      `INSERT INTO messages (id, from_jid, sender_jid, timestamp, content, media, media_type, session_id, user_id, is_view_once, from_me)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id, session_id) DO NOTHING`,
      [
        id,
        from_jid,
        sender_jid,
        timestamp,
        content,
        media ? JSON.stringify(media) : null,
        media_type,
        String(sessionId),
        String(user_id),
        Boolean(!!message.message?.viewOnceMessageV2),
        from_me,
      ]
    );
  } catch (error) {
    logger.error(`[Upsert] Error persisting message: ${error.message}`);
  }
}

export async function handleMessagesUpsert(sessionId, messageUpdate, sock) {
  try {
    const prefix = process.env.COMMAND_PREFIX || ".";
    logger.info(
      `[Upsert] handleMessagesUpsert: session=${sessionId} type=${messageUpdate.type} messages=${messageUpdate.messages?.length || 0}`
    );

    for (const message of messageUpdate.messages) {
      if (!message?.message) continue;

      logger.info(
        `[Upsert] Processing message from ${sessionId} in ${message.key.remoteJid}`
      );

      // Persist message to database
      await persistMessage(sessionId, sock, message);

      // Skip self-messages unless they're commands
      const messageText = messageProcessor.extractMessageText(message);
      const isCommand = messageText?.startsWith(prefix);

      if (message.key.fromMe && !isCommand) {
        await sock.readMessages([message.key]);
        continue;
      }

      // Process through the centralized message processor
      const result = await messageProcessor.processMessage(
        sock,
        sessionId,
        message,
        prefix
      );

      // Log results
      if (result.blocked) {
        logger.info(`[Upsert] Message blocked: ${result.reason}`);
      } else if (result.error) {
        logger.error(`[Upsert] Message processing error: ${result.error}`);
      } else if (result.ignored) {
        logger.debug(`[Upsert] Command ignored (not found)`);
      } else {
        logger.debug(`[Upsert] Message processed successfully`);
      }

      // Mark message as read
      await sock.readMessages([message.key]);
    }
  } catch (error) {
    logger.error(`[Upsert] Error handling messages: ${error.message}`);
  }
}
