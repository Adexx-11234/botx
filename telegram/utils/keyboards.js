// utils/keyboards.js - Complete keyboard layouts for the bot
export class TelegramKeyboards {
  // Main user keyboards
  static mainMenu() {
    return {
      inline_keyboard: [
        [{ text: "📱 Connect WhatsApp", callback_data: "connect" }],
        [
          { text: "📊 Status", callback_data: "status" },
          { text: "❓ Help", callback_data: "help" }
        ],
        [{ text: "🔌 Disconnect", callback_data: "disconnect" }]
      ]
    }
  }

  static connecting() {
    return {
      inline_keyboard: [
        [{ text: "❌ Cancel", callback_data: "main_menu" }]
      ]
    }
  }

  static confirmDisconnect() {
    return {
      inline_keyboard: [
        [
          { text: "✅ Yes, disconnect", callback_data: "disconnect_confirm" },
          { text: "❌ Cancel", callback_data: "main_menu" }
        ]
      ]
    }
  }

  static backButton(target = "main_menu") {
    return {
      inline_keyboard: [
        [{ text: "🔙 Back", callback_data: target }]
      ]
    }
  }

  static codeOptions(code) {
    return {
      inline_keyboard: [
        [{ text: "🔄 Get New Code", callback_data: "connect" }],
        [{ text: "🔙 Main Menu", callback_data: "main_menu" }]
      ]
    }
  }

  // ADMIN KEYBOARDS

  // Main admin panel
  static adminMenu() {
    return {
      inline_keyboard: [
        [
          { text: "📊 Statistics", callback_data: "admin_stats" },
          { text: "👥 Users", callback_data: "admin_users" }
        ],
        [
          { text: "⚙️ Admins", callback_data: "admin_manage" },
          { text: "📱 Sessions", callback_data: "admin_sessions" }
        ],
        [
          { text: "🔧 System", callback_data: "admin_system" },
          { text: "💬 Messages", callback_data: "admin_messages" }
        ],
        [
          { text: "⚠️ Maintenance", callback_data: "admin_maintenance" },
          { text: "📋 Logs", callback_data: "admin_logs" }
        ],
        [{ text: "🚪 Logout", callback_data: "admin_logout" }]
      ]
    }
  }

