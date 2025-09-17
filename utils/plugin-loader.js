// Plugin System & Core Commands with Auto-Reload - OPTIMIZED VERSION
import fs from "fs/promises"
import fsr from "fs"
import path from "path"
import { fileURLToPath } from "url"
import chalk from "chalk"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Simplified logging
const log = {
  info: (msg) => console.log(chalk.blue('[INFO]'), msg),
  warn: (msg) => console.log(chalk.yellow('[WARN]'), msg),
  error: (msg, err) => console.log(chalk.red('[ERROR]'), msg, err?.message || ''),
  debug: (msg) => process.env.DEBUG && console.log(chalk.gray('[DEBUG]'), msg)
}

class PluginLoader {
  constructor() {
    this.plugins = new Map()
    this.commands = new Map()
    this.antiPlugins = new Map()
    this.contactStore = new Map()
    this.watchers = new Map()
    this.reloadTimeouts = new Map()
    this.isInitialized = false
    this.pluginDir = path.join(__dirname, "..", "plugins")
    this.autoReloadEnabled = process.env.PLUGIN_AUTO_RELOAD !== "false"
    this.reloadDebounceMs = Number.parseInt(process.env.PLUGIN_RELOAD_DEBOUNCE) || 1000

    log.info(`Plugin loader initialized (Auto-reload: ${this.autoReloadEnabled ? 'ON' : 'OFF'})`)
  }

  validatePlugin(plugin, pluginName) {
    if (!plugin || typeof plugin !== "object") return false
    if (!plugin.name || typeof plugin.name !== "string") return false
    if (typeof plugin.execute !== "function") return false
    
    if (plugin.permissions && Array.isArray(plugin.permissions)) {
      const validPermissions = ["owner", "admin", "group_admin", "user"]
      const hasInvalidPermission = plugin.permissions.some(p => !validPermissions.includes(p.toLowerCase()))
      if (hasInvalidPermission) {
        log.warn(`Plugin ${pluginName} has invalid permissions: ${JSON.stringify(plugin.permissions)}`)
      }
    }
    
    return true
  }

  async loadPlugins() {
    try {
      log.info("Loading plugins...")
      await this.clearWatchers()
      await this.loadAllPlugins()
      
      if (this.autoReloadEnabled) {
        await this.setupFileWatchers()
      }

      this.isInitialized = true
      log.info(`Loaded ${this.plugins.size} plugins, ${this.commands.size} commands`)
      
      // Schedule maintenance
      setInterval(() => this.performMaintenance(), 1800000)
      
      return Array.from(this.plugins.values())
    } catch (error) {
      log.error("Error loading plugins:", error)
      throw error
    }
  }

  async loadAllPlugins() {
    try {
      await this.loadPluginsFromDirectory(this.pluginDir)
      await this.registerAntiPlugins()
    } catch (error) {
      log.error("Error loading all plugins:", error)
    }
  }

  async registerAntiPlugins() {
    for (const [pluginId, plugin] of this.plugins.entries()) {
      if (plugin && typeof plugin.processMessage === "function") {
        this.antiPlugins.set(pluginId, plugin)
      }
    }
  }

