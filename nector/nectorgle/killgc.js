import config from '../../config.cjs';

const killGroupCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  const argsRaw = m.body.slice(config.PREFIX.length + command.length).trim();
  const args = argsRaw.split(' ');

  if (!['killgc', 'kickall'].includes(command)) return;

  const botNumber = await Matrix.decodeJid(Matrix.user.id);
  const isOwner = [botNumber, `${config.OWNER_NUMBER}@s.whatsapp.net`].includes(m.sender);

  try {
    await Matrix.sendMessage(m.from, { react: { text: "💥", key: m.key } });

    if (!isOwner) {
      return m.reply("🚫 *Hold up!* This command is for the big boss only. You’re not the boss of me!");
    }

    if (!args[0]) {
      return m.reply("❗ Provide a valid group link. Ensure the bot is in that group with admin privileges!");
    }

    let groupId, groupName;

    try {
      const inviteCode = args[0].split("https://chat.whatsapp.com/")[1];
      const groupInfo = await Matrix.groupGetInviteInfo(inviteCode);
      groupId = groupInfo.id;
      groupName = groupInfo.subject;
    } catch (err) {
      return m.reply("❌ Invalid group link. Please check again.");
    }

    const metadata = await Matrix.groupMetadata(groupId);
    const participants = metadata.participants;
    const participantIds = participants
      .filter(p => p.id !== botNumber)
      .map(p => p.id);

    await m.reply(`☠️ Initializing kill protocol for *${groupName}*...`);

    await Matrix.groupSettingUpdate(groupId, "announcement");
    await Matrix.removeProfilePicture(groupId);
    await Matrix.groupUpdateSubject(groupId, "𝗧𝗵𝗶𝘀 𝗴𝗿𝗼𝘂𝗽 𝗶𝘀 𝗻𝗼 𝗹𝗼𝗻𝗴𝗲𝗿 𝗮𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 🚫");
    await Matrix.groupUpdateDescription(groupId, "//𝗕𝘆 𝘁𝗵𝗲 𝗼𝗿𝗱𝗲𝗿 𝗼𝗳 *ⓃⒺCⓉOR🍯* !");
    await Matrix.groupRevokeInvite(groupId);

    await Matrix.sendMessage(groupId, {
      text: `⚠️ My owner has remotely triggered the kill protocol.\n\nAll ${participantIds.length} members will now be removed.\n\nGoodbye Everyone! 👋`,
      mentions: participantIds
    });

    await Matrix.groupParticipantsUpdate(groupId, participantIds, "remove");

    await Matrix.sendMessage(groupId, {
      text: "Goodbye Group owner 👋\nIt's too cold in here 🥶"
    });

    await Matrix.groupLeave(groupId);
    await m.reply("✅ ```Successfully Killed💀```");

  } catch (err) {
    console.error('[KillGC Error]', err.message);
    m.reply("❌ ```Kill command failed. Ensure bot is in the group and has admin rights.```");
  }
};

export default killGroupCommand;
