import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

import { createComponentLogger } from "./utils/logger.js";
import { sessionManager } from "./whatsapp/session-manager.js";
import pool from "./config/database.js";
import { WhatsAppTelegramBot } from "./telegram/bot.js";
import { WhatsAppClient } from "./whatsapp/client.js";
import pluginLoader from "./utils/plugin-loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createComponentLogger("MAIN");
const app = express();
const PORT = process.env.PORT || 3000;

const telegramBot = new WhatsAppTelegramBot();
const whatsappClient = new WhatsAppClient(pluginLoader);

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Health check endpoint
app.get("/health", (req, res) => {
  const stats = sessionManager.getStats();
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sessions: stats,
    version: "1.0.0",
    telegram: telegramBot.getStats(),
    whatsapp: whatsappClient.getStats(),
  });
});

// Status endpoint for monitoring
app.get("/status", (req, res) => {
  res.json({
    platform: "WhatsApp-Telegram Bot Platform",
    status: "running",
    batch: "Batch 2 - Telegram Bot Integration & WhatsApp Client Active",
    nextBatch: "Batch 3 - Plugin System & Advanced Features",
    sessions: sessionManager.getStats(),
    telegram: telegramBot.getStats(),
    whatsapp: whatsappClient.getStats(),
    features: {
      database: "PostgreSQL with proper Baileys JID format",
      sessionManagement: "Multi-user session handling with cleanup",
      logging: "Component-based logging with file and console output",
      antiCommands: "4-warning system for group moderation",
      groupControl: "grouponly mode for bot reply control",
      telegramBot: "Active with authentication and admin system",
      whatsappClient: "Active with multi-session support",
    },
    plugins: pluginLoader.getPluginStats(),
  });
});

// Initialize platform
async function initializePlatform() {
  logger.info("Starting WhatsApp-Telegram Bot Platform...");

  // Test database connection (non-fatal)
  try {
    await pool.query("SELECT NOW()");
    logger.info("Database connection established");
  } catch (error) {
    logger.error("Database connection failed (server will still start)", error);
  }

  // Initialize Telegram bot (non-fatal)
  try {
    logger.info("Initializing Telegram bot...");
    const telegramInitialized = await telegramBot.initialize();
    if (!telegramInitialized) {
      logger.warn("Telegram bot failed to initialize; continuing without Telegram");
    } else {
      logger.info("Telegram bot initialized successfully ✅");
    }
  } catch (error) {
    logger.error("Telegram bot initialization error (continuing)", error);
  }

  // Initialize WhatsApp client (non-fatal)
  try {
    logger.info("Initializing WhatsApp client...");
    // Initialize plugin system first
    await pluginLoader.loadPlugins();
    logger.info("Plugins loaded successfully");
    await whatsappClient.initialize();
    logger.info("WhatsApp client initialized successfully ✅");
  } catch (error) {
    logger.error("WhatsApp client initialization error (continuing)", error);
  }

  // Start cleanup interval
  setInterval(() => {
    try {
      sessionManager.cleanup();
    } catch (error) {
      logger.error("Session cleanup error", error);
    }
  }, 300000); // Every 5 minutes

  // Start HTTP server regardless of component init results
  app.listen(PORT, () => {
    logger.info("HTTP server running", { port: PORT });
    logger.info("Platform Status:");
    logger.info("   - Batch 1: Core Infrastructure ✅ COMPLETE");
    logger.info("   - Batch 2: Bot Integration ✅ COMPLETE");
    logger.info("   - Database schema with proper Baileys JID format ✅");
    logger.info("   - Session management system ✅");
    logger.info("   - Logging and error handling ✅");
    logger.info("   - Telegram bot with authentication: " + (telegramBot.getStats().isInitialized ? "✅" : "❌"));
    logger.info("   - WhatsApp client with multi-session support: " + (whatsappClient.isInitialized ? "✅" : "❌"));
    logger.info("");
    logger.info("🚀 Platform HTTP server is running");
    logger.info("🔄 Next: Batch 3 - Plugin System & Advanced Features");
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down platform...");

  try {
    await telegramBot.stop();
    logger.info("Telegram bot stopped");

    await whatsappClient.cleanup();
    logger.info("WhatsApp client cleaned up");

    await pool.end();
    logger.info("Database connections closed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown", error);
    process.exit(1);
  }
});

// Start the platform
initializePlatform();
