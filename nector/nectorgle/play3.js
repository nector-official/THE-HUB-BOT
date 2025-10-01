// media-handler.js
import axios from "axios";
import ytSearch from "yt-search";

/**
 * API endpoints used by the original code.
 * Keep these identical so behavior does not change.
 */
const BASE_DOWNLOAD = "https://jawad-tech.vercel.app/download/";

/**
 * Simulate typing / presence and send an ephemeral helper message.
 * Mirrors the original behavior (ephemeralExpiration = 86400 seconds).
 */
const delayTyping = async (sock, jid, text = "🎶 THE-HUB BOT 𝙄𝙎 𝙊𝙉 𝙄𝙏...") => {
  try {
    // some WhatsApp libs expose presenceSubscribe; call if available
    if (typeof sock.presenceSubscribe === "function") {
      await sock.presenceSubscribe(jid);
    }
  } catch (e) {
    // ignore presence errors (non-fatal)
  }

  // Send an ephemeral/semi-ephemeral hint message (keep same TTL)
  // Many libs accept ephemeralExpiration in send options; keep same key.
  await sock.sendMessage(jid, { text }, { ephemeralExpiration: 86400 });
};

/**
 * Send usage instructions (keeps exact text style from original)
 */
const sendUsage = (sock, jid, command, quotedMsg) =>
  sock.sendMessage(
    jid,
    {
      text:
        "❗ *Usage:* `." +
        command +
        " <song/video>`\n💡 *Example:* `." +
        command +
        " calm down remix`",
    },
    { quoted: quotedMsg }
  );

/**
 * Global error reporter (keeps original prefix text).
 */
const sendError = async (sock, jid, error, quotedMsg) => {
  // original logs "[POP🔴ERROR]:", keep the same marker
  console.error("[POP🔴ERROR]:", error?.message ?? error);
  return sock.sendMessage(
    jid,
    {
      text:
        "⚠️ *Error:* `" +
        (error?.message ?? String(error)) +
        "`\nTry again or use another keyword.",
    },
    { quoted: quotedMsg }
  );
};

/**
 * Helper: safely retrieve text from different message shapes used by WhatsApp libraries.
 * This makes the handler robust and prevents undefined errors that appeared after cleaning.
 */
const extractText = (msg) => {
  // msg may be in many shapes: msg.body, msg.text, msg.message.conversation,
  // msg.message.extendedTextMessage.text, etc.
  if (!msg) return "";
  if (typeof msg.body === "string") return msg.body;
  if (typeof msg.text === "string") return msg.text;

  const m = msg.message || {};
  // common locations
  if (typeof m.conversation === "string") return m.conversation;
  if (m.extendedTextMessage && typeof m.extendedTextMessage.text === "string")
    return m.extendedTextMessage.text;
  if (m.imageMessage && typeof m.imageMessage.caption === "string")
    return m.imageMessage.caption;
  if (m.documentMessage && typeof m.documentMessage.caption === "string")
    return m.documentMessage.caption;
  return "";
};

/**
 * Format views safely (video.views sometimes is string or number)
 */
const formatViews = (v) => {
  if (v == null) return "0";
  if (typeof v === "number") return v.toLocaleString();
  // remove non-digits and format
  const digits = String(v).replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString() : String(v);
};

/**
 * Main media command handler (mp3 / mp4).
 * Keeps the same responses, captions and file sending logic as the original code.
 */
