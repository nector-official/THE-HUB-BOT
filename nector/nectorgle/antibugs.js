import fs from 'fs';
import path from 'path';
import config from '../../config.cjs';

const antibugsFile = path.resolve('./lib/antibugs.json');

// Load config (if not exists, create default)
if (!fs.existsSync(antibugsFile)) {
  fs.writeFileSync(antibugsFile, JSON.stringify({ enabled: true }, null, 2));
}

const readStatus = () => {
  const data = fs.readFileSync(antibugsFile);
  return JSON.parse(data).enabled;
};

const writeStatus = (status) => {
  fs.writeFileSync(antibugsFile, JSON.stringify({ enabled: status }, null, 2));
};

const antibugs = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(prefix.length + cmd.length).trim().split(' ');
  const senderName = m.pushName || 'User';

  // List of known dangerous unicode bugs
  const bugUnicode = [
    '\u202e', '\u200e', '\u200f', '\u2060',
    '\u2066', '\u2067', '\u2068', '\u202a',
    '\u202b', '\u202c'
  ];

  const bugDetected = bugUnicode.some(char => m.body?.includes(char));
  const isEnabled = readStatus();

  // 🔁 Toggle command
  if (cmd === 'antibugs') {
    if (!args[0]) {
      return await sock.sendMessage(m.from, {
        text: `🛡️ *AntiBugs Status:* ${isEnabled ? '✅ ON' : '❌ OFF'}\n\nUse *.antibugs on* or *.antibugs off* to toggle.`,
      }, { quoted: m });
    }

    const arg = args[0].toLowerCase();
    if (arg === 'on') {
      writeStatus(true);
      return await sock.sendMessage(m.from, {
        text: `✅ *AntiBugs has been turned ON*\nBot will now scan & delete bug messages.`,
      }, { quoted: m });
    }

    if (arg === 'off') {
      writeStatus(false);
      return await sock.sendMessage(m.from, {
        text: `❌ *AntiBugs has been turned OFF*\nBug messages will not be scanned or removed.`,
      }, { quoted: m });
    }
  }

  // 🧪 Scan every message
  if (bugDetected && isEnabled) {
    try {
      await sock.sendMessage(m.from, {
        image: { url: 'https://files.catbox.moe/03qy6k.jpg' },
        caption: `🚫 *Bug Message Detected!*\n\nA suspicious message by *${senderName}* was removed to protect the group.`,
        contextInfo: {
          forwardingScore: 5,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterName: 'THE-HUB-BOT',
            newsletterJid: '120363395396503029@newsletter',
          },
        },
      }, { quoted: m });

      // Delete bug message
      await sock.sendMessage(m.from, {
        delete: {
          remoteJid: m.key.remoteJid,
          fromMe: false,
          id: m.key.id,
          participant: m.key.participant || m.key.remoteJid,
        }
      });
    } catch (err) {
      console.error('[ANTIBUG ERROR]', err);
    }
  }
};

export default antibugs;
