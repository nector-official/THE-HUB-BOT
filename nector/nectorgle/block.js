import config from '../../config.cjs';

const blockCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'block') return;

  const args = m.body.slice(config.PREFIX.length + command.length).trim();
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const isOwner = [botNumber, `${config.OWNER_NUMBER}@s.whatsapp.net`].includes(m.sender);

  await Matrix.sendMessage(m.from, { react: { text: "🚫", key: m.key } });

  if (!isOwner) {
    return m.reply('📛 *THIS IS AN OWNER-ONLY COMMAND*');
  }

  if (!args && !m.quoted) {
    return m.reply(`❗ Usage: ${config.PREFIX}block 2547xxxxxxxx`);
  }

  const target = m.isGroup
    ? (args ? args.replace(/\D/g, '') + '@s.whatsapp.net' : m.quoted?.sender)
    : m.chat;

  try {
    await Matrix.updateBlockStatus(target, 'block');
    await m.reply('✅ *User successfully blocked!*');
  } catch (err) {
    console.error('[Block Error]', err.message);
    await m.reply('❌ Failed to block the user.');
  }
};

export default blockCommand;
                                             
