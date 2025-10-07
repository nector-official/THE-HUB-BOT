import axios from "axios";
import config from "../../config.cjs";

let autobioInterval = null;

const quotes = [
  "🚀 Keep pushing forward!",
  "🌟 You're capable of amazing things.",
  "💡 Progress, not perfection.",
  "📌 Focus on the step in front of you.",
  "✨ Powered by THE-HUB-BOT",
  "🎯 Keep grinding. The bot never sleeps.",
  "🤖 Auto Bio is watching 👀",
  "⚡ Be the storm, not the breeze."
];

const getRandomQuote = async () => {
  const useApi = Math.random() < 0.9; // 90% API, 10% local

  if (useApi) {
    try {
      const res = await axios.get("https://zenquotes.io/api/random");
      if (res.data && res.data[0]?.q && res.data[0]?.a) {
        return `💬 ${res.data[0].q} — ${res.data[0].a}`;
      }
    } catch (err) {
      console.error("[AutoBio ZenQuotes API Error]", err.message);
    }
  }

  return quotes[Math.floor(Math.random() * quotes.length)];
};

const startAutoBio = (sock) => {
  if (autobioInterval) return;

  console.log("📝 [AutoBio] Auto Bio loop started.");
  autobioInterval = setInterval(async () => {
    const quote = await getRandomQuote();
    try {
      await sock.updateProfileStatus(quote);
      console.log(`✅ [AutoBio] Updated bio to: ${quote}`);
    } catch (err) {
      console.error("❌ [AutoBio Failed]", err.message);
    }
  }, 1 * 3600 * 1000); // update every 1 hour (safer)
};

const stopAutoBio = () => {
  if (autobioInterval) clearInterval(autobioInterval);
  autobioInterval = null;
  console.log("🛑 [AutoBio] Stopped.");
};

const autobioCommand = async (m, sock) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(" ")[0].toLowerCase()
    : "";
  const arg = m.body.slice(config.PREFIX.length + command.length).trim().toLowerCase();

  if (command !== "autobio") return;

  if (!["on", "off"].includes(arg)) {
    return m.reply("🔁 *Usage:*\n\n`autobio on` - Start auto bio\n`autobio off` - Stop auto bio");
  }

  if (arg === "on") {
    if (autobioInterval) return m.reply("✅ *Auto Bio is already running.*");
    startAutoBio(sock);
    return m.reply("🚀 *Auto Bio started!* Bio will change every 1 hour.");
  }

  if (arg === "off") {
    if (!autobioInterval) return m.reply("⚠️ *Auto Bio is not running.*");
    stopAutoBio();
    return m.reply("🛑 *Auto Bio stopped.*");
  }
};

// ✅ Auto-start autobio when bot connects
export const autoStartAutoBio = (sock) => {
  if (config.AUTO_BIO) {
    startAutoBio(sock);
  }
};

export default autobioCommand;
