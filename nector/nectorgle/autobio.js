import axios from "axios";
import config from "../../config.cjs";

let autobioInterval = null;

const quotes = [
  "🚀 Keep pushing forward!",
  "🌟 You're capable of amazing things.",
  "💡 Progress, not perfection.",
  "😂 I told my bot a joke, now it won't stop responding!",
  "🐱 Cats have 32 muscles in each ear... and still ignore you.",
  "📌 Focus on the step in front of you.",
  "✨ Powered by THE-HUB-BOT",
  "🎯 Keep grinding. The bot never sleeps.",
  "🤖 Auto Bio is watching 👀",
  "⚡ Be the storm, not the breeze."
];

const getRandomQuote = async () => {
  const useApi = Math.random() < 0.5; // 50% chance to use joke API

  if (useApi) {
    try {
      const res = await axios.get("https://v2.jokeapi.dev/joke/Any?type=single");
      if (res.data && res.data.joke) return `😂 ${res.data.joke}`;
    } catch (err) {
      console.error("[AutoBio JokeAPI Error]", err.message);
    }
  }

  const random = quotes[Math.floor(Math.random() * quotes.length)];
  return random;
};

const startAutoBio = async (Matrix) => {
  if (autobioInterval) return;

  autobioInterval = setInterval(async () => {
    const quote = await getRandomQuote();
    try {
      await Matrix.updateProfileStatus(quote);
      console.log(`[AutoBio] Bio updated to: ${quote}`);
    } catch (err) {
      console.error("[AutoBio Error]", err.message);
    }
  }, 59 * 1000); // Every 59 seconds
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
    return m.reply("🚀 *Auto Bio started!* Your bio will now change every 59 seconds.");
  }

  if (arg === "off") {
    if (!autobioInterval) return m.reply("⚠️ *Auto Bio is not running.*");
    stopAutoBio();
    return m.reply("🛑 *Auto Bio stopped.*");
  }
};

export default autobioCommand;
