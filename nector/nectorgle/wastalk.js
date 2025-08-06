import config from '../../config.cjs';

const waStalkCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (!["wa-stalk", "wastalk"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "❄️", key: m.key } });

  if (!args) {
    return m.reply("🔍 *Please enter a WhatsApp number.*\n\nExample: `wa-stalk 2547xxxxxxx`");
  }

  const number = args.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  try {
    const pp = await Matrix.profilePictureUrl(number, "image")
      .catch(() => 'https://files.catbox.moe/v4uikp.jpg');

    const name = await Matrix.getName(number);
    const bio = (await Matrix.fetchStatus(number).catch(() => {}))?.status || 'Not Found';

    await Matrix.sendMessage(m.chat, {
      image: { url: pp },
      caption:
        `🔍 *WhatsApp User Stalker*\n\n` +
        `◦ *ɴᴀᴍᴇ:* ${name}\n` +
        `◦ *ɴᴜᴍʙᴇʀ:* ${number.split("@")[0]}\n` +
        `◦ *ʙɪᴏ:* ${bio}\n\n` +
        `> 👁 *ᴘᴏᴡᴇʀᴇᴅ ʙʏ nector-ʙᴏᴛ*`
    }, { quoted: m });

  } catch (err) {
    console.error("[WA-Stalk Error]", err.message);
    m.reply("❌ *Couldn't fetch info. Make sure the number is on WhatsApp.*");
  }
};

export default waStalkCommand;
