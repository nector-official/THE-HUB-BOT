import fetch from 'node-fetch';
import config from '../../config.cjs';

const quoteCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'quote') return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "😁", key: m.key } });

    const res = await fetch('https://api.quotable.io/random');
    const data = await res.json();

    if (!data || !data.content)
      return m.reply("❌ Couldn't fetch a quote.");

    m.reply(`📜 *"${data.content}"*\n\n— ${data.author}`);
  } catch (err) {
    console.error(err);
    m.reply("❌ Failed to fetch quote.");
  }
};

export default quoteCommand;
      
