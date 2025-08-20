import { logger } from "../utils/logger.js"

class RateLimitMiddleware {
  constructor() {
    this.userLimits = new Map()
    this.globalLimits = new Map()

    // Rate limits per user per minute
    this.USER_LIMIT = 10
    this.GLOBAL_LIMIT = 100
    this.WINDOW_MS = 60000 // 1 minute
  }

  execute(sock, sessionId, context, plugin) {
    const userId = context.from
    const now = Date.now()

    // Check user rate limit
    if (!this.checkUserLimit(userId, now)) {
      logger.plugin.warn(`Rate limit exceeded for user: ${userId}`)
      return {
        allowed: false,
        reason: "⚠️ You're sending commands too quickly. Please wait a moment.",
      }
    }

    // Check global rate limit
    if (!this.checkGlobalLimit(sessionId, now)) {
      logger.plugin.warn(`Global rate limit exceeded for session: ${sessionId}`)
      return {
        allowed: false,
        reason: "⚠️ System is busy. Please try again in a moment.",
      }
    }

    return { allowed: true }
  }

  checkUserLimit(userId, now) {
    const userKey = `user:${userId}`
    const userLimit = this.userLimits.get(userKey) || { count: 0, resetTime: now + this.WINDOW_MS }

    if (now > userLimit.resetTime) {
      userLimit.count = 1
      userLimit.resetTime = now + this.WINDOW_MS
    } else {
      userLimit.count++
    }

    this.userLimits.set(userKey, userLimit)

    return userLimit.count <= this.USER_LIMIT
  }

  checkGlobalLimit(sessionId, now) {
    const globalKey = `session:${sessionId}`
    const globalLimit = this.globalLimits.get(globalKey) || { count: 0, resetTime: now + this.WINDOW_MS }

    if (now > globalLimit.resetTime) {
      globalLimit.count = 1
      globalLimit.resetTime = now + this.WINDOW_MS
    } else {
      globalLimit.count++
    }

    this.globalLimits.set(globalKey, globalLimit)

    return globalLimit.count <= this.GLOBAL_LIMIT
  }
}

export default new RateLimitMiddleware()
