import config from '../../config.cjs';

const deleteCommand = async (m, Matrix, msg, react, Replymk, isGroup, isAdmin, isBotAdmin) => {
  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const isOwner = [botNumber, `${config.OWNER_NUMBER}@s.whatsapp.net`].includes(m.sender);
  const prefix = config.PREFIX;

  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'delete' && command !== 'del') return;

  await react(m, "✅️");

  if (!m.quoted) {
    return Replymk("❗ *Reply to the message you want to delete.*");
  }

  try {
    if (isGroup) {
      if (!isOwner && !isAdmin) return Replymk(msg.admin);

      const isBotMsg = m.quoted.sender === botNumber;

      if (isBotMsg) {
        await Matrix.sendMessage(m.chat, {
          delete: {
            remoteJid: m.chat,
            fromMe: true,
            id: m.quoted.id,
            participant: m.quoted.sender
          }
        });
      } else {
        if (!isBotAdmin) return Replymk(msg.adminbot);

        await Matrix.sendMessage(m.chat, {
          delete: {
            remoteJid: m.chat,
            fromMe: false,
            id: m.quoted.id,
            participant: m.quoted.sender
          }
        });
      }
    } else {
      if (!isOwner) return Replymk(msg.owner);

      await Matrix.sendMessage(m.chat, {
        delete: {
          remoteJid: m.chat,
          fromMe: false,
          id: m.quoted.id,
          participant: m.quoted.sender
        }
      });
    }
  } catch (err) {
    console.error('[Delete Command Error]', err.message);
    await Matrix.sendMessage(m.from, {
      text: '❌ *An error occurred while deleting the message.*'
    }, { quoted: m });
  }
};

export default deleteCommand;
