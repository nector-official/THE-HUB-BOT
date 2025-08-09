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
  const useApi = Math.random() < 0.8; // 80% chance to use motivational API

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

const startAutoBio = (Matrix) => {
  if (autobioInterval) return;

  console.log("[AutoBio] Auto Bio started automatically.");
  autobioInterval = setInterval(async () => {
    const quote = await getRandomQuote();
    try {
      await Matrix.updateProfileStatus(quote);
      console.log(`[AutoBio] Bio updated to: ${quote}`);
    } catch (err) {
      console.error("[AutoBio Error]", err.message);
    }
  }, 19 * 1000);
};

const stopAutoBio = () => {
  if (autobioInterval) clearInterval(autobioInterval);
  autobioInterval = null;
};

const autobioCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(" ")[0].toLowerCase()
    : "";
  const arg = m.body.slice(config.PREFIX.length + command.length).trim().toLowerCase();

  if (command !== "autobio") return;

  if (!["on", "off"].includes(arg)) {
    return m.reply("🔁 *Usage:*\n\n`autobio on` - Start auto bio\n`autobio off` - Stop auto bio");
  }

  if (arg === "on") {
    if (autobioInterval) return m.reply("✅ *Auto Bio is already active.*");
    startAutoBio(Matrix);
    return m.reply("🚀 *Auto Bio started!* Your bio will now change every 20 seconds.");
  }

  if (arg === "off") {
    if (!autobioInterval) return m.reply("⚠️ *Auto Bio is not running.*");
    stopAutoBio();
    return m.reply("🛑 *Auto Bio stopped.*");
  }
};

// ✅ Auto-start autobio when bot connects
export const autoStartAutoBio = (Matrix) => {
  if (config.AUTO_BIO) {
    startAutoBio(Matrix);
  }
};

export default autobioCommand;
