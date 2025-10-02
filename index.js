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

// Auto feature intervals / guards (so we don't start duplicates on reconnect)
let presenceInterval = null; // for ALWAYS_ONLINE
let autobioInterval = null;  // for AUTO_BIO

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

// ------------------ AutoBio helpers (self-contained so index.js doesn't depend on other file paths) ------------------
const AUTO_BIO_QUOTE_POOL = [
  "🚀 Keep pushing forward!",
  "🌟 You're capable of amazing things.",
  "💡 Progress, not perfection.",
  "📌 Focus on the step in front of you.",
  "✨ Powered by THE-HUB-BOT",
  "🎯 Keep grinding. The bot never sleeps.",
  "🤖 Auto Bio is watching 👀",
  "⚡ Be the storm, not the breeze."
];

async function fetchRandomAutoBioQuote() {
  // try API first, fallback to local pool
  try {
    const res = await axios.get('https://zenquotes.io/api/random', { timeout: 5000 });
    if (res.data && res.data[0]?.q && res.data[0]?.a) {
      return `💬 ${res.data[0].q} — ${res.data[0].a}`;
    }
  } catch (err) {
    // swallow — we'll fallback to local quotes
    // console.error('[AutoBio] ZenQuotes error:', err?.message || err);
  }
  return AUTO_BIO_QUOTE_POOL[Math.floor(Math.random() * AUTO_BIO_QUOTE_POOL.length)];
}

function startAutoBio(Matrix) {
  if (autobioInterval) return; // already running
  console.log('[AutoBio] Starting auto-bio...');
  autobioInterval = setInterval(async () => {
    try {
      const quote = await fetchRandomAutoBioQuote();
      await Matrix.updateProfileStatus(quote);
      console.log(`[AutoBio] Bio updated to: ${quote}`);
    } catch (err) {
      console.error('[AutoBio] Error updating bio:', err?.message || err);
    }
  }, 60 * 1000);
}

function stopAutoBio() {
  if (autobioInterval) {
    clearInterval(autobioInterval);
    autobioInterval = null;
    console.log('[AutoBio] Stopped auto-bio.');
  }
}

// ------------------ START SOCKET ------------------
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
        // clear auto intervals/listeners to avoid duplicate behavior on reconnect
        if (presenceInterval) {
          clearInterval(presenceInterval);
          presenceInterval = null;
        }
        stopAutoBio();

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
              text: '✅ Connection successful! Enjoy THE-HUB-BOT 🎉'
            });
            console.log('✅ Startup message sent.');
          } catch (e) {
            console.error('❌ Failed to send startup message:', e?.message ?? e);
          }

          // ---------- Auto features triggered on startup (respecting config flags) ----------
          // ALWAYS_ONLINE -> send periodic 'available' presence
          if (config.ALWAYS_ONLINE && !presenceInterval) {
            presenceInterval = setInterval(async () => {
              try {
                await sock.sendPresenceUpdate('available');
              } catch (err) {
                // ignore transient errors
              }
            }, 10_000);
            console.log('[Auto] ALWAYS_ONLINE enabled (presence heartbeat every 10s)');
          }

          // AUTO_BIO -> start auto-bio loop
          if (config.AUTO_BIO) {
            startAutoBio(sock);
          }

          initialConnection = false;
        } else {
          console.log('♻️ Connection re-established after restart.');

          // Ensure auto features on reconnect
          if (config.ALWAYS_ONLINE && !presenceInterval) {
            presenceInterval = setInterval(async () => {
              try {
                await sock.sendPresenceUpdate('available');
              } catch (err) {}
            }, 10_000);
          }
          if (config.AUTO_BIO && !autobioInterval) startAutoBio(sock);
        }
      }
    });

    // wire events: messages, calls, group updates
    sock.ev.on('messages.upsert', async m => {
      try {
        // first, let your custom Handler process it (commands, responses etc)
        Handler(m, sock, MAIN_LOGGER);

        // then run auto features per incoming message (if applicable)
        const msg = m.messages?.[0];

        if (msg && !msg.key?.fromMe) {
          // Auto-typing / Auto-recording presence
          try {
            if (config.AUTO_RECORDING) {
              // give priority to recording if both enabled
              await sock.sendPresenceUpdate('recording', msg.key.remoteJid);
            } else if (config.AUTO_TYPING) {
              await sock.sendPresenceUpdate('composing', msg.key.remoteJid);
            }
          } catch (err) {
            // ignore presence errors
          }

          // Auto status view (when a status/broadcast update arrives)
          try {
            if (config.AUTO_STATUS_SEEN && msg.key.remoteJid === 'status@broadcast') {
              // readMessages may or may not be available depending on Baileys version
              if (typeof sock.readMessages === 'function') {
                await sock.readMessages([msg.key]);
              } else if (typeof sock.readMessage === 'function') {
                await sock.readMessage(msg.key);
              } else {
                // best-effort: do nothing if function missing
              }
            }
          } catch (err) {
            // ignore
          }
        }

        // then (like original) run autoreact if enabled and message is not from me
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
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

init().catch(err => {
  console.error('Init failed:', err);
  process.exit(1);
});
