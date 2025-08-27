// utils/messages.js - Complete message templates for the bot
export class TelegramMessages {
  // Basic bot messages
  static welcome(firstName) {
    return `Welcome ${firstName}!

I'm the PAUL Bot - I help you connect your WhatsApp to Telegram.

*What can I do?*
• Forward WhatsApp messages to Telegram
• Let you reply from Telegram  
• Keep everything synchronized

Ready to connect? Just click the button below!`
  }

  static help() {
    return `*How to Connect:*

1️⃣ Click "Connect WhatsApp"
2️⃣ Enter your phone number with country code
3️⃣ I'll give you a code
4️⃣ Open WhatsApp > Settings > Linked Devices
5️⃣ Enter the code there

That's it! Your messages will start appearing here.

*Commands:*
/start - Main menu
/status - Check connection
/disconnect - Remove WhatsApp
/help - This message
/admin - Admin panel (admins only)`
  }

  // Connection flow messages
  static askPhoneNumber() {
    return `*Enter Your Phone Number*

Please type your number with country code:

✅ Correct: +1234567890
✅ Correct: +447123456789
❌ Wrong: 1234567890 (missing +)
❌ Wrong: 234567890 (missing country code)

Just type and send your number below:`
  }

  static showPairingCode(code) {
    return `*Your Connection Code*

\`${code}\`

*Now follow these steps:*
1️⃣ Open WhatsApp on your phone
2️⃣ Tap ⋮ (menu) or Settings
3️⃣ Select "Linked Devices"
4️⃣ Tap "Link a Device"
5️⃣ Enter this code: ${code}

⏰ Code expires in 60 seconds
🔄 Need a new code? Just start over`
  }

  static connected(phone) {
    return `*Successfully Connected!*

Your WhatsApp (${phone}) is now linked!

Messages will appear here automatically.
You can reply directly from Telegram.

Type /status to check your connection anytime.`
  }

  static alreadyConnected(phone) {
    return `You're already connected!

Phone: ${phone}

To connect a different number:
1. First /disconnect
2. Then /connect again`
  }

  static notConnected() {
    return `Not connected yet

Click "Connect WhatsApp" to get started!`
  }

  static disconnected() {
    return `Disconnected successfully

Your WhatsApp has been unlinked.
You can connect again anytime!`
  }

  static status(isConnected, phone) {
    if (!isConnected) {
      return `*Status*

Connection: ❌ Not connected

Use /connect to link your WhatsApp`
    }

    return `*Status*

Connection: ✅ Active
Phone: ${phone}
Messages: Working

Everything is running smoothly!`
  }

  static invalidPhone() {
    return `Invalid phone number

Remember to include:
• The + sign
• Country code
• Full number

Example: +1234567890

Please try again:`
  }

  static phoneInUse() {
    return `This number is already connected to another account.

Each WhatsApp can only be linked to one Telegram account.`
  }

  static confirmDisconnect(phone) {
    return `*Confirm Disconnect*

This will unlink: ${phone}

Are you sure?`
  }

  static error(details = null) {
    return `Something went wrong${details ? `\n\nDetails: ${details}` : ''}

Please try again or contact support.`
  }
// Add to TelegramMessages class in utils/messages.js

static disconnecting(phone) {
  return `*Disconnecting...*

Unlinking WhatsApp: ${phone}

This may take a moment...`
}

static connecting() {
  return `*Connecting to WhatsApp...*

Please wait while we establish the connection.

This may take up to 30 seconds.`
}

  // ADMIN MESSAGES
  
  // Authentication
  static adminLogin() {
    return `*Admin Access Required*

Enter your admin password:`
  }

  static adminLoginSuccess() {
    return `*Access Granted*

Welcome to the admin panel!`
  }

  static adminLoginFailed(attemptsLeft) {
    return `*Incorrect Password*

Attempts remaining: ${attemptsLeft}

⚠️ Account will be locked after failed attempts.`
  }

  static adminLockout() {
    return `*Account Locked*

Too many failed login attempts.
Try again in 15 minutes.`
  }

  static unauthorized() {
    return `*Access Denied*

You don't have admin privileges.`
  }

  // Main admin panel
  static adminPanel() {
    return `*Admin Panel*

Select an option:`
  }

  // Statistics
  static adminStats(stats) {
    return `*System Statistics*

👥 *Users*
• Total: ${stats.totalUsers}
• Active Today: ${stats.activeToday || 0}
• New This Week: ${stats.newThisWeek || 0}

📱 *Sessions*  
• Connected: ${stats.connectedSessions}
• Active (1h): ${stats.activeSessions}
• Success Rate: ${stats.connectionRate || 0}%

💬 *Messages*
• Today: ${stats.messagesToday}
• This Week: ${stats.messagesWeek || 0}
• Avg per User: ${stats.avgMessages || 0}

🖥️ *System*
• Uptime: ${stats.uptime}
• Memory: ${stats.memoryUsage}MB
• Status: Running`
  }

