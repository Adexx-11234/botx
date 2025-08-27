/**
 * MessagePersistence Class - Handles message storage to database
 */
export class MessagePersistence {
  constructor() {
    // No initialization needed for persistence
  }

  /**
   * Store message to database with corrected timestamp
   */
  async persistMessage(sessionId, sock, m) {
    try {
      const { MessageQueries } = await import("../../database/query.js")

      if (!m.key || !m.key.id) {
        return
      }
      const messageData = {
        id: m.key.id,
        fromJid: m.chat,
        senderJid: m.sender,
        timestamp: Number(m.messageTimestamp || Math.floor(Date.now() / 1000)),
        content: this.extractMessageContent(m),
        media: this.extractMediaData(m),
        mediaType: this.getMediaType(m),
        sessionId: String(sessionId),
        userId: String(sock.user?.id || ""),
        isViewOnce: Boolean(!!m.message?.viewOnceMessageV2),
        fromMe: Boolean(m.key.fromMe),
        pushName: m.pushName || "Unknown",
      }

      await MessageQueries.storeMessage(messageData)
    } catch (error) {
      // Persistence errors handled silently to avoid spam
    }
  }

  /**
   * Extract text content from various message types
   */
  extractMessageContent(m) {
    try {
      if (m.message?.conversation) {
        return m.message.conversation
      }

      if (m.message?.extendedTextMessage?.text) {
        return m.message.extendedTextMessage.text
      }

      if (m.message?.imageMessage?.caption) {
        return m.message.imageMessage.caption
      }

      if (m.message?.videoMessage?.caption) {
        return m.message.videoMessage.caption
      }

      if (m.message?.documentMessage?.caption) {
        return m.message.documentMessage.caption
      }

      if (m.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        return m.message.listResponseMessage.singleSelectReply.selectedRowId
      }

      if (m.message?.interactiveResponseMessage?.nativeFlowResponseMessage) {
        const flowResponse = m.message.interactiveResponseMessage.nativeFlowResponseMessage
        if (flowResponse?.paramsJson) {
          try {
            const params = JSON.parse(flowResponse.paramsJson)
            return `[Interactive Response: ${params.id || "Unknown"}]`
          } catch {
            return "[Interactive Response]"
          }
        }
        return "[Interactive Response]"
      }

      if (m.message?.stickerMessage) {
        return "[Sticker]"
      }

      if (m.message?.audioMessage) {
        return "[Audio]"
      }

      if (m.message?.imageMessage && !m.message.imageMessage.caption) {
        return "[Image]"
      }

      if (m.message?.videoMessage && !m.message.videoMessage.caption) {
        return "[Video]"
      }

      if (m.message?.documentMessage && !m.message.documentMessage.caption) {
        const fileName = m.message.documentMessage.fileName || "Unknown"
        const fileLength = m.message.documentMessage.fileLength
        const fileSize = fileLength ? ` (${this.formatFileSize(fileLength)})` : ""
        return `[Document: ${fileName}${fileSize}]`
      }

      if (m.message?.contactMessage) {
        const displayName = m.message.contactMessage.displayName || "Unknown"
        return `[Contact: ${displayName}]`
      }

      if (m.message?.locationMessage) {
        return "[Location]"
      }

      if (m.message?.liveLocationMessage) {
        return "[Live Location]"
      }

      if (m.message?.viewOnceMessage || m.message?.viewOnceMessageV2) {
        return "[View Once Message]"
      }

      return m.body || ""
    } catch (error) {
      return m.body || "[Error extracting content]"
    }
  }

  /**
   * Extract media data for storage
   */
  extractMediaData(m) {
    const media =
      m.message?.imageMessage ||
      m.message?.videoMessage ||
      m.message?.audioMessage ||
      m.message?.documentMessage ||
      m.message?.stickerMessage ||
      (m.message?.viewOnceMessageV2 ? { viewOnceMessageV2: m.message.viewOnceMessageV2 } : null)

    return media ? JSON.stringify(media) : null
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  /**
   * Get media type from message
   */
  getMediaType(m) {
    if (m.message?.imageMessage) return "image"
    if (m.message?.videoMessage) return "video"
    if (m.message?.audioMessage) return "audio"
    if (m.message?.documentMessage) return "document"
    if (m.message?.stickerMessage) return "sticker"
    return null
  }
}