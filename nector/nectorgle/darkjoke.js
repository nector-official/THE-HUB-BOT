import fetch from 'node-fetch';
import config from '../../config.cjs';

const darkjokeCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (!['darkjoke', 'darkhumor'].includes(command)) return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "😬", key: m.key } });

    const res = await fetch('https://v2.jokeapi.dev/joke/Dark?type=single');
    const data = await res.json();

    if (!data || !data.joke)
      return m.reply("❌ Couldn't fetch a dark joke.");

    m.reply(`🌚 *Dark Humor:*\n\n${data.joke}`);
  } catch (err) {
    console.error(err);
    m.reply("❌ Failed to fetch dark joke.");
  }
};

export default darkjokeCommand;
