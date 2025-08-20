export class TelegramMessages {
  static welcome(firstName) {
    return `🤖 *Welcome to WhatsApp-Telegram Bot Platform, ${firstName}!*

This bot allows you to connect and manage your WhatsApp account through Telegram.

*Available Features:*
📱 Connect your WhatsApp account
📊 Check connection status
🔌 Disconnect when needed
⚙️ Admin panel (for authorized users)

Click the buttons below to get started!`
  }

  static help() {
    return `📚 *Help & Commands*

*Available Commands:*
/start - Start the bot and show main menu
/connect - Connect your WhatsApp account
/disconnect - Disconnect your WhatsApp account
/status - Check your connection status
/admin - Access admin panel (admins only)
/help - Show this help message

*How to Connect WhatsApp:*
1. Click "📱 Connect WhatsApp"
2. Enter your phone number
3. Enter the pairing code from your WhatsApp app
4. Your account will be connected!

*Note:* Only one WhatsApp session per Telegram user is allowed.`
  }

  static connectionInstructions() {
    return `📱 *Connect Your WhatsApp Account*

To connect your WhatsApp account:

1. Click "📞 Enter Phone Number" below
2. Send your phone number in international format (e.g., +1234567890)
3. Open WhatsApp on your phone
4. Go to Settings > Linked Devices > Link a Device
5. Enter the pairing code I'll send you

*Important:* Make sure your phone has internet connection during this process.`
  }

  static enterPhoneNumber() {
    return `📞 *Enter Your Phone Number*

Please send your phone number in international format.

*Examples:*
• +1234567890 (US)
• +447123456789 (UK)
• +919876543210 (India)

Make sure to include the country code with the + sign.`
  }

  static pairingCodeSent(code) {
    return `🔐 *Pairing Code Generated*

Your pairing code is: \`${code}\`

*Steps to complete connection:*
1. Open WhatsApp on your phone
2. Go to Settings > Linked Devices
3. Tap "Link a Device"
4. Enter this code: \`${code}\`

The code will expire in 5 minutes. If it expires, please try connecting again.`
  }

  static connectionSuccess(phoneNumber) {
    return `✅ *WhatsApp Connected Successfully!*

Your WhatsApp account (${phoneNumber}) is now connected to this bot.

You can now use all WhatsApp features through this Telegram bot. Your session will remain active until you disconnect or it expires due to inactivity.`
  }

  static connectionFailed(reason) {
    return `❌ *Connection Failed*

Failed to connect your WhatsApp account.

*Reason:* ${reason}

Please try again or contact support if the problem persists.`
  }

  static alreadyConnected(phoneNumber) {
    return `⚠️ *Already Connected*

Your Telegram account is already connected to WhatsApp number: ${phoneNumber}

If you want to connect a different number, please disconnect first and then reconnect.`
  }

  static notConnected() {
    return `⚠️ *Not Connected*

You don't have any WhatsApp account connected to this bot.

Click "📱 Connect WhatsApp" to get started!`
  }

  static disconnectionSuccess() {
    return `✅ *WhatsApp Disconnected*

Your WhatsApp account has been successfully disconnected from this bot.

You can reconnect anytime using the "📱 Connect WhatsApp" button.`
  }

  static status(isConnected, phoneNumber = null, lastSeen = null) {
    if (!isConnected) {
      return `📊 *Connection Status*

Status: ❌ Not Connected
WhatsApp Account: None

Use /connect to link your WhatsApp account.`
    }

    return `📊 *Connection Status*

Status: ✅ Connected
WhatsApp Account: ${phoneNumber}
Last Activity: ${lastSeen || "Just now"}
Session: Active

Your WhatsApp is ready to use through this bot!`
  }

  static adminLogin() {
    return `🔐 *Admin Authentication Required*

Please enter the admin password to access the admin panel.

Send the password as a message (it will be automatically deleted for security).`
  }

  static adminLoginSuccess() {
    return `✅ *Admin Access Granted*

Welcome to the admin panel! You now have access to all administrative functions.

Your session will expire in 30 minutes of inactivity.`
  }

  static adminLoginFailed(attemptsLeft) {
    return `❌ *Invalid Password*

Access denied. You have ${attemptsLeft} attempts remaining.

After 3 failed attempts, you will be locked out for 15 minutes.`
  }

  static adminLockout() {
    return `🚫 *Account Locked*

Too many failed login attempts. You are locked out for 15 minutes.

Please try again later.`
  }

  static adminStats(stats) {
    return `📊 *System Statistics*

👥 Total Users: ${stats.totalUsers}
📱 Connected Sessions: ${stats.connectedSessions}
📈 Active Sessions: ${stats.activeSessions}
💬 Messages Today: ${stats.messagesToday}
🔄 Uptime: ${stats.uptime}

Last Updated: ${new Date().toLocaleString()}`
  }

  static adminUserList(users, page, totalPages) {
    let message = `👥 *User List (Page ${page}/${totalPages})*\n\n`

    users.forEach((user, index) => {
      const status = user.is_connected ? "✅" : "❌"
      message += `${status} ${user.telegram_username || user.telegram_id}\n`
      message += `   📱 ${user.whatsapp_number || "Not connected"}\n`
      message += `   🕒 ${user.last_seen || "Never"}\n\n`
    })

    return message
  }

  static invalidPhoneNumber() {
    return `❌ *Invalid Phone Number*

The phone number format is incorrect. Please make sure to:

• Include the country code with + sign
• Use only numbers after the +
• Example: +1234567890

Please try again with the correct format.`
  }

  static error(message = "An unexpected error occurred") {
    return `❌ *Error*

${message}

Please try again or contact support if the problem persists.`
  }

  static unauthorized() {
    return `🚫 *Unauthorized Access*

You don't have permission to access this feature.

Contact an administrator if you believe this is an error.`
  }
}
