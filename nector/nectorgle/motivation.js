import config from '../../config.cjs';
import axios from 'axios';

const motivationCommand = async (m, Matrix) => {
  const args = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).trim().split(' ')
    : [];

  const command = args.shift()?.toLowerCase();
  if (command !== 'motivation') return;

  const keyword = args.join(' ').trim();
  await Matrix.sendMessage(m.from, { react: { text: "💪", key: m.key } });

  try {
    let url = 'https://api.quotable.io/random';
    if (keyword) {
      url = `https://api.quotable.io/random?tags=${encodeURIComponent(keyword)}`;
    }

    const res = await axios.get(url);
    const quote = res.data.content;
    const author = res.data.author;

    await m.reply(`💡 *Motivational Quote*\n\n_"${quote}"_\n— *${author}*`);
  } catch (err) {
    console.error('[MOTIVATION ERROR]', err.message);
    m.reply('❌ *Could not fetch motivation right now.*');
  }
};

export default motivationCommand;
