import pino from "pino"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Ensure logs directory exists
const logsDir = path.join(__dirname, "../logs")
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    targets: [
      {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
        level: "info",
      },
      {
        target: "pino/file",
        options: {
          destination: path.join(logsDir, "app.log"),
          mkdir: true,
        },
        level: "debug",
      },
    ],
  },
})

export const createComponentLogger = (component) => {
  return {
    info: (msg, data) => logger.info({ component, ...data }, msg),
    error: (msg, error) => logger.error({ component, error: error?.message || error }, msg),
    warn: (msg, data) => logger.warn({ component, ...data }, msg),
    debug: (msg, data) => logger.debug({ component, ...data }, msg),
    trace: (msg, data) => logger.trace({ component, ...data }, msg),
  }
}

export { logger }

export const telegram = createComponentLogger("TELEGRAM")
export const whatsapp = createComponentLogger("WHATSAPP")
export const database = createComponentLogger("DATABASE")
export const plugin = createComponentLogger("PLUGIN")
export const session = createComponentLogger("SESSION")
export const auth = createComponentLogger("AUTH")

export default logger
