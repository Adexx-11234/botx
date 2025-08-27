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
  if (!m) return m
  
  if (m.key) {
    m.id = m.key.id
    m.isBaileys = m.id.startsWith("BAE5") && m.id.length === 16
    m.chat = m.key.remoteJid
    m.fromMe = m.key.fromMe
    m.isGroup = m.chat.endsWith("@g.us")
    
    let rawSender = (m.fromMe && sock.user.id) || m.participant || m.key.participant || m.chat || ""
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
  
  if (m.message) {
    m.mtype = getContentType(m.message)
    m.msg =
      m.mtype == "viewOnceMessage"
        ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)]
        : m.message[m.mtype]
    
    // Fixed body extraction with safe property access
    m.body =
      m.message.conversation ||
      m.msg?.caption ||
      m.msg?.text ||
      (m.mtype == "listResponseMessage" && m.msg?.singleSelectReply?.selectedRowId) ||
      (m.mtype == "buttonsResponseMessage" && m.msg?.selectedButtonId) ||
      (m.mtype == "viewOnceMessage" && m.msg?.caption) ||
      (m.mtype == "documentMessage" && `[Document: ${m.msg?.fileName || 'Unknown'}]`) ||
      (m.mtype == "contactMessage" && `[Contact: ${m.msg?.displayName || 'Unknown'}]`) ||
      (m.mtype == "locationMessage" && "[Location]") ||
      (m.mtype == "liveLocationMessage" && "[Live Location]") ||
      m.text ||
      ""
    
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
      
      // Fixed quoted text extraction with safe property access
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
  }
  
  if (m.msg?.url) m.download = () => sock.downloadMediaMessage(m.msg)
  
  // Fixed text extraction with safe property access
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

  // FIXED m.reply function with proper validation and error handling
  m.reply = async (text, options = {}) => {
    try {
      // Ensure we have a valid chat ID as string
      let chatJid = m.chat || m.key?.remoteJid
      
      // Convert to string and validate
      if (chatJid && typeof chatJid !== 'string') {
        chatJid = String(chatJid)
      }
      
      // Validate chatJid is a proper WhatsApp JID
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
      logger.error(`[MessageSerializer] Chat details - m.chat: ${typeof m.chat} ${m.chat}, m.key.remoteJid: ${typeof m.key?.remoteJid} ${m.key?.remoteJid}`)
      throw error
    }
  }
  
  m.delete = () => sock.sendMessage(m.chat, { delete: m.key })
  
  return m
}