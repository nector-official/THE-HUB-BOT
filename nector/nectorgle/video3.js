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
    return m.reply(
      "❌ *Please provide a video name or YouTube link!*\n\nExample:\n`" +
      config.PREFIX + command + " shape of you`"
    );
  }

  // 🎬 React to indicate start
  await Matrix.sendMessage(m.from, { react: { text: "📹", key: m.key } });

  try {
    let videoUrl = '';
    let previewTitle = '';
    let previewThumbnail = '';

    // 🔗 If input is a YouTube or Shorts link
    if (
      args.startsWith('http://') ||
      args.startsWith('https://') ||
      args.includes('youtu.be') ||
      args.includes('youtube.com')
    ) {
      videoUrl = args;

      // Normalize Shorts URLs → standard YouTube format
      if (videoUrl.includes('youtube.com/shorts/')) {
        const videoId = videoUrl.split('shorts/')[1]?.split('?')[0];
        if (videoId) videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }
    } else {
      // 🔍 Otherwise, search YouTube
      const { videos } = await yts(args);
      if (!videos || videos.length === 0) {
        return m.reply("⚠️ *No videos found for your query!*");
      }
      videoUrl = videos[0].url;
      previewTitle = videos[0].title;
      previewThumbnail = videos[0].thumbnail;
    }

    // 🧠 Validate YouTube URL format
    const validUrl = videoUrl.match(
      /(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
    );
    if (!validUrl) {
      return m.reply("🚫 *This is not a valid YouTube link!*");
    }

    // ⏳ Indicate downloading
    await Matrix.sendMessage(m.from, { react: { text: "⏳", key: m.key } });

    // 🌐 Fetch data from Hector Manuel’s API
    const apiUrl = `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(videoUrl)}`;
    const res = await axios.get(apiUrl, { headers: { Accept: 'application/json' } });

    if (res.status !== 200 || !res.data.status) {
      return m.reply("🚫 *Failed to fetch video from the API.*");
    }

    const data = res.data;
    const title = data.title || previewTitle || 'video.mp4';
    const thumbnail = data.thumbnail || previewThumbnail;
    const quality = data.videos?.["480"]
      ? "480p"
      : data.videos?.["360"]
      ? "360p"
      : "720p";
    const videoDownloadUrl =
      data.videos?.["480"] || data.videos?.["360"] || data.videos?.["720"];

    if (!videoDownloadUrl) {
      return m.reply("❌ *No downloadable video link found. Try another one.*");
    }

    // 🖼️ Send video preview
    await Matrix.sendMessage(
      m.from,
      {
        image: { url: thumbnail },
        caption: `🎬 *${title}*\n📌 Quality: ${quality}\n\n> _Downloading your video..._`,
      },
      { quoted: m }
    );

    // 📹 Send video
    await Matrix.sendMessage(
      m.from,
      {
        video: { url: videoDownloadUrl },
        mimetype: 'video/mp4',
        fileName: `${title}.mp4`,
        caption: `🎞 *${title}*\n📌 Quality: ${quality}\n\n> _Downloaded by ${config.BOT_NAME || "Your Bot"}_`,
      },
      { quoted: m }
    );

    // ✅ Finished successfully
    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });

  } catch (err) {
    console.error("[Video Command Error]", err.message);
    await Matrix.sendMessage(m.from, { react: { text: "❌", key: m.key } });
    m.reply("📹 *Download failed:* " + err.message);
  }
};

export default videoCommand;
