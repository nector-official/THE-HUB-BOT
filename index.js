import dotenv from "dotenv";
dotenv.config();

import {
  makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  useMultiFileAuthState,
  makeInMemoryStore,
} from "@whiskeysockets/baileys";

import { Handler, Callupdate, GroupUpdate } from "./nector/nectord/nectordd.js";
import { autoStartAutoBio } from "./nector/nectord/autobio.js";

import express from "express";
import pino from "pino";
import path from "path";
import fs from "fs";
import config from "./config.cjs";
import autoreact from "./lib/autoreact.cjs";
import { fileURLToPath } from "url";
import { File } from "megajs";

const { emojis, doReact } = autoreact;

// __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Session paths
const sessionDir = path.join(__dirname, "session");
const credsPath = path.join(sessionDir, "creds.json");
if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

let useQR = false;
let initialConnection = true;

// Logger
const MAIN_LOGGER = pino({
  timestamp: () => ',"time":"' + new Date().toJSON() + '"',
});
const sockLogger = pino({ level: "silent" });

// Store
let store = makeInMemoryStore ? makeInMemoryStore({ logger: sockLogger }) : null;

// =========================
// 🔹 Download Session (if SESSION_ID provided)
// =========================
async function downloadSessionData() {
  try {
    if (!config.SESSION_ID) {
      console.error("❌ Please add your SESSION_ID to config.");
      return false;
    }

    const parts = config.SESSION_ID.split("~")[1];
    if (!parts || !parts.includes("#")) {
      console.error("❌ Invalid SESSION_ID format.");
      return false;
    }

    const [fileId, decryptionKey] = parts.split("#");
    const megaFile = File.fromURL(
      "https://mega.nz/file/" + fileId + "#" + decryptionKey
    );

    const buffer = await new Promise((resolve, reject) => {
      megaFile.download((err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    await fs.promises.writeFile(credsPath, buffer);
    console.log("🔒 Session Successfully Loaded !!");
    return true;
  } catch (err) {
    console.error("❌ Failed to download session data:", err);
    return false;
  }
}

// =========================
// 🔹 Safe Auto Feature Runner
// =========================
function safeInterval(fn, delay, label) {
  setInterval(() => {
    try {
      fn();
    } catch (err) {
      console.error(`⚠️ ${label} crashed, restarting...`, err.message);
    }
  }, delay);
}

// =========================
// 🔹 Start Auto Features
// =========================
function startAutoFeatures(sock) {
  if (config.ALWAYS_ONLINE) {
    safeInterval(() => sock.sendPresenceUpdate("available"), 15 * 1000, "Always Online");
    console.log("⚡ Always Online enabled.");
  }

  if (config.AUTO_TYPING) {
    safeInterval(() => sock.sendPresenceUpdate("composing"), 10 * 1000, "AutoTyping");
    console.log("⌨️ AutoTyping enabled.");
  }

  if (config.AUTO_RECORDING) {
    safeInterval(() => sock.sendPresenceUpdate("recording"), 12 * 1000, "AutoRecording");
    console.log("🎙️ AutoRecording enabled.");
  }

  // AutoBio with restart safety
  try {
    autoStartAutoBio(sock);
    console.log("📝 AutoBio started.");
  } catch (err) {
    console.error("⚠️ AutoBio crashed, restarting...", err.message);
    setTimeout(() => startAutoFeatures(sock), 5000);
  }
}

// =========================
// 🔹 Start Bot
// =========================
async function start() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(
      "🤖 THE-HUB-BOT using WA v" + version.join(".") + " | Latest:",
      isLatest
    );

    const sock = makeWASocket({
      version,
      logger: sockLogger,
      printQRInTerminal: useQR,
      browser: ["THE-HUB-BOT", "Safari", "3.3"],
      auth: state,
      getMessage: async (key) => {
        if (store) {
          const cached = await store.loadMessage(key.remoteJid, key.id);
          return cached?.message;
        }
        return { conversation: "..." };
      },
    });

    if (store && typeof store.bind === "function") store.bind(sock.ev);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "close") {
        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut;
        if (shouldReconnect) {
          console.log("♻️ Connection closed, trying restart...");
          start();
        } else {
          console.log("❌ Logged out. Please remove session and re-scan QR.");
        }
      } else if (connection === "open") {
        if (initialConnection) {
          console.log("✅ THE-HUB-BOT is now online!");
          try {
            await sock.sendMessage(sock.user.id, {
              text: "✅ Connection successful! Enjoy THE-HUB-BOT 🎉",
            });
            console.log("✅ Startup message sent.");
          } catch (e) {
            console.error("❌ Failed to send startup message:", e?.message ?? e);
          }
          initialConnection = false;

          // Start auto features once online
          startAutoFeatures(sock);
        } else {
          console.log("♻️ Connection re-established after restart.");
        }
      }
    });

    sock.ev.on("messages.upsert", async (m) => {
      try {
        Handler(m, sock, MAIN_LOGGER);

        const msg = m.messages?.[0];
        if (msg && !msg.key?.fromMe && config.AUTO_REACT && msg.message) {
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          await doReact(emoji, msg, sock);
        }
      } catch (err) {
        console.error("Auto react / message handler error:", err);
      }
    });

    sock.ev.on("call", (callData) => Callupdate(callData, sock));
    sock.ev.on("group-participants.update", (update) =>
      GroupUpdate(sock, update)
    );

    if (config.MODE === "private") sock.public = false;
    else if (config.MODE === "public") sock.public = true;

    console.log("✅ Socket started.");
  } catch (err) {
    console.error("Critical Error:", err);
    process.exit(1);
  }
}

// =========================
// 🔹 Init (load session or QR)
// =========================
async function init() {
  if (fs.existsSync(credsPath)) {
    console.log("🔒 Session file found, proceeding without QR.");
    await start();
  } else {
    const ok = await downloadSessionData();
    if (ok) {
      console.log("✅ Session downloaded, starting bot.");
      await start();
    } else {
      console.log(
        "❌ No session found or invalid, will print QR for manual login."
      );
      useQR = true;
      await start();
    }
  }
}

// =========================
// 🔹 Express Web Server
// =========================
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.static(path.join(__dirname)));
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "index.html"))
);
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

// =========================
// 🔹 Start Init
// =========================
init().catch((err) => {
  console.error("Init failed:", err);
  process.exit(1);
});
