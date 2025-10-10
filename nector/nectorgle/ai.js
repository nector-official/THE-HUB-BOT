import config from '../../config.cjs';
import axios from 'axios';

const chatgptCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  // Command aliases
  if (!["ai", "gpt", "chatgpt"].includes(command)) return;

  // React while processing
  await Matrix.sendMessage(m.from, { react: { text: "🤖", key: m.key } });

  // If no query provided
  if (!args) {
    return m.reply(`💬 *Please provide a question for the AI.*\n\nExample:\n\`${config.PREFIX + command} What is the Nile River?\``);
  }

  try {
    let reply;

    // ⚙️ Primary API → HectorManuel GPT-4.5
    try {
      const hectorRes = await axios.get(`https://all-in-1-ais.officialhectormanuel.workers.dev/?query=${encodeURIComponent(args)}&model=gpt-4.5`);
      if (hectorRes.data && hectorRes.data.success && hectorRes.data.message?.content) {
        reply = hectorRes.data.message.content;
      }
    } catch (err) {
      console.warn("[Primary API Error]", err.message);
    }

    // 🔁 Secondary API → Safone fallback
    if (!reply) {
      try {
        const safoneRes = await axios.get(`https://api.safone.co/chatbot?query=${encodeURIComponent(args)}`);
        reply = safoneRes.data?.result || safoneRes.data?.response;
      } catch (err) {
        console.warn("[Safone Fallback Error]", err.message);
      }
    }

    // If both APIs fail
    if (!reply) {
      return m.reply("❌ *No answer found. Try again later.*");
    }

    // Send AI response
    await m.reply(`🤖 *AI Response:*\n\n${reply}`);

  } catch (err) {
    console.error("[AI Command Error]", err.message);
    await m.reply("❌ *Error contacting AI service. Try again later.*");
  }
};

export default chatgptCommand;
