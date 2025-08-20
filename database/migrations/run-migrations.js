import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import pool from "../../config/database.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigrations() {
  try {
    console.log("🔄 Starting database migrations...")

    // Read all .sql files in this directory and run them in filename order
    const files = fs
      .readdirSync(__dirname)
      .filter((f) => f.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b))

    if (files.length === 0) {
      console.log("ℹ️ No migration files found")
      return
    }

    for (const file of files) {
      const fullPath = path.join(__dirname, file)
      const sql = fs.readFileSync(fullPath, "utf8")
      console.log(`➡️  Applying migration: ${file}`)
      await pool.query(sql)
      console.log(`✅ Applied: ${file}`)
    }

    console.log("✅ All migrations completed successfully!")
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
