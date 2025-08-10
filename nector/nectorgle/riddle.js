import config from '../../config.cjs';
import axios from 'axios';

let activeRiddles = {};

const riddleCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  // Aliases for the riddle command
  const aliases = ['riddle', 'quiz', 'puzzle', 'brain'];

  // Check if the command is one of the aliases
  if (aliases.includes(command)) {
    await Matrix.sendMessage(m.from, { react: { text: "❓", key: m.key } });

    try {
      // Fetch a random riddle
      const res = await axios.get('https://riddles-api.vercel.app/random');
      const { riddle, answer } = res.data;

      // Store the correct answer for the user
      activeRiddles[m.sender] = answer.toLowerCase().trim();

      await m.reply(`🧩 *Riddle Time!*\n\n${riddle}\n\n💬 Reply with your answer.`);
    } catch (err) {
      console.error('[RIDDLE ERROR]', err.message);
      await m.reply('❌ *Could not fetch a riddle right now.*');
    }
    return;
  }

  // If user is answering an active riddle
  if (activeRiddles[m.sender]) {
    const userAnswer = m.body.trim().toLowerCase();
    const correct = activeRiddles[m.sender];

    if (userAnswer === correct) {
      await m.reply(`🎉 Correct! The answer is indeed *${correct}* 👏`);
    } else {
      await m.reply(`❌ Oops! The correct answer was *${correct}*.`);
    }

    // Remove stored riddle after answering
    delete activeRiddles[m.sender];
  }
};

export default riddleCommand;