  // User management
  static adminUserList(users, page, totalPages) {
    let message = `*User List* (Page ${page}/${totalPages})\n\n`
    
    users.forEach(user => {
      const status = user.is_connected ? "🟢" : "🔴"
      const adminBadge = user.is_admin ? "👑 " : ""
      const name = user.first_name || user.username || "Unknown"
      
      message += `${status} ${adminBadge}*${name}*\n`
      message += `   ID: \`${user.telegram_id}\`\n`
      if (user.whatsapp_number) {
        message += `   📱 ${user.whatsapp_number}\n`
      }
      message += `   📅 ${new Date(user.created_at).toLocaleDateString()}\n\n`
    })

    return message
  }

  // Admin management
  static adminManageAdmins() {
    return `*Admin Management*

Manage administrator accounts and permissions.`
  }

  static adminAddAdmin() {
    return `*Add New Admin*

Send the Telegram ID or @username of the user you want to make an admin.

⚠️ The user must have used the bot at least once.`
  }

  static adminRemoveAdmin() {
    return `*Remove Admin*

Send the Telegram ID or @username of the admin you want to remove.

⚠️ Cannot remove the default admin.`
  }

  static setAdminPassword(user) {
    const name = user.first_name || user.username || `User ${user.telegram_id}`
    return `*Set Admin Password*

Setting up admin access for: *${name}*

Please send a secure password for this admin:`
  }

  static adminAdded(user) {
    const name = user.first_name || user.username || `User ${user.telegram_id}`
    return `*Admin Created*

👑 *${name}* is now an administrator!

They can access the admin panel using their password.`
  }

  static adminListAdmins(admins) {
    if (admins.length === 0) {
      return `*Administrator List*

No additional admins found.
Only the default admin exists.`
    }

    let message = "*Administrator List*\n\n"
    
    admins.forEach(admin => {
      const name = admin.first_name || admin.username || "Unknown"
      const isDefault = admin.telegram_id == process.env.DEFAULT_ADMIN_ID ? " (Default)" : ""
      message += `👑 *${name}*${isDefault}\n`
      message += `   ID: \`${admin.telegram_id}\`\n`
      message += `   Added: ${new Date(admin.created_at).toLocaleDateString()}\n\n`
    })

    return message
  }

  // Sessions management
  static adminSessionsList(sessions, page, totalPages) {
    let message = `*Active Sessions* (Page ${page}/${totalPages})\n\n`
    
    sessions.forEach(session => {
      const status = session.is_connected ? "🟢 Active" : "🔴 Inactive"
      const name = session.first_name || session.username || "Unknown"
      const lastActive = new Date(session.updated_at).toLocaleString()
      
      message += `${status} *${name}*\n`
      message += `   ID: \`${session.telegram_id}\`\n`
      message += `   📱 ${session.phone_number || 'No phone'}\n`
      message += `   ⏰ Last: ${lastActive}\n\n`
    })

    return message || "No active sessions found."
  }

  // Disconnect operations
  static disconnectAllConfirmation() {
    return `*DANGEROUS OPERATION*

🔌 *Disconnect All Users*

This will:
• Disconnect all WhatsApp sessions
• Remove all user data  
• Cannot be undone

⚠️ Are you absolutely sure?`
  }

  static disconnectSpecificUser() {
    return `*Disconnect Specific User*

Send the user's:
• Telegram ID, or
• Phone number

Example: \`1234567890\` or \`+1234567890\``
  }

  // System information
  static systemInfo(info) {
    return `*System Information*

🖥️ *Server*
• Platform: ${info.platform}
• Node.js: ${info.nodeVersion}  
• Memory: ${info.memoryUsage}MB / ${info.totalMemory}MB
• CPU: ${info.cpuLoad}%

📊 *Application*
• Uptime: ${info.uptime}
• Version: ${info.botVersion}
• Database: ${info.dbStatus}
• Active Sessions: ${info.activeConnections}

💾 *Storage*  
• Session Files: ${info.sessionFiles}
• DB Size: ${info.dbSize}MB
• Logs: ${info.logSize}MB`
  }

  static maintenancePanel() {
    return `*Maintenance Panel*

🚨 *DANGEROUS OPERATIONS*
Use with extreme caution!

These actions cannot be undone.`
  }

  // Message stats
  static messageStats(stats) {
    return `*Message Statistics*

📊 *Overview*
• Total Messages: ${stats.totalMessages}
• Today: ${stats.todayMessages}
• This Week: ${stats.weekMessages}
• This Month: ${stats.monthMessages}

📈 *Trends*
• Daily Average: ${stats.dailyAverage}
• Peak Hour: ${stats.peakHour}
• Most Active User: ${stats.mostActiveUser}

📱 *By Type*
• Text: ${stats.textMessages}
• Media: ${stats.mediaMessages}
• Voice: ${stats.voiceMessages}
• Other: ${stats.otherMessages}`
  }

