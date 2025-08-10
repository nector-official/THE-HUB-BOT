import config from '../../config.cjs';
import axios from 'axios';

const motivationCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'motivation') return;

  await Matrix.sendMessage(m.from, { react: { text: "💪", key: m.key } });

  try {
    const res = await axios.get('https://zenquotes.io/api/random');
    const quote = res.data[0].q;
    const author = res.data[0].a;

    await m.reply(`💡 *Motivational Quote*\n\n_"${quote}"_\n— *${author}*`);
  } catch (err) {
    console.error('[MOTIVATION ERROR]', err.message);
    m.reply('❌ *Could not fetch motivation right now.*');
  }
};
