import config from '../../config.cjs';

const hidetagCommand = async (m, Matrix, { isGroup, isAdmin, isOwner, groupMetadata }) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (!["hidetag", "z", "h"].includes(command)) return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });

    if (!isGroup) {
      return m.reply("❌ This command only works in groups.");
    }

    if (!isAdmin && !isOwner) {
      return m.reply("❌ You must be an admin to use this.");
    }

    if (!args && !m.quoted) {
      return m.reply(`💡 Example: ${config.PREFIX}hidetag Hello everyone! (or reply to a message)`);
    }

    const teks = m.quoted ? m.quoted.text : args;
    const members = groupMetadata.participants.map(e => e.id);

    await Matrix.sendMessage(m.from, {
      text: teks,
      mentions: members
    }, { quoted: m });

  } catch (err) {
    console.error('[Hidetag Error]', err.message);
    m.reply("❌ An error occurred while trying to mention everyone.");
  }
};

export default hidetagCommand;
