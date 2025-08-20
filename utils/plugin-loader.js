// Plugin System & Core Commands

import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { createComponentLogger } from "./logger.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class PluginLoader {
  constructor() {
    this.plugins = new Map()
    this.commands = new Map()
    this.antiPlugins = new Map()  // Separate map for anti-plugins
    this.middleware = []
    this.isInitialized = false
    this.pluginDir = path.join(__dirname, "..", "plugins")
    this.log = createComponentLogger("PLUGIN")
    this.log.info("Plugin loader initialized")
  }

  async loadPlugins() {
    try {
      this.log.info("Starting plugin discovery and loading...")

      // Load plugins from main directory
      await this.loadMainPlugins()

      // Load plugins from category directories (group, private, both)
      await this.loadPluginCategory("group")
      await this.loadPluginCategory("private")
      await this.loadPluginCategory("both")

      // Register anti-plugins automatically
      await this.registerAntiPlugins()

      this.isInitialized = true
      this.log.info(`Plugin loading complete. Loaded ${this.plugins.size} plugins, ${this.commands.size} commands, ${this.antiPlugins.size} anti-plugins`)

      return Array.from(this.plugins.values())
    } catch (error) {
      this.log.error("Error loading plugins:", error)
      throw error
    }
  }

  async loadMainPlugins() {
    try {
      const files = await fs.readdir(this.pluginDir)

      for (const file of files) {
        if (file.endsWith(".js")) {
          await this.loadPlugin(this.pluginDir, file, "main")
        }
      }
    } catch (error) {
      this.log.error(`Error loading main plugins:`, error)
    }
  }

  async loadPluginCategory(category) {
    const categoryPath = path.join(this.pluginDir, category)

    try {
      const files = await fs.readdir(categoryPath)

      for (const file of files) {
        if (file.endsWith(".js")) {
          await this.loadPlugin(categoryPath, file, category)
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        this.log.error(`Error loading ${category} plugins:`, error)
      }
    }
  }

  async loadPlugin(pluginPath, filename, category) {
    try {
      const fullPath = path.join(pluginPath, filename)
      const pluginName = path.basename(filename, ".js")

      // Clear module cache for hot reloading in development
      const moduleUrl = `file://${fullPath}?t=${Date.now()}`
      
      // Dynamic import for ES modules
      const pluginModule = await import(moduleUrl)
      const plugin = pluginModule.default || pluginModule

      // Validate plugin structure
      if (!this.validatePlugin(plugin, pluginName)) {
        return
      }

      // Register plugin
      const pluginId = `${category}:${pluginName}`
      const pluginData = {
        ...plugin,
        id: pluginId,
        category,
        filename,
        loadedAt: new Date().toISOString()
      }

      this.plugins.set(pluginId, pluginData)

      // Register commands
      if (plugin.commands && Array.isArray(plugin.commands)) {
        for (const command of plugin.commands) {
          this.commands.set(command, pluginId)
        }
      }

      // Check if this is an anti-plugin (has processMessage method)
      if (typeof plugin.processMessage === 'function') {
        this.antiPlugins.set(pluginId, pluginData)
        this.log.info(`Registered anti-plugin: ${pluginId}`)
      }

      this.log.info(`Loaded plugin: ${pluginId} (commands: ${plugin.commands?.join(", ") || "none"})`)
    } catch (error) {
      this.log.error(`Error loading plugin ${filename}:`, error)
    }
  }

  validatePlugin(plugin, name) {
    // Basic validation
    if (!plugin.name || typeof plugin.execute !== 'function') {
      this.log.warn(`Invalid plugin structure: ${name} (missing name or execute function)`)
      return false
    }

    // Commands validation (not required for anti-plugins)
    if (!plugin.commands && typeof plugin.processMessage !== 'function') {
      this.log.warn(`Plugin ${name} has no commands array and no processMessage method`)
      return false
    }

    // If it has commands, they should be an array
    if (plugin.commands && !Array.isArray(plugin.commands)) {
      this.log.warn(`Plugin ${name} commands must be an array`)
      return false
    }

    return true
  }

  /**
   * Register anti-plugins that will be called by message processor
   */
  async registerAntiPlugins() {
    let registeredCount = 0
    
    for (const [pluginId, plugin] of this.plugins) {
      if (typeof plugin.processMessage === 'function') {
        this.antiPlugins.set(pluginId, plugin)
        registeredCount++
      }
    }

    this.log.info(`Auto-registered ${registeredCount} anti-plugins`)
  }

  async executeCommand(sock, sessionId, command, args, context) {
    if (!this.isInitialized) {
      throw new Error("Plugin system not initialized")
    }

    const pluginId = this.commands.get(command)
    if (!pluginId) {
      // Silently ignore unknown commands
      return { success: false, ignore: true }
    }

    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return { success: false, error: "Plugin not found" }
    }

    try {
      // Check if plugin is category-restricted
      if (plugin.category === "group" && !context.isGroup) {
        return { success: false, error: "This command can only be used in groups" }
      }
      
      if (plugin.category === "private" && context.isGroup) {
        return { success: false, error: "This command can only be used in private chat" }
      }

      // Admin check is handled by individual plugins
      
      // Execute plugin
      this.log.debug(`Executing command: ${command} via plugin: ${pluginId}`)
      const result = await plugin.execute(sock, sessionId, args, context)

      return { success: true, result }
    } catch (err) {
      this.log.error(`Error executing command ${command}:`, err)
      return { success: false, error: err?.message || String(err) }
    }
  }

  /**
   * Get all anti-plugins for message processor
   */
  getAllAntiPlugins() {
    return this.antiPlugins
  }

  /**
   * Get all plugins (for backward compatibility)
   */
  getAllPlugins() {
    return this.plugins
  }

  getAvailableCommands(category = null) {
    const commands = []

    for (const [command, pluginId] of this.commands.entries()) {
      const plugin = this.plugins.get(pluginId)
      if (!category || plugin.category === category || plugin.category === "both") {
        commands.push({
          command,
          plugin: plugin.name,
          description: plugin.description,
          category: plugin.category,
          adminOnly: plugin.adminOnly || false,
          usage: plugin.usage || `${command} - ${plugin.description}`,
        })
      }
    }

    return commands
  }

  getPluginByCommand(command) {
    const pluginId = this.commands.get(command)
    if (!pluginId) return null
    return this.plugins.get(pluginId)
  }

  getPluginById(pluginId) {
    return this.plugins.get(pluginId)
  }

  /**
   * Check if an anti-plugin is enabled for a specific group/chat
   */
  async isAntiPluginEnabled(pluginId, chatId) {
    const plugin = this.antiPlugins.get(pluginId)
    if (!plugin) return false

    // If plugin has isEnabled method, use it
    if (typeof plugin.isEnabled === 'function') {
      try {
        return await plugin.isEnabled(chatId)
      } catch (error) {
        this.log.error(`Error checking if anti-plugin ${pluginId} is enabled:`, error)
        return false
      }
    }

    // Default: enabled for groups, disabled for private chats
    return chatId.endsWith("@g.us")
  }

  /**
   * Process message through all enabled anti-plugins
   */
  async processAntiPlugins(sock, sessionId, context, message) {
    if (this.antiPlugins.size === 0) return

    for (const [pluginId, plugin] of this.antiPlugins) {
      try {
        // Check if plugin is enabled for this chat
        const isEnabled = await this.isAntiPluginEnabled(pluginId, context.from)
        if (!isEnabled) {
          this.log.debug(`Anti-plugin ${pluginId} disabled for ${context.from}`)
          continue
        }

        // Check if plugin should process this message type
        if (typeof plugin.shouldProcess === 'function') {
          const shouldProcess = await plugin.shouldProcess(context, message)
          if (!shouldProcess) {
            this.log.debug(`Anti-plugin ${pluginId} skipping message processing`)
            continue
          }
        }

        // Process the message
        this.log.debug(`Processing message through anti-plugin: ${pluginId}`)
        await plugin.processMessage(sock, sessionId, context, message)
        
      } catch (error) {
        this.log.error(`Error in anti-plugin ${pluginId}:`, error)
      }
    }
  }

  /**
   * Reload a specific plugin (useful for development)
   */
  async reloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    const { category, filename } = plugin
    const pluginPath = category === "main" 
      ? this.pluginDir 
      : path.join(this.pluginDir, category)

    // Remove old plugin data
    this.plugins.delete(pluginId)
    this.antiPlugins.delete(pluginId)
    
    // Remove old commands
    for (const [command, cmdPluginId] of this.commands.entries()) {
      if (cmdPluginId === pluginId) {
        this.commands.delete(command)
      }
    }

    // Reload plugin
    await this.loadPlugin(pluginPath, filename, category)
    
    this.log.info(`Reloaded plugin: ${pluginId}`)
  }

  /**
   * Get plugin statistics
   */
  getPluginStats() {
    const categories = {}
    for (const plugin of this.plugins.values()) {
      categories[plugin.category] = (categories[plugin.category] || 0) + 1
    }

    return {
      totalPlugins: this.plugins.size,
      totalCommands: this.commands.size,
      totalAntiPlugins: this.antiPlugins.size,
      categories,
      isInitialized: this.isInitialized,
    }
  }

  /**
   * List all loaded plugins with their info
   */
  listPlugins() {
    const pluginList = []
    
    for (const [pluginId, plugin] of this.plugins) {
      pluginList.push({
        id: pluginId,
        name: plugin.name,
        category: plugin.category,
        commands: plugin.commands || [],
        hasAntiFeatures: typeof plugin.processMessage === 'function',
        adminOnly: plugin.adminOnly || false,
        description: plugin.description,
        loadedAt: plugin.loadedAt
      })
    }

    return pluginList.sort((a, b) => a.name.localeCompare(b.name))
  }
}

export default new PluginLoader()