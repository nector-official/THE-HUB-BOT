import config from '../../config.cjs';
import axios from 'axios';

const googleSearchCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (command !== 'google') return;

  await Matrix.sendMessage(m.from, { react: { text: "✅️", key: m.key } });

  if (!args) {
    return m.reply('❗ *Provide a search term!*\n\nExample:\n`*google What is treason?`');
  }

  try {
    const { data } = await axios.get(
      `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(args)}&key=AIzaSyDMbI3nvmQUrfjoCJYLS69Lej1hSXQjnWI&cx=baf9bdb0c631236e5`
    );

    if (!data.items || data.items.length === 0) {
      return m.reply("❌ *Unable to find any results.*");
    }

    let resultText = `🔎 *Google Search Results*\n\n🔍 *Query:* ${args}\n\n`;
    for (let i = 0; i < Math.min(5, data.items.length); i++) {
      const item = data.items[i];
      resultText += `📌 *Title:* ${item.title}\n📝 *Description:* ${item.snippet}\n🌐 *Link:* ${item.link}\n\n`;
    }

    await m.reply(resultText);

  } catch (err) {
    console.error("[Google Error]", err.message);
    m.reply("❌ *Failed to fetch search results. Please try again later.*");
  }
};

export default googleSearchCommand;
