import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import config from '../../config.cjs';

const trendingCommand = async (m, Matrix) => {
  const cmd = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  if (cmd !== 'trending') return;

  await Matrix.sendMessage(m.from, { react: { text: "🌍", key: m.key } });

  const feeds = [
    {
      title: 'Kenya News',
      url: 'https://www.standardmedia.co.ke/rss/headlines.php',
    },
    {
      title: 'Global News',
      url: 'https://news.google.com/news/rss?hl=en',
    },
  ];

  let result = '📢 *Trending News*\n\n';

  for (const feed of feeds) {
    try {
      const { data } = await axios.get(feed.url);
      const parsed = await parseStringPromise(data);

      const items = parsed.rss.channel[0].item.slice(0, 5); // Top 5 items

      result += `🗞 *${feed.title}*\n`;
      items.forEach((item, i) => {
        result += `*${i + 1}.* ${item.title[0]}\n🔗 ${item.link[0]}\n\n`;
      });
    } catch (err) {
      console.error(`[Error loading ${feed.title}]:`, err.message);
      result += `❌ Could not load ${feed.title}.\n\n`;
    }
  }

  await Matrix.sendMessage(m.chat, { text: result.trim() }, { quoted: m });
};

export default trendingCommand;
