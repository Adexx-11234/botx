import pool from "../config/database.js"
import { createComponentLogger } from "../utils/logger.js"

const logger = createComponentLogger("CreateAdmin")

async function createAdmin() {
  const telegramId = process.argv[2]
  const username = process.argv[3]

  if (!telegramId) {
    console.log("Usage: node scripts/create-admin.js <telegram_id> [username]")
    process.exit(1)
  }

  try {
    const result = await pool.query(
      "INSERT INTO users (telegram_id, username, is_admin, is_active) VALUES ($1, $2, true, true) ON CONFLICT (telegram_id) DO UPDATE SET is_admin = true, username = $2",
      [telegramId, username || null],
    )

    logger.info("Admin user created/updated", { telegramId, username })
    console.log(`✅ Admin user created: ${telegramId} (${username || "no username"})`)
  } catch (error) {
    logger.error("Failed to create admin", { error: error.message })
    console.error("❌ Failed to create admin:", error.message)
  } finally {
    await pool.end()
  }
}

createAdmin()
