import fetch from 'node-fetch';
import config from '../../config.cjs';

const waifuCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'waifu') return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "🥲", key: m.key } });

    const res = await fetch('https://api.waifu.pics/sfw/waifu');
    const data = await res.json();

    if (!data || !data.url)
      return m.reply("❌ Couldn't fetch waifu image.");

    await Matrix.sendMessage(m.from, {
      image: { url: data.url },
      caption: "✨ Here's your random waifu!"
    }, { quoted: m });

  } catch (err) {
    console.error(err);
    m.reply("❌ Failed to get waifu.");
  }
};

export default waifuCommand;
        
