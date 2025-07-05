import config from '../../config.cjs';

const antispam = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const senderName = m.pushName || 'User';

  if (cmd === 'antispam') {
    const msg = `
🚫 *ANTI-SPAM POLICY — THE-HUB-BOT*

Hello *${senderName}*, please take note of our anti-spam system:

⚠️ Spamming is strictly *prohibited* in all chats.
✅ First strike: *Warning* issued.
⛔ Second strike: *Temporary mute or restriction*.
🔒 Repeat offenses: *Permanent block or ban*.

Our system uses auto-detection to catch repeated texts, mass tagging, flooding, or command abuse.

Let’s keep THE-HUB-BOT clean, respectful, and fun for everyone 💯

*— THE-HUB-BOT Moderation Team 🛡️*
    `.trim();

    await sock.sendMessage(m.from, {
      image: { url: 'https://files.catbox.moe/03qy6k.jpg' },
      caption: msg,
      contextInfo: {
        forwardingScore: 5,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterName: 'THE-HUB-BOT',
          newsletterJid: '120363395396503029@newsletter',
        },
      },
    }, { quoted: m });
  }
};

export default antispam;
