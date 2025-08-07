import config from '../../config.cjs';
import axios from 'axios';
import xml2js from 'xml2js';

const parseRSS = async (url) => {
  try {
    const res = await axios.get(url);
    const data = await xml2js.parseStringPromise(res.data);
    return data.rss?.channel?.[0]?.item?.slice(0, 5) || [];
  } catch (err) {
    console.error("[RSS Parse Error]", err.message);
    return [];
  }
};

const trendingCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'trending') return;

  await Matrix.sendMessage(m.from, { react: { text: "🌍", key: m.key } });

  const [globalItems, kenyaItems] = await Promise.all([
    parseRSS('https://news.google.com/news/rss'),
    parseRSS('https://nation.africa/rss/latest.xml')
  ]);

  const formatItems = (title, items) => {
    if (items.length === 0) return `❌ No ${title} found.\n`;
    return `🗞 *${title}*\n` + items.map((item, i) => {
      const ti = item.title?.[0] || 'N/A';
      const link = item.link?.[0] || 'N/A';
      return `*${i+1}.* ${ti}\n🌐 ${link}`;
    }).join("\n\n");
  };

  const result = `📢 *Trending Today*\n\n${formatItems("Global News", globalItems)}\n\n${formatItems("Kenya News", kenyaItems)}`;

  await Matrix.sendMessage(m.chat, { text: result }, { quoted: m });
};

export default trendingCommand;
