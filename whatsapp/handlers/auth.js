import { logger } from "../../utils/logger.js"

export class AuthHandler {
  constructor(sessionManager) {
    this.sessionManager = sessionManager
  }

  async generatePairingCode(sessionId, phoneNumber) {
    try {
      logger.info(`[Auth] Generating pairing code for session ${sessionId}, phone: ${phoneNumber}`)

      // Validate phone number format
      const formattedPhone = this.formatPhoneNumber(phoneNumber)
      if (!formattedPhone) {
        throw new Error("Invalid phone number format")
      }

      // Generate pairing code using session manager
      const pairingCode = await this.sessionManager.generatePairingCode(sessionId, formattedPhone)

      if (!pairingCode) {
        throw new Error("Failed to generate pairing code")
      }

      logger.info(`[Auth] Pairing code generated for ${sessionId}: ${pairingCode}`)

      // Store pairing attempt in database
      await this.logPairingAttempt(sessionId, formattedPhone, pairingCode)

      return {
        success: true,
        pairingCode,
        phoneNumber: formattedPhone,
        expiresIn: 300, // 5 minutes
      }
    } catch (error) {
      logger.error(`[Auth] Error generating pairing code: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null

    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, "")

    // Check if it's a valid phone number
    if (cleaned.length < 10 || cleaned.length > 15) {
      return null
    }

    // Add country code if missing (assume +1 for US/Canada)
    if (cleaned.length === 10) {
      return `+1${cleaned}`
    }

    // If it already has country code, format it
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+${cleaned}`
    }

    // If it has international format, add +
    if (cleaned.length >= 10) {
      return `+${cleaned}`
    }

    return null
  }

  async logPairingAttempt(sessionId, phoneNumber, pairingCode) {
    try {
      // Log pairing attempt to database if needed
      logger.info(`[Auth] Logged pairing attempt for ${sessionId} with ${phoneNumber}`)
    } catch (error) {
      logger.error(`[Auth] Error logging pairing attempt: ${error.message}`)
    }
  }

  async validateSession(sessionId) {
    try {
      const session = await this.sessionManager.getSession(sessionId)
      return {
        valid: !!session,
        session,
        error: session ? null : "Session not found"
      }
    } catch (error) {
      logger.error(`[Auth] Error validating session: ${error.message}`)
      return {
        valid: false,
        session: null,
        error: error.message
      }
    }
  }

  async revokeSession(sessionId) {
    try {
      await this.sessionManager.clearSession(sessionId)
      logger.info(`[Auth] Session ${sessionId} revoked successfully`)
      return { success: true }
    } catch (error) {
      logger.error(`[Auth] Error revoking session: ${error.message}`)
      return { success: false, error: error.message }
    }
  }
}
