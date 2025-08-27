// config/database.js
// Enhanced database configuration with connection management
import { Pool } from "pg";
import dotenv from "dotenv";
import { createComponentLogger } from "../utils/logger.js";

dotenv.config();

const logger = createComponentLogger("DATABASE");

// Database configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to wait for a connection
  acquireTimeoutMillis: 60000, // Maximum time to wait for a connection from the pool
  createTimeoutMillis: 8000, // Maximum time to wait during connection creation
  destroyTimeoutMillis: 5000, // Maximum time to wait during disconnection
  reapIntervalMillis: 1000, // How often to check for idle resources to destroy
  createRetryIntervalMillis: 200, // How long to idle after failed create before trying again
};

// Create connection pool
const pool = new Pool(dbConfig);

// Connection event handlers
pool.on("connect", (client) => {
  logger.debug("New database client connected");
});

pool.on("acquire", (client) => {
});

pool.on("release", (client) => {
});

pool.on("remove", (client) => {
});

pool.on("error", (err, client) => {
  logger.error("Database pool error:", err);
});

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    client.release();
    
    logger.info("Database connection test successful", {
      timestamp: result.rows[0].current_time,
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
    });
    
    return true;
  } catch (error) {
    logger.error("Database connection test failed:", error);
    return false;
  }
}

/**
 * Get pool statistics
 */
function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * Gracefully close all connections
 */
async function closePool() {
  try {
    await pool.end();
    logger.info("Database connection pool closed successfully");
  } catch (error) {
    logger.error("Error closing database pool:", error);
    throw error;
  }
}

/**
 * Execute query with error handling and logging
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      logger.warn("Slow query detected", {
        duration: `${duration}ms`,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      });
    }
    
    return result;
  } catch (error) {
    logger.error("Database query error:", {
      error: error.message,
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      params: params
    });
    throw error;
  }
}

/**
 * Execute transaction with automatic rollback on error
 */
async function transaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Export pool and utility functions
export { 
  pool,
  testConnection,
  getPoolStats,
  closePool,
  query,
  transaction
};

export default pool;
