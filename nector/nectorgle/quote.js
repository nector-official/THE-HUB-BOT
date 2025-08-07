import config from '../../config.cjs';
import axios from 'axios';

const quoteCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'quote') return;

  await Matrix.sendMessage(m.from, { react: { text: "📜", key: m.key } });

  try {
    const response = await axios.get('https://api.quotable.io/random');
    const { content, author } = response.data;

    await m.reply(`📜 *${content}*\n— _${author}_`);
  } catch (err) {
    console.error('[QUOTE ERROR]', err.message);
    m.reply('❌ *Could not fetch a quote right now.*');
  }
};

export default quoteCommand;
