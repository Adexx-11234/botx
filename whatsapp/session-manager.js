import {
    makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    Browsers,
  } from "@whiskeysockets/baileys";
  import { Boom } from "@hapi/boom";
  import fs from "fs";
  import path from "path";
  import pino from "pino";
  import { logger } from "../utils/logger.js";
  import { baileysConfig } from "../config/baileys.js";
  import pluginLoader from "../utils/plugin-loader.js";
  import { handlePairing, markPairingRestartHandled, clearPairing } from "./utils/pairing.js";
  
  class WhatsAppSessionManager {
    constructor() {
      this.sessions = new Map();
      this.reconnectAttempts = new Map();
      this.maxReconnectAttempts = 5;
      this.sessionCallbacks = new Map();
      this.pairingState = new Map(); // sessionId -> { code, expiresAt, active }
    }
  
    async initializeExistingSessions() {
      try {
        const sessionsDir = "./sessions";
        if (!fs.existsSync(sessionsDir)) {
          fs.mkdirSync(sessionsDir, { recursive: true });
          return;
        }
  
        const sessionFolders = fs
          .readdirSync(sessionsDir, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);
  
        logger.info(
          `[SessionManager] Found ${sessionFolders.length} existing sessions`
        );
  
        for (const sessionId of sessionFolders) {
          const sessionPath = path.join(sessionsDir, sessionId);
          const hasCredentials = this.checkSessionCredentials(sessionPath);
  
          if (hasCredentials) {
            logger.info(
              `[SessionManager] Auto-reconnecting session: ${sessionId}`
            );
            await this.createSession(sessionId, null, {
              onConnectionUpdate: (update) => {
                logger.info(
                  `[SessionManager] Auto-reconnect ${sessionId}: ${update.status}`
                );
              },
            });
            await new Promise((resolve) => setTimeout(resolve, 6000));
          }
        }
      } catch (error) {
        logger.error(
          `[SessionManager] Error initializing existing sessions: ${error.message}`
        );
      }
    }
  
    checkSessionCredentials(sessionPath) {
      try {
        const credsFile = path.join(sessionPath, "creds.json");
        return fs.existsSync(credsFile);
      } catch (error) {
        return false;
      }
    }
  
    hasExistingSession(userId) {
      const sessionPath = path.join("./sessions", userId.toString());
      return this.checkSessionCredentials(sessionPath);
    }
  
    async createSession(userId, phoneNumber, callbacks = {}) {
      try {
        const sessionId = userId.toString();
  
        // Check if session already exists and is connected
        if (this.sessions.has(sessionId)) {
          const existingSession = this.sessions.get(sessionId);
          if (existingSession.sock && existingSession.sock.user) {
            logger.info(
              `[SessionManager] Session ${sessionId} already exists and connected`
            );
            return existingSession.sock;
          }
        }
  
        const sessionPath = path.join("./sessions", sessionId);
        if (!fs.existsSync(sessionPath)) {
          fs.mkdirSync(sessionPath, { recursive: true });
        }
  
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  
        const sock = makeWASocket({
          auth: state,
          // Only show QR in terminal if enabled and no phone number pairing
          printQRInTerminal: Boolean(baileysConfig.printQRInTerminal) && !phoneNumber,
          logger: baileysConfig.logger || pino({ level: "silent" }),
          // Let Baileys resolve the correct version; do not hardcode
          browser: baileysConfig.browser || Browsers.macOS("Chrome"),
          generateHighQualityLinkPreview: true,
          markOnlineOnConnect: true,
          syncFullHistory: Boolean(baileysConfig.syncFullHistory),
          defaultQueryTimeoutMs: baileysConfig.defaultQueryTimeoutMs || 60000,
          keepAliveIntervalMs: baileysConfig.keepAliveIntervalMs || 10000,
          retryRequestDelayMs: baileysConfig.retryRequestDelayMs || 350,
          maxMsgRetryCount: baileysConfig.maxMsgRetryCount || 5,
          getMessage: baileysConfig.getMessage || (async () => undefined),
        });
  
        // Store session info
        this.sessions.set(sessionId, { sock, callbacks, phoneNumber });
        this.sessionCallbacks.set(sessionId, callbacks);
  
        sock.ev.on("creds.update", saveCreds);
  
        sock.ev.on("connection.update", async (update) => {
          await this.handleConnectionUpdate(
            sessionId,
            update,
            phoneNumber,
            callbacks
          );
        });
  
        sock.ev.on("messages.upsert", async (messageUpdate) => {
          const { handleMessagesUpsert } = await import("./handlers/upsert.js");
          await handleMessagesUpsert(sessionId, messageUpdate, sock);
        });
  
        if (phoneNumber && !state.creds?.registered) {
          setTimeout(() => handlePairing(sock, sessionId, phoneNumber, this.pairingState, callbacks), 500)
        }
  
        return sock;
      } catch (error) {
        logger.error(
          `[SessionManager] Error creating session ${userId}: ${error.message}`
        );
        throw error;
      }
    }
  
    async loadSessionCredentials(sessionPath) {
      const credsFile = path.join(sessionPath, "creds.json");
      if (fs.existsSync(credsFile)) {
        return JSON.parse(fs.readFileSync(credsFile));
      }
      return {};
    }
  
    async handleConnectionUpdate(sessionId, update, phoneNumber, callbacks) {
      const { connection, lastDisconnect, qr, receivedPendingNotifications } =
        update;
  
      if (connection === "close") {
        const error = lastDisconnect?.error;
        const isLoggedOut = error instanceof Boom
          ? error.output?.statusCode === DisconnectReason.loggedOut
          : false;
        const shouldReconnect = !isLoggedOut;

        // If pairing is active, allow one reconnect if stream restart is required after pairing
        const pair = this.pairingState.get(sessionId);
        const pairingActive = pair && Date.now() < pair.expiresAt && pair.active;
        const requiresRestart = typeof error?.message === "string" && (
          error.message.includes("Stream Errored") ||
          error.message.includes("restart required")
        );

        let willReconnect = shouldReconnect;
        if (pairingActive) {
          willReconnect = requiresRestart;
          if (willReconnect) markPairingRestartHandled(this.pairingState, sessionId)
        }

        logger.info(
          `[SessionManager] Connection closed for ${sessionId}, reconnecting: ${willReconnect}`
        );

        if (willReconnect) {
          const attempts = this.reconnectAttempts.get(sessionId) || 0;
  
          if (attempts < this.maxReconnectAttempts) {
            this.reconnectAttempts.set(sessionId, attempts + 1);
  
            const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
  
            setTimeout(async () => {
              try {
                logger.info(
                  `[SessionManager] Reconnecting ${sessionId} (attempt ${
                    attempts + 1
                  })`
                );
                await this.createSession(sessionId, phoneNumber, callbacks);
              } catch (error) {
                logger.error(
                  `[SessionManager] Reconnection failed for ${sessionId}: ${error.message}`
                );
              }
            }, delay);
          } else {
            logger.error(
              `[SessionManager] Max reconnection attempts reached for ${sessionId}`
            );
            this.sessions.delete(sessionId);
            this.reconnectAttempts.delete(sessionId);
          }
        } else if (isLoggedOut) {
          // User logged out, clean up session
          this.sessions.delete(sessionId);
          this.reconnectAttempts.delete(sessionId);
          await this.cleanupSession(sessionId);
        }
  
        if (callbacks.onConnectionUpdate) {
          await callbacks.onConnectionUpdate({
            status: "disconnected",
            sessionId,
          });
        }
      } else if (connection === "open") {
        logger.info(
          `[SessionManager] Session ${sessionId} connected successfully`
        );
  
        // Reset reconnection attempts on successful connection
        this.reconnectAttempts.delete(sessionId);
  
        setTimeout(() => {
          logger.info(
            `[SessionManager] Session ${sessionId} ready for message handling`
          );
  
          if (callbacks.onConnectionUpdate) {
            callbacks.onConnectionUpdate({
              status: "connected",
              sessionId,
              sock: this.sessions.get(sessionId)?.sock,
            });
          }
          // Clear pairing state on successful connection
          clearPairing(this.pairingState, sessionId);
        }, 6000);
      } else if (connection === "connecting") {
        logger.info(`[SessionManager] Session ${sessionId} connecting...`);
      }
  
      if (receivedPendingNotifications) {
        logger.info(
          `[SessionManager] Session ${sessionId} received pending notifications`
        );
      }
  
      // Handle QR code
      if (qr && callbacks.onQRCode) {
        await callbacks.onQRCode(qr);
      }
    }
  
    // moved to handlers/upsert.js
  
    extractMessageText(message) {
      const msg = message.message;
  
      if (msg.conversation) return msg.conversation;
      if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
      if (msg.imageMessage?.caption) return msg.imageMessage.caption;
      if (msg.videoMessage?.caption) return msg.videoMessage.caption;
      if (msg.documentMessage?.caption) return msg.documentMessage.caption;
  
      return null;
    }
  
    // Removed built-in command routing; plugins handle all commands
  
    async cleanupSession(sessionId) {
      try {
        const sessionPath = path.join("./sessions", sessionId);
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          logger.info(
            `[SessionManager] Cleaned up session files for ${sessionId}`
          );
        }
      } catch (error) {
        logger.error(
          `[SessionManager] Error cleaning up session: ${error.message}`
        );
      }
    }
  
    getSession(sessionId) {
      return this.sessions.get(sessionId.toString());
    }
  
    getAllSessions() {
      return Array.from(this.sessions.keys());
    }
  
    async sendMessage(sessionId, chatId, message) {
      try {
        const session = this.sessions.get(sessionId.toString());
        if (!session || !session.sock) {
          throw new Error(`Session ${sessionId} not found or not connected`);
        }

        return await session.sock.sendMessage(chatId, message);
      } catch (error) {
        logger.error(`[SessionManager] Error sending message: ${error.message}`);
        throw error;
      }
    }

    async disconnectSession(sessionId) {
      try {
        const id = sessionId.toString();
        const session = this.sessions.get(id);
        if (session?.sock) {
          try {
            session.sock.ws?.close();
          } catch (innerError) {
            logger.error(`[SessionManager] Error closing socket for ${id}: ${innerError.message}`);
          }
        }
        this.sessions.delete(id);
        this.reconnectAttempts.delete(id);
        logger.info(`[SessionManager] Disconnected session ${id} (preserved credentials)`);
      } catch (error) {
        logger.error(`[SessionManager] Error disconnecting session: ${error.message}`);
      }
    }

    cleanup() {
      try {
        logger.info(`[SessionManager] Cleanup executed`);
      } catch (error) {
        logger.error(`[SessionManager] Cleanup error: ${error.message}`);
      }
    }
  }
  
  const sessionManager = new WhatsAppSessionManager();
  
  // ES6 exports
  export {
    WhatsAppSessionManager,
    WhatsAppSessionManager as SessionManager, // Alias for compatibility
    sessionManager,
  };
  
  export default sessionManager;
  