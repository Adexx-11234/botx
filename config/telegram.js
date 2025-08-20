export const telegramConfig = {
  token: process.env.TELEGRAM_BOT_TOKEN,
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10,
    },
  },
  webHook: false,
  onlyFirstMatch: false,
  request: {
    url: "https://api.telegram.org",
    timeout: 30000,
  },
}

export const botCommands = [
  { command: "start", description: "Start the bot and get welcome message" },
  { command: "connect", description: "Connect your WhatsApp account" },
  { command: "disconnect", description: "Disconnect your WhatsApp account" },
  { command: "status", description: "Check your connection status" },
  { command: "admin", description: "Access admin panel (admins only)" },
  { command: "help", description: "Show help message" },
]

export const adminConfig = {
  maxAdmins: 10,
  passwordMinLength: 8,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  maxLoginAttempts: 3,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
}
