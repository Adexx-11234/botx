import fs from "fs"

export const replygcxeon = (sock, m, teks) => {
  return sock.sendMessage(
    m.chat,
    {
      text: teks,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 9999999,
        isForwarded: true,
        externalAdReply: {
          showAdAttribution: true,
          containsAutoReply: true,
          title: `paulbot`,
          body: `Paul`,
          previewType: "PHOTO",
          thumbnailUrl: ``,
          thumbnail: fs.readFileSync(`./XeonMedia/thumb.jpg`),
          sourceUrl: `https://github.com/paulbot`,
        },
      },
    },
    { quoted: m },
  )
}

export const replyWithExternalAd = (sock, m, text, options = {}) => {
  const {
    title = "paulbot",
    body = "Paul",
    thumbnail = "./XeonMedia/theme/cheemspic.jpg",
    sourceUrl = "https://github.com/paulbot",
  } = options

  return sock.sendMessage(
    m.chat,
    {
      text: text,
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          title: title,
          body: body,
          thumbnail: fs.readFileSync(thumbnail),
          sourceUrl: sourceUrl,
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
    },
    { quoted: m },
  )
}

export const replyWithPaymentRequest = (sock, m, text, options = {}) => {
  const { title = "paulbot", body = "Paul", thumbnail = "./XeonMedia/theme/cheemspic.jpg" } = options

  return sock.relayMessage(
    m.chat,
    {
      requestPaymentMessage: {
        currencyCodeIso4217: "USD",
        amount1000: "9999999900",
        requestFrom: m.sender,
        noteMessage: {
          extendedTextMessage: {
            text: text,
            contextInfo: {
              externalAdReply: {
                showAdAttribution: true,
                title: title,
                body: body,
                thumbnail: fs.readFileSync(thumbnail),
                mediaType: 1,
                renderLargerThumbnail: true,
              },
            },
          },
        },
      },
    },
    {},
  )
}

export const replyWithDocument = (sock, m, text, options = {}) => {
  const {
    title = "paulbot",
    body = "Paul",
    thumbnail = "./XeonMedia/theme/cheemspic.jpg",
    sourceUrl = "https://github.com/paulbot",
    fileName = "Paul",
    documentUrl = "https://i.ibb.co/VVTPyqS/Whats-App-Image-2024-10-17-at-03-21-02-31303469.jpg",
  } = options

  return sock.sendMessage(
    m.chat,
    {
      document: {
        url: documentUrl,
      },
      caption: text,
      mimetype: "application/zip",
      fileName: fileName,
      fileLength: "99999999999",
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          title: title,
          body: body,
          thumbnail: fs.readFileSync(thumbnail),
          sourceUrl: sourceUrl,
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
    },
    { quoted: m },
  )
}

export const replyWithLocation = (sock, m, text, options = {}) => {
  const { latitude = 37.7749, longitude = -122.4194, title = "paulbot Location" } = options

  return sock.sendMessage(
    m.chat,
    {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
      },
      caption: text,
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          title: title,
          body: "Paul",
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
    },
    { quoted: m },
  )
}

export const replyWithContact = (sock, m, text, options = {}) => {
  const {
    displayName = "Paul",
    vcard = `BEGIN:VCARD\nVERSION:3.0\nN:Paul;;;;\nFN:Paul\nitem1.TEL;waid=1234567890:+1 234 567 890\nitem1.X-ABLabel:Mobile\nEND:VCARD`,
  } = options

  return sock.sendMessage(
    m.chat,
    {
      contacts: {
        displayName: displayName,
        contacts: [
          {
            vcard: vcard,
          },
        ],
      },
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          title: "paulbot Contact",
          body: text,
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
    },
    { quoted: m },
  )
}
