// antillink.js
import config from '../../config.cjs';

const antiLink = async (m, sock) => {
  try {
    // Only proceed for group messages
    if (!m.isGroup) return;

    const adminNumber = config.OWNER_NUMBER; // e.g., '254712345678'
    const sender = m.sender; // sender's WhatsApp ID
    const text = m.body || '';

    // Regex to detect links (http, https, www)
    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

    // If the message contains a link AND sender is not the admin
    if (linkRegex.test(text) && sender !== `${adminNumber}@s.whatsapp.net`) {
      // Delete the message silently
      await sock.sendMessage(m.from, {
        delete: { remoteJid: m.from, fromMe: false, id: m.key.id }
      });
    }
  } catch (err) {
    console.error('[Anti-Link Error]', err);
  }
};

export default antiLink;
