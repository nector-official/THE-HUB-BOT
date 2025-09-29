import dotenv from 'dotenv';
dotenv.config();

import {
  makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  useMultiFileAuthState,
  makeInMemoryStore
} from '@whiskeysockets/baileys';

import { Handler, Callupdate, GroupUpdate } from './nector/nectord/nectordd.js';
import express from 'express';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import config from './config.cjs';
import autoreact from './lib/autoreact.cjs';
import { fileURLToPath } from 'url';
import { File } from 'megajs';

const { emojis, doReact } = autoreact;

// __dirname polyfill for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Session folder & creds path
const sessionDir = path.join(__dirname, 'session');
const credsPath = path.join(sessionDir, 'creds.json');
if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

// Flags
let useQR = false;
let initialConnection = true;

// Logger
const MAIN_LOGGER = pino({
  timestamp: () => ',"time":"' + new Date().toJSON() + '"'
});
const sockLogger = pino({ level: 'silent' });

// The in-memory store (binds to socket events)
let store = makeInMemoryStore ? makeInMemoryStore({ logger: sockLogger }) : null;

// Helper: download session data from MEGA when SESSION_ID is provided
async function downloadSessionData() {
  try {
    console.log('Debugging SESSION_ID:', config.SESSION_ID);
    if (!config.SESSION_ID) {
      console.error('❌ Please add your SESSION_ID to config (SESSION_ID missing).');
      return false;
    }

    const parts = config.SESSION_ID.split('~')[1];
    if (!parts || !parts.includes('#')) {
      console.error('❌ Invalid SESSION_ID format! It must contain both file ID and decryption key.');
      return false;
    }

    const [fileId, decryptionKey] = parts.split('#');

    console.log('🔄 Downloading Session...');
    const megaFile = File.fromURL('https://mega.nz/file/' + fileId + '#' + decryptionKey);

    const buffer = await new Promise((resolve, reject) => {
      megaFile.download((err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    await fs.promises.writeFile(credsPath, buffer);
    console.log('🔒 Session Successfully Loaded !!');
    return true;
  } catch (err) {
    console.error('❌ Failed to download session data:', err);
    return false;
  }
}

async function start() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log('🤖 THE-HUB-BOT using WA v' + version.join('.') + ' | Latest:', isLatest);

    const sock = makeWASocket({
      version,
      logger: sockLogger,
      printQRInTerminal: useQR,
      browser: ['THE-HUB-BOT', 'Safari', '3.3'],
      auth: state,
      getMessage: async key => {
        if (store) {
          const cached = await store.loadMessage(key.remoteJid, key.id);
          return cached?.message;
        }
        return { conversation: '...' };
      }
    });

    if (store && typeof store.bind === 'function') store.bind(sock.ev);

    sock.ev.on('creds.update', saveCreds);

    // connection update (open/close)
    sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect } = update;

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        console.log("⚠️ Connection closed. Reason:", reason);

        if (reason === DisconnectReason.loggedOut) {
          console.log('❌ Logged out from WhatsApp. Please delete session and re-scan QR.');
          process.exit(0);
        } else {
          console.log('♻️ Trying to reconnect in 5s...');
          setTimeout(() => start(), 5000);
        }

      } else if (connection === 'open') {
        if (initialConnection) {
          console.log('✅ THE-HUB-BOT is now online!');

          try {
            const myJid = sock.user.id; // ✅ correct JID
            const imageUrl = 'https://telegra.ph/file/bef2ec9f00a62adfe8db0.jpg';

            await new Promise(resolve => setTimeout(resolve, 2000));

            await sock.sendMessage(myJid, {
              image: { url: imageUrl },
              caption: '🤖 THE-HUB BOT is now online!\n\nPowered by NECTOR 🍯',
              contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                  title: 'THE-HUB BOT',
                  body: 'Always online 🚀',
                  thumbnailUrl: imageUrl,
                  sourceUrl: 'https://whatsapp.com/channel/0029Vb3zzYJ9xVJk0Y65c81W',
                  mediaType: 1
                }
              }
            });

            console.log('✅ Startup message sent to self.');
          } catch (e) {
            console.error('❌ Failed to send startup message:', e?.message ?? e);
          }

          initialConnection = false;
        } else {
          console.log('♻️ Connection re-established after restart.');
        }
      }
    });

    // messages
    sock.ev.on('messages.upsert', async m => {
      try {
        Handler(m, sock, MAIN_LOGGER);

        const msg = m.messages?.[0];
        if (msg && !msg.key?.fromMe && config.AUTO_REACT && msg.message) {
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          await doReact(emoji, msg, sock);
        }
      } catch (err) {
        console.error('Auto react / message handler error:', err);
      }
    });

    sock.ev.on('call', callData => Callupdate(callData, sock));
    sock.ev.on('group-participants.update', participantsUpdate => GroupUpdate(sock, participantsUpdate));

    if (config.MODE === 'private') sock.public = false;
    else if (config.MODE === 'public') sock.public = true;

    console.log('✅ socket started.');
  } catch (err) {
    console.error('Critical Error:', err);
    process.exit(1);
  }
}

async function init() {
  if (fs.existsSync(credsPath)) {
    console.log('🔒 Session file found, proceeding without QR.');
    await start();
  } else {
    const ok = await downloadSessionData();
    if (ok) {
      console.log('✅ Session downloaded, starting bot.');
      await start();
    } else {
      console.log('❌ No session found or invalid, will print QR for manual login.');
      useQR = true;
      await start();
    }
  }
}

// Express server (keeps app alive on Render)
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

init().catch(err => {
  console.error('Init failed:', err);
  process.exit(1);
});



