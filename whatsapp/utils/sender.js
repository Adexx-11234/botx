import { logger } from "../../utils/logger.js"
import { WhatsAppHelpers } from "./helpers.js"

export class MessageSender {
  constructor() {
    this.rateLimits = new Map()
    this.messageQueue = new Map()
    this.processing = new Set()

    // Rate limit configuration
    this.limits = {
      perSecond: 80, // WhatsApp allows up to 80 messages per second
      perMinute: 1000,
      perHour: 10000,
      pairLimit: 6000, // 6 seconds between messages to same user
    }

    // Start queue processor
    this.startQueueProcessor()
  }

  async sendMessage(sock, jid, content, options = {}) {
    const rateLimitKey = WhatsAppHelpers.createRateLimitKey(jid)

    // Check rate limits
    if (await this.isRateLimited(rateLimitKey)) {
      logger.warn(`[Sender] Rate limited for ${jid}`)
      return this.queueMessage(sock, jid, content, options)
    }

    try {
      // Update rate limit counters
      this.updateRateLimit(rateLimitKey)

      // Send message
      const result = await sock.sendMessage(jid, content, {
        ...options,
        // Add message retry configuration
        messageId: options.messageId || this.generateMessageId(),
      })

      logger.info(`[Sender] Message sent to ${jid}: ${content.text || "media"}`)
      return result
    } catch (error) {
      logger.error(`[Sender] Failed to send message to ${jid}: ${error.message}`)

      // Handle specific WhatsApp errors
      if (error.output?.statusCode === 429) {
        logger.warn(`[Sender] Rate limit hit, queueing message for ${jid}`)
        return this.queueMessage(sock, jid, content, options)
      }

      throw error
    }
  }

  async sendText(sock, jid, text, options = {}) {
    return this.sendMessage(sock, jid, { text }, options)
  }

  async sendMedia(sock, jid, mediaType, media, caption = "", options = {}) {
    const content = {
      [mediaType]: media,
      caption: caption || undefined
    }
    
    return this.sendMessage(sock, jid, content, options)
  }

  async sendBulkMessages(sock, messages, options = {}) {
    const { batchSize = 10, delay = 1000 } = options
    const results = []

    logger.info(`[Sender] Starting bulk send of ${messages.length} messages`)

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)
      const batchPromises = batch.map(({ jid, content, options: msgOptions }) =>
        this.sendMessage(sock, jid, content, msgOptions).catch((error) => ({
          error: error.message,
          jid,
        })),
      )

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Add delay between batches
      if (i + batchSize < messages.length) {
        await this.sleep(delay)
      }
    }

    logger.info(`[Sender] Bulk send completed: ${results.length} messages processed`)
    return results
  }

  async isRateLimited(key) {
    const now = Date.now()
    const limits = this.rateLimits.get(key)

    if (!limits) {
      return false
    }

    // Check per-second limit
    const secondWindow = now - 1000
    const recentMessages = limits.timestamps.filter((t) => t > secondWindow)

    if (recentMessages.length >= this.limits.perSecond) {
      return true
    }

    // Check per-minute limit
    const minuteWindow = now - 60 * 1000
    const minuteMessages = limits.timestamps.filter((t) => t > minuteWindow)

    if (minuteMessages.length >= this.limits.perMinute) {
      return true
    }

    // Check per-hour limit
    const hourWindow = now - 60 * 60 * 1000
    const hourMessages = limits.timestamps.filter((t) => t > hourWindow)

    if (hourMessages.length >= this.limits.perHour) {
      return true
    }

    return false
  }

  updateRateLimit(key) {
    const now = Date.now()
    
    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, { timestamps: [] })
    }

    const limits = this.rateLimits.get(key)
    limits.timestamps.push(now)

    // Keep only recent timestamps (last hour)
    const hourAgo = now - 60 * 60 * 1000
    limits.timestamps = limits.timestamps.filter((t) => t > hourAgo)
  }

  async queueMessage(sock, jid, content, options) {
    const queueKey = jid
    
    if (!this.messageQueue.has(queueKey)) {
      this.messageQueue.set(queueKey, [])
    }

    const message = { sock, jid, content, options, timestamp: Date.now() }
    this.messageQueue.get(queueKey).push(message)

    logger.debug(`[Sender] Queued message for ${jid}, queue length: ${this.messageQueue.get(queueKey).length}`)
    
    return { queued: true, queueLength: this.messageQueue.get(queueKey).length }
  }

  startQueueProcessor() {
    setInterval(() => {
      this.processQueue()
    }, 1000) // Process queue every second
  }

  async processQueue() {
    if (this.processing.size > 0) return // Already processing

    for (const [jid, queue] of this.messageQueue.entries()) {
      if (queue.length === 0) continue

      this.processing.add(jid)

      try {
        const message = queue.shift()
        const rateLimitKey = WhatsAppHelpers.createRateLimitKey(jid)

        // Check if still rate limited
        if (await this.isRateLimited(rateLimitKey)) {
          // Put message back at the front of the queue
          queue.unshift(message)
          continue
        }

        // Send the message
        await this.sendMessage(message.sock, message.jid, message.content, message.options)
        
        // Add delay between messages to same user
        await this.sleep(100)
      } catch (error) {
        logger.error(`[Sender] Error processing queued message: ${error.message}`)
      } finally {
        this.processing.delete(jid)
      }
    }
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getQueueStats() {
    const stats = {
      totalQueued: 0,
      queueCounts: {},
      processing: Array.from(this.processing)
    }

    for (const [jid, queue] of this.messageQueue.entries()) {
      stats.totalQueued += queue.length
      stats.queueCounts[jid] = queue.length
    }

    return stats
  }

  clearQueue(jid = null) {
    if (jid) {
      this.messageQueue.delete(jid)
      logger.info(`[Sender] Cleared message queue for ${jid}`)
    } else {
      this.messageQueue.clear()
      logger.info(`[Sender] Cleared all message queues`)
    }
  }
}

export const messageSender = new MessageSender()
