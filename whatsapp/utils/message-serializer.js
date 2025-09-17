import { logger } from "../../utils/logger.js"

export function getContentType(message) {
  if (message) {
    const keys = Object.keys(message)
    const key = keys.find(
      (k) => (k === "conversation" || k.endsWith("Message")) && k !== "senderKeyDistributionMessage",
    )
    return key
  }
}

export function serializeMessage(sock, m, store) {
  // Add comprehensive validation at the start
  if (!m || typeof m !== 'object') {
    logger.warn("[MessageSerializer] Invalid message object passed to serializeMessage")
    return null
  }
  
  try {
    // Create a shallow copy to prevent external modifications during processing
    const originalM = m
    
    // Ensure m has the required structure before proceeding
    if (!m.key && !m.message) {
      logger.warn("[MessageSerializer] Message object missing key and message properties")
      return m
    }
    
    if (m.key) {
      m.id = m.key.id
      m.isBaileys = m.id ? (m.id.startsWith("BAE5") && m.id.length === 16) : false
      m.chat = m.key.remoteJid
      m.fromMe = m.key.fromMe
      m.isGroup = m.chat ? m.chat.endsWith("@g.us") : false
      
      let rawSender = (m.fromMe && sock.user?.id) || m.participant || m.key.participant || m.chat || ""
      if (sock.decodeJid) {
        rawSender = sock.decodeJid(rawSender)
      }
      m.sender = rawSender
      
      if (m.isGroup) {
        let rawParticipant = m.key.participant || ""
        if (sock.decodeJid) {
          rawParticipant = sock.decodeJid(rawParticipant)
        }
        m.participant = rawParticipant
      }
    }
    
    // Special handling for ViewOnce messages (both wrapped and flag-based)
    if (m.message && typeof m.message === 'object') {
      // Check for ViewOnce wrappers
      const hasViewOnceWrapper = m.message.viewOnceMessage || m.message.viewOnceMessageV2 || m.message.viewOnceMessageV2Extension
      
      // Check for viewOnce flag on media messages
      const hasViewOnceFlag = Object.keys(m.message).some(key => 
        m.message[key]?.viewOnce === true && 
        ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(key)
      )
      
      if (hasViewOnceWrapper || hasViewOnceFlag) {
        logger.debug("[MessageSerializer] Detected ViewOnce message (wrapper or flag), using safe processing")
        
        try {
          m.mtype = getContentType(m.message)
          
          if (hasViewOnceWrapper && (m.mtype === "viewOnceMessage" || m.mtype === "viewOnceMessageV2")) {
            // Handle wrapped ViewOnce messages
            const viewOnceWrapper = m.message[m.mtype]
            if (viewOnceWrapper && viewOnceWrapper.message) {
              const innerContentType = getContentType(viewOnceWrapper.message)
              m.msg = viewOnceWrapper.message[innerContentType]
            } else {
              m.msg = m.message[m.mtype]
            }
          } else if (hasViewOnceFlag) {
            // Handle ViewOnce flag on regular media
            m.msg = m.message[m.mtype]
          } else {
            m.msg = m.message[m.mtype]
          }
        } catch (viewOnceError) {
          logger.warn(`[MessageSerializer] ViewOnce processing failed, falling back: ${viewOnceError.message}`)
          m.mtype = "conversation"
          m.msg = null
        }
      } else {
        // Regular message processing
        m.mtype = getContentType(m.message)
        m.msg = m.mtype === "viewOnceMessage" && m.message[m.mtype]?.message
          ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)]
          : m.message[m.mtype]
      }
      
      // Validate that m is still intact after setting mtype and msg
      if (!m || typeof m !== 'object') {
        logger.error("[MessageSerializer] Message object corrupted after mtype/msg assignment")
        return originalM // Return the original if corruption occurred
      }
      
      // Safe body extraction
      m.body = ""
      try {
        m.body =
          m.message.conversation ||
          m.msg?.caption ||
          m.msg?.text ||
          (m.mtype === "listResponseMessage" && m.msg?.singleSelectReply?.selectedRowId) ||
          (m.mtype === "buttonsResponseMessage" && m.msg?.selectedButtonId) ||
          (m.mtype === "viewOnceMessage" && m.msg?.caption) ||
          (m.mtype === "viewOnceMessageV2" && m.msg?.caption) ||
          (m.mtype === "documentMessage" && `[Document: ${m.msg?.fileName || 'Unknown'}]`) ||
          (m.mtype === "contactMessage" && `[Contact: ${m.msg?.displayName || 'Unknown'}]`) ||
          (m.mtype === "locationMessage" && "[Location]") ||
          (m.mtype === "liveLocationMessage" && "[Live Location]") ||
          // Handle ViewOnce flag on media
          (m.msg?.viewOnce && m.msg?.caption) ||
          m.text ||
          ""
      } catch (bodyError) {
        logger.warn(`[MessageSerializer] Body extraction failed: ${bodyError.message}`)
        m.body = ""
      }
      
      // Safe quoted message handling
      try {
        const quoted = (m.quoted = m.msg?.contextInfo ? m.msg.contextInfo.quotedMessage : null)
        m.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : []
        
        if (m.quoted) {
          let type = getContentType(quoted)
          m.quoted = m.quoted[type]
          if (["productMessage"].includes(type)) {
            type = getContentType(m.quoted)
            m.quoted = m.quoted[type]
          }
          if (typeof m.quoted === "string") {
            m.quoted = { text: m.quoted }
          }
          m.quoted.mtype = type
          m.quoted.id = m.msg.contextInfo.stanzaId
          m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
          m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith("BAE5") && m.quoted.id.length === 16 : false
          m.quoted.sender = sock.decodeJid ? sock.decodeJid(m.msg.contextInfo.participant) : m.msg.contextInfo.participant
          m.quoted.fromMe = m.quoted.sender === (sock.decodeJid ? sock.decodeJid(sock.user.id) : sock.user.id)
          
          m.quoted.text =
            m.quoted.text ||
            m.quoted.caption ||
            m.quoted.conversation ||
            m.quoted.contentText ||
            m.quoted.selectedDisplayText ||
            m.quoted.title ||
            (m.quoted.documentMessage && `[Document: ${m.quoted.documentMessage?.fileName || 'Unknown'}]`) ||
            (m.quoted.contactMessage && `[Contact: ${m.quoted.contactMessage?.displayName || 'Unknown'}]`) ||
            (m.quoted.locationMessage && "[Location]") ||
            ""
          m.quoted.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : []
        }
      } catch (quotedError) {
        logger.warn(`[MessageSerializer] Quoted message processing failed: ${quotedError.message}`)
        m.quoted = null
        m.mentionedJid = []
      }
    } else {
      // Set defaults if no message property
      m.mtype = null
      m.msg = null
      m.body = ""
    }
    
    if (m.msg?.url) m.download = () => sock.downloadMediaMessage(m.msg)
    
    // Safe text extraction
    try {
      m.text = m.msg
        ? m.msg.text ||
          m.msg.caption ||
          m.message?.conversation ||
          m.msg.contentText ||
          m.msg.selectedDisplayText ||
          m.msg.title ||
          (m.msg.fileName && `[Document: ${m.msg.fileName}]`) ||
          ""
        : ""
    } catch (textError) {
      m.text = ""
    }

    // Safe reply function
    m.reply = async (text, options = {}) => {
      try {
        let chatJid = m.chat || m.key?.remoteJid
        
        if (chatJid && typeof chatJid !== 'string') {
          chatJid = String(chatJid)
        }
        
        if (!chatJid || typeof chatJid !== 'string' || !chatJid.includes('@')) {
          throw new Error(`Invalid chat JID: ${typeof chatJid} - ${chatJid}`)
        }

        const messageOptions = { 
          quoted: m,
          ...options 
        }
        
        if (Buffer.isBuffer(text)) {
          return await sock.sendMessage(chatJid, { 
            document: text, 
            fileName: "file", 
            ...options 
          }, { quoted: m })
        } else if (typeof text === 'string') {
          return await sock.sendMessage(chatJid, { text }, messageOptions)
        } else if (typeof text === 'object') {
          return await sock.sendMessage(chatJid, text, messageOptions)
        }
      } catch (error) {
        logger.error(`[MessageSerializer] Error in m.reply: ${error.message}`)
        throw error
      }
    }
    
    m.delete = () => sock.sendMessage(m.chat, { delete: m.key })
    
    return m
    
  } catch (error) {
    logger.error(`[MessageSerializer] Critical error during serialization: ${error.message}`)
    logger.error(`[MessageSerializer] Message structure: ${JSON.stringify({
      hasKey: !!m?.key,
      hasMessage: !!m?.message,
      messageKeys: m?.message ? Object.keys(m.message) : [],
      messageType: typeof m
    })}`)
    return null
  }
}