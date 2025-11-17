// Always‑online fix
let presenceInterval = null;
// FULL CLEANED & PATCHED INDEX.JS USING PASTEBIN/BASE64 SESSIONS
// -------------------------------------------------------------
// This version removes MEGA session loading and replaces it with
// direct Base64 session decoding from SESSION_ID = "nector~<base64>"
// -------------------------------------------------------------

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

// Auto feature intervals\ nlet presenceInterval = null;
let autobioInterval = null;

// Logger
const MAIN_LOGGER = pino({
  timestamp: () => '\",\"time\":\"' + new Date().toJSON() + '\"'
});
const sockLogger = pino({ level: 'silent' });

let store = makeInMemoryStore ? makeInMemoryStore({ logger: sockLogger }) : null;

// -------------------------------------------------------------
// NEW FUNCTION: Load Base64/Pastebin Session (nector~<base64>)
// -------------------------------------------------------------
async function loadPastebinSession() {
  try {
    if (!config.SESSION_ID) {
      console.error("❌ SESSION_ID missing in config.");
      return false;
    }

    let session = config.SESSION_ID.trim();

    if (!session.startsWith("nector~")) {
      console.error("❌ Invalid SESSION_ID format. Expected: nector~<base64>");
      return false;
    }

    const base64 = session.replace("nector~", "").trim();

    console.log("🔄 Decoding Pastebin/Base64 session...");
    const buffer = Buffer.from(base64, "base64");

    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    await fs.promises.writeFile(credsPath, buffer);

    console.log("✅ Session successfully loaded from Pastebin/Base64!");
    return true;

  } catch (err) {
    console.error("❌ Failed to load Pastebin/Base64 session:", err);
    return false;
  }
}

// -------------------------------------------------------------
// AUTO BIO SYSTEM
// -------------------------------------------------------------
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
  try {
    const res = await axios.get('https://zenquotes.io/api/random', { timeout: 5000 });
    if (res.data && res.data[0]?.q && res.data[0]?.a) {
      return `💬 ${res.data[0].q} — ${res.data[0].a}`;
    }
  } catch {}

  return AUTO_BIO_QUOTE_POOL[Math.floor(Math.random() * AUTO_BIO_QUOTE_POOL.length)];
}

function startAutoBio(Matrix) {
  if (autobioInterval) return;
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

// -------------------------------------------------------------
// START SOCKET
// -------------------------------------------------------------
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

    // -------------------------------------------------------------
    // CONNECTION UPDATE
    // -------------------------------------------------------------
    sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect } = update;

      if (connection === 'close') {
        if (presenceInterval) {
          clearInterval(presenceInterval);
          presenceInterval = null;
        }
        stopAutoBio();

        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          console.log('♻️ Connection closed, trying restart...');
          start();
        } else {
          console.log('❌ Logged out. Please remove session and re-scan QR.');
        }

      } else if (connection === 'open') {
        if (initialConnection) {
          console.log('✅ THE-HUB-BOT is now online!');

          try {
            await sock.sendMessage(sock.user.id, {
              text: '✅ Connection successful! Enjoy THE-HUB-BOT 🎉'
            });
          } catch {}

          if (config.ALWAYS_ONLINE && !presenceInterval) {
            presenceInterval = setInterval(async () => {
              try { await sock.sendPresenceUpdate('available'); } catch {}
            }, 10_000);
            console.log('[Auto] ALWAYS_ONLINE enabled');
          }

          if (config.AUTO_BIO) startAutoBio(sock);

          initialConnection = false;

        } else {
          console.log('♻️ Reconnected.');

          if (config.ALWAYS_ONLINE && !presenceInterval) {
            presenceInterval = setInterval(async () => {
              try { await sock.sendPresenceUpdate('available'); } catch {}
            }, 10_000);
          }

          if (config.AUTO_BIO && !autobioInterval) startAutoBio(sock);
        }
      }
    });

    // -------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------
    sock.ev.on('messages.upsert', async m => {
      try {
        Handler(m, sock, MAIN_LOGGER);

        const msg = m.messages?.[0];

        if (msg && !msg.key?.fromMe) {
          try {
            if (config.AUTO_RECORDING) await sock.sendPresenceUpdate('recording', msg.key.remoteJid);
            else if (config.AUTO_TYPING) await sock.sendPresenceUpdate('composing', msg.key.remoteJid);
          } catch {}

          try {
            if (config.AUTO_STATUS_SEEN && msg.key.remoteJid === 'status@broadcast') {
              if (typeof sock.readMessages === 'function') await sock.readMessages([msg.key]);
            }
          } catch {}
        }

        if (msg && !msg.key?.fromMe && config.AUTO_REACT && msg.message) {
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          await doReact(emoji, msg, sock);
        }

      } catch (err) {
        console.error('Auto react / message handler error:', err);
      }
    });

    sock.ev.on('call', callData => Callupdate(callData, sock));
    sock.ev.on('group-participants.update', data => GroupUpdate(sock, data));

    sock.public = config.MODE === 'public';

    console.log('✅ socket started.');

  } catch (err) {
    console.error('Critical Error:', err);
    process.exit(1);
  }
}

// -------------------------------------------------------------
// INIT
// -------------------------------------------------------------
async function init() {
  if (fs.existsSync(credsPath)) {
    console.log('🔒 Local session found → starting bot');
    await start();
  } else {
    const ok = await loadPastebinSession();

    if (ok) {
      console.log('✅ Session loaded → starting bot');
      await start();
    } else {
      console.log('❌ SESSION_ID invalid → QR mode enabled');
      useQR = true;
      await start();
    }
  }
}

// -------------------------------------------------------------
// EXPRESS SERVER (Keeps bot alive)
// -------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

init().catch(err => {
  console.error('Init failed:', err);
  process.exit(1);
});
