import fs from 'fs';
import path from 'path';
import config from '../../config.cjs';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { writeFile } from 'fs/promises';

const messageStore = new Map();
const CONFIG_PATH = path.join(process.cwd(), 'data', 'antidelete.json');
const TEMP_MEDIA_DIR = path.join(process.cwd(), 'tmp');

// 🗂 Ensure tmp dir exists
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
  fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// 🧹 Get folder size in MB
const getFolderSizeInMB = (folderPath) => {
  try {
    const files = fs.readdirSync(folderPath);
    let totalSize = 0;
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      if (fs.statSync(filePath).isFile()) {
        totalSize += fs.statSync(filePath).size;
      }
    }
    return totalSize / (1024 * 1024);
  } catch {
    return 0;
  }
};

// 🧽 Clean tmp folder if too large
const cleanTempFolderIfLarge = () => {
  try {
    const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);
    if (sizeMB > 100) {
      fs.readdirSync(TEMP_MEDIA_DIR).forEach(file =>
        fs.unlinkSync(path.join(TEMP_MEDIA_DIR, file))
      );
    }
  } catch {}
};
setInterval(cleanTempFolderIfLarge, 60 * 1000);

// ⚙️ Load/save config
function loadAntideleteConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return { enabled: false };
    return JSON.parse(fs.readFileSync(CONFIG_PATH));
  } catch {
    return { enabled: false };
  }
}
function saveAntideleteConfig(configData) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2));
  } catch (err) {
    console.error('Config save error:', err);
  }
}

// 🎯 Antidelete Command
const antideleteCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  // ✅ Trigger words
  if (!['antidelete', 'ad', 'antidel'].includes(command)) return;

  const isOwner = m.key.fromMe || config.OWNER_NUMBERS.includes(m.sender);

  if (!isOwner) {
    return m.reply('*🚫 Only the bot owner can use this command.*');
  }

  const conf = loadAntideleteConfig();

  if (!args) {
    return m.reply(
      `*🛡 ANTIDELETE SETTINGS*\n\nCurrent Status: ${conf.enabled ? '✅ ON' : '❌ OFF'}\n\nUsage:\n${config.PREFIX}antidelete on\n${config.PREFIX}antidelete off`
    );
  }

  if (args === 'on') {
    conf.enabled = true;
  } else if (args === 'off') {
    conf.enabled = false;
  } else {
    return m.reply(`❌ Invalid argument.\nUse: ${config.PREFIX}antidelete on/off`);
  }

  saveAntideleteConfig(conf);
  return m.reply(`✅ *Antidelete ${args === 'on' ? 'enabled' : 'disabled'}!*`);
};

// 📦 Store incoming messages
export async function storeMessage(message) {
  try {
    const conf = loadAntideleteConfig();
    if (!conf.enabled || !message.key?.id) return;

    const messageId = message.key.id;
    let content = '';
    let mediaType = '';
    let mediaPath = '';
    const sender = message.key.participant || message.key.remoteJid;

    // Detect type
    if (message.message?.conversation) {
      content = message.message.conversation;
    } else if (message.message?.extendedTextMessage?.text) {
      content = message.message.extendedTextMessage.text;
    } else if (message.message?.imageMessage) {
      mediaType = 'image';
      const buffer = await downloadContentFromMessage(message.message.imageMessage, 'image');
      mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
      await writeFile(mediaPath, buffer);
    } else if (message.message?.videoMessage) {
      mediaType = 'video';
      const buffer = await downloadContentFromMessage(message.message.videoMessage, 'video');
      mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
      await writeFile(mediaPath, buffer);
    } else if (message.message?.stickerMessage) {
      mediaType = 'sticker';
      const buffer = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
      mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
      await writeFile(mediaPath, buffer);
    }

    messageStore.set(messageId, {
      content,
      mediaType,
      mediaPath,
      sender,
      group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('storeMessage error:', err);
  }
}

// 🧨 Handle message deletions
export async function handleMessageRevocation(Matrix, revocationMessage) {
  try {
    const conf = loadAntideleteConfig();
    if (!conf.enabled) return;

    const messageId = revocationMessage.message.protocolMessage.key.id;
    const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;
    const ownerNumber = Matrix.user.id.split(':')[0] + '@s.whatsapp.net';

    if (deletedBy.includes(Matrix.user.id) || deletedBy === ownerNumber) return;

    const original = messageStore.get(messageId);
    if (!original) return;

    const sender = original.sender;
    const senderName = sender.split('@')[0];
    const groupName = original.group ? (await Matrix.groupMetadata(original.group)).subject : '';

    const time = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit',
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    let text = `*🔰 ANTIDELETE REPORT 🔰*\n\n` +
      `*🗑️ Deleted By:* @${deletedBy.split('@')[0]}\n` +
      `*👤 Sender:* @${senderName}\n` +
      `*🕒 Time:* ${time}\n`;

    if (groupName) text += `*👥 Group:* ${groupName}\n`;
    if (original.content) text += `\n*💬 Message:*\n${original.content}`;

    await Matrix.sendMessage(ownerNumber, {
      text,
      mentions: [deletedBy, sender]
    });

    // Send deleted media
    if (original.mediaType && fs.existsSync(original.mediaPath)) {
      try {
        await Matrix.sendMessage(ownerNumber, {
          [original.mediaType]: { url: original.mediaPath },
          caption: `*Deleted ${original.mediaType}*\nFrom: @${senderName}`,
          mentions: [sender]
        });
      } catch (err) {
        await Matrix.sendMessage(ownerNumber, { text: `⚠️ Media send error: ${err.message}` });
      }
      fs.unlinkSync(original.mediaPath);
    }

    messageStore.delete(messageId);
  } catch (err) {
    console.error('handleMessageRevocation error:', err);
  }
}

export default antideleteCommand;
