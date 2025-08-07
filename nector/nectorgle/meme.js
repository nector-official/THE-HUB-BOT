import config from '../../config.cjs';
import axios from 'axios';

const memeCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'meme') return;

  await Matrix.sendMessage(m.from, { react: { text: "🖼️", key: m.key } });

  try {
    const response = await axios.get("https://meme-api.com/gimme");
    const { title, url, author, postLink } = response.data;

    await Matrix.sendMessage(m.chat, {
      image: { url },
      caption: `🗯 *${title}*\n👤 _by ${author}_\n🔗 ${postLink}`
    }, { quoted: m });

  } catch (err) {
    console.error('[MEME ERROR]', err.message);
    m.reply('❌ *Failed to fetch meme. Try again later.*');
  }
};

export default memeCommand;
