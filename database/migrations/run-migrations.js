import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import pool from "../../config/database.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigrations() {
  try {
    console.log("🔄 Starting database migrations...")

    const migrationFile = path.join(__dirname, "001_init.sql")
    const migrationSQL = fs.readFileSync(migrationFile, "utf8")

    await pool.query(migrationSQL)

    console.log("✅ Database migrations completed successfully!")
    console.log("📊 Tables created:")
    console.log("   - users (Telegram authentication)")
    console.log("   - sessions (WhatsApp connections)")
    console.log("   - messages (with proper Baileys JID format)")
    console.log("   - groups (settings and anti-commands)")
    console.log("   - warnings (4-warning system)")
    console.log("   - settings (user preferences)")
  } catch (error) {
    console.error("❌ Migration failed:", error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
}

export { runMigrations }
