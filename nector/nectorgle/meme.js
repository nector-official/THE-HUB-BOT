import fetch from 'node-fetch';
import config from '../../config.cjs';

const memeCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'meme') return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "😂", key: m.key } });

    const res = await fetch('https://meme-api.com/gimme');
    const data = await res.json();

    if (!data || !data.url)
      return m.reply("❌ Couldn't fetch meme.");

    await Matrix.sendMessage(m.from, {
      image: { url: data.url },
      caption: `🤣 *${data.title}*`
    }, { quoted: m });

  } catch (err) {
    console.error(err);
    m.reply("❌ Failed to fetch meme.");
  }
};

export default memeCommand;
