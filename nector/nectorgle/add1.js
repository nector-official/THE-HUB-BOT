import config from '../../config.cjs';

const addCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  // Supported aliases
  if (!['add', 'invite', 'bring'].includes(command)) return;

  // Must be in a group
  if (!m.isGroup) {
    return m.reply("❌ This command can only be used in groups.");
  }

  const groupMetadata = await Matrix.groupMetadata(m.from);
  const botNumber = await Matrix.decodeJid(Matrix.user.id);

  // Check if bot is admin
  const botInGroup = groupMetadata.participants.find(p => p.id === botNumber);
  if (!botInGroup || (botInGroup.admin !== 'admin' && botInGroup.admin !== 'superadmin')) {
    return m.reply("❌ I need to be an *admin* to add members.");
  }

  // Get the number to add
  const args = m.body.slice(prefix.length + command.length).trim();
  if (!args) {
    return m.reply(`📌 Please provide a number to add.\nExample: \`${prefix}add 2547xxxxxxx\``);
  }

  const number = args.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  const check = await Matrix.onWhatsApp(number.split('@')[0]);

  if (check.length < 1) {
    return m.reply("❌ That number is not registered on WhatsApp.");
  }

  try {
    const res = await Matrix.groupParticipantsUpdate(m.from, [number], 'add');
    const status = res[0]?.status;

    if (status === 200) {
      return m.reply(`✅ Successfully added ${number.split("@")[0]} to the group.`);
    }
    if (status === 408) {
      return m.reply(`❌ Failed to add ${number.split("@")[0]}. The user does not allow others to add them.`);
    }
    if (status === 409) {
      return m.reply(`⚠️ ${number.split("@")[0]} is already in the group!`);
    }
    if (status === 403) {
      return m.reply(`❌ Cannot add ${number.split("@")[0]}. The user has restricted group joins.`);
    }

    return m.reply(`❌ Failed to add member. Status code: ${status}`);

  } catch (err) {
    console.error('[ADD MEMBER ERROR]', err.message);
    m.reply("❌ Failed to add member. Please try again.");
  }
};

export default addCommand;
