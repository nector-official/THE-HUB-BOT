import config from '../../config.cjs';

const promote = async (m, gss) => {
  try {
    const botNumber = await gss.decodeJid(gss.user.id);
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
    const text = m.body.slice(prefix.length + cmd.length).trim();

    const validCommands = ['promote', 'adminup', 'makeadmin', 'promot'];
    if (!validCommands.includes(cmd)) return;

    if (!m.isGroup) {
      return gss.sendMessage(m.from, {
        text: `┏━━━〔 🚫 *Group Only* 〕━━━┓
┃
┃  This command only works in group chats.
┃
┗━━━━━━━━━━━━━━━━━━━━┛`,
        contextInfo: {
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363395396503029@newsletter',
            newsletterName: 'THE-HUB-BOT'
          }
        }
      });
    }

    const groupMetadata = await gss.groupMetadata(m.from);
    const participants = groupMetadata.participants;

    // fixed: ensure this is boolean
    const isBotAdmin = !!participants.find(p => p.id === botNumber)?.admin;
    if (!isBotAdmin) {
      return gss.sendMessage(m.from, {
        text: `┏━━━〔 ❌ *Permission Error* 〕━━━┓
┃
┃  I need to be an *admin* to promote users!
┃
┗━━━━━━━━━━━━━━━━━━━━┛`,
        contextInfo: {
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363395396503029@newsletter',
            newsletterName: 'THE-HUB-BOT'
          }
        }
      });
    }

    const sender = m.sender;
    const isOwner = sender === config.OWNER_NUMBER + '@s.whatsapp.net';
    const isSudo = config.SUDO?.includes(sender);
    const isGroupAdmin = !!participants.find(p => p.id === sender)?.admin; // ✅ fix here

    if (!isOwner && !isSudo && !isGroupAdmin) {
      return gss.sendMessage(m.from, {
        text: `┏━━━〔 🔐 *Access Denied* 〕━━━┓
┃
┃  Only *admins* or *bot owners* can
┃  promote others in this group.
┃
┗━━━━━━━━━━━━━━━━━━━━┛`,
        contextInfo: {
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363395396503029@newsletter',
            newsletterName: 'THE-HUB-BOT'
          }
        }
      });
    }

    if (!m.mentionedJid) m.mentionedJid = [];
    if (m.quoted?.participant) m.mentionedJid.push(m.quoted.participant);

    let target = m.mentionedJid[0]
      ? m.mentionedJid[0]
      : m.quoted?.participant
      ? m.quoted.participant
      : text.replace(/[^0-9]/g, '').length > 0
      ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
      : null;

    if (!target) {
      return gss.sendMessage(m.from, {
        text: `┏━━━〔 🧍 *Mention Required* 〕━━━┓
┃
┃  Please *mention*, *reply*, or *enter number*
┃  of the user you want to promote.
┃
┃  ✅ Example: *.promote @user*
┃
┗━━━━━━━━━━━━━━━━━━━━┛`,
        contextInfo: {
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363395396503029@newsletter',
            newsletterName: 'THE-HUB-BOT'
          }
        }
      });
    }

    await gss.groupParticipantsUpdate(m.from, [target], 'promote')
      .then(() => {
        gss.sendMessage(m.from, {
          text: `┏━━━〔 ✅ *Promotion Complete* 〕━━━┓
┃
┃  🎉 Promoted: @${target.split('@')[0]}
┃  📛 Group: *${groupMetadata.subject}*
┃
┗━━━━━━━━━━━━━━━━━━━━┛`,
          mentions: [target],
          contextInfo: {
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363395396503029@newsletter',
              newsletterName: 'THE-HUB-BOT'
            }
          }
        });
      })
      .catch((err) => {
        gss.sendMessage(m.from, {
          text: `❌ *Promotion failed.* ${err.toString()}`,
          contextInfo: {
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363395396503029@newsletter',
              newsletterName: 'THE-HUB-BOT'
            }
          }
        });
      });

  } catch (error) {
    console.error('Promote Error:', error);
    gss.sendMessage(m.from, {
      text: `🚨 *An unexpected error occurred while promoting.*`,
      contextInfo: {
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363395396503029@newsletter',
          newsletterName: 'THE-HUB-BOT'
        }
      }
    });
  }
};

export default promote;
        