  // User management keyboards
  static adminUsersMenu() {
    return {
      inline_keyboard: [
        [
          { text: "📋 List Users", callback_data: "admin_users_list" },
          { text: "🔍 Search User", callback_data: "admin_user_search" }
        ],
        [
          { text: "📊 User Stats", callback_data: "admin_user_stats" },
          { text: "🔌 Disconnect User", callback_data: "admin_disconnect_user" }
        ],
        [
          { text: "🗑️ Delete User", callback_data: "admin_delete_user" },
          { text: "📤 Export Users", callback_data: "admin_export_users" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_panel" }]
      ]
    }
  }

  static paginationKeyboard(currentPage, totalPages, prefix) {
    const keyboard = []
    
    // Navigation row
    if (totalPages > 1) {
      const nav = []
      if (currentPage > 1) {
        nav.push({ text: "◀️", callback_data: `${prefix}_${currentPage - 1}` })
      }
      nav.push({ text: `${currentPage}/${totalPages}`, callback_data: "noop" })
      if (currentPage < totalPages) {
        nav.push({ text: "▶️", callback_data: `${prefix}_${currentPage + 1}` })
      }
      keyboard.push(nav)
    }

    // Action buttons based on context
    if (prefix === "admin_users") {
      keyboard.push([
        { text: "🔍 Search", callback_data: "admin_user_search" },
        { text: "📊 Stats", callback_data: "admin_user_stats" }
      ])
      keyboard.push([
        { text: "🔌 Disconnect", callback_data: "admin_disconnect_user" },
        { text: "🗑️ Delete", callback_data: "admin_delete_user" }
      ])
    } else if (prefix === "admin_sessions") {
      keyboard.push([
        { text: "🔌 Disconnect All", callback_data: "admin_disconnect_all" },
        { text: "🧹 Cleanup", callback_data: "admin_cleanup_sessions" }
      ])
    }

    keyboard.push([{ text: "🔙 Back", callback_data: "admin_panel" }])
    
    return { inline_keyboard: keyboard }
  }

  // Admin management keyboards
  static adminManagementKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: "➕ Add Admin", callback_data: "admin_add" },
          { text: "➖ Remove Admin", callback_data: "admin_remove" }
        ],
        [
          { text: "📋 List Admins", callback_data: "admin_list" },
          { text: "🔑 Change Password", callback_data: "admin_change_password" }
        ],
        [
          { text: "📊 Admin Activity", callback_data: "admin_activity" },
          { text: "🔐 Security Settings", callback_data: "admin_security" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_panel" }]
      ]
    }
  }

  // System management keyboards
  static systemMenu() {
    return {
      inline_keyboard: [
        [
          { text: "🔍 Health Check", callback_data: "admin_health" },
          { text: "📊 Performance", callback_data: "admin_performance" }
        ],
        [
          { text: "🔄 Restart Bot", callback_data: "admin_restart" },
          { text: "🧹 Clear Cache", callback_data: "admin_clear_cache" }
        ],
        [
          { text: "📁 Backup Data", callback_data: "admin_backup" },
          { text: "📈 Monitor", callback_data: "admin_monitor" }
        ],
        [
          { text: "⚙️ Configuration", callback_data: "admin_config" },
          { text: "🔧 Database", callback_data: "admin_database" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_panel" }]
      ]
    }
  }

  // Session management keyboards
  static sessionsMenu() {
    return {
      inline_keyboard: [
        [
          { text: "📋 Active Sessions", callback_data: "admin_sessions_list" },
          { text: "🔌 Disconnect All", callback_data: "admin_disconnect_all" }
        ],
        [
          { text: "🧹 Cleanup Sessions", callback_data: "admin_cleanup_sessions" },
          { text: "📊 Session Stats", callback_data: "admin_session_stats" }
        ],
        [
          { text: "🔄 Refresh", callback_data: "admin_sessions_refresh" },
          { text: "📤 Export", callback_data: "admin_export_sessions" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_panel" }]
      ]
    }
  }

  // Maintenance keyboards
  static maintenanceMenu() {
    return {
      inline_keyboard: [
        [
          { text: "🔌 Disconnect All", callback_data: "admin_disconnect_all" },
          { text: "🗑️ Clear All Data", callback_data: "admin_clear_all" }
        ],
        [
          { text: "🔄 Reset Database", callback_data: "admin_reset_db" },
          { text: "📁 Backup System", callback_data: "admin_full_backup" }
        ],
        [
          { text: "🧹 Deep Clean", callback_data: "admin_deep_clean" },
          { text: "📊 Optimize DB", callback_data: "admin_optimize_db" }
        ],
        [
          { text: "🔧 Repair", callback_data: "admin_repair" },
          { text: "⚡ Emergency", callback_data: "admin_emergency" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_panel" }]
      ]
    }
  }

  // Message management keyboards
  static messagesMenu() {
    return {
      inline_keyboard: [
        [
          { text: "📊 Statistics", callback_data: "admin_message_stats" },
          { text: "🔍 Search Messages", callback_data: "admin_search_messages" }
        ],
        [
          { text: "📈 Trends", callback_data: "admin_message_trends" },
          { text: "👑 Top Users", callback_data: "admin_top_users" }
        ],
        [
          { text: "🗑️ Cleanup Old", callback_data: "admin_cleanup_messages" },
          { text: "📤 Export", callback_data: "admin_export_messages" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_panel" }]
      ]
    }
  }

  // Logs and monitoring keyboards
  static logsMenu() {
    return {
      inline_keyboard: [
        [
          { text: "📋 Activity Logs", callback_data: "admin_activity_logs" },
          { text: "⚠️ Error Logs", callback_data: "admin_error_logs" }
        ],
        [
          { text: "🔐 Security Logs", callback_data: "admin_security_logs" },
          { text: "📊 System Logs", callback_data: "admin_system_logs" }
        ],
        [
          { text: "🔍 Filter Logs", callback_data: "admin_filter_logs" },
          { text: "📤 Export Logs", callback_data: "admin_export_logs" }
        ],
        [
          { text: "🗑️ Clear Logs", callback_data: "admin_clear_logs" },
          { text: "⚙️ Log Settings", callback_data: "admin_log_settings" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_panel" }]
      ]
    }
  }

  // Confirmation keyboards
  static disconnectAllConfirmation() {
    return {
      inline_keyboard: [
        [
          { text: "⚠️ YES, DISCONNECT ALL", callback_data: "admin_disconnect_all_confirm" }
        ],
        [
          { text: "❌ Cancel", callback_data: "admin_maintenance" }
        ]
      ]
    }
  }

  static dangerousActionConfirm(action) {
    return {
      inline_keyboard: [
        [
          { text: `⚠️ YES, ${action.toUpperCase()}`, callback_data: `admin_${action}_confirm` }
        ],
        [
          { text: "❌ Cancel", callback_data: "admin_maintenance" }
        ]
      ]
    }
  }

  static confirmAction(confirmCallback, cancelCallback = "admin_panel") {
    return {
      inline_keyboard: [
        [
          { text: "✅ Confirm", callback_data: confirmCallback },
          { text: "❌ Cancel", callback_data: cancelCallback }
        ]
      ]
    }
  }

  // Quick actions keyboards
  static quickActions() {
    return {
      inline_keyboard: [
        [
          { text: "🔄 Refresh", callback_data: "admin_refresh" },
          { text: "📊 Quick Stats", callback_data: "admin_quick_stats" }
        ],
        [
          { text: "🔍 Search", callback_data: "admin_quick_search" },
          { text: "📋 Recent", callback_data: "admin_recent_activity" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_panel" }]
      ]
    }
  }

  // Settings keyboards
  static settingsMenu() {
    return {
      inline_keyboard: [
        [
          { text: "🔐 Security", callback_data: "admin_security_settings" },
          { text: "📊 Logging", callback_data: "admin_log_settings" }
        ],
        [
          { text: "⚡ Performance", callback_data: "admin_performance_settings" },
          { text: "🔔 Notifications", callback_data: "admin_notification_settings" }
        ],
        [
          { text: "🌐 API", callback_data: "admin_api_settings" },
          { text: "💾 Storage", callback_data: "admin_storage_settings" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_system" }]
      ]
    }
  }

  // Database management keyboards
  static databaseMenu() {
    return {
      inline_keyboard: [
        [
          { text: "📊 Status", callback_data: "admin_db_status" },
          { text: "🔍 Health", callback_data: "admin_db_health" }
        ],
        [
          { text: "🧹 Optimize", callback_data: "admin_db_optimize" },
          { text: "🔄 Vacuum", callback_data: "admin_db_vacuum" }
        ],
        [
          { text: "📁 Backup", callback_data: "admin_db_backup" },
          { text: "📊 Stats", callback_data: "admin_db_stats" }
        ],
        [
          { text: "🔧 Repair", callback_data: "admin_db_repair" },
          { text: "⚠️ Reset", callback_data: "admin_db_reset" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_system" }]
      ]
    }
  }

  // Search and filter keyboards
  static searchResultsKeyboard(hasNext = false, hasPrev = false, currentPage = 1) {
    const keyboard = []
    
    if (hasNext || hasPrev) {
      const nav = []
      if (hasPrev) nav.push({ text: "◀️ Previous", callback_data: `admin_search_prev_${currentPage - 1}` })
      if (hasNext) nav.push({ text: "▶️ Next", callback_data: `admin_search_next_${currentPage + 1}` })
      keyboard.push(nav)
    }

    keyboard.push([
      { text: "🔍 New Search", callback_data: "admin_user_search" },
      { text: "🔙 Back", callback_data: "admin_users" }
    ])

    return { inline_keyboard: keyboard }
  }

  static filterOptions() {
    return {
      inline_keyboard: [
        [
          { text: "✅ Connected", callback_data: "admin_filter_connected" },
          { text: "❌ Disconnected", callback_data: "admin_filter_disconnected" }
        ],
        [
          { text: "👑 Admins", callback_data: "admin_filter_admins" },
          { text: "👤 Users", callback_data: "admin_filter_users" }
        ],
        [
          { text: "📅 Today", callback_data: "admin_filter_today" },
          { text: "📅 Week", callback_data: "admin_filter_week" }
        ],
        [
          { text: "🔄 Clear Filters", callback_data: "admin_clear_filters" },
          { text: "🔙 Back", callback_data: "admin_users" }
        ]
      ]
    }
  }

  // Export options keyboards
  static exportOptions(type) {
    return {
      inline_keyboard: [
        [
          { text: "📊 CSV", callback_data: `admin_export_${type}_csv` },
          { text: "📋 JSON", callback_data: `admin_export_${type}_json` }
        ],
        [
          { text: "📄 PDF Report", callback_data: `admin_export_${type}_pdf` },
          { text: "📈 Excel", callback_data: `admin_export_${type}_excel` }
        ],
        [{ text: "🔙 Back", callback_data: `admin_${type}` }]
      ]
    }
  }

  // Backup options keyboards
  static backupOptions() {
    return {
      inline_keyboard: [
        [
          { text: "💾 Quick Backup", callback_data: "admin_backup_quick" },
          { text: "🗃️ Full Backup", callback_data: "admin_backup_full" }
        ],
        [
          { text: "📊 Users Only", callback_data: "admin_backup_users" },
          { text: "💬 Messages Only", callback_data: "admin_backup_messages" }
        ],
        [
          { text: "⚙️ Settings", callback_data: "admin_backup_settings" },
          { text: "📋 Schedule", callback_data: "admin_backup_schedule" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_system" }]
      ]
    }
  }

  // Security settings keyboards
  static securitySettings() {
    return {
      inline_keyboard: [
        [
          { text: "🔐 Password Policy", callback_data: "admin_password_policy" },
          { text: "🕒 Session Timeout", callback_data: "admin_session_timeout" }
        ],
        [
          { text: "🚫 Lockout Settings", callback_data: "admin_lockout_settings" },
          { text: "📊 Login Monitoring", callback_data: "admin_login_monitoring" }
        ],
        [
          { text: "🔍 Audit Trail", callback_data: "admin_audit_trail" },
          { text: "🛡️ IP Whitelist", callback_data: "admin_ip_whitelist" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_settings" }]
      ]
    }
  }

  // Performance monitoring keyboards
  static performanceMenu() {
    return {
      inline_keyboard: [
        [
          { text: "⚡ Real-time", callback_data: "admin_performance_realtime" },
          { text: "📊 Historical", callback_data: "admin_performance_history" }
        ],
        [
          { text: "💾 Memory", callback_data: "admin_performance_memory" },
          { text: "💽 Storage", callback_data: "admin_performance_storage" }
        ],
        [
          { text: "🌐 Network", callback_data: "admin_performance_network" },
          { text: "⚙️ CPU", callback_data: "admin_performance_cpu" }
        ],
        [
          { text: "📈 Trends", callback_data: "admin_performance_trends" },
          { text: "⚠️ Alerts", callback_data: "admin_performance_alerts" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_system" }]
      ]
    }
  }

  // Emergency actions keyboard
  static emergencyMenu() {
    return {
      inline_keyboard: [
        [
          { text: "🚨 EMERGENCY STOP", callback_data: "admin_emergency_stop" }
        ],
        [
          { text: "🔌 Kill All Sessions", callback_data: "admin_emergency_kill" },
          { text: "🛡️ Safe Mode", callback_data: "admin_emergency_safe" }
        ],
        [
          { text: "📞 Contact Support", callback_data: "admin_emergency_support" },
          { text: "📋 Status Report", callback_data: "admin_emergency_report" }
        ],
        [{ text: "🔙 Back", callback_data: "admin_maintenance" }]
      ]
    }
  }

  // Time range selectors
  static timeRangeSelector(prefix) {
    return {
      inline_keyboard: [
        [
          { text: "1H", callback_data: `${prefix}_1h` },
          { text: "6H", callback_data: `${prefix}_6h` },
          { text: "24H", callback_data: `${prefix}_24h` }
        ],
        [
          { text: "7D", callback_data: `${prefix}_7d` },
          { text: "30D", callback_data: `${prefix}_30d` },
          { text: "All", callback_data: `${prefix}_all` }
        ],
        [{ text: "🔙 Back", callback_data: "admin_panel" }]
      ]
    }
  }

  // Utility keyboards
  static yesNo(yesCallback, noCallback = "admin_panel") {
    return {
      inline_keyboard: [
        [
          { text: "✅ Yes", callback_data: yesCallback },
          { text: "❌ No", callback_data: noCallback }
        ]
      ]
    }
  }

  static okButton(callback = "admin_panel") {
    return {
      inline_keyboard: [
        [{ text: "✅ OK", callback_data: callback }]
      ]
    }
  }

  static refreshButton(callback) {
    return {
      inline_keyboard: [
        [
          { text: "🔄 Refresh", callback_data: callback },
          { text: "🔙 Back", callback_data: "admin_panel" }
        ]
      ]
    }
  }

  // Dynamic keyboard builder
  static buildCustomKeyboard(buttons, columns = 2) {
    const keyboard = []
    
    for (let i = 0; i < buttons.length; i += columns) {
      const row = buttons.slice(i, i + columns)
      keyboard.push(row.map(btn => ({
        text: btn.text,
        callback_data: btn.callback_data
      })))
    }

    return { inline_keyboard: keyboard }
  }

  // Special keyboards for specific contexts
  static userActionKeyboard(userId) {
    return {
      inline_keyboard: [
        [
          { text: "🔌 Disconnect", callback_data: `admin_disconnect_user_${userId}` },
          { text: "🗑️ Delete", callback_data: `admin_delete_user_${userId}` }
        ],
        [
          { text: "👑 Make Admin", callback_data: `admin_promote_user_${userId}` },
          { text: "📊 User Stats", callback_data: `admin_user_details_${userId}` }
        ],
        [{ text: "🔙 Back", callback_data: "admin_users_list" }]
      ]
    }
  }

  static sessionActionKeyboard(sessionId) {
    return {
      inline_keyboard: [
        [
          { text: "🔌 Disconnect", callback_data: `admin_disconnect_session_${sessionId}` },
          { text: "📊 Details", callback_data: `admin_session_details_${sessionId}` }
        ],
        [
          { text: "🔄 Restart", callback_data: `admin_restart_session_${sessionId}` },
          { text: "⚠️ Force Kill", callback_data: `admin_kill_session_${sessionId}` }
        ],
        [{ text: "🔙 Back", callback_data: "admin_sessions_list" }]
      ]
    }
  }

  // Status indicators as keyboards (for better UX)
  static statusIndicator(status, callback = "admin_panel") {
    const statusEmojis = {
      'online': '🟢',
      'offline': '🔴', 
      'warning': '🟡',
      'error': '❌',
      'maintenance': '🔧'
    }

    return {
      inline_keyboard: [
        [
          { text: `${statusEmojis[status] || '❓'} ${status.toUpperCase()}`, callback_data: "noop" }
        ],
        [
          { text: "🔄 Refresh", callback_data: callback },
          { text: "🔙 Back", callback_data: "admin_panel" }
        ]
      ]
    }
  }
}