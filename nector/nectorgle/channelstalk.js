import config from '../../config.cjs';
import axios from 'axios';

const channelStalkCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (!["channelstalk", "channel-stalk"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "✅️", key: m.key } });

  if (!args) {
    return m.reply("📢 *Please provide a WhatsApp Channel ID.*\n\nExample:\n`channelstalk 120363395396503029@newsletter`");
  }

  try {
    const res = await axios.get(`https://zenzapi.xyz/api/stalk/channel?apikey=BagasPrdn&jid=${args}`);
    if (!res.data.status) {
      return m.reply("❌ *Channel not found or data unavailable.*");
    }

    const ch = res.data.result;
    const caption = `📢 *WhatsApp Channel Info*\n\n` +
      `◦ *Name:* ${ch.name}\n` +
      `◦ *Username:* ${ch.username || "N/A"}\n` +
      `◦ *Description:* ${ch.desc || "No description"}\n` +
      `◦ *Subscriber Count:* ${ch.subscriber_count || "N/A"}\n` +
      `◦ *Views:* ${ch.views || "N/A"}\n` +
      `◦ *Link:* wa.me/${args.split('@')[0]}\n\n` +
      `🆔 *NewsletterJID:* ${args}`;

    await Matrix.sendMessage(m.chat, {
      image: { url: ch.profile || 'https://files.catbox.moe/v4uikp.jpg' },
      caption
    }, { quoted: m });

  } catch (error) {
    console.error("[ChannelStalk Error]", error.message);
    return m.reply("❌ *Failed to fetch channel info. Please try again later.*");
  }
};

export default channelStalkCommand;
