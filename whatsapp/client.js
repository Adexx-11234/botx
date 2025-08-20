import { logger } from "../utils/logger.js";
import { sessionManager } from "./session-manager.js";
import { MessageHandler } from "./handlers/messages.js";
import { EventHandler } from "./handlers/events.js";
import { AuthHandler } from "./handlers/auth.js";
import { GroupHandler } from "./handlers/groups.js";
import { messageSender } from "./utils/sender.js";
import path from "path";
import fs from "fs";

export class WhatsAppClient {
  constructor(pluginManager) {
    this.sessionManager = sessionManager;
    this.pluginManager = pluginManager;
    this.clients = new Map();
    this.authStates = new Map();
    this.isInitialized = false;

    // Initialize handlers for message processing only
    this.messageHandler = new MessageHandler(this);
    this.eventHandler = new EventHandler(this.sessionManager);
    this.authHandler = new AuthHandler(this);
    this.groupHandler = new GroupHandler(this);

    global.whatsappClientInstance = this;

    logger.info("[WhatsApp] WhatsApp client initialized");
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      const sessionsDir = path.join(process.cwd(), "sessions");
      if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
      }

      await this.sessionManager.initializeExistingSessions();

      this.isInitialized = true;
      this.initTime = Date.now();
      logger.info("[WhatsApp] WhatsApp client initialized successfully");
    } catch (error) {
      logger.error(`[WhatsApp] Error initializing client: ${error.message}`);
      throw error;
    }
  }

  async createSession(userId, phoneNumber, callbacks = {}) {
    try {
      if (this.sessionManager.hasExistingSession(userId)) {
        logger.info(
          `[WhatsApp] Session ${userId} already exists, reconnecting...`
        );
      }

      const sock = await this.sessionManager.createSession(
        userId,
        phoneNumber,
        {
          ...callbacks,
          onConnectionUpdate: async (update) => {
            if (update.status === "connected") {
              await this.handleConnectionOpen(userId, update.sock, phoneNumber);
            }
            if (callbacks.onConnectionUpdate) {
              await callbacks.onConnectionUpdate(update);
            }
          },
        }
      );

      return sock;
    } catch (error) {
      logger.error(
        `[WhatsApp] Error creating session ${userId}: ${error.message}`
      );
      throw error;
    }
  }

  async handleConnectionOpen(sessionId, sock, phoneNumber) {
    try {
      logger.info(`[WhatsApp] Connection opened for session ${sessionId}`);

      this.clients.set(sessionId, {
        sock,
        sessionId,
        phoneNumber,
        status: "open",
        createdAt: Date.now(),
      });

      logger.info(
        `[WhatsApp] Session ${sessionId} is now ready to receive messages!`
      );
    } catch (error) {
      logger.error(
        `[WhatsApp] Error handling connection open: ${error.message}`
      );
    }
  }

  async sendText(sessionId, chatId, text) {
    try {
      await this.sessionManager.sendMessage(sessionId, chatId, { text });
      logger.info(`[WhatsApp] Text message sent to ${chatId}`);
    } catch (error) {
      logger.error(`[WhatsApp] Error sending text: ${error.message}`);
    }
  }

  async sendImage(sessionId, chatId, image, caption = null) {
    try {
      await this.sessionManager.sendMessage(sessionId, chatId, {
        image,
        caption,
      });
      logger.info(`[WhatsApp] Image sent to ${chatId}`);
    } catch (error) {
      logger.error(`[WhatsApp] Error sending image: ${error.message}`);
    }
  }

  async sendVideo(sessionId, chatId, video, caption = null) {
    try {
      await this.sessionManager.sendMessage(sessionId, chatId, {
        video,
        caption,
      });
      logger.info(`[WhatsApp] Video sent to ${chatId}`);
    } catch (error) {
      logger.error(`[WhatsApp] Error sending video: ${error.message}`);
    }
  }

  async sendAudio(sessionId, chatId, audio, options = {}) {
    try {
      await this.sessionManager.sendMessage(sessionId, chatId, {
        audio,
        ptt: true,
      });
      logger.info(`[WhatsApp] Audio sent to ${chatId}`);
    } catch (error) {
      logger.error(`[WhatsApp] Error sending audio: ${error.message}`);
    }
  }

  async disconnectSession(sessionId) {
    try {
      const client = this.clients.get(sessionId);
      if (!client) {
        logger.warn(`[WhatsApp] Session ${sessionId} not found for disconnect`);
        return false;
      }

      await this.sessionManager.cleanupSession(sessionId);

      this.clients.delete(sessionId);
      this.authStates.delete(sessionId);

      logger.info(`[WhatsApp] Session ${sessionId} disconnected`);
      return true;
    } catch (error) {
      logger.error(
        `[WhatsApp] Error disconnecting session ${sessionId}: ${error.message}`
      );
      return false;
    }
  }

  async getSessionStatus(sessionId) {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return { status: "not_found" };
    }

    const client = this.clients.get(sessionId);
    return {
      status: client?.status || "unknown",
      sessionId: sessionId,
      phoneNumber: session.phoneNumber,
      createdAt: client?.createdAt || Date.now(),
      uptime: client ? Date.now() - client.createdAt : 0,
    };
  }

  async getAllSessions() {
    const sessionIds = this.sessionManager.getAllSessions();
    const sessions = [];

    for (const sessionId of sessionIds) {
      const status = await this.getSessionStatus(sessionId);
      sessions.push(status);
    }

    return sessions;
  }

  async getGroupInfo(sessionId, groupJid) {
    try {
      const client = this.clients.get(sessionId);
      if (!client || client.status !== "open") {
        throw new Error(`Session ${sessionId} not connected`);
      }

      return await this.groupHandler.getGroupInfo(client.sock, groupJid);
    } catch (error) {
      logger.error(`[WhatsApp] Error getting group info: ${error.message}`);
      throw error;
    }
  }

  async kickUser(sessionId, groupJid, adminJid, targetJid) {
    try {
      const client = this.clients.get(sessionId);
      if (!client || client.status !== "open") {
        throw new Error(`Session ${sessionId} not connected`);
      }

      return await this.groupHandler.kickUser(
        client.sock,
        groupJid,
        adminJid,
        targetJid
      );
    } catch (error) {
      logger.error(`[WhatsApp] Error kicking user: ${error.message}`);
    }
  }

  async addUser(sessionId, groupJid, adminJid, targetJid) {
    try {
      const client = this.clients.get(sessionId);
      if (!client || client.status !== "open") {
        throw new Error(`Session ${sessionId} not connected`);
      }

      return await this.groupHandler.addUser(
        client.sock,
        groupJid,
        adminJid,
        targetJid
      );
    } catch (error) {
      logger.error(`[WhatsApp] Error adding user: ${error.message}`);
    }
  }

  async promoteUser(sessionId, groupJid, adminJid, targetJid) {
    try {
      const client = this.clients.get(sessionId);
      if (!client || client.status !== "open") {
        throw new Error(`Session ${sessionId} not connected`);
      }

      return await this.groupHandler.promoteUser(
        client.sock,
        groupJid,
        adminJid,
        targetJid
      );
    } catch (error) {
      logger.error(`[WhatsApp] Error promoting user: ${error.message}`);
    }
  }

  async demoteUser(sessionId, groupJid, adminJid, targetJid) {
    try {
      const client = this.clients.get(sessionId);
      if (!client || client.status !== "open") {
        throw new Error(`Session ${sessionId} not connected`);
      }

      return await this.groupHandler.demoteUser(
        client.sock,
        groupJid,
        adminJid,
        targetJid
      );
    } catch (error) {
      logger.error(`[WhatsApp] Error demoting user: ${error.message}`);
    }
  }

  isSessionConnected(sessionId) {
    const session = this.sessionManager.getSession(sessionId);
    return session && session.sock && session.sock.user;
  }

  getConnectedSessions() {
    const sessionIds = this.sessionManager.getAllSessions();
    return sessionIds
      .map((sessionId) => {
        const client = this.clients.get(sessionId);
        const session = this.sessionManager.getSession(sessionId);
        if (session && session.sock && session.sock.user) {
          return {
            sessionId,
            phoneNumber: session.phoneNumber,
            uptime: client ? Date.now() - client.createdAt : 0,
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  async cleanup() {
    logger.info("[WhatsApp] Cleaning up WhatsApp client...");

    for (const sessionId of this.sessionManager.getAllSessions()) {
      try {
        await this.sessionManager.disconnectSession(sessionId);
      } catch (error) {
        logger.error(
          `[WhatsApp] Error cleaning up session ${sessionId}: ${error.message}`
        );
      }
    }

    this.clients.clear();
    this.authStates.clear();
    this.isInitialized = false;

    logger.info("[WhatsApp] WhatsApp client cleanup completed");
  }

  getStats() {
    return {
      totalSessions: this.sessionManager.getAllSessions().length,
      connectedSessions: this.getConnectedSessions().length,
      queueStats: messageSender.getQueueStats(),
      uptime: this.isInitialized ? Date.now() - this.initTime : 0,
    };
  }
}

// Note: Do not auto-instantiate here to avoid duplicate initialization
