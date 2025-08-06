import fetch from 'node-fetch';
import config from '../../config.cjs';

const jokeCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'joke') return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "🤣", key: m.key } });

    const res = await fetch('https://v2.jokeapi.dev/joke/Any?type=single');
    const data = await res.json();

    if (!data || !data.joke)
      return m.reply("❌ Couldn't fetch a joke right now. Try again later.");

    m.reply(`🃏 *Random Joke:*\n\n${data.joke}`);
  } catch (err) {
    console.error(err);
    m.reply("❌ Failed to fetch joke.");
  }
};

export default jokeCommand;
    
