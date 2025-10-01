import config from '../../config.cjs';
import axios from 'axios';

const chatgptCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (!["ai", "gpt", "chatgpt"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "🤖", key: m.key } });

  if (!args) {
    return m.reply(
      "💬 *Please provide a question for the AI.*\n\nExample:\n`" +
        config.PREFIX +
        command +
        " Who discovered gravity?`"
    );
  }

  // List of free APIs (in priority order)
  const apis = [
    {
      name: "Kenlie GPT4",
      type: "AI",
      url: (q) => `https://api.kenliejugarap.com/api/gpt4?prompt=${encodeURIComponent(q)}`,
      extract: (data) => data?.response
    },
    {
      name: "Safone Chatbot",
      type: "AI",
      url: (q) => `https://api.safone.co/chatbot?query=${encodeURIComponent(q)}`,
      extract: (data) => data?.result || data?.response
    },
    {
      name: "Advice Slip",
      type: "Advice",
      url: () => `https://api.adviceslip.com/advice`,
      extract: (data) => data?.slip?.advice
    },
    {
      name: "ZenQuotes",
      type: "Quote",
      url: () => `https://zenquotes.io/api/random`,
      extract: (data) => data?.[0]?.q + " — " + data?.[0]?.a
    },
    {
      name: "Useless Facts",
      type: "Fact",
      url: () => `https://uselessfacts.jsph.pl/random.json?language=en`,
      extract: (data) => data?.text
    }
  ];

  let reply = null;

  for (let i = 0; i < apis.length; i++) {
    const api = apis[i];
    try {
      const res = await axios.get(api.url(args), { timeout: 10000 });
      reply = api.extract(res.data);

      if (reply) {
        // First API = normal response
        if (i === 0) {
          await m.reply(`🤖 *AI Response (from ${api.name}):*\n\n${reply}`);
        } else {
          // Show fallback notice
          await m.reply(
            `⚠️ *Main AI service is down.*\n` +
            `Here’s a reply from *${api.type} service* (${api.name}):\n\n${reply}`
          );
        }
        return;
      }
    } catch (err) {
      console.error(`[${api.name} Error]`, err.message);
      continue; // try next API
    }
  }

  // If all fail
  await m.reply("❌ *All free AI services are unavailable right now. Please try again later.*");
};

export default chatgptCommand;
