// Imports
import axios from "axios";
import ytSearch from "yt-search";

// API Base
const BASE_URL = "https://jawad-tech.vercel.app/download/ytmp3?url=";

/**
 * Delay typing simulation + ephemeral bot message
 */
const delayTyping = async (sock, jid, text = "🎶 THE-HUB BOT 𝙄𝙎 𝙊𝙉 𝙄𝙏...") => {
  await sock.presenceSubscribe(jid);
  await sock.sendMessage(
    jid,
    { text },
    { ephemeralExpiration: 86400 } // 24 hours
  );
};

/**
 * Send proper usage guide if user forgets keyword
 */
const sendUsage = (sock, jid, command, msg) => {
  return sock.sendMessage(
    jid,
    {
      text:
        "❗ *Usage:* `." +
        command +
        " <song/video>`\n💡 *Example:* `." +
        command +
        " calm down remix`",
    },
    { quoted: msg }
  );
};

/**
 * Error handler
 */
const sendError = async (sock, jid, error, msg) => {
  console.error("[POP🔴ERROR]:", error.message);
  return sock.sendMessage(
    jid,
    {
      text:
        "⚠️ *Error:* `" +
        error.message +
        "`\nTry again or use another keyword.",
    },
    { quoted: msg }
  );
};

/**
 * Core function: handle media (music / video)
 */
const handleMediaCommand = async (msg, sock, format = "mp3") => {
  const prefix = ".";
  const body = msg.message || "";
  const jid = msg.key.remoteJid;

  // Extract command keyword
  const command = body.startsWith(prefix)
    ? body.slice(prefix.length).split(" ")[0].toLowerCase()
    : "";

  // Extract search query
  const query = body.slice(prefix.length + command.length).trim();
  if (!query) return sendUsage(sock, jid, command, msg);

  try {
    await delayTyping(sock, jid);

    // Search YouTube
    const results = await ytSearch(query);
    const video = results.videos[0];

    if (!video) {
      return sock.sendMessage(
        jid,
        { text: "😔 No results found. Try another keyword." },
        { quoted: msg }
      );
    }

    // Video details
    const ytUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
    const apiUrl =
      format === "mp3"
        ? `${BASE_URL}${video.videoId}&format=mp3`
        : `https://jawad-tech.vercel.app/download/ytmp4?url=${video.videoId}`;

    // Fetch download link
    const { data } = await axios.get(apiUrl);
    if (!data.url) {
      return sock.sendMessage(
        jid,
        { text: "❌ Failed to generate download link. API may be offline." },
        { quoted: msg }
      );
    }

    // Build caption
    const caption = (
      `╭━━🎧 THE HUB 𝙈𝙀𝘿𝙄𝘼 ━━╮\n` +
      `┃ 🔊 *${format.toUpperCase()} Request Ready!*\n┃\n` +
      `┃ 🎵 *Title:* ${video.title}\n` +
      `┃ 👤 *Author:* ${video.author.name}\n` +
      `┃ ⏱️ *Duration:* ${video.timestamp}\n` +
      `┃ 📅 *Published:* ${video.ago}\n` +
      `┃ 👁️ *Views:* ${video.views.toLocaleString()}\n` +
      `┃ 🔗 *URL:* ${ytUrl}\n` +
      `┃ 📥 *Format:* ${format.toUpperCase()}\n` +
      `╰━━━━━━━━━━━━━━━━━━━━╯\n` +
      `⚡ Powered by *THE-HUB BOT V2*`
    ).trim();

    // Send preview
    await sock.sendMessage(
      jid,
      {
        image: { url: video.thumbnail },
        caption,
      },
      { quoted: msg }
    );

    // Send file
    const fileName =
      video.title.replace(/[\\/:*?"<>|]/g, "") + "." + format;

    await sock.sendMessage(
      jid,
      {
        [format === "mp3" ? "audio" : "video"]: { url: data.url },
        mimetype: format === "mp3" ? "audio/mpeg" : "video/mp4",
        fileName,
      },
      { quoted: msg }
    );
  } catch (err) {
    return sendError(sock, jid, err, msg);
  }
};

/**
 * Handler for incoming messages
 */
const mediaHandler = async (msg, sock) => {
  const prefix = ".";
  const body = msg.body || "";

  const command = body.startsWith(prefix)
    ? body.slice(prefix.length).split(" ")[0].toLowerCase()
    : "";

  switch (command) {
    case "play":
    case "music":
    case "song":
    case "mp3":
    case "mp3doc":
      return handleMediaCommand(msg, sock, "mp3");

    case "video":
    case "vid":
    case "movie":
    case "mp4":
      return handleMediaCommand(msg, sock, "mp4");
  }
};

/**
 * Aliases
 */
export const aliases = [
  "play",
  "song",
  "music",
  "mp3",
  "mp3doc",
  "video",
  "vid",
  "mp4",
  "movie",
];

export default mediaHandler;
