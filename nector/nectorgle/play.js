import yts from 'yt-search';
import axios from 'axios';
import config from '../../config.cjs';

const playCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  // ✅ Multiple trigger words
  if (!["play", "song", "music", "mp3"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "🎧", key: m.key } });

  if (!args) {
    return m.reply(
      "❌ *Please provide a song name!*\n\nExample:\n" +
      "`" + config.PREFIX + command + " despacito`"
    );
  }

  try {
    // 🔍 Search YouTube
    const { videos } = await yts(args);
    if (!videos || videos.length === 0) {
      return m.reply("⚠️ *No results found for your query!*");
    }

    const video = videos[0];
    const videoUrl = video.url;

    // 🖼️ Send video info before download
    await Matrix.sendMessage(m.from, {
      image: { url: video.thumbnail },
      caption: `🎵 *${video.title}*\n⏱ Duration: ${video.timestamp}\n👁 Views: ${video.views.toLocaleString()}\n\n⏳ Downloading audio...`
    }, { quoted: m });

    // 🎧 Fetch audio using the API
    const apiUrl = `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(videoUrl)}`;
    const res = await axios.get(apiUrl);
    const data = res.data;

    if (!data?.status) {
      return m.reply("🚫 *Failed to fetch audio. Try again later.*");
    }

    const audioUrl = data.audio;
    const title = data.title || video.title;

    if (!audioUrl) {
      return m.reply("🚫 *No audio URL found in the response.*");
    }

    // 🎶 Send audio file
    await Matrix.sendMessage(m.from, {
      audio: { url: audioUrl },
      mimetype: "audio/mpeg",
      fileName: `${title}.mp3`
    }, { quoted: m });

  } catch (err) {
    console.error("[Play Command Error]", err.message);
    m.reply("❌ *Download failed. Please try again later.*");
  }
};

export default playCommand;
