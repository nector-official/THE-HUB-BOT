import config from '../../config.cjs';
import axios from 'axios';

let activeRiddles = {};

// normalize: lowercase, remove punctuation, trim
function normalize(str = '') {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();
}

// Levenshtein distance (for fuzzy matching)
function levenshtein(a = '', b = '') {
  const n = a.length, m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[n][m];
}

function similarity(a, b) {
  if (!a.length && !b.length) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

const riddleCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  const aliases = ['riddle', 'quiz', 'puzzle', 'brain'];

  if (aliases.includes(command)) {
    await Matrix.sendMessage(m.from, { react: { text: "❓", key: m.key } });

    try {
      const res = await axios.get('https://riddles-api.vercel.app/random');
      const { riddle, answer } = res.data;

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

  if (activeRiddles[m.sender]) {
    const userAnswerRaw = m.body || '';
    const userAnswer = normalize(userAnswerRaw);
    const { original, normalized } = activeRiddles[m.sender];

    let isCorrect = false;

    // 1) exact / substring checks
    if (
      userAnswer === normalized ||
      normalized.includes(userAnswer) ||
      userAnswer.includes(normalized)
    ) {
      isCorrect = true;
    } else {
      // 2) token overlap (ignore very short words)
      const correctWords = normalized.split(/\s+/).filter(w => w.length > 2);
      const userWords = userAnswer.split(/\s+/).filter(w => w.length > 2);

      const overlap = correctWords.filter(w => userAnswer.includes(w)).length;
      if (overlap >= 1) {
        isCorrect = true;
      } else {
        // 3) per-word fuzzy match (catch typos)
        let perWordFuzzy = false;
        for (const cw of correctWords) {
          for (const uw of userWords) {
            if (similarity(cw, uw) >= 0.85) {
              perWordFuzzy = true;
              break;
            }
          }
          if (perWordFuzzy) break;
        }
        if (perWordFuzzy) isCorrect = true;
        else {
          // 4) whole-string fuzzy similarity (allow short paraphrases)
          if (similarity(userAnswer, normalized) >= 0.55) {
            isCorrect = true;
          }
        }
      }
    }

    if (isCorrect) {
      await m.reply(`🎉 Correct! The answer is indeed *${original}* 👏`);
    } else {
      await m.reply(`❌ Oops! The correct answer was *${original}*.`);
    }

    delete activeRiddles[m.sender];
  }
};

export default riddleCommand;
