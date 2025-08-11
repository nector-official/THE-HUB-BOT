import config from '../../config.cjs';

const addCommand = async (m, Matrix) => {
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const prefix = config.PREFIX;

  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'add' && command !== 'addmember') return;

  if (!m.isGroup) {
    return m.reply("❌ This command can only be used in groups.");
  }

  // Get number from args or quoted message
  let number;
  const args = m.body.slice(prefix.length + command.length).trim();

  if (args) {
    number = args.replace(/[^0-9]/g, '');
  } else if (m.quoted) {
    number = m.quoted.sender.split('@')[0];
  } else {
    return m.reply(`📌 Example:\n\`${prefix}${command} 2547xxxxxxx\`\nOr reply to a user with \`${prefix}${command}\``);
  }

  const jid = `${number}@s.whatsapp.net`;

  try {
    const exists = await Matrix.onWhatsApp(number);
    if (!exists || exists.length < 1) {
      return m.reply("❌ That number is not registered on WhatsApp.");
    }

    const groupMetadata = await Matrix.groupMetadata(m.from);
    const botInGroup = groupMetadata.participants.find(p => p.id === botNumber);
    if (!botInGroup || !botInGroup.admin) {
      return m.reply("❌ I need to be an *admin* to add members.");
    }

    const result = await Matrix.groupParticipantsUpdate(m.from, [jid], 'add');

    switch (result[0].status) {
      case 200:
        return m.reply(`✅ Successfully added *${number}* to the group.`);
      case 403:
        return m.reply(`❌ Cannot add *${number}*. They have restricted group invitations.`);
      case 408:
        return m.reply(`❌ Cannot add *${number}*. They do not allow being added directly.`);
      case 409:
        return m.reply(`⚠️ *${number}* is already in the group.`);
      default:
        return m.reply(`❌ Failed to add *${number}*. Status: ${result[0].status}`);
    }
  } catch (err) {
    console.error('[ADD ERROR]', err.message);
    return m.reply("❌ An error occurred while trying to add the member.");
  }
};

export default addCommand;
