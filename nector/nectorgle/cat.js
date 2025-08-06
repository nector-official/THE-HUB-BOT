import fetch from 'node-fetch';
import config from '../../config.cjs';

const catCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'cat') return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "🐱", key: m.key } });

    const res = await fetch('https://api.thecatapi.com/v1/images/search');
    const data = await res.json();

    if (!data[0]?.url)
      return m.reply("❌ Failed to fetch cat image.");

    await Matrix.sendMessage(m.from, {
      image: { url: data[0].url },
      caption: "🐱 Meow~ Here's a cute cat for you!"
    }, { quoted: m });

  } catch (err) {
    console.error(err);
    m.reply("❌ Failed to fetch cat image.");
  }
};

export default catCommand;
      
