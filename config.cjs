const fs = require("fs");

const config = {
  // 🧠 Session & Identity
  SESSION_ID: "nector~45oEkRQb#RdmwwTg01TT7i-quTNV-wNr4BolVga3j7gWqMXsgrUM",
  PREFIX: ".", // your command prefix
  BOT_NAME: "THE-HUB-BOT",
  BOT: "hello 👋",
  NEW_CMD: "ᴀᴅᴅᴠᴀʀ\n│ sᴜᴅᴏ\n| nector",
  CAPTION: "ᴘᴏᴡᴇʀᴇᴅ by nector",

  // 🔧 Auto features
  AUTO_STATUS_SEEN: true,
  AUTO_BIO: false,
  AUTO_STATUS_REACT: true,
  AUTO_REPLY_STATUS: false,
  AUTO_STICKER: false,
  AUTO_READ: false,
  AUTO_TYPING: true,
  AUTO_RECORDING: false,
  AUTO_REACT: false,
  ALWAYS_ONLINE: true,
  AUTO_BLOCK: true,

  // 📦 Extra Features
  ANTI_LEFT: false,
  ANTILINK: false,
  ANTI_DELETE: false,
  CHAT_BOT: false,
  CHAT_BOT_MODE: "public",
  LYDEA: false,
  REJECT_CALL: false,
  NOT_ALLOW: true,
  BLOCK_UNKNOWN: false,

  // 🛠 Other
  MODE: "public",
  DELETED_MESSAGES_CHAT_ID: "254725474072@s.whatsapp.net",

  // 👑 Owner & Permissions
  OWNER_NAME: "❤️ⓃⒺCⓉOR🍯",
  OWNER_NUMBER: "254725474072",
  SUDO_NUMBER: "254725474072",

  // 💚 Auto react emoji
  AUTOLIKE_EMOJI: "☢️",
  STATUS_READ_MSG: "Status Viewed by THE-HUB-BOT",
  WELCOME: false,

  // 🌍 Calendar Feed (Newly Added Section)
  OWNER_JID: "254725474072@s.whatsapp.net", // full WhatsApp JID
  WEATHER_CITY: "Nairobi",
  WEATHER_API: "https://wttr.in/Nairobi?format=%C+%t", // Simple text weather
  HOLIDAY_API: "https://date.nager.at/api/v3/PublicHolidays",
  NEWS_API: "https://newsdata.io/api/1/news?apikey=pub_6d7e3fbe8c10459f9414293eb78c7bb1&country=ke,us&language=en",
  FACT_API: "https://uselessfacts.jsph.pl/random.json?language=en",
};

module.exports = config;
