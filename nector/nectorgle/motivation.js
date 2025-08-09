import config from '../../config.cjs';
import axios from 'axios';

const motivationCommand = async (m, Matrix) => {
  const args = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).trim().split(' ')
    : [];

  const command = args.shift()?.toLowerCase();
  if (command !== 'motivation') return;

  const keyword = args.join(' ').trim().toLowerCase();

  await Matrix.sendMessage(m.from, { react: { text: "💪", key: m.key } });

  try {
    // Fetch multiple quotes to increase chance of matching
    const res = await axios.get('https://zenquotes.io/api/quotes');
    const quotes = res.data;

    let chosenQuote;
    if (keyword) {
      // Filter quotes containing the keyword
      const filtered = quotes.filter(q =>
        q.q.toLowerCase().includes(keyword) || q.a.toLowerCase().includes(keyword)
      );
      if (filtered.length > 0) {
        chosenQuote = filtered[Math.floor(Math.random() * filtered.length)];
      }
    }

    // If no keyword or no match found, just pick a random quote
    if (!chosenQuote) {
      if (keyword) {
        await m.reply(`❌ No specific quotes found for "${keyword}". Showing a random one instead.`);
      }
      chosenQuote = quotes[Math.floor(Math.random() * quotes.length)];
    }

    await m.reply(`💡 *Motivational Quote*\n\n_"${chosenQuote.q}"_\n— *${chosenQuote.a}*`);
  } catch (err) {
    console.error('[MOTIVATION ERROR]', err.message);
    m.reply('❌ *Could not fetch motivation right now.*');
  }
};

export default motivationCommand;