  // Activity logs
  static activityLogs(logs) {
    if (logs.length === 0) {
      return `*Activity Logs*

No recent activity found.`
    }

    let message = "*Recent Admin Activity*\n\n"
    
    logs.forEach(log => {
      const time = new Date(log.timestamp).toLocaleString()
      message += `🕒 ${time}\n`
      message += `👤 Admin: ${log.telegram_id}\n`
      message += `🔄 Action: ${log.action}\n`
      if (log.details) {
        message += `📝 Details: ${log.details}\n`
      }
      message += "\n"
    })

    return message
  }

  // Health check
  static healthCheck(health) {
    const getStatusEmoji = (status) => {
      switch(status) {
        case 'healthy': return '✅'
        case 'warning': return '⚠️'
        case 'error': return '❌'
        default: return '❓'
      }
    }

    return `*System Health Check*

${getStatusEmoji(health.database.status)} *Database*
${health.database.message}

${getStatusEmoji(health.sessions.status)} *Sessions*
${health.sessions.message}

${getStatusEmoji(health.memory.status)} *Memory*  
${health.memory.message}

*Overall Status:* ${getStatusEmoji(health.overall)} ${health.overall.toUpperCase()}`
  }

  // Success/Error messages
  static operationSuccess(message) {
    return `*Success*

${message}`
  }

  static operationError(message) {
    return `*Error*

${message}`
  }

  static operationWarning(message) {
    return `*Warning*

${message}`
  }

  static confirmAction(action, details = null) {
    let message = `*Confirm Action*

${action}\n\n`
    if (details) {
      message += `${details}\n\n`
    }
    message += "Are you sure you want to continue?"
    return message
  }

  // Search results
  static searchResults(results, query) {
    if (results.length === 0) {
      return `*Search Results*

No results found for: "${query}"`
    }

    let message = `*Search Results for: "${query}"*\n\n`
    
    results.forEach(result => {
      const name = result.first_name || result.username || "Unknown"
      const status = result.is_connected ? "🟢" : "🔴"
      
      message += `${status} *${name}*\n`
      message += `   ID: \`${result.telegram_id}\`\n`
      if (result.phone_number) {
        message += `   📱 ${result.phone_number}\n`
      }
      message += `   📅 ${new Date(result.created_at).toLocaleDateString()}\n\n`
    })

    return message
  }

  // Backup and restore
  static backupStatus(status) {
    return `*Backup Status*

Status: ${status.status}
Progress: ${status.progress}%
Started: ${status.startTime}
Estimated: ${status.estimatedTime}

${status.message || ''}`
  }

  static backupComplete(info) {
    return `*Backup Complete*

File: ${info.filename}
Size: ${info.size}MB
Duration: ${info.duration}
Records: ${info.records}

Backup saved successfully.`
  }

  // Performance metrics
  static performanceMetrics(metrics) {
    return `*Performance Metrics*

⚡ *Response Times*
• Database: ${metrics.dbResponseTime}ms
• API: ${metrics.apiResponseTime}ms
• WhatsApp: ${metrics.whatsappResponseTime}ms

📊 *Throughput*
• Messages/min: ${metrics.messagesPerMinute}
• Requests/min: ${metrics.requestsPerMinute}
• Peak load: ${metrics.peakLoad}%

🔄 *Cache*
• Hit rate: ${metrics.cacheHitRate}%
• Miss rate: ${metrics.cacheMissRate}%
• Size: ${metrics.cacheSize}MB`
  }

  // Maintenance notifications
  static maintenanceScheduled(time) {
    return `*Maintenance Scheduled*

Scheduled for: ${time}
Duration: ~30 minutes
Impact: Service interruption

All users will be notified before maintenance begins.`
  }

  static maintenanceStarted() {
    return `*Maintenance Started*

The system is currently under maintenance.
Service will be restored shortly.

We apologize for any inconvenience.`
  }

  static maintenanceCompleted() {
    return `*Maintenance Completed*

System maintenance has been completed successfully.
All services are now operational.

Thank you for your patience.`
  }

  // Quick action confirmations
  static restartConfirmation() {
    return `*Restart System*

This will restart the bot and disconnect all users temporarily.
Service will resume automatically.

Continue with restart?`
  }

  static clearCacheConfirmation() {
    return `*Clear Cache*

This will clear all cached data.
Performance may be slower temporarily.

Continue with cache clear?`
  }

  static resetDatabaseConfirmation() {
    return `*DANGER: Reset Database*

⚠️ THIS WILL DELETE ALL DATA ⚠️

• All users will be removed
• All sessions will be deleted  
• All messages will be lost
• This cannot be undone

Type "CONFIRM RESET" to proceed.`
  }
}