import config from '../../config.cjs';
import fs from 'fs';
import axios from 'axios';

const autoStatusForward = async (m, Matrix) => {
  try {
    // Check if message is a status update
    if (m.key.remoteJid === 'status@broadcast') {
      const fromUser = m.pushName || m.participant || "Unknown";

      if (m.message.imageMessage || m.message.videoMessage) {
        await Matrix.sendMessage(config.OWNER_NUMBER, {
          forward: m
        });
      } else if (m.message.conversation || m.message.extendedTextMessage) {
        const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
        await Matrix.sendMessage(config.OWNER_NUMBER, {
          text: `📣 *Status from ${fromUser}:*\n\n${text}`
        });
      }
    }
  } catch (err) {
    console.error("[AutoStatusForward ERROR]", err.message);
  }
};

export default autoStatusForward;
