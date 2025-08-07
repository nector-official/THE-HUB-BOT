import config from '../../config.cjs';

const deleteCommand = async (m, { conn }) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'delete') return;

  // Check if the message is a reply
  if (!m.quoted) return m.reply('❗ Reply to a message you want to delete.');

  const isGroup = m.isGroup;
  const sender = m.sender;
  const groupMetadata = isGroup ? await conn.groupMetadata(m.chat) : null;
  const isAdmin = isGroup
    ? groupMetadata.participants.find(p => p.id === sender)?.admin !== undefined
    : true;

  // Only delete if user is admin or it's private chat
  if (!isAdmin && isGroup) {
    return m.reply('🚫 You need to be an *admin* to delete messages in this group.');
  }

  try {
    await conn.sendMessage(m.chat, {
      delete: {
        remoteJid: m.chat,
        fromMe: false,
        id: m.quoted.id.id,
        participant: m.quoted.sender
      }
    });
    await m.react('🗑️');
  } catch (error) {
    console.error('[Delete Error]', error.message);
    m.reply('⚠️ Failed to delete the message.');
  }
};

export default deleteCommand;
