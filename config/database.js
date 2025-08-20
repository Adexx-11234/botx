import { Pool } from "pg"
import dotenv from "dotenv"

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection on startup
pool.on("connect", () => {
  console.log("📊 Connected to PostgreSQL database")
})

pool.on("error", (err) => {
  console.error("❌ Database connection error:", err)
})

export { pool }
export default pool
