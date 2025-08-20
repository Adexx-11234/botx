import {
    makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    Browsers,
  } from "@whiskeysockets/baileys";
  import { Boom } from "@hapi/boom";
  import fs from "fs";
  import path from "path";
  import { logger } from "../utils/logger.js";
  import { baileysConfig } from "../config/baileys.js";
  import {
    handlePairing,
    markPairingRestartHandled,
    clearPairing,
  } from "./utils/pairing.js";
  
  class WhatsAppSessionManager {
    constructor() {
      // Core session management
      this.sessions = new Map(); // sessionId -> { sock, callbacks, phoneNumber, userId, createdAt, lastActivity }
      this.sessionCallbacks = new Map(); // sessionId -> callbacks
      this.pairingState = new Map(); // sessionId -> { code, expiresAt, active }
  
      // Connection management
      this.reconnectAttempts = new Map(); // sessionId -> attemptCount
      this.maxReconnectAttempts = 5;
      this.reconnectDelayBase = 1000; // 1 second base delay
      this.maxReconnectDelay = 30000; // 30 seconds max delay
  
      // Session limits and cleanup
      this.maxConcurrentSessions = 100; // Adjust based on your server capacity
      this.sessionTimeoutMs = 24 * 60 * 60 * 1000; // 24 hours inactive timeout
      this.cleanupIntervalMs = 60 * 60 * 1000; // Cleanup every hour
  
      // Start periodic cleanup
      this.startPeriodicCleanup();
  
      logger.info("[SessionManager] WhatsApp Session Manager initialized");
    }
  
    // ==========================================
    // SESSION LIFECYCLE MANAGEMENT
    // ==========================================
  
    async createSession(userId, phoneNumber = null, callbacks = {}) {
      try {
        const sessionId = this.generateSessionId(userId);
  
        // Check session limits
        if (this.sessions.size >= this.maxConcurrentSessions) {
          await this.cleanupInactiveSessions();
          if (this.sessions.size >= this.maxConcurrentSessions) {
            throw new Error(
              `Maximum concurrent sessions limit reached (${this.maxConcurrentSessions})`
            );
          }
        }
  
        // Check if session already exists and is connected
        if (this.sessions.has(sessionId)) {
          const existingSession = this.sessions.get(sessionId);
          if (existingSession.sock && existingSession.sock.user) {
            logger.info(
              `[SessionManager] Session ${sessionId} already exists and connected`
            );
            // Update last activity
            existingSession.lastActivity = Date.now();
            return existingSession.sock;
          }
          // Clean up existing broken session
          await this.disconnectSession(sessionId);
        }
  
        // Create session directory
        const sessionPath = this.getSessionPath(sessionId);
        if (!fs.existsSync(sessionPath)) {
          fs.mkdirSync(sessionPath, { recursive: true });
        }
  
        // Initialize auth state
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  
        // Determine if this is a new registration or existing session
        const isExistingSession = this.hasValidCredentials(sessionId);
        const shouldPrintQR = !phoneNumber && !isExistingSession;
  
        // Create WhatsApp socket
        const sock = makeWASocket({
          printQRInTerminal: shouldPrintQR, // Only print QR for completely new sessions without phone number
          auth: state,
          ...baileysConfig, // Apply your baileys configuration
        });
  
        // Store session info with metadata
        const sessionData = {
          sock,
          callbacks,
          phoneNumber,
          userId,
          createdAt: Date.now(),
          lastActivity: Date.now(),
          reconnectCount: 0,
          isConnected: false,
        };
  
        this.sessions.set(sessionId, sessionData);
        this.sessionCallbacks.set(sessionId, callbacks);
  
        // Setup event handlers
        this.setupSocketEventHandlers(sock, sessionId, sessionData, saveCreds);
  
        // Handle pairing ONLY for completely new registrations (not existing sessions)
        if (phoneNumber && !state.creds?.registered && !isExistingSession) {
          setTimeout(async () => {
            if (sock.authState?.creds?.registered) {
              logger.info(
                `[SessionManager] ${sessionId} already registered, skipping pairing`
              );
              return;
            }
  
            logger.info(
              `[SessionManager] Starting pairing process for new session ${sessionId}`
            );
            await handlePairing(
              sock,
              sessionId,
              phoneNumber,
              this.pairingState,
              callbacks
            );
          }, 1000);
        } else if (isExistingSession) {
          logger.info(
            `[SessionManager] ${sessionId} is an existing session, skipping pairing and QR generation`
          );
        }
  
        logger.info(`[SessionManager] Session ${sessionId} created successfully`);
        return sock;
      } catch (error) {
        logger.error(
          `[SessionManager] Error creating session ${userId}: ${error.message}`
        );
        throw error;
      }
    }
  
    async initializeExistingSessions(callbacks = {}) {
      try {
        const sessionsDir = "./sessions";
  
        if (!fs.existsSync(sessionsDir)) {
          logger.info(
            "[SessionManager] No sessions directory found, skipping initialization"
          );
          return { initialized: 0, failed: 0 };
        }
  
        const sessionDirs = fs
          .readdirSync(sessionsDir, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);
  
        if (sessionDirs.length === 0) {
          logger.info("[SessionManager] No existing sessions found");
          return { initialized: 0, failed: 0 };
        }
  
        logger.info(
          `[SessionManager] Found ${sessionDirs.length} existing sessions, initializing...`
        );
  
        let initialized = 0;
        let failed = 0;
        const batchSize = 5; // Initialize in batches to prevent overwhelming
  
        // Process sessions in batches
        for (let i = 0; i < sessionDirs.length; i += batchSize) {
          const batch = sessionDirs.slice(i, i + batchSize);
  
          await Promise.allSettled(
            batch.map(async (sessionId) => {
              try {
                if (this.hasValidCredentials(sessionId)) {
                  logger.info(
                    `[SessionManager] Initializing existing session: ${sessionId}`
                  );
  
                  // Extract userId from sessionId (assuming format: user_<userId>)
                  const userId = this.extractUserIdFromSessionId(sessionId);
                  await this.createSession(userId, null, callbacks);
                  initialized++;
  
                  // Small delay between sessions
                  await this.delay(500);
                }
              } catch (error) {
                logger.error(
                  `[SessionManager] Failed to initialize session ${sessionId}: ${error.message}`
                );
                failed++;
              }
            })
          );
  
          // Delay between batches
          if (i + batchSize < sessionDirs.length) {
            await this.delay(2000);
          }
        }
  
        logger.info(
          `[SessionManager] Session initialization complete: ${initialized} successful, ${failed} failed`
        );
        return { initialized, failed };
      } catch (error) {
        logger.error(
          `[SessionManager] Error initializing existing sessions: ${error.message}`
        );
        throw error;
      }
    }
  
    // ==========================================
    // CONNECTION EVENT HANDLING
    // ==========================================
  
    setupSocketEventHandlers(sock, sessionId, sessionData, saveCreds) {
      // Credentials update handler
      sock.ev.on("creds.update", saveCreds);
  
      // Connection state handler
      sock.ev.on("connection.update", async (update) => {
        await this.handleConnectionUpdate(sessionId, update, sessionData);
      });
  
      // Message handler
      sock.ev.on("messages.upsert", async (messageUpdate) => {
        try {
          // Update last activity
          sessionData.lastActivity = Date.now();
  
          const { handleMessagesUpsert } = await import("./handlers/upsert.js");
          await handleMessagesUpsert(sessionId, messageUpdate, sock);
        } catch (error) {
          logger.error(
            `[SessionManager] Error handling message upsert for ${sessionId}: ${error.message}`
          );
        }
      });
  
      // Groups update handler
      sock.ev.on("groups.update", async (updates) => {
        try {
          sessionData.lastActivity = Date.now();
          logger.debug(
            `[SessionManager] Groups updated for session ${sessionId}: ${updates.length} updates`
          );
        } catch (error) {
          logger.error(
            `[SessionManager] Error handling groups update for ${sessionId}: ${error.message}`
          );
        }
      });
  
      // Contacts update handler
      sock.ev.on("contacts.update", async (updates) => {
        try {
          sessionData.lastActivity = Date.now();
          logger.debug(
            `[SessionManager] Contacts updated for session ${sessionId}: ${updates.length} updates`
          );
        } catch (error) {
          logger.error(
            `[SessionManager] Error handling contacts update for ${sessionId}: ${error.message}`
          );
        }
      });
    }
  
    async handleConnectionUpdate(sessionId, update, sessionData) {
      const {
        connection,
        lastDisconnect,
        qr,
        receivedPendingNotifications,
        isNewLogin,
      } = update;
  
      logger.info(`[SessionManager] Connection update for ${sessionId}:`, {
        connection,
        receivedPendingNotifications,
        isNewLogin,
        hasQR: !!qr,
      });
  
      // Update session metadata
      sessionData.lastActivity = Date.now();
  
      if (connection === "close") {
        sessionData.isConnected = false;
        await this.handleConnectionClose(sessionId, lastDisconnect, sessionData);
      } else if (connection === "open") {
        sessionData.isConnected = true;
        sessionData.reconnectCount = 0;
        this.reconnectAttempts.delete(sessionId);
  
        await this.handleConnectionOpen(sessionId, sessionData);
      } else if (connection === "connecting") {
        logger.info(`[SessionManager] Session ${sessionId} connecting...`);
      }
  
      if (receivedPendingNotifications) {
        logger.info(
          `[SessionManager] Session ${sessionId} received pending notifications`
        );
      }
  
      // Handle QR code ONLY for completely new sessions without credentials
      if (qr && sessionData.callbacks.onQRCode) {
        const isExistingSession = this.hasValidCredentials(sessionId);
        if (!isExistingSession) {
          logger.info(
            `[SessionManager] Generating QR code for new session ${sessionId}`
          );
          await sessionData.callbacks.onQRCode(qr);
        } else {
          logger.info(
            `[SessionManager] Ignoring QR code for existing session ${sessionId}`
          );
        }
      }
    }
  
    async handleConnectionClose(sessionId, lastDisconnect, sessionData) {
      const error = lastDisconnect?.error;
      const isLoggedOut =
        error instanceof Boom
          ? error.output?.statusCode === DisconnectReason.loggedOut
          : false;
  
      // Enhanced pairing restart logic
      const pair = this.pairingState.get(sessionId);
      const pairingActive = pair && Date.now() < pair.expiresAt && pair.active;
      const requiresRestart =
        typeof error?.message === "string" &&
        (error.message.includes("Stream Errored") ||
          error.message.includes("restart required") ||
          error.message.includes("Connection Closed"));
  
      let shouldReconnect = !isLoggedOut;
      if (pairingActive) {
        shouldReconnect = requiresRestart;
        if (shouldReconnect) {
          markPairingRestartHandled(this.pairingState, sessionId);
        }
      }
  
      logger.info(
        `[SessionManager] Connection closed for ${sessionId}, should reconnect: ${shouldReconnect}`
      );
  
      if (shouldReconnect && !isLoggedOut) {
        await this.attemptReconnection(sessionId, sessionData);
      } else if (isLoggedOut) {
        logger.info(
          `[SessionManager] Session ${sessionId} logged out, cleaning up`
        );
        this.sessions.delete(sessionId);
        this.reconnectAttempts.delete(sessionId);
        await this.cleanupSessionFiles(sessionId);
      }
  
      // Notify connection status
      if (sessionData.callbacks.onConnectionUpdate) {
        await sessionData.callbacks.onConnectionUpdate({
          status: "disconnected",
          sessionId,
          reason: error?.message || "Connection closed",
        });
      }
    }
  
    async handleConnectionOpen(sessionId, sessionData) {
      logger.info(`[SessionManager] Session ${sessionId} connected successfully`);
  
      // Setup delay based on session type
      const setupDelay = this.hasValidCredentials(sessionId) ? 3000 : 6000;
  
      setTimeout(() => {
        logger.info(
          `[SessionManager] Session ${sessionId} ready for message handling`
        );
  
        if (sessionData.callbacks.onConnectionUpdate) {
          sessionData.callbacks.onConnectionUpdate({
            status: "connected",
            sessionId,
            sock: sessionData.sock,
          });
        }
  
        clearPairing(this.pairingState, sessionId);
      }, setupDelay);
    }
  
    async attemptReconnection(sessionId, sessionData) {
      const attempts = this.reconnectAttempts.get(sessionId) || 0;
  
      if (attempts < this.maxReconnectAttempts) {
        this.reconnectAttempts.set(sessionId, attempts + 1);
        sessionData.reconnectCount = attempts + 1;
  
        const delay = Math.min(
          this.reconnectDelayBase * Math.pow(2, attempts),
          this.maxReconnectDelay
        );
  
        logger.info(
          `[SessionManager] Scheduling reconnection for ${sessionId} (attempt ${
            attempts + 1
          }) in ${delay}ms`
        );
  
        setTimeout(async () => {
          try {
            logger.info(
              `[SessionManager] Reconnecting ${sessionId} (attempt ${
                attempts + 1
              })`
            );
            await this.createSession(
              sessionData.userId,
              sessionData.phoneNumber,
              sessionData.callbacks
            );
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
    }
  
    // ==========================================
    // SESSION OPERATIONS
    // ==========================================
  
    async sendMessage(sessionId, chatId, message) {
      try {
        const sessionData = this.sessions.get(sessionId.toString());
        if (!sessionData || !sessionData.sock) {
          throw new Error(`Session ${sessionId} not found or not connected`);
        }
  
        if (!sessionData.isConnected) {
          throw new Error(`Session ${sessionId} is not connected`);
        }
  
        // Update last activity
        sessionData.lastActivity = Date.now();
  
        return await sessionData.sock.sendMessage(chatId, message);
      } catch (error) {
        logger.error(
          `[SessionManager] Error sending message for session ${sessionId}: ${error.message}`
        );
        throw error;
      }
    }
  
    async getSessionInfo(sessionId) {
      const sessionData = this.sessions.get(sessionId.toString());
      if (!sessionData) {
        return null;
      }
  
      return {
        sessionId,
        userId: sessionData.userId,
        isConnected: sessionData.isConnected,
        phoneNumber: sessionData.phoneNumber,
        createdAt: sessionData.createdAt,
        lastActivity: sessionData.lastActivity,
        reconnectCount: sessionData.reconnectCount,
        user: sessionData.sock?.user || null,
      };
    }
  
    getSession(sessionId) {
      const sessionData = this.sessions.get(sessionId.toString());
      return sessionData ? sessionData.sock : null;
    }
  
    getAllSessions() {
      return Array.from(this.sessions.entries()).map(
        ([sessionId, sessionData]) => ({
          sessionId,
          userId: sessionData.userId,
          isConnected: sessionData.isConnected,
          phoneNumber: sessionData.phoneNumber,
          createdAt: sessionData.createdAt,
          lastActivity: sessionData.lastActivity,
          reconnectCount: sessionData.reconnectCount,
        })
      );
    }
  
    getActiveSessionsCount() {
      return Array.from(this.sessions.values()).filter(
        (session) => session.isConnected
      ).length;
    }
  
    async disconnectSession(sessionId) {
      try {
        const id = sessionId.toString();
        const sessionData = this.sessions.get(id);
  
        if (sessionData?.sock) {
          try {
            // Close WebSocket connection
            if (sessionData.sock.ws) {
              sessionData.sock.ws.close();
            }
  
            // Clean up any additional resources
            if (sessionData.sock.cleanup) {
              sessionData.sock.cleanup();
            }
          } catch (innerError) {
            logger.error(
              `[SessionManager] Error closing socket for ${id}: ${innerError.message}`
            );
          }
        }
  
        // Remove from memory but preserve credentials
        this.sessions.delete(id);
        this.sessionCallbacks.delete(id);
        this.reconnectAttempts.delete(id);
  
        logger.info(
          `[SessionManager] Disconnected session ${id} (preserved credentials)`
        );
      } catch (error) {
        logger.error(
          `[SessionManager] Error disconnecting session ${sessionId}: ${error.message}`
        );
      }
    }
  
    // ==========================================
    // UTILITY METHODS
    // ==========================================
  
    generateSessionId(userId) {
      return `user_${userId.toString()}`;
    }
  
    extractUserIdFromSessionId(sessionId) {
      return sessionId.replace("user_", "");
    }
  
    getSessionPath(sessionId) {
      return path.join("./sessions", sessionId);
    }
  
    hasValidCredentials(sessionId) {
      try {
        const sessionPath = this.getSessionPath(sessionId);
        const credsFile = path.join(sessionPath, "creds.json");
        return fs.existsSync(credsFile);
      } catch (error) {
        return false;
      }
    }
  
    // For backward compatibility
    hasExistingSession(userId) {
      const sessionId = this.generateSessionId(userId);
      return this.hasValidCredentials(sessionId);
    }
  
    checkSessionCredentials(sessionPath) {
      try {
        const credsFile = path.join(sessionPath, "creds.json");
        return fs.existsSync(credsFile);
      } catch (error) {
        return false;
      }
    }
  
    async delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  
    // ==========================================
    // CLEANUP AND MAINTENANCE
    // ==========================================
  
    startPeriodicCleanup() {
      setInterval(async () => {
        try {
          await this.cleanupInactiveSessions();
        } catch (error) {
          logger.error(
            `[SessionManager] Error during periodic cleanup: ${error.message}`
          );
        }
      }, this.cleanupIntervalMs);
    }
  
    async cleanupInactiveSessions() {
      const now = Date.now();
      const inactiveSessions = [];
  
      for (const [sessionId, sessionData] of this.sessions) {
        const inactiveTime = now - sessionData.lastActivity;
        if (inactiveTime > this.sessionTimeoutMs) {
          inactiveSessions.push(sessionId);
        }
      }
  
      if (inactiveSessions.length > 0) {
        logger.info(
          `[SessionManager] Cleaning up ${inactiveSessions.length} inactive sessions`
        );
  
        for (const sessionId of inactiveSessions) {
          await this.disconnectSession(sessionId);
        }
      }
  
      return inactiveSessions.length;
    }
  
    async cleanupSessionFiles(sessionId) {
      try {
        const sessionPath = this.getSessionPath(sessionId);
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          logger.info(
            `[SessionManager] Cleaned up session files for ${sessionId}`
          );
        }
      } catch (error) {
        logger.error(
          `[SessionManager] Error cleaning up session files for ${sessionId}: ${error.message}`
        );
      }
    }
  
    async cleanup() {
      try {
        logger.info("[SessionManager] Starting cleanup process...");
  
        // Disconnect all sessions gracefully
        const disconnectPromises = [];
        for (const [sessionId] of this.sessions) {
          disconnectPromises.push(this.disconnectSession(sessionId));
        }
  
        await Promise.allSettled(disconnectPromises);
  
        // Clear all maps
        this.sessions.clear();
        this.sessionCallbacks.clear();
        this.reconnectAttempts.clear();
        this.pairingState.clear();
  
        logger.info("[SessionManager] Cleanup completed successfully");
      } catch (error) {
        logger.error(`[SessionManager] Error during cleanup: ${error.message}`);
      }
    }
  
    // ==========================================
    // STATISTICS AND MONITORING
    // ==========================================
  
    getStats() {
      const totalSessions = this.sessions.size;
      const activeSessions = this.getActiveSessionsCount();
      const reconnectingSessions = this.reconnectAttempts.size;
  
      return {
        totalSessions,
        activeSessions,
        inactiveSessions: totalSessions - activeSessions,
        reconnectingSessions,
        maxConcurrentSessions: this.maxConcurrentSessions,
        utilizationPercentage: Math.round(
          (totalSessions / this.maxConcurrentSessions) * 100
        ),
      };
    }
  }
  
  // Create singleton instance
  const sessionManager = new WhatsAppSessionManager();
  
  // Export both the class and the singleton instance
  export {
    WhatsAppSessionManager,
    WhatsAppSessionManager as SessionManager,
    sessionManager,
  };
  
  export default sessionManager;
  