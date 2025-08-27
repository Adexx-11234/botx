import express from "express"
import dotenv from "dotenv"
import { createComponentLogger } from "./utils/logger.js"
import { testConnection, closePool } from "./config/database.js"
import { runMigrations } from "./database/migrations/run-migrations.js"
import { WhatsAppTelegramBot } from "./telegram/bot.js"
import { WhatsAppClient } from "./whatsapp/client.js"
import { initializeSessionManager } from "./whatsapp/sessions/session-manager.js"
import { WebInterface } from "./web/index.js"
import pluginLoader from "./utils/plugin-loader.js"
import cookieParser from 'cookie-parser'
dotenv.config()

const logger = createComponentLogger("MAIN")
const PORT = process.env.PORT || 3000
const app = express()

// Platform components
let telegramBot = null
let whatsappClient = null
let sessionManager = null
let webInterface = null
let server = null
let isInitialized = false

// Setup middleware
app.use(express.json({ limit: "30mb" }))
app.use(express.urlencoded({ extended: true, limit: "30mb" }))
app.use(express.static("public"))
app.use(cookieParser())

// Setup web interface routes
webInterface = new WebInterface()
app.use('/', webInterface.router)

// Health endpoints
app.get("/health", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    initialized: isInitialized,
    components: {
      database: true,
      telegram: !!telegramBot,
      whatsapp: !!whatsappClient,
      sessions: sessionManager ? sessionManager.activeSockets.size : 0,
      sessionManager: !!sessionManager,
      eventHandlersEnabled: sessionManager ? sessionManager.eventHandlersEnabled : false
    }
  }
  res.json(health)
})

app.get("/api/status", async (req, res) => {
  const stats = {}
  
  if (sessionManager) {
    try {
      stats.sessions = await sessionManager.getStats()
    } catch (error) {
      stats.sessions = { error: 'Failed to get stats' }
    }
  }
  
  res.json({
    platform: "WhatsApp-Telegram Bot Platform",
    status: isInitialized ? "operational" : "initializing",
    ...stats,
    telegram: telegramBot ? telegramBot.getStats?.() : null,
    whatsapp: whatsappClient ? whatsappClient.getStats?.() : null
  })
})

// Initialize platform
async function initializePlatform() {
  if (isInitialized) {
    logger.warn("Platform already initialized, skipping...")
    return
  }

  logger.info("Starting WhatsApp-Telegram Bot Platform...")
  
  try {
    // 1. Database
    logger.info("Connecting to database...")
    await testConnection()
    await runMigrations()

    // 2. Plugins
    logger.info("Loading plugins...")
    await pluginLoader.loadPlugins()

    // 3. Telegram Bot
    logger.info("Starting Telegram bot...")
    telegramBot = new WhatsAppTelegramBot()
    await telegramBot.initialize()

    // 4. Session Manager - Initialize with event handlers disabled
    logger.info("Starting session manager...")
    sessionManager = initializeSessionManager(telegramBot)
    
    // Initialize existing sessions (this will automatically enable event handlers after 3 seconds)
    logger.info("Initializing existing sessions...")
    const { initialized, total } = await sessionManager.initializeExistingSessions()
    logger.info(`Session initialization completed: ${initialized}/${total} sessions`)

    // 5. Wait a bit more to ensure event handlers are enabled
    logger.info("Waiting for event handlers to be enabled...")
    await new Promise(resolve => setTimeout(resolve, 4000)) // Wait 4 seconds total

    // 6. WhatsApp Client - only after session manager is fully ready
    logger.info("Starting WhatsApp client...")
    whatsappClient = new WhatsAppClient(pluginLoader)
    whatsappClient.setTelegramBot(telegramBot)

    // 7. HTTP Server
    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info("Platform initialization completed successfully")
      logger.info(`Event handlers enabled: ${sessionManager.eventHandlersEnabled}`)
      logger.info(`Web interface: http://localhost:${PORT}`)
      logger.info(`Health check: http://localhost:${PORT}/health`)
    })

    isInitialized = true

    // 8. Maintenance tasks - run less frequently and with better error handling
    setInterval(async () => {
      try {
        if (sessionManager?.storage) {
          const stats = await sessionManager.getStats()
          if (stats.totalSessions > stats.connectedSessions) {
            // Basic cleanup for disconnected sessions
            logger.debug(`Maintenance: ${stats.connectedSessions}/${stats.totalSessions} sessions connected`)
          }
        }
        
        // Lightweight connection test
        await testConnection()
      } catch (error) {
        logger.error("Maintenance task error:", error.message)
      }
    }, 600000) // 10 minutes

  } catch (error) {
    logger.error("Platform initialization failed:", error)
    process.exit(1)
  }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`)
  
  try {
    // Stop accepting new connections first
    if (server) {
      server.close()
      logger.info("HTTP server closed")
    }

    // Cleanup components in reverse order
    if (whatsappClient) {
      logger.info("Cleaning up WhatsApp client...")
      await whatsappClient.cleanup()
    }

    if (telegramBot) {
      logger.info("Stopping Telegram bot...")
      await telegramBot.stop()
    }

    if (sessionManager) {
      logger.info("Cleaning up session manager...")
      await sessionManager.cleanup()
    }

    logger.info("Closing database connections...")
    await closePool()
    
    logger.info("Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    logger.error("Shutdown error:", error)
    process.exit(1)
  }
}

// Error handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  // Don't exit immediately, try graceful shutdown
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
  // Log but don't exit for unhandled rejections unless critical
})

// Handle process warnings
process.on('warning', (warning) => {
  if (warning.name !== 'MaxListenersExceededWarning') {
    logger.warn('Process warning:', warning.message)
  }
})

// Start platform
initializePlatform().catch((error) => {
  logger.error("Failed to start platform:", error)
  process.exit(1)
})