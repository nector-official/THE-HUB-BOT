import config from '../../config.cjs';
import axios from 'axios';

const motivationCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  // Allow aliases if needed
  const aliases = ['motivation', 'motive', 'quote', 'inspire'];
  if (!aliases.includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "💪", key: m.key } });

  // Local backup quotes
  const localQuotes = [
    { q: "Your limitation—it’s only your imagination.", a: "Unknown" },
    { q: "Push yourself, because no one else is going to do it for you.", a: "Unknown" },
    { q: "Sometimes later becomes never. Do it now.", a: "Unknown" },
    { q: "Great things never come from comfort zones.", a: "Unknown" },
    { q: "Dream it. Wish it. Do it.", a: "Unknown" },
    { q: "Success doesn’t just find you. You have to go out and get it.", a: "Unknown" },
    { q: "The harder you work for something, the greater you’ll feel when you achieve it.", a: "Unknown" },
    { q: "Don’t watch the clock; do what it does. Keep going.", a: "Sam Levenson" }
  ];

  try {
    // Try fetching from ZenQuotes API
    const res = await axios.get('https://zenquotes.io/api/random');
    if (!Array.isArray(res.data) || !res.data[0]?.q) throw new Error("Invalid API response");

    const quote = res.data[0].q;
    const author = res.data[0].a;

    await m.reply(`💡 *Motivational Quote*\n\n_"${quote}"_\n— *${author}*`);
  } catch (err) {
    console.error('[MOTIVATION ERROR]', err.message);

    // Fallback to local quote
    const randomQuote = localQuotes[Math.floor(Math.random() * localQuotes.length)];
    await m.reply(`💡 *Motivational Quote*\n\n_"${randomQuote.q}"_\n— *${randomQuote.a}*`);
  }
};

export default motivationCommand;
