import axios from 'axios';
import yts from 'yt-search';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import config from '../../config.cjs';

const playCommand = async (m, Matrix) => {
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const isOwner = [botNumber, `${config.OWNER_NUMBER}@s.whatsapp.net`].includes(m.sender);
  const prefix = config.PREFIX;

  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  const args = m.body.slice(prefix.length + command.length).trim();

  if (command !== 'play', 'music', 'song', 'sound', 'hit', 'beat' ) return;

  if (!args && !m.quoted) {
    return m.reply("❓ What song or URL do you want to download?\nYou can also reply to a message with a URL.");
  }

  const url = args || (m.quoted && m.quoted.text);
  const isAudio = !args.includes("video");

  try {
    let linkMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/[^\/]+\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    let title, thumbnail, duration, videoUrl;

    await Matrix.sendMessage(m.from, { text: "🔍 Searching for the song, please wait..." }, { quoted: m });

    if (linkMatch) {
      const videoDetails = await yts(linkMatch[0]);
      const result = videoDetails.all[0];
      title = result.title;
      thumbnail = result.thumbnail;
      duration = result.duration.timestamp;
      videoUrl = linkMatch[0];
    } else {
      const search = await yts(url);
      if (!search.all.length) return m.reply("❌ No results found for your search.");
      const result = search.all[0];
      title = result.title;
      thumbnail = result.thumbnail;
      duration = result.duration.timestamp;
      videoUrl = result.url;
    }

    const cleanTitle = title.replace(/[^a-zA-Z0-9 ]/g, "");
    const outputPath = path.join('./', `${cleanTitle}.mp3`);

    const apis = [
      `https://xploader-api.vercel.app/ytmp3?url=${videoUrl}`,
      `https://apis.davidcyriltech.my.id/youtube/mp3?url=${videoUrl}`,
      `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${videoUrl}`,
      `https://api.dreaded.site/api/ytdl/audio?url=${videoUrl}`
    ];

    if (isAudio) {
      for (const api of apis) {
        try {
          const res = await fetch(api);
          const data = await res.json();
          if (!(data.status === 200 || data.success)) continue;

          const audioUrl = data.result?.downloadUrl || data.url;
          if (!audioUrl) continue;

          const stream = await axios({ url: audioUrl, method: "GET", responseType: "stream" });
          if (stream.status !== 200) continue;

          return ffmpeg(stream.data)
            .toFormat('mp3')
            .save(outputPath)
            .on('end', async () => {
              await Matrix.sendMessage(m.from, {
                document: { url: outputPath },
                mimetype: 'audio/mp3',
                caption: `🎶 *Title:* ${title}\n⏱️ *Duration:* ${duration}\n\nPowered by ⓃⒺCⓉOR🍯`,
                fileName: `${cleanTitle}.mp3`,
                thumbnail: { url: thumbnail },
              }, { quoted: m });
              fs.unlinkSync(outputPath);
            })
            .on('error', err => m.reply("❌ Download failed\n" + err.message));
        } catch (err) {
          continue;
        }
      }
      return m.reply("❌ All APIs failed or are currently down.");
    }

  } catch (e) {
    return m.reply("❌ Something went wrong\n" + e.message);
  }
};

export default playCommand;
      
