import axios from 'axios';
import yts from 'yt-search';
import config from '../../config.cjs';

const videoCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  // ✅ Allow multiple trigger words
  if (!["video", "playvid", "vid", "mp4"].includes(command)) return;

  if (!args) {
    return m.reply("❌ *Please provide a video name or YouTube link!*\n\nExample:\n`" + config.PREFIX + command + " shape of you`");
  }

  await Matrix.sendMessage(m.from, { react: { text: "📹", key: m.key } });

  try {
    let videoUrl = '';
    let previewTitle = '';
    let previewThumbnail = '';

    // 🔗 If input is a YouTube URL
    if (args.startsWith('http://') || args.startsWith('https://')) {
      videoUrl = args;
    } else {
      // 🔍 Search YouTube for the video
      const { videos } = await yts(args);
      if (!videos || videos.length === 0) {
        return m.reply("⚠️ *No videos found for your query!*");
      }
      videoUrl = videos[0].url;
      previewTitle = videos[0].title;
      previewThumbnail = videos[0].thumbnail;
    }

    // 🧠 Validate YouTube URL
    const urls = videoUrl.match(/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/|playlist\?list=)?)([a-zA-Z0-9_-]{11})/gi);
    if (!urls) {
      return m.reply("🚫 *This is not a valid YouTube link!*");
    }

    // ⏳ React with hourglass
    await Matrix.sendMessage(m.from, { react: { text: "⏳", key: m.key } });

    // 🌐 Use Hector Manuel’s API
    const apiUrl = `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(videoUrl)}`;
    const res = await axios.get(apiUrl, { headers: { 'Accept': 'application/json' } });

    if (res.status !== 200 || !res.data.status) {
      return m.reply("🚫 *Failed to fetch video from the API.*");
    }

    const data = res.data;
    const title = data.title || previewTitle || "video.mp4";
    const thumbnail = data.thumbnail || previewThumbnail;
    const quality = "360p";
    const videoDownloadUrl = data.videos?.["360"] || data.videos?.["480"] || data.videos?.["720"];

    if (!videoDownloadUrl) {
      return m.reply("❌ *No downloadable video link found. Try another one.*");
    }

    // 🖼️ Send preview before downloading
    await Matrix.sendMessage(m.from, {
      image: { url: thumbnail },
      caption: `🎬 *${title}*\n📌 Quality: ${quality}\n\n> _Downloading your video..._`
    }, { quoted: m });

    // 📹 Try sending the video directly
    await Matrix.sendMessage(m.from, {
      video: { url: videoDownloadUrl },
      mimetype: "video/mp4",
      fileName: `${title}.mp4`,
      caption: `🎞 *${title}*\n📌 Quality: ${quality}\n\n> _Downloaded by ${config.BOT_NAME || "Your Bot"}_`
    }, { quoted: m });

    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });

  } catch (err) {
    console.error("[Video Command Error]", err.message);
    await Matrix.sendMessage(m.from, { react: { text: "❌", key: m.key } });
    m.reply("📹 *Download failed:* " + err.message);
  }
};

export default videoCommand;
