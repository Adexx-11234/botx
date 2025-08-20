# Group Events Plugin

## 🎭 **Overview**

The `groupevents` plugin is a comprehensive solution for managing automatic messages in WhatsApp groups. It handles welcome messages, goodbye messages, promotion notifications, and demotion notifications - all in one centralized plugin.

## 🚀 **Features**

### ✨ **Welcome Messages**
- Automatically sends personalized welcome messages when new members join
- Includes group name, member count, and join timestamp
- Customizable format with emojis and styling

### ✨ **Goodbye Messages**
- Sends goodbye messages when members leave the group
- Includes group name, member count, and leave timestamp
- Emotional farewell with "You'll be missed" messaging

### 👑 **Promotion Messages**
- Notifies when members are promoted to admin
- Congratulatory tone with responsibility reminder

### 📉 **Demotion Messages**
- Notifies when members are demoted from admin
- Reassuring tone that they can still participate

## 📋 **Commands**

### Main Commands
- `.groupevents` - Show help and status
- `.groupevents status` - Check all event settings

### Welcome Management
- `.welcome on` - Enable welcome messages
- `.welcome off` - Disable welcome messages
- `.welcome status` - Check welcome status

### Goodbye Management
- `.goodbye on` - Enable goodbye messages
- `.goodbye off` - Disable goodbye messages
- `.goodbye status` - Check goodbye status

## 💬 **Message Formats**

### Welcome Message Example
```
✨ Welcome @~OMAH🦋! ✨

Welcome to ⚡SΔVΔGΣ SⵕUΔÐ⚡! 🎉

We're now 142 members.

Joined at: 13:53:09, 16/08/2025

> © Paul Bot
```

### Goodbye Message Example
```
✨ Goodbye @~OMAH🦋! ✨

You'll be missed in ⚡SΔVΔGΣ SⵕUΔÐ⚡! 🥲

We're now 141 members.

Left at: 13:53:09, 16/08/2025

> © Paul Bot
```

## ⚙️ **Configuration**

### Database Integration
- Uses the `groups` table with `welcome_enabled` and `goodbye_enabled` columns
- Settings are stored per group (not globally)
- Each group can have different welcome/goodbye settings

### Plugin Integration
- Automatically integrated with the group handler
- No environment variables needed
- Admin-only commands for security

## 🔧 **Technical Details**

### File Structure
```
plugins/
├── groupevents.js          # Main plugin file
└── README.md              # This documentation

whatsapp/handlers/
└── groups.js              # Group event handler (uses plugin)
```

### Dependencies
- `database/query.js` - For database operations
- `utils/logger.js` - For logging
- `utils/plugin-loader.js` - For plugin management

### Database Schema
```sql
-- Migration 003_add_welcome_goodbye_columns.sql
ALTER TABLE groups ADD COLUMN welcome_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE groups ADD COLUMN goodbye_enabled BOOLEAN DEFAULT FALSE;
```

## 🎯 **Usage Examples**

### Enable Welcome Messages
```
.welcome on
```
**Response:** ✨ Welcome messages enabled! New members will receive personalized welcome messages when they join the group.

### Check Status
```
.groupevents status
```
**Response:** 
```
🎭 Group Events Status

✨ Welcome Messages: ✅ Enabled
✨ Goodbye Messages: ❌ Disabled

Use .welcome on/off or .goodbye on/off to manage these features.
```

## 🔄 **How It Works**

1. **Group Join Event**: When someone joins, the group handler checks if welcome is enabled
2. **Group Leave Event**: When someone leaves, the group handler checks if goodbye is enabled
3. **Plugin Check**: Uses `pluginLoader.getPluginByCommand("groupevents")` to get the plugin
4. **Message Creation**: Calls appropriate method (`createWelcomeMessage`, `createGoodbyeMessage`)
5. **Message Sending**: Sends the formatted message to the group
6. **Logging**: Logs all actions for debugging

## 🚫 **Security Features**

- **Admin Only**: All commands require admin privileges
- **Group Only**: Commands only work in groups
- **Validation**: Proper input validation for all commands
- **Error Handling**: Comprehensive error handling and logging

## 📝 **Notes**

- Messages are automatically formatted with current timestamp and member count
- Group name is extracted from `groupMetadata.subject`
- All messages include "© Paul Bot" signature
- Plugin is automatically loaded by the plugin system
- No manual configuration needed - just enable/disable per group

## 🔮 **Future Enhancements**

- Custom message templates per group
- Welcome/goodbye image support
- Member count thresholds for special messages
- Integration with group rules/description
- Analytics for join/leave patterns
