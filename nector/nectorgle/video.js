import yts from 'yt-search';
import fetch from 'node-fetch';
import config from '../../config.cjs';

const videoCommand = async (m, Matrix) => {
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const isOwner = [botNumber, `${config.OWNER_NUMBER}@s.whatsapp.net`].includes(m.sender);
  const prefix = config.PREFIX;

  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  const args = m.body.slice(prefix.length + command.length).trim();

  if (command !== 'video') return;

  if (!args) {
    return m.reply("❓ What video do you want to download? Please provide a search term.");
  }

  try {
    await Matrix.sendMessage(m.from, { text: "🔍 *Searching for your video, please wait...*" }, { quoted: m });

    const search = await yts(args);
    if (!search.all.length) {
      return m.reply("❌ No results found for your query.");
    }

    const { title, thumbnail, duration, url } = search.all[0];
    const videoUrl = url;
    const apiUrl = `https://apis-keith.vercel.app/download/dlmp4?url=${videoUrl}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status && data.result) {
      const downloadUrl = data.result.downloadUrl;

      await Matrix.sendMessage(m.from, {
        image: { url: thumbnail },
        caption: `🎬 *Video Found:*\n\n📌 *Title:* ${title}\n⏱️ *Duration:* ${duration}\n🔗 *Link:* ${videoUrl}\n\n> ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ ʙʏ ⓃⒺCⓉOR🍯`,
      }, { quoted: m });

      await Matrix.sendMessage(m.from, {
        video: { url: downloadUrl },
        mimetype: "video/mp4",
        caption: `🎬 *Video Downloaded Successfully!*\n\n> ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ ʙʏ ⓃⒺCⓉOR🍯`,
      }, { quoted: m });

    } else {
      m.reply("❌ Unable to fetch the video. The server might be down, please try again later.");
    }

  } catch (error) {
    m.reply(`❌ An error occurred while processing your request: ${error.message}`);
  }
};

export default videoCommand;
    
