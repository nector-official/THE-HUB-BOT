import Parser from 'rss-parser';
import config from '../../config.cjs';

const parser = new Parser();

const trendingCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'trending') return;

  await Matrix.sendMessage(m.from, { react: { text: "🌍", key: m.key } });

  const feedUrls = [
    { title: 'Global News', url: 'https://news.google.com/rss' },
    { title: 'Kenya News', url: 'https://nation.africa/rss/latest.xml' }
  ];

  let result = '📢 *Trending Today*\n\n';

  await Promise.all(feedUrls.map(async (feedInfo) => {
    try {
      const feed = await parser.parseURL(feedInfo.url);
      if (!feed.items || feed.items.length === 0) {
        result += `❌ No ${feedInfo.title} available.\n\n`;
        return;
      }
      result += `🗞 *${feedInfo.title}*\n`;
      feed.items.slice(0, 5).forEach((item, i) => {
        result += `*${i+1}.* ${item.title}\n🌐 ${item.link}\n\n`;
      });
    } catch (err) {
      console.error(`[RSS Error: ${feedInfo.title}]`, err.message);
      result += `❌ Error loading ${feedInfo.title}.\n\n`;
    }
  }));

  await Matrix.sendMessage(m.chat, { text: result.trim() }, { quoted: m });
};

export default trendingCommand;