  async loadPluginsFromDirectory(dirPath, category = "main") {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true })

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name)

        if (item.isDirectory()) {
          const subCategory = category === "main" ? item.name : `${category}/${item.name}`
          await this.loadPluginsFromDirectory(itemPath, subCategory)
        } else if (item.name.endsWith(".js")) {
          await this.loadPlugin(dirPath, item.name, category)
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        log.error(`Error loading plugins from ${dirPath}:`, error)
      }
    }
  }

  async extractPushName(sock, m) {
    try {
      let pushName = m.pushName || m.message?.pushName || m.key?.notify
      
      if (!pushName && this.contactStore.has(m.sender)) {
        const cached = this.contactStore.get(m.sender)
        if (cached.pushName && (Date.now() - cached.timestamp) < 300000) {
          pushName = cached.pushName
        }
      }
      
      if (!pushName && sock.store?.contacts?.[m.sender]) {
        const contact = sock.store.contacts[m.sender]
        pushName = contact.notify || contact.name || contact.pushName
      }

      pushName = pushName || this.generateFallbackName(m.sender)

      this.contactStore.set(m.sender, {
        pushName: pushName,
        timestamp: Date.now()
      })

      return pushName
    } catch (error) {
      return this.generateFallbackName(m.sender)
    }
  }

  generateFallbackName(jid) {
    if (!jid) return "Unknown"
    const phoneNumber = jid.split('@')[0]
    return phoneNumber && phoneNumber.length > 4 ? `User ${phoneNumber.slice(-4)}` : "Unknown User"
  }

  performMaintenance() {
    const now = Date.now()
    const maxAge = 1800000 // 30 minutes

    for (const [jid, data] of this.contactStore.entries()) {
      if (now - data.timestamp > maxAge) {
        this.contactStore.delete(jid)
      }
    }
  }
    
  async loadPlugin(pluginPath, filename, category) {
    try {
      const fullPath = path.join(pluginPath, filename)
      const pluginName = path.basename(filename, ".js")
      const moduleUrl = `file://${fullPath}?t=${Date.now()}`

      const pluginModule = await import(moduleUrl)
      const plugin = pluginModule.default || pluginModule

      if (!this.validatePlugin(plugin, pluginName)) {
        log.warn(`Skipping invalid plugin: ${filename}`)
        return
      }

      const pluginId = `${category}:${pluginName}`
      
      // Normalize commands
      const normalizedCommands = []
      
      if (Array.isArray(plugin.commands)) {
        for (const c of plugin.commands) {
          if (typeof c === "string") normalizedCommands.push(c.toLowerCase())
        }
      }
      if (Array.isArray(plugin.aliases)) {
        for (const a of plugin.aliases) {
          if (typeof a === "string") normalizedCommands.push(a.toLowerCase())
        }
      }
      
      if (normalizedCommands.length === 0 && typeof plugin.name === "string") {
        normalizedCommands.push(plugin.name.toLowerCase())
      }

      if (typeof pluginName === "string" && !normalizedCommands.includes(pluginName.toLowerCase())) {
        normalizedCommands.push(pluginName.toLowerCase())
      }
      
      const uniqueCommands = [...new Set(normalizedCommands)]

      const pluginData = {
        ...plugin,
        id: pluginId,
        category,
        filename,
        fullPath,
        pluginPath,
        loadedAt: new Date().toISOString(),
        commands: uniqueCommands,
      }

      this.plugins.set(pluginId, pluginData)

      for (const command of uniqueCommands) {
        this.commands.set(command, pluginId)
      }

      if (typeof plugin.processMessage === "function") {
        this.antiPlugins.set(pluginId, pluginData)
      }

      log.debug(`Loaded plugin: ${pluginId} (${uniqueCommands.join(", ") || "none"})`)
    } catch (error) {
      log.error(`Error loading plugin ${filename}:`, error)
    }
  }

  async setupFileWatchers() {
    try {
      await this.setupDirectoryWatchersRecursively(this.pluginDir, "main")
    } catch (error) {
      log.error("Error setting up file watchers:", error)
    }
  }

  async setupDirectoryWatchersRecursively(dirPath, category) {
    try {
      await this.setupDirectoryWatcher(dirPath, category)

      const items = await fs.readdir(dirPath, { withFileTypes: true })
      for (const item of items) {
        if (item.isDirectory()) {
          const subDirPath = path.join(dirPath, item.name)
          const subCategory = category === "main" ? item.name : `${category}/${item.name}`
          await this.setupDirectoryWatchersRecursively(subDirPath, subCategory)
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        log.error(`Error setting up watchers for ${dirPath}:`, error)
      }
    }
  }

  async setupDirectoryWatcher(dirPath, category) {
    try {
      const watcher = fsr.watch(dirPath, { persistent: false }, (eventType, filename) => {
        if (filename && filename.endsWith(".js")) {
          this.handleFileChange(dirPath, filename, category, eventType)
        }
      })

      this.watchers.set(dirPath, watcher)
    } catch (error) {
      log.error(`Error setting up watcher for ${dirPath}:`, error)
    }
  }

  async handleFileChange(dirPath, filename, category, eventType) {
    try {
      const key = path.join(dirPath, filename)
      const existing = this.reloadTimeouts.get(key)
      if (existing) clearTimeout(existing)

      const timeout = setTimeout(async () => {
        try {
          await this.loadPlugin(dirPath, filename, category)
          log.info(`Reloaded plugin: ${filename}`)
        } catch (error) {
          log.error(`Failed to reload plugin ${filename}:`, error)
        } finally {
          this.reloadTimeouts.delete(key)
        }
      }, this.reloadDebounceMs)

      this.reloadTimeouts.set(key, timeout)
    } catch (error) {
      log.error("Error handling file change:", error)
    }
  }

  async clearWatchers() {
    for (const watcher of this.watchers.values()) {
      try { watcher.close?.() } catch (_) {}
    }
    this.watchers.clear()

    for (const timeout of this.reloadTimeouts.values()) {
      try { clearTimeout(timeout) } catch (_) {}
    }
    this.reloadTimeouts.clear()
  }

  findCommand(commandName) {
    if (!commandName || typeof commandName !== 'string') return null
    const pluginId = this.commands.get(commandName.toLowerCase())
    return pluginId ? this.plugins.get(pluginId) || null : null
  }

async executeCommand(sock, sessionId, commandName, args, m) {
  try {
    const plugin = this.findCommand(commandName)
    if (!plugin) {
      // Silently fail - no error messages for non-existent commands
      return { success: false, silent: true }
    }

    // Check grouponly restrictions BEFORE executing any command
      
    // Ensure pushName is available
    if (!m.pushName) {
      m.pushName = await this.extractPushName(sock, m)
    }
      
    // Check if sender is bot owner
    const isCreator = this.checkIsBotOwner(sock, m.sender)
    
    // Enhance message object
    const enhancedM = {
      ...m,
      chat: m.chat || m.key?.remoteJid || m.from,
      sender: m.sender || m.key?.participant || m.from,
      isCreator,
      isGroup: m.isGroup || (m.chat && m.chat.endsWith('@g.us')),
      isAdmin: m.isAdmin || false,
      isBotAdmin: m.isBotAdmin || false,
      groupMetadata: m.groupMetadata || null,
      participants: m.participants || null,
      sessionContext: m.sessionContext || { telegram_id: "Unknown", session_id: sessionId },
      sessionId,
      reply: m.reply
    }

    // Check permissions
    const permissionCheck = await this.checkPluginPermissions(sock, plugin, enhancedM)
    if (!permissionCheck.allowed) {
      return {
        success: false,
        error: permissionCheck.message
      }
    }

    // Execute plugin
    const result = await this.executePluginWithFallback(sock, sessionId, args, enhancedM, plugin)
    
    return {
      success: true,
      result: result
    }
  } catch (error) {
    log.error(`Error executing command ${commandName}:`, error)
    return {
      success: false,
      error: `Error executing command: ${error.message}`
    }
  }
}

  async executePluginWithFallback(sock, sessionId, args, m, plugin) {
    try {
      // Ensure admin status is properly set for group commands
      if (m.isGroup && (!m.hasOwnProperty('isAdmin') || !m.hasOwnProperty('isBotAdmin'))) {
        try {
          const AdminChecker = (await import("../whatsapp/utils/admin-checker.js")).default
          const adminChecker = new AdminChecker()
          
          if (!m.hasOwnProperty('isAdmin')) {
            m.isAdmin = await adminChecker.isGroupAdmin(sock, m.chat, m.sender)
          }
          if (!m.hasOwnProperty('isBotAdmin')) {
            m.isBotAdmin = await adminChecker.isBotAdmin(sock, m.chat)
          }
        } catch (adminError) {
          log.debug(`Failed to check admin status: ${adminError.message}`)
          m.isAdmin = m.isAdmin || false
          m.isBotAdmin = m.isBotAdmin || false
        }
      }

      if (plugin.execute.length === 4) {
        return await plugin.execute(sock, sessionId, args, m)
      }
      
      if (plugin.execute.length === 3) {
        const context = {
          args: args || [],
          quoted: m.quoted || null,
          isAdmin: m.isAdmin || false,
          isBotAdmin: m.isBotAdmin || false,
          isCreator: m.isCreator || false,
          store: null
        }
        return await plugin.execute(sock, m, context)
      }

      return await plugin.execute(sock, sessionId, args, m)
    } catch (error) {
      log.error(`Plugin execution failed for ${plugin.name}:`, error)
      throw error
    }
  }

  async checkPluginPermissions(sock, plugin, m) {
    try {
      if (!plugin) {
        return { allowed: false, message: "❌ Plugin not found." }
      }

      const requiredPermission = this.determineRequiredPermission(plugin, m.command?.name)
      
      const categoryCheck = this.checkCategoryRestrictions(plugin, m)
      if (!categoryCheck.allowed) {
        return categoryCheck
      }

      if (requiredPermission === "owner" && !m.isCreator) {
        return {
          allowed: false,
          message: "❌ This command is restricted to the bot owner only."
        }
      }

      if (requiredPermission === "admin" && !m.isAdmin && !m.isCreator) {
        return {
          allowed: false,
          message: "❌ This command requires admin privileges."
        }
      }

      if (requiredPermission === "group_admin" && m.isGroup && !m.isAdmin && !m.isCreator) {
        return {
          allowed: false,
          message: "❌ This command requires group admin privileges."
        }
      }

      return { allowed: true }
    } catch (error) {
      log.error("Error checking permissions:", error)
      return {
        allowed: false,
        message: "❌ Permission check failed."
      }
    }
  }

  checkIsBotOwner(sock, userJid) {
    try {
      if (!sock?.user?.id || !userJid) return false

      let botUserId = sock.user.id
      if (botUserId.includes(':')) {
        botUserId = botUserId.split(':')[0]
      }
      if (botUserId.includes('@')) {
        botUserId = botUserId.split('@')[0]
      }

      let userNumber = userJid
      if (userNumber.includes(':')) {
        userNumber = userNumber.split(':')[0]
      }
      if (userNumber.includes('@')) {
        userNumber = userNumber.split('@')[0]
      }

      return botUserId === userNumber
    } catch (error) {
      log.error("Error checking bot owner status:", error)
      return false
    }
  }
 
  determineRequiredPermission(plugin, command) {
    if (!plugin) return "user"

    // Check command-specific permissions
    if (plugin.commandPermissions?.[command]) {
      return plugin.commandPermissions[command].toLowerCase()
    }

    // Check permissions array - use most restrictive
    if (plugin.permissions && Array.isArray(plugin.permissions) && plugin.permissions.length > 0) {
      const perms = plugin.permissions.map(p => String(p).toLowerCase())
      
      if (perms.includes("owner")) return "owner"
      if (perms.includes("admin") || perms.includes("system_admin")) return "admin"
      if (perms.includes("group_admin")) return "group_admin"
      if (perms.includes("user")) return "user"
    }

    // Legacy flags
    if (plugin.ownerOnly === true) return "owner"
    if (plugin.adminOnly === true) return "group_admin"

    // Category-based permissions
    const category = plugin.category?.toLowerCase() || ""
    const filename = plugin.filename?.toLowerCase() || ""
    const pluginPath = plugin.fullPath?.toLowerCase() || ""
    
    if (category.includes("owner") || filename.includes("owner") || pluginPath.includes("owner") || pluginPath.includes("/ownermenu/")) {
      return "owner"
    }

    if (category.includes("group") || pluginPath.includes("group") || pluginPath.includes("/groupmenu/")) {
      return "group_admin"
    }

    return "user"
  }

  checkCategoryRestrictions(plugin, m) {
    const category = plugin.category?.toLowerCase() || ""
    
    if ((category === "group" || category === "groupmenu") && !m.isGroup) {
      return {
        allowed: false,
        message: "❌ This command can only be used in groups."
      }
    }

    if ((category === "private" || category === "privatemenu") && m.isGroup) {
      return {
        allowed: false,
        message: "❌ This command can only be used in private chat."
      }
    }

    return { allowed: true }
  }

  async processAntiPlugins(sock, sessionId, m) {
  for (const plugin of this.antiPlugins.values()) {
    try {
      let enabled = true
      if (typeof plugin.isEnabled === "function") {
        enabled = await plugin.isEnabled(m.chat)
      }
      if (!enabled) continue

      let shouldProcess = true
      if (typeof plugin.shouldProcess === "function") {
        shouldProcess = await plugin.shouldProcess(sock, m)  // Add sock parameter here
      }
      if (!shouldProcess) continue

      if (typeof plugin.processMessage === "function") {
        await plugin.processMessage(sock, sessionId, m)
      }
    } catch (pluginErr) {
      log.warn(`Anti-plugin error in ${plugin?.name || "unknown"}: ${pluginErr.message}`)
    }
  }
}

  async shutdown() {
    log.info("Shutting down plugin loader...")
    await this.clearWatchers()
    log.info("Plugin loader shutdown complete")
  }

  // Utility methods
  getAvailableCommands(category = null) {
    const commands = []
    const seenPlugins = new Set()

    for (const [command, pluginId] of this.commands.entries()) {
      const plugin = this.plugins.get(pluginId)
      if (seenPlugins.has(pluginId)) continue
      seenPlugins.add(pluginId)

      const pluginCategory = plugin.category.split("/")[0]
      if (!category || pluginCategory === category || plugin.category === "both") {
        commands.push({
          command: plugin.commands[0],
          plugin: plugin.name,
          description: plugin.description,
          category: plugin.category,
          adminOnly: plugin.adminOnly || false,
          permissions: plugin.permissions || [],
          usage: plugin.usage || `${plugin.commands[0]} - ${plugin.description}`,
          allCommands: plugin.commands,
        })
      }
    }
    return commands
  }

  getPluginStats() {
    const categories = {}
    for (const plugin of this.plugins.values()) {
      const rootCategory = plugin.category.split("/")[0]
      categories[rootCategory] = (categories[rootCategory] || 0) + 1
    }

    return {
      totalPlugins: this.plugins.size,
      totalCommands: this.commands.size,
      totalAntiPlugins: this.antiPlugins.size,
      categories,
      isInitialized: this.isInitialized,
      autoReloadEnabled: this.autoReloadEnabled,
      watchersActive: this.watchers.size,
    }
  }

  listPlugins() {
    return Array.from(this.plugins.values())
      .map(plugin => ({
        id: plugin.id,
        name: plugin.name,
        category: plugin.category,
        commands: plugin.commands || [],
        hasAntiFeatures: typeof plugin.processMessage === "function",
        adminOnly: plugin.adminOnly || false,
        permissions: plugin.permissions || [],
        description: plugin.description,
        loadedAt: plugin.loadedAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
}

// Create singleton instance
const pluginLoader = new PluginLoader()

// Graceful shutdown
const shutdown = async () => {
  await pluginLoader.shutdown()
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)

export default pluginLoader