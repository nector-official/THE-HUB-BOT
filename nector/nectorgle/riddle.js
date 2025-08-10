import config from '../../config.cjs';
import axios from 'axios';

let activeRiddles = {};

const riddleCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  if (command === 'riddle') {
    await Matrix.sendMessage(m.from, { react: { text: "❓", key: m.key } });

    try {
      const res = await axios.get('https://api.apileague.com/retrieve-random-riddle');
      const { riddle, answer } = res.data;

      activeRiddles[m.sender] = answer.toLowerCase().trim();
      await m.reply(`🧩 *Riddle Time!* \n\n${riddle}\n\nReply with your answer.`);
    } catch (err) {
      console.error('[RIDDLE ERROR]', err.message);
      await m.reply('❌ *Could not fetch a riddle right now.*');
    }
    return;
  }

  // Handle user’s answer
  if (activeRiddles[m.sender]) {
    const userAnswer = m.body.trim().toLowerCase();
    const correct = activeRiddles[m.sender];

    if (userAnswer === correct) {
      await m.reply(`🎉 Correct! The answer is indeed *${correct}*`);
    } else {
      await m.reply(`❌ Close—but the right answer was **${correct}**.`);
    }

    delete activeRiddles[m.sender];
  }
};

export default riddleCommand;