const handleMediaCommand = async (msg, sock, format = "mp3") => {
  // robust extraction of text and jid
  const text = extractText(msg).trim();
  // msg.key && msg.key.remoteJid is common; fallback to msg.from or msg.jid
  const jid =
    (msg.key && msg.key.remoteJid) || msg.from || msg.jid || msg.chat || null;

  // if text doesn't start with prefix, no command present
  const PREFIX = ".";
  const startsWithPrefix = text.startsWith(PREFIX);
  const command = startsWithPrefix ? text.slice(PREFIX.length).split(" ")[0].toLowerCase() : "";
  // remainder after ".command"
  const query = startsWithPrefix ? text.slice(PREFIX.length + command.length).trim() : "";

  if (!query) return sendUsage(sock, jid, command || (format === "mp3" ? "play" : "video"), msg);

  try {
    // mimic the original "typing/presence" behavior
    await delayTyping(sock, jid);

    // search YouTube (exact same dependency used in original)
    const res = await ytSearch(query);
    const video = res?.videos?.[0];

    if (!video) {
      return sock.sendMessage(
        jid,
        { text: "😔 No results found. Try another keyword." },
        { quoted: msg }
      );
    }

    // Build URLs similarly to original:
    // mp3 -> /download/ytmp3?url=VIDEOID&format=mp3
    // mp4 -> /download/ytmp4?url=VIDEOID
    const videoId = video.videoId || video.videoId;
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const apiUrl =
      format === "mp3"
        ? `${BASE_DOWNLOAD}ytmp3?url=${encodeURIComponent(videoId)}&format=mp3`
        : `${BASE_DOWNLOAD}ytmp4?url=${encodeURIComponent(videoId)}`;

    // fetch the download link (original used axios.get)
    const { data } = await axios.get(apiUrl);

    // original checked a property (data.url). Keep that check.
    const downloadUrl = data?.url ?? data?.result ?? data;
    if (!downloadUrl) {
      return sock.sendMessage(
        jid,
        { text: "❌ Failed to generate download link. API may be offline." },
        { quoted: msg }
      );
    }

    // Build the caption exactly like original formatting (keeps all lines/emoji)
    const caption = (
      "\n╭━━🎧 THE HUB 𝙈𝙀𝘿𝙄𝘼 ━━╮\n" +
      `┃ 🔊 *${format.toUpperCase()} Request Ready!*` +
      `\n┃\n` +
      `┃ 🎵 *Title:* ${video.title}` +
      `\n┃ 👤 *Author:* ${video.author?.name ?? "Unknown"}` +
      `\n┃ ⏱️ *Duration:* ${video.timestamp ?? "Unknown"}` +
      `\n┃ 📅 *Published:* ${video.ago ?? "Unknown"}` +
      `\n┃ 👁️ *Views:* ${formatViews(video.views)}` +
      `\n┃ 🔗 *URL:* ${ytUrl}` +
      `\n┃ 📥 *Format:* ${format.toUpperCase()}` +
      `\n╰━━━━━━━━━━━━━━━━━━━━╯\n` +
      `⚡ Powered by *THE-HUB BOT V2*\n`
    ).trim();

    // send thumbnail + caption (preserve original behavior)
    if (video.thumbnail) {
      await sock.sendMessage(
        jid,
        { image: { url: video.thumbnail }, caption },
        { quoted: msg }
      );
    } else {
      // if no thumbnail, still send caption as text (fallback)
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }

    // prepare filename (sanitize): same replacement as original
    const safeTitle = (video.title || "download").replace(/[\\\/:*?"<>|]/g, "");
    const fileName = `${safeTitle}.${format}`;

    // send the actual media referencing the download link (same keys as original)
    const sendPayload =
      format === "mp3"
        ? {
            audio: { url: downloadUrl },
            mimetype: "audio/mpeg",
            fileName,
          }
        : {
            video: { url: downloadUrl },
            mimetype: "video/mp4",
            fileName,
          };

    await sock.sendMessage(jid, sendPayload, { quoted: msg });
  } catch (err) {
    return sendError(sock, jid, err, msg);
  }
};

/**
 * Router: determine if incoming command requests mp3 or mp4
 * Keeps the same aliases the original had.
 */
const mediaHandler = async (msg, sock) => {
  const text = extractText(msg).trim();
  if (!text) return;

  const PREFIX = ".";
  if (!text.startsWith(PREFIX)) return;

  const command = text.slice(PREFIX.length).split(" ")[0].toLowerCase();

  // mp3-like commands
  const mp3Aliases = ["play", "song", "music", "mp3", "mp3doc"];
  // mp4-like commands
  const mp4Aliases = ["video", "vid", "movie", "mp4"];

  if (mp3Aliases.includes(command)) return handleMediaCommand(msg, sock, "mp3");
  if (mp4Aliases.includes(command)) return handleMediaCommand(msg, sock, "mp4");
};

// export aliases exactly like original so any registry still finds same names
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
