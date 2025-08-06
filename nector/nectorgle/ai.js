import config from '../../config.cjs';
import axios from 'axios';

const aiChatCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (!["ai", "chatgpt"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "🤖", key: m.key } });

  if (!args) {
    return m.reply("💬 *Please provide a question or message for ChatGPT.*\n\nExample:\n`*ai Who was Nelson Mandela?`");
  }

  try {
    const res = await axios.get(`https://api.safone.dev/chatgpt?query=${encodeURIComponent(args)}`);
    const reply = res.data?.response;

    if (!reply) {
      return m.reply("❌ *No response from ChatGPT. Try again later.*");
    }

    await m.reply(`🤖 *ChatGPT Response:*\n\n${reply}`);

  } catch (err) {
    console.error("[ChatGPT Error]", err.message);
    m.reply("❌ *Error communicating with ChatGPT. Please try again later.*");
  }
};

export default aiChatCommand;
