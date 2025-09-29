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

    // Your SESSION_ID format used previously: prefix~<fileId>#<key>
    // e.g. "nector~N9pBTIxL#Jg9DoCw..."
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
    // load auth state (creates files under sessionDir)
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log('🤖 THE-HUB-BOT using WA v' + version.join('.') + ' | Latest:', isLatest);

    // create socket
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

    // bind store to socket events so it caches messages
    if (store && typeof store.bind === 'function') store.bind(sock.ev);

    // save creds when updated
    sock.ev.on('creds.update', saveCreds);

    // connection update (open/close)
    sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        // reconnect unless logged out
        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          console.log('♻️ Connection closed, trying restart...');
          start();
        } else {
          console.log('❌ Logged out. Please remove session and re-scan QR.');
        }
      } else if (connection === 'open') {
        if (initialConnection) {
          console.log('✅ THE-HUB-BOT is now online!');

          // simple startup message (cleaned)
          try {
            await sock.sendMessage(sock.user.id, {
              text: '✅ Connection successful!\n\ntype .menu to get started\n\nEnjoy THE-HUB-BOT 🎉'
            });
            console.log('✅ Startup message sent.');
          } catch (e) {
            console.error('❌ Failed to send startup message:', e?.message ?? e);
          }

          initialConnection = false;
        } else {
          console.log('♻️ Connection re-established after restart.');
        }
      }
    });

    // wire events: messages, calls, group updates
    sock.ev.on('messages.upsert', async m => {
      try {
        // first, let your custom Handler process it (commands, responses etc)
        Handler(m, sock, MAIN_LOGGER);

        // then (like original) run autoreact if enabled and message is not from me
        const msg = m.messages?.[0];
        if (
          msg &&
          !msg.key?.fromMe &&
          config.AUTO_REACT &&
          msg.message
        ) {
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          await doReact(emoji, msg, sock);
        }
      } catch (err) {
        console.error('Auto react / message handler error:', err);
      }
    });

    // call events -> custom Callupdate
    sock.ev.on('call', callData => Callupdate(callData, sock));

    // group participant updates -> custom GroupUpdate
    sock.ev.on('group-participants.update', participantsUpdate => GroupUpdate(sock, participantsUpdate));

    // set public/private mode as per config (keeps parity with your obf code)
    if (config.MODE === 'private') sock.public = false;
    else if (config.MODE === 'public') sock.public = true;

    console.log('✅ socket started.');
  } catch (err) {
    console.error('Critical Error:', err);
    process.exit(1);
  }
}

async function init() {
  // If a local creds.json exists we use it; otherwise try to download via SESSION_ID
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

/* Express server (keeps app alive on Render) */
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => re
s.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

init().catch(err => {
  console.error('Init failed:', err);
  process.exit(1);
});

