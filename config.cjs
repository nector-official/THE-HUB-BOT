const fs = require("fs");

const config = {
  // 🧠 Session & Identity
  SESSION_ID: "nector~eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiMEFHK3JXSk1xOGNmN0lxck1FR2xxa1M2L2twWUpjTFFWRnRvLzEwQXRsOD0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiZGNzSmltMVU0a3NJd1l2eWNZa293ek9QazJoQnM0T2Zsck54NmRlSiszcz0ifX0sInBhaXJpbmdFcGhlbWVyYWxLZXlQYWlyIjp7InByaXZhdGUiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJHUEZ1OEJBcmlmMyt0VFF4bUZEeDJVU21GTzRXbVg1N3JGbll6WlRPb1ZJPSJ9LCJwdWJsaWMiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJiMHdad3FlS0s4NUtUMUc3bnkvYXdCaktMSm9FQ3M3UWdYV2VIeTJRQVNvPSJ9fSwic2lnbmVkSWRlbnRpdHlLZXkiOnsicHJpdmF0ZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IlVNTnc2ZDBhNHkzZUI3V3lpWE5Qd0QreXRlWVFzQmZYZEpidFdwU0dWbWM9In0sInB1YmxpYyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkFnVnlwa2V6c00ySzlQM3pnKytrSUo1YXJrbURRTGhLd2kyUVJCN2E2bFk9In19LCJzaWduZWRQcmVLZXkiOnsia2V5UGFpciI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiK0RYVVlQMVlHNDBMdTdHMFl6azlSY1RkcnhyOVIxMUVYK3ZSbG1vZUsydz0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiZS92VGprbzEyMk1vN2o4NTVNVitlalNEKzZ5b2xub2h1T0RnbUMzUHlUOD0ifX0sInNpZ25hdHVyZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6Ilo4NitUdHh1T3FhQ09QMFlJRUZhSWpveUxDOGlKOHNwcEduUjdvRkE2SmpybWxHWWk2SndjSThOUGFudzl5UHhHbUQzSzIvTnEvUThPVHp2RFpOcmp3PT0ifSwia2V5SWQiOjF9LCJyZWdpc3RyYXRpb25JZCI6OTgsImFkdlNlY3JldEtleSI6InFESEtQb3lQaWhoUm5aT1lCTnhDWURDQkxlTC9UN3A1UEJxVE56V3BHMVU9IiwicHJvY2Vzc2VkSGlzdG9yeU1lc3NhZ2VzIjpbeyJrZXkiOnsicmVtb3RlSmlkIjoiMjU0Nzg2NDA0NDgwQHMud2hhdHNhcHAubmV0IiwiZnJvbU1lIjp0cnVlLCJpZCI6IkFDMTlENDUzNzJCMUIzRkJGMENCNkQyOTk4OUMxRDYwIn0sIm1lc3NhZ2VUaW1lc3RhbXAiOjE3NjMzNTE3NzF9XSwibmV4dFByZUtleUlkIjo4MTMsImZpcnN0VW51cGxvYWRlZFByZUtleUlkIjo4MTMsImFjY291bnRTeW5jQ291bnRlciI6MCwiYWNjb3VudFNldHRpbmdzIjp7InVuYXJjaGl2ZUNoYXRzIjpmYWxzZX0sInJlZ2lzdGVyZWQiOnRydWUsInBhaXJpbmdDb2RlIjoiTkVDVE9SMDEiLCJtZSI6eyJpZCI6IjI1NDc4NjQwNDQ4MDo0M0BzLndoYXRzYXBwLm5ldCIsImxpZCI6IjI1NjUwNDYwNzI4OTQ2NTo0M0BsaWQifSwiYWNjb3VudCI6eyJkZXRhaWxzIjoiQ002TWpQWURFTVc1NnNnR0dBRWdBQ2dBIiwiYWNjb3VudFNpZ25hdHVyZUtleSI6IklOdWpuU3FrSlRsWVl6TGtSK2dNZWwrOUMvK01yd3ozcFNMMkV2MDRiVzA9IiwiYWNjb3VudFNpZ25hdHVyZSI6IjRBdUNMOTZpVE9Jb1pIR3ZjRVZ0Nm52OG1rZmpldUY3NG5JRUpucjdnMmJTSUtBckEvS2M4R1AvTjRQYUpGQXpJdHNuOUNBVDJZL1lRQVI3MmNMdUFBPT0iLCJkZXZpY2VTaWduYXR1cmUiOiJJc2dWNFArYmdXYlE3OGtiQkRsM1hFL3ZpV0MyREs1SkhVT0xiUFEzckw4cHhlT1ZKbkVmendKeWNVNHJPVnNrOHptVkJ0ZWZwUmhkWkpReFVvU2FqUT09In0sInNpZ25hbElkZW50aXRpZXMiOlt7ImlkZW50aWZpZXIiOnsibmFtZSI6IjI1NDc4NjQwNDQ4MDo0M0BzLndoYXRzYXBwLm5ldCIsImRldmljZUlkIjowfSwiaWRlbnRpZmllcktleSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkJTRGJvNTBxcENVNVdHTXk1RWZvREhwZnZRdi9qSzhNOTZVaTloTDlPRzF0In19XSwicGxhdGZvcm0iOiJhbmRyb2lkIiwicm91dGluZ0luZm8iOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJDQTBJRWdnQyJ9LCJsYXN0QWNjb3VudFN5bmNUaW1lc3RhbXAiOjE3NjMzNTE3NjQsImxhc3RQcm9wSGFzaCI6IjFLNGhINCJ9",
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
  WEATHER_CITY: "Webuye",
  QUOTE_API: "https://zenquotes.io/api/random",
  WEATHER_API: "https://wttr.in/Nairobi?format=%C+%t", // Simple text weather
  HOLIDAY_API: "https://date.nager.at/api/v3/PublicHolidays",
  NEWS_API: "https://newsdata.io/api/1/news?apikey=pub_6d7e3fbe8c10459f9414293eb78c7bb1&country=ke&language=en&category=top",
  FACT_API: "https://uselessfacts.jsph.pl/random.json?language=en",
};

module.exports = config;
