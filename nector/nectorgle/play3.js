// ─── Imports ──────────────────────────────
import axios from "axios";
import ytSearch from "yt-search";

// ─── Constants ────────────────────────────
const BASE_URL = "https://jawad-tech.vercel.app/download/";
const PREFIX = ".";

// ─── Utility Helpers ──────────────────────
const delayTyping = async (sock, jid, text = "🎶 Ⓝ̱ͬ͘Ⓔ̤̓͝C̣ͫ̕Ⓣͤ͏̙O̡̱̾R̫͑͜🍯̶͓ͥ BOT 𝙄𝙎 𝙊𝙉 𝙄𝙏...") => {
  await sock.presenceSubscribe(jid);
  await sock.sendMessage(jid, { text }, { ephemeralExpiration: 86400 });
};

const sendUsage = (sock, jid, command, msg) =>
  sock.sendMessage(
    jid,
    {
      text: `❗ *Usage:* \`.${command} <song/video>\`\n💡 *Example:* \`.${command} calm down remix\``,
    },
    { quoted: msg }
  );

const sendError = (sock, jid, error, msg) =>
  sock.sendMessage(
    jid,
    {
      text: `⚠️ *Error:* \`${error.message}\`\nTry again or use another keyword.`,
    },
    { quoted: msg }
  );

// ─── Core Function ────────────────────────
const handleMediaCommand = async (msg, sock, format = "mp3") => {
  const body = msg.body || "";
  const jid = msg.key.remoteJid;

  // Extract command & query
  const command = body.startsWith(PREFIX)
    ? body.slice(PREFIX.length).split(" ")[0].toLowerCase()
    : "";
  const query = body.slice(PREFIX.length + command.length).trim();
  if (!query) return sendUsage(sock, jid, command, msg);

  try {
    await delayTyping(sock, jid);

    // Search YouTube
    const results = await ytSearch(query);
    const video = results.videos[0];
    if (!video)
      return sock.sendMessage(
        jid,
        { text: "😔 No results found. Try another keyword." },
        { quoted: msg }
      );

    const ytUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
    const apiUrl =
      BASE_URL +
      (format === "mp3"
        ? `ytmp3?url=${video.videoId}`
        : `ytmp4?url=${video.videoId}`);

    // Fetch download link
    const { data } = await axios.get(apiUrl);
    if (!data.url)
      return sock.sendMessage(
        jid,
        { text: "❌ Failed to generate download link. API may be offline." },
        { quoted: msg }
      );

    // Caption
    const caption = `
╭━━🎧 Ⓝ̸̳͌Ⓔ̤ͭ͘Ĉ̲͞Ⓣ͓̉͠O̪͒͠R͎̒͢🍯̽͝ͅ ̘̾́M̷̭ͥĚ҉̥D̸͓͐Ǐ̵͈A̴̫̾ ━━╮
┃ 🔊 *${format.toUpperCase()} Request Ready!*
┃ 🎵 *Title:* ${video.title}
┃ 👤 *Author:* ${video.author.name}
┃ ⏱️ *Duration:* ${video.timestamp}
┃ 📅 *Published:* ${video.ago}
┃ 👁️ *Views:* ${video.views.toLocaleString()}
┃ 🔗 *URL:* ${ytUrl}
┃ 📥 *Format:* ${format.toUpperCase()}
╰━━━━━━━━━━━━━━━━━━━━╯
⚡ Powered by *ⓃⒺCⓉOR🍯*
    `.trim();

    // Preview (thumbnail + details)
    await sock.sendMessage(
      jid,
      { image: { url: video.thumbnail }, caption },
      { quoted: msg }
    );

    // Media File
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

// ─── Message Router ───────────────────────
const mediaHandler = async (msg, sock) => {
  const body = msg.body || "";
  const command = body.startsWith(PREFIX)
    ? body.slice(PREFIX.length).split(" ")[0].toLowerCase()
    : "";

  if (["play", "music", "song", "mp3", "mp3doc"].includes(command))
    return handleMediaCommand(msg, sock, "mp3");

  if (["video", "vid", "movie", "mp4"].includes(command))
    return handleMediaCommand(msg, sock, "mp4");
};

// ─── Exports ──────────────────────────────
export const aliases = ["play", "song", "music", "mp3", "mp3doc", "video", "vid", "mp4", "movie"];
export default mediaHandler;
