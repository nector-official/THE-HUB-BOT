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
      const res = await axios.get('https://riddles-api.vercel.app/random');
      const { riddle, answer } = res.data;

      // Store the answer for the user
      activeRiddles[m.sender] = answer.toLowerCase().trim();

      await m.reply(`🧩 *Riddle Time!*\n\n${riddle}\n\n💬 Reply with your answer.`);
    } catch (err) {
      console.error('[RIDDLE ERROR]', err.message);
      await m.reply('❌ *Could not fetch a riddle right now.*');
    }
    return;
  }

  // If the user is answering
  if (activeRiddles[m.sender]) {
    const userAnswer = m.body.trim().toLowerCase();
    const correct = activeRiddles[m.sender];

    if (userAnswer === correct) {
      await m.reply(`🎉 Correct! The answer is indeed *${correct}* 👏`);
    } else {
      await m.reply(`❌ Oops! The correct answer was *${correct}*.`);
    }

    delete activeRiddles[m.sender]; // Clear the stored riddle
  }
};

export default riddleCommand;
