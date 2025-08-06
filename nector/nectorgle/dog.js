import fetch from 'node-fetch';
import config from '../../config.cjs';

const dogCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'dog') return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "🦮", key: m.key } });

    const res = await fetch('https://dog.ceo/api/breeds/image/random');
    const data = await res.json();

    if (!data.message)
      return m.reply("❌ Failed to fetch dog image.");

    await Matrix.sendMessage(m.from, {
      image: { url: data.message },
      caption: "🐶 Woof! Here's a cute dog!"
    }, { quoted: m });

  } catch (err) {
    console.error(err);
    m.reply("❌ Failed to fetch dog image.");
  }
};

export default dogCommand;
    
