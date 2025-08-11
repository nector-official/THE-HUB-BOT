import config from '../../config.cjs';

const addCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  // Aliases
  if (!['add', 'invite', 'bring'].includes(command)) return;

  try {
    const groupMetadata = await Matrix.groupMetadata(m.from);
    const botNumber = await Matrix.decodeJid(Matrix.user.id);

    // Find bot participant
    const botInGroup = groupMetadata.participants.find(p => p.id === botNumber);

    if (!botInGroup?.admin) {
      return m.reply("❌ I need to be an *admin* to add members.");
    }

    // Extract number from args or replied message
    let number;
    const args = m.body.slice(prefix.length + command.length).trim();

    if (args) {
      number = args.replace(/[^0-9]/g, '');
    } else if (m.quoted && m.quoted.sender) {
      number = m.quoted.sender.split('@')[0];
    } else {
      return m.reply(`📌 Provide a number or reply to a message.\nExample: \`${prefix}add 2547xxxxxxx\``);
    }

    const check = await Matrix.onWhatsApp(number);
    if (!check.length) {
      return m.reply("❌ That number is not registered on WhatsApp.");
    }

    const res = await Matrix.groupParticipantsUpdate(m.from, [`${number}@s.whatsapp.net`], 'add');
    const status = res[0]?.status;

    if (status === 200) return m.reply(`✅ Added ${number} to the group.`);
    if (status === 408) return m.reply(`❌ ${number} does not allow others to add them.`);
    if (status === 409) return m.reply(`⚠️ ${number} is already in the group.`);
    if (status === 403) return m.reply(`❌ ${number} has restricted group joins.`);

    m.reply(`❌ Failed to add member. Status: ${status}`);

  } catch (err) {
    console.error('[ADD MEMBER ERROR]', err.message);
    m.reply("❌ Could not add member.");
  }
};

export default addCommand;
