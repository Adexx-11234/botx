export class TelegramKeyboards {
  static mainMenu() {
    return {
      inline_keyboard: [
        [
          { text: "📱 Connect WhatsApp", callback_data: "connect_whatsapp" },
          { text: "📊 Status", callback_data: "check_status" },
        ],
        [
          { text: "🔌 Disconnect", callback_data: "disconnect_whatsapp" },
          { text: "❓ Help", callback_data: "show_help" },
        ],
        [{ text: "⚙️ Admin Panel", callback_data: "admin_panel" }],
      ],
    }
  }

  static connectionMenu() {
    return {
      inline_keyboard: [
        [{ text: "📞 Enter Phone Number", callback_data: "enter_phone" }],
        [{ text: "🔙 Back to Main Menu", callback_data: "main_menu" }],
      ],
    }
  }

  static adminMenu() {
    return {
      inline_keyboard: [
        [
          { text: "👥 Manage Users", callback_data: "admin_users" },
          { text: "📊 Statistics", callback_data: "admin_stats" },
        ],
        [
          { text: "🔧 System Status", callback_data: "admin_system" },
          { text: "📝 Logs", callback_data: "admin_logs" },
        ],
        [{ text: "👑 Manage Admins", callback_data: "admin_manage_admins" }],
        [{ text: "🔙 Back to Main Menu", callback_data: "main_menu" }],
      ],
    }
  }

  static adminUsersMenu() {
    return {
      inline_keyboard: [
        [
          { text: "📋 List All Users", callback_data: "admin_list_users" },
          { text: "🔍 Search User", callback_data: "admin_search_user" },
        ],
        [
          { text: "🚫 Disconnect User", callback_data: "admin_disconnect_user" },
          { text: "📊 User Stats", callback_data: "admin_user_stats" },
        ],
        [{ text: "🔙 Back to Admin Menu", callback_data: "admin_panel" }],
      ],
    }
  }

  static confirmationKeyboard(action, data = "") {
    return {
      inline_keyboard: [
        [
          { text: "✅ Yes", callback_data: `confirm_${action}_${data}` },
          { text: "❌ No", callback_data: `cancel_${action}` },
        ],
      ],
    }
  }

  static backButton(target = "main_menu") {
    return {
      inline_keyboard: [[{ text: "🔙 Back", callback_data: target }]],
    }
  }

  static paginationKeyboard(currentPage, totalPages, prefix) {
    const keyboard = []
    const buttons = []

    if (currentPage > 1) {
      buttons.push({ text: "⬅️ Previous", callback_data: `${prefix}_page_${currentPage - 1}` })
    }

    buttons.push({ text: `${currentPage}/${totalPages}`, callback_data: "noop" })

    if (currentPage < totalPages) {
      buttons.push({ text: "Next ➡️", callback_data: `${prefix}_page_${currentPage + 1}` })
    }

    if (buttons.length > 0) {
      keyboard.push(buttons)
    }

    keyboard.push([{ text: "🔙 Back", callback_data: "admin_panel" }])

    return { inline_keyboard: keyboard }
  }
}
