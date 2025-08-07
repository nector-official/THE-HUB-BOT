import config from '../../config.cjs';
import axios from 'axios';

const adviceCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'advice') return;

  await Matrix.sendMessage(m.from, { react: { text: "💡", key: m.key } });

  try {
    const res = await axios.get('https://api.adviceslip.com/advice');
    const advice = res.data.slip.advice;

    await m.reply(`💡 *Advice:*\n_${advice}_`);
  } catch (err) {
    console.error('[ADVICE ERROR]', err.message);
    m.reply('❌ *Could not fetch advice at the moment.*');
  }
};

export default adviceCommand;
