import config from '../../config.cjs';
import axios from 'axios';

const dareCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  const aliases = ['dare', 'challenge'];
  if (!aliases.includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "🔥", key: m.key } });

  try {
    const res = await axios.get('https://api.truthordarebot.xyz/v1/dare');
    const question = res.data.question;
    await m.reply(`🎯 *Your Dare:*\n\n${question}`);
  } catch (err) {
    console.error('[DARE ERROR]', err.message);
    await m.reply('❌ *Could not fetch a dare right now.*');
  }
};

export default dareCommand;
