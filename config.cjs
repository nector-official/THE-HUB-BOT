const fs = require("fs");

const config = {
  // 🧠 Session & Identity
  SESSION_ID: "nector~hl5inTQR#HWYGhAu6tdGxECRLJ7PC98FU1BHIlSYMu_atbuDi4AQ",
  PREFIX: ".",
  BOT_NAME: "THE-HUB-BOT",
  BOT: "hello 👋",
  NEW_CMD: "ᴀᴅᴅᴠᴀʀ\n│ sᴜᴅᴏ\n| nector",
  CAPTION: "ᴘᴏᴡᴇʀᴇᴅ by nector",

  // 🤖 GPT/AI API KEYS
  GPT_API_KEY: "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",
  GROQ_API_KEY: "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",
  WEATHER_API_KEY: "ec32bfa1c6b8ff81a636877b6ba302c8",
  GEMINI_KEY: "AIzaSyCUPaxfIdZawsKZKqCqJcC-GWiQPCXKTDc",

  // 🔧 Auto features (hardcoded defaults)
  AUTO_STATUS_SEEN: true,      // Auto view statuses ON
  AUTO_BIO: true,             // Auto bio OFF
  AUTO_STATUS_REACT: false,    // Auto react OFF
  AUTO_REPLY_STATUS: false,    // Auto reply OFF
  AUTO_STICKER: false,         // Auto sticker OFF
  AUTO_READ: false,            // Auto read OFF
  AUTO_TYPING: true,           // Auto typing ON
  AUTO_RECORDING: false,       // Auto recording OFF
  AUTO_REACT: false,           // Auto react OFF
  ALWAYS_ONLINE: true,         // Always online ON
  AUTO_BLOCK: true,            // Auto block ON by default

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
  AUTOLIKE_EMOJI: "💚",
  STATUS_READ_MSG: "Status Viewed by THE-HUB-BOT",
  WELCOME: false,
};

module.exports = config;
