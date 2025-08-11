import config from '../../config.cjs';
import axios from 'axios';

let activeRiddles = {};

// Helper function to normalize answers (remove punctuation, lowercase, trim)
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .trim();
}

const riddleCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  // Aliases for the riddle command
  const aliases = ['riddle', 'quiz', 'puzzle', 'brain'];

  // If user requests a new riddle
  if (aliases.includes(command)) {
    await Matrix.sendMessage(m.from, { react: { text: "❓", key: m.key } });

    try {
      // Fetch a random riddle
      const res = await axios.get('https://riddles-api.vercel.app/random');
      const { riddle, answer } = res.data;

      // Store the correct answer for the user (original + normalized)
      activeRiddles[m.sender] = {
        original: answer.trim(),
        normalized: normalize(answer)
      };

      await m.reply(`🧩 *Riddle Time!*\n\n${riddle}\n\n💬 Reply with your answer.`);
    } catch (err) {
      console.error('[RIDDLE ERROR]', err.message);
      await m.reply('❌ *Could not fetch a riddle right now.*');
    }
    return;
  }

  // If user is answering an active riddle
  if (activeRiddles[m.sender]) {
    const userAnswer = normalize(m.body);
    const { original, normalized } = activeRiddles[m.sender];

    // Keyword overlap check
    const correctWords = normalized.split(/\s+/).filter(w => w.length > 2); // ignore very short words
    const matchingWords = correctWords.filter(word => userAnswer.includes(word));

    if (userAnswer === normalized || matchingWords.length >= 2) {
      await m.reply(`🎉 Correct! The answer is indeed *${original}* 👏`);
    } else {
      await m.reply(`❌ Oops! The correct answer was *${original}*.`);
    }

    delete activeRiddles[m.sender];
  }
};

export default riddleCommand;
