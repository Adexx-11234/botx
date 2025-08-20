import { logger } from "../../utils/logger.js"

export async function handlePairing(sock, sessionId, phoneNumber, pairingState, callbacks) {
  try {
    if (!phoneNumber) return

    const existingPair = pairingState.get(sessionId)
    const now = Date.now()
    if (existingPair && now < existingPair.expiresAt && existingPair.active) {
      if (callbacks?.onPairingCode) await callbacks.onPairingCode(existingPair.code)
      return
    }

    const formattedPhone = phoneNumber.replace(/^\+/, "").replace(/\s+/g, "")
    const code = await sock.requestPairingCode(formattedPhone)
    const formattedCode = code.match(/.{1,4}/g)?.join("-") || code

    pairingState.set(sessionId, {
      code: formattedCode,
      expiresAt: Date.now() + 5 * 60 * 1000,
      active: true,
    })

    logger.info(`[SessionManager] Pairing code for ${sessionId}: ${formattedCode}`)
    if (callbacks?.onPairingCode) await callbacks.onPairingCode(formattedCode)
  } catch (error) {
    logger.error(`[SessionManager] Pairing code error: ${error.message}`)
  }
}

export function markPairingRestartHandled(pairingState, sessionId) {
  const pair = pairingState.get(sessionId)
  if (pair) pairingState.set(sessionId, { ...pair, active: false })
}

export function clearPairing(pairingState, sessionId) {
  pairingState.delete(sessionId)
}


