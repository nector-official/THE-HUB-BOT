import fetch from 'node-fetch';
import config from '../../config.cjs';

const play = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  if (cmd !== 'play3') return;

  if (!text) {
    await sock.sendMessage(m.from, {
      text: `❗ *Usage:* \`${prefix}play <song name or YouTube link>\``
    }, { quoted: m });
    return;
  }

  await m.React('🔍');

  const apis = [
    `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(text)}&apikey=gifted-md`,
    `https://www.dark-yasiya-api.site/download/ytmp3?url=${encodeURIComponent(text)}`,
    `https://api.dreaded.site/api/ytdl/video?query=${encodeURIComponent(text)}`
  ];

  let result;

  for (const api of apis) {
    try {
      const res = await fetch(api);
      const data = await res.json();

      const audio =
        data?.result?.audio?.url || data?.result?.url || data?.data?.url || data?.url;

      if (audio) {
        result = {
          title: data?.result?.title || data?.data?.title || 'Unknown Title',
          duration: data?.result?.duration || data?.data?.duration || 'Unknown',
          thumbnail: data?.result?.thumbnail || data?.data?.thumbnail || null,
          size: data?.result?.size || data?.data?.size || 'Unknown',
          audio
        };
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!result) {
    await m.React('❌');
    return sock.sendMessage(m.from, {
      text: '❌ *All sources failed. Try a different song or link.*'
    }, { quoted: m });
  }

  const { title, duration, thumbnail, size, audio } = result;

  await m.React('🎶');

  const caption = `
🎧 *Now Playing...*
  
🎵 *${title}*
⏱️ Duration: *${duration}*
📦 Size: *${size}*
  
✨ Requested by: @${m.sender.split('@')[0]}
  `.trim();

  if (thumbnail) {
    await sock.sendMessage(m.from, {
      image: { url: thumbnail },
      caption,
      mentions: [m.sender]
    }, { quoted: m });
  }

  await sock.sendMessage(m.from, {
    audio: { url: audio },
    mimetype: 'audio/mp4',
    fileName: `${title}.mp3`,
    ptt: false
  }, { quoted: m });

  await m.React('✅');
};

export default play;
