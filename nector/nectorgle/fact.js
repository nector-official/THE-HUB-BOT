import config from '../../config.cjs';
import axios from 'axios';

const factCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'fact') return;

  await Matrix.sendMessage(m.from, { react: { text: "📘", key: m.key } });

  try {
    const res = await axios.get("https://uselessfacts.jsph.pl/random.json?language=en");
    const fact = res.data?.text;

    if (!fact) return m.reply('😓 *Could not fetch a fact. Try again later.*');

    m.reply(`🧠 *Did you know?*\n\n${fact}`);
  } catch (error) {
    console.error('[FACT ERROR]', error.message);
    m.reply('⚠️ *Error fetching fact. Please try again later.*');
  }
};

export default factCommand;
