import config from '../../config.cjs';
import axios from 'axios';

const motivationCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'motivation') return;

  await Matrix.sendMessage(m.from, { react: { text: "🔥", key: m.key } });

  try {
    const res = await axios.get('https://type.fit/api/quotes');
    const quotes = res.data;
    const random = quotes[Math.floor(Math.random() * quotes.length)];
    const quote = random.text;
    const author = random.author || 'Unknown';

    await m.reply(`🔥 *Motivation*\n\n_"${quote}"_\n— *${author}*`);
  } catch (err) {
    console.error('[MOTIVATION ERROR]', err.message);
    m.reply('❌ *Could not fetch motivation right now.*');
  }
};

export default motivationCommand;
      
