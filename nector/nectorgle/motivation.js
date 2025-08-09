import config from '../../config.cjs';
import axios from 'axios';

const keywordEmojis = {
  success: "🔥",
  breakthrough: "🚀",
  hope: "🌈",
  love: "💖",
  happiness: "😊",
  joy: "😄",
  life: "🌱",
  strength: "💪",
  courage: "🦁",
  faith: "🙏",
  motivation: "💡",
  default: "💡"
};

const keywordSuggestions = {
  success: ["breakthrough", "achievement", "goal", "victory"],
  love: ["relationships", "heart", "affection", "romance"],
  happiness: ["joy", "smile", "positive", "fun"],
  strength: ["courage", "resilience", "determination"],
  hope: ["faith", "belief", "future", "positivity"],
  courage: ["bravery", "strength", "fearless", "bold"],
  faith: ["hope", "belief", "trust", "confidence"]
};

const motivationCommand = async (m, Matrix) => {
  const args = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).trim().split(' ')
    : [];

  const command = args.shift()?.toLowerCase();
  if (command !== 'motivation') return;

  const keywords = args.map(k => k.trim().toLowerCase()).filter(k => k);
  const firstKeyword = keywords[0] || "motivation";

  const emoji = keywordEmojis[firstKeyword] || keywordEmojis.default;

  await Matrix.sendMessage(m.from, { react: { text: emoji, key: m.key } });

  try {
    const res = await axios.get('https://zenquotes.io/api/quotes');
    const quotes = res.data;

    let selectedQuotes = [];

    if (keywords.length > 0) {
      const filtered = quotes.filter(q =>
        keywords.some(kw =>
          q.q.toLowerCase().includes(kw) || q.a.toLowerCase().includes(kw)
        )
      );
      if (filtered.length > 0) {
        selectedQuotes = filtered.sort(() => 0.5 - Math.random()).slice(0, 3);
      }
    }

    if (selectedQuotes.length === 0) {
      if (keywords.length > 0) {
        let suggestionText = "";
        if (keywordSuggestions[firstKeyword]) {
          suggestionText = `💡 Try related keywords: ${keywordSuggestions[firstKeyword].map(k => `"${k}"`).join(', ')}`;
        }
        await m.reply(`❌ No quotes found for "${keywords.join(' ')}". Showing random ones instead.\n${suggestionText}`);
      }
      selectedQuotes = quotes.sort(() => 0.5 - Math.random()).slice(0, 3);
    }

    // Send each quote as an image card
    for (let q of selectedQuotes) {
      const imageUrl = `https://dummyimage.com/800x450/2e2e2e/ffffff.png&text=${encodeURIComponent(`"${q.q}"\n— ${q.a}`)}`;
      await Matrix.sendMessage(m.from, {
        image: { url: imageUrl },
        caption: `${emoji} *Motivational Quote*\n\n_"${q.q}"_\n— *${q.a}*`
      });
    }

  } catch (err) {
    console.error('[MOTIVATION ERROR]', err.message);
    m.reply('❌ *Could not fetch motivation right now.*');
  }
};

export default motivationCommand;
