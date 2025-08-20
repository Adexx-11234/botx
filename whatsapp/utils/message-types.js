// ==========================================
// MESSAGE TYPE DETECTION AND CATEGORIZATION
// ==========================================

export const KNOWN_MESSAGE_TYPES = [
    "conversation",
    "extendedTextMessage",
    "imageMessage",
    "videoMessage",
    "audioMessage",
    "documentMessage",
    "stickerMessage",
    "albumMessage",
    "buttonsMessage",
    "buttonsResponseMessage",
    "listMessage",
    "listResponseMessage",
    "interactiveMessage",
    "InteractiveResponseMessage", // Case variation
    "interactiveResponseMessage", // Case variation
    "templateMessage",
    "templateButtonReplyMessage",
    "quickReplyButtonMessage",
    "productMessage",
    "orderMessage",
    "invoiceMessage",
    "sendPaymentMessage",
    "requestPaymentMessage",
    "call",
    "pollCreationMessage",
    "pollVoteMessage",
    "protocolMessage",
    "keepAliveMessage",
    "newsletterAdminInviteMessage",
    "contactsArrayMessage",
    "locationMessage",
    "liveLocationMessage",
    "reactionMessage",
    "ephemeralMessage",
    "revokedMessage",
  ]
  
  /**
   * Checks if a message contains "hello" text and should be blocked.
   * @param {string} body - The message body text.
   * @param {Object} m - The message object from Baileys.
   * @returns {boolean} True if message should be blocked, false otherwise.
   */
  export function shouldBlockMessage(body, m) {
    if (!body && !m) return false;
    
    // Check main body text
    if (body && typeof body === 'string') {
      if (body.toLowerCase().includes('hello')) {
        return true;
      }
    }
    
    // Check message object for any text content that might contain "hello"
    if (m && m.message) {
      // Check conversation messages
      if (m.message.conversation && typeof m.message.conversation === 'string') {
        if (m.message.conversation.toLowerCase().includes('hello')) {
          return true;
        }
      }
      
      // Check extended text messages
      if (m.message.extendedTextMessage && m.message.extendedTextMessage.text) {
        if (m.message.extendedTextMessage.text.toLowerCase().includes('hello')) {
          return true;
        }
      }
      
      // Check image captions
      if (m.message.imageMessage && m.message.imageMessage.caption) {
        if (m.message.imageMessage.caption.toLowerCase().includes('hello')) {
          return true;
        }
      }
      
      // Check video captions
      if (m.message.videoMessage && m.message.videoMessage.caption) {
        if (m.message.videoMessage.caption.toLowerCase().includes('hello')) {
          return true;
        }
      }
      
      // Check document captions
      if (m.message.documentMessage && m.message.documentMessage.caption) {
        if (m.message.documentMessage.caption.toLowerCase().includes('hello')) {
          return true;
        }
      }
      
      // Check button messages
      if (m.message.buttonsMessage) {
        const buttonMsg = m.message.buttonsMessage;
        if (buttonMsg.contentText && buttonMsg.contentText.toLowerCase().includes('hello')) {
          return true;
        }
        if (buttonMsg.footerText && buttonMsg.footerText.toLowerCase().includes('hello')) {
          return true;
        }
        if (buttonMsg.buttons) {
          for (const button of buttonMsg.buttons) {
            if (button.buttonText && button.buttonText.displayText && 
                button.buttonText.displayText.toLowerCase().includes('hello')) {
              return true;
            }
          }
        }
      }
      
      // Check list messages
      if (m.message.listMessage) {
        const listMsg = m.message.listMessage;
        if (listMsg.description && listMsg.description.toLowerCase().includes('hello')) {
          return true;
        }
        if (listMsg.title && listMsg.title.toLowerCase().includes('hello')) {
          return true;
        }
        if (listMsg.sections) {
          for (const section of listMsg.sections) {
            if (section.title && section.title.toLowerCase().includes('hello')) {
              return true;
            }
            if (section.rows) {
              for (const row of section.rows) {
                if (row.title && row.title.toLowerCase().includes('hello')) {
                  return true;
                }
                if (row.description && row.description.toLowerCase().includes('hello')) {
                  return true;
                }
              }
            }
          }
        }
      }
      
      // Check template messages
      if (m.message.templateMessage) {
        const templateMsg = m.message.templateMessage;
        if (templateMsg.hydratedTemplate) {
          const template = templateMsg.hydratedTemplate;
          if (template.hydratedContentText && template.hydratedContentText.toLowerCase().includes('hello')) {
            return true;
          }
          if (template.hydratedFooterText && template.hydratedFooterText.toLowerCase().includes('hello')) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * Extracts and categorizes message information for logging.
   * @param {Object} m - The message object from Baileys.
   * @param {string} body - The extracted text body of the message.
   * @param {string} command - The detected command (if any).
   * @param {string} mime - The MIME type of media (if any).
   * @returns {Object} An object containing categorized message info.
   */
  export function getMessageInfo(m, body, command, mime) {
    // BLOCKING CHECK - Block messages containing "hello"
    const isBlocked = shouldBlockMessage(body, m);
    
    if (isBlocked) {
      return {
        actualMsgType: "blocked",
        messageCategory: "BLOCKED MESSAGE",
        messageIcon: "🚫",
        categoryColor: "bgRed",
        displayContent: "[BLOCKED: Contains 'hello']",
        isMedia: false,
        isViewOnce: false,
        isEphemeral: false,
        isButton: false,
        isTemplateMsg: false,
        isListMessage: false,
        isBlocked: true,
        blockReason: "Contains prohibited text: 'hello'"
      };
    }
  
    const actualMsgType = m.mtype || (m.message && Object.keys(m.message)[0]) || "unknown"
  
    let messageCategory = ""
    let messageIcon = ""
    let categoryColor = "" // Tailwind-like color name for chalk
    let isMedia = false
    let isViewOnce = false
    let isEphemeral = false
    let isButton = false
    let isTemplateMsg = false
    let isListMessage = false
  
    // Command messages
    if (command) {
      messageCategory = "COMMAND"
      messageIcon = "⚡"
      categoryColor = "bgYellow"
    }
    // Text messages
    else if (actualMsgType === "conversation") {
      messageCategory = "TEXT MESSAGE"
      messageIcon = "💬"
      categoryColor = "bgWhite"
    } else if (actualMsgType === "extendedTextMessage") {
      messageCategory = "EXTENDED TEXT"
      messageIcon = "📝"
      categoryColor = "bgWhite"
    }
    // Media messages
    else if (actualMsgType === "imageMessage") {
      messageCategory = "IMAGE"
      messageIcon = "🖼️"
      categoryColor = "bgMagenta"
      isMedia = true
    } else if (actualMsgType === "videoMessage") {
      const isGif = m.message?.videoMessage?.gifPlayback || false
      messageCategory = isGif ? "GIF" : "VIDEO"
      messageIcon = isGif ? "🎞️" : "🎥"
      categoryColor = "bgRed"
      isMedia = true
    } else if (actualMsgType === "audioMessage") {
      const isPtt = m.message?.audioMessage?.ptt || false
      messageCategory = isPtt ? "VOICE NOTE" : "AUDIO"
      messageIcon = isPtt ? "🎤" : "🎵"
      categoryColor = "bgGreen"
      isMedia = true
    } else if (actualMsgType === "documentMessage") {
      messageCategory = "DOCUMENT"
      messageIcon = "📄"
      categoryColor = "bgBlue"
      isMedia = true
    } else if (actualMsgType === "stickerMessage") {
      messageCategory = "STICKER"
      messageIcon = "🎭"
      categoryColor = "bgWhite"
      isMedia = true
    }
    // Album/Media Collection messages
    else if (actualMsgType === "albumMessage") {
      messageCategory = "ALBUM"
      messageIcon = "🖼️📸"
      categoryColor = "bgMagenta"
      isMedia = true
    }
    // Interactive messages and responses
    else if (actualMsgType === "buttonsMessage") {
      messageCategory = "BUTTONS"
      messageIcon = "🔘"
      categoryColor = "bgCyan"
      isButton = true
    } else if (actualMsgType === "buttonsResponseMessage") {
      messageCategory = "BUTTON RESPONSE"
      messageIcon = "✅"
      categoryColor = "bgCyan"
      isButton = true
    } else if (actualMsgType === "listMessage") {
      messageCategory = "LIST"
      messageIcon = "📋"
      categoryColor = "bgCyan"
      isListMessage = true
    } else if (actualMsgType === "listResponseMessage") {
      messageCategory = "LIST RESPONSE"
      messageIcon = "✅"
      categoryColor = "bgCyan"
    } else if (actualMsgType === "interactiveResponseMessage" || actualMsgType === "InteractiveResponseMessage") {
      messageCategory = "INTERACTIVE RESPONSE"
      messageIcon = "✅"
      categoryColor = "bgCyan"
    } else if (actualMsgType === "interactiveMessage") {
      messageCategory = "INTERACTIVE"
      messageIcon = "🔘"
      categoryColor = "bgCyan"
    } else if (actualMsgType === "templateMessage") {
      messageCategory = "TEMPLATE"
      messageIcon = "📄"
      categoryColor = "bgCyan"
      isTemplateMsg = true
    } else if (actualMsgType === "templateButtonReplyMessage") {
      messageCategory = "TEMPLATE RESPONSE"
      messageIcon = "✅"
      categoryColor = "bgCyan"
      isTemplateMsg = true
    } else if (actualMsgType === "quickReplyButtonMessage") {
      messageCategory = "QUICK REPLY"
      messageIcon = "⚡"
      categoryColor = "bgCyan"
      isButton = true
    }
    // Business messages
    else if (actualMsgType === "productMessage") {
      messageCategory = "PRODUCT"
      messageIcon = "🛍️"
      categoryColor = "bgGreen"
    } else if (actualMsgType === "orderMessage") {
      messageCategory = "ORDER"
      messageIcon = "📦"
      categoryColor = "bgBlue"
    } else if (actualMsgType === "invoiceMessage") {
      messageCategory = "INVOICE"
      messageIcon = "🧾"
      categoryColor = "bgYellow"
    } else if (actualMsgType === "sendPaymentMessage" || actualMsgType === "requestPaymentMessage") {
      messageCategory = "PAYMENT"
      messageIcon = "💳"
      categoryColor = "bgGreen"
    }
    // Communication messages
    else if (actualMsgType === "call") {
      const isVideoCall = m.message?.call?.callType === "video" || false
      messageCategory = isVideoCall ? "VIDEO CALL" : "VOICE CALL"
      messageIcon = isVideoCall ? "📹" : "📞"
      categoryColor = "bgRed"
    } else if (actualMsgType === "pollCreationMessage") {
      messageCategory = "POLL"
      messageIcon = "📊"
      categoryColor = "bgCyan"
    } else if (actualMsgType === "pollVoteMessage") {
      messageCategory = "POLL VOTE"
      messageIcon = "📊"
      categoryColor = "bgCyan"
    }
    // Location messages
    else if (actualMsgType === "locationMessage") {
      messageCategory = "LOCATION"
      messageIcon = "📍"
      categoryColor = "bgBlue"
    } else if (actualMsgType === "liveLocationMessage") {
      messageCategory = "LIVE LOCATION"
      messageIcon = "📍"
      categoryColor = "bgRed"
    }
    // Contact messages
    else if (actualMsgType === "contactMessage") {
      messageCategory = "CONTACT"
      messageIcon = "👤"
      categoryColor = "bgBlue"
    } else if (actualMsgType === "contactsArrayMessage") {
      messageCategory = "CONTACTS"
      messageIcon = "👥"
      categoryColor = "bgMagenta"
    }
    // Special message types
    else if (actualMsgType === "viewOnceMessage" || actualMsgType === "viewOnceMessageV2") {
      messageCategory = "VIEW ONCE"
      messageIcon = "👁️"
      categoryColor = "bgMagenta"
      isViewOnce = true
    } else if (actualMsgType === "ephemeralMessage") {
      messageCategory = "EPHEMERAL"
      messageIcon = "⏱️"
      categoryColor = "bgYellow"
      isEphemeral = true
      // Recursively get info for the actual message inside ephemeralMessage
      const innerInfo = getMessageInfo(m.ephemeralMessage.message)
      messageCategory = innerInfo.messageCategory
      isMedia = innerInfo.isMedia
      isViewOnce = innerInfo.isViewOnce
      isButton = innerInfo.isButton
      isTemplateMsg = innerInfo.isTemplateMsg
      isListMessage = innerInfo.isListMessage
    }
    // Protocol and system messages
    else if (actualMsgType === "protocolMessage") {
      messageCategory = "PROTOCOL"
      messageIcon = "🔧"
      categoryColor = "bgGray"
    } else if (actualMsgType === "keepAliveMessage") {
      messageCategory = "KEEP ALIVE"
      messageIcon = "💓"
      categoryColor = "bgGray"
    }
    // Newsletter messages
    else if (actualMsgType === "newsletterAdminInviteMessage") {
      messageCategory = "NEWSLETTER INVITE"
      messageIcon = "📢"
      categoryColor = "bgBlue"
    }
    // Fallback for truly unknown message types
    else {
      messageCategory = actualMsgType.toUpperCase().replace(/MESSAGE$/, "")
      messageIcon = "❓"
      categoryColor = "bgGray"
    }
  
    const displayContent = body || actualMsgType || "No content"
    const truncatedContent = displayContent.length > 100 ? displayContent.substring(0, 97) + "..." : displayContent
  
    return {
      actualMsgType,
      messageCategory,
      messageIcon,
      categoryColor,
      displayContent: truncatedContent,
      isMedia,
      isViewOnce,
      isEphemeral,
      isButton,
      isTemplateMsg,
      isListMessage,
      isBlocked: false,
      blockReason: null
    }
  }

export {
  getMessageInfo,
  shouldBlockMessage,
  KNOWN_MESSAGE_TYPES,
}