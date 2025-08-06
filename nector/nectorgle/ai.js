import config from '../../config.cjs';
import axios from 'axios';

const chatgptCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (!["ai", "chatgpt"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "🤖", key: m.key } });

  if (!args) {
    return m.reply("💬 *Please provide a question for the AI.*\n\nExample:\n`" + config.PREFIX + command + " What is the Nile River?`");
  }

  try {
    const res = await axios.get(`https://api.safone.co/chatbot?query=${encodeURIComponent(args)}`);
    const reply = res.data?.result || res.data?.response;

    if (!reply) {
      return m.reply("❌ *No answer found. Try again later.*");
    }

    await m.reply(`🤖 *AI Response:*\n\n${reply}`);
  } catch (err) {
    console.error("[Safone Chat Error]", err.message);
    m.reply("❌ *Error contacting AI service. Try again later.*");
  }
};

export default chatgptCommand;
                                  
