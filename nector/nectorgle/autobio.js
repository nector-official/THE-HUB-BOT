import axios from "axios";
import config from "../../config.cjs";

let autobioInterval = null;

// List of your preferred APIs
const apiList = [
  "https://zenquotes.io/api/random",
  "https://api.adviceslip.com/advice",
  "https://uselessfacts.jsph.pl/random.json?language=en",
  "https://v2.jokeapi.dev/joke/Any?type=single"
];

// Get a random quote/fact/joke/advice from the APIs
const getRandomQuote = async () => {
  const api = apiList[Math.floor(Math.random() * apiList.length)];

  try {
    const res = await axios.get(api);

    if (api.includes("zenquotes")) {
      return `🌟 ${res.data[0]?.q} — ${res.data[0]?.a}`;
    }

    if (api.includes("adviceslip")) {
      return `💡 ${res.data.slip.advice}`;
    }

    if (api.includes("uselessfacts")) {
      return `📘 ${res.data.text}`;
    }

    if (api.includes("jokeapi")) {
      return `😂 ${res.data.joke}`;
    }

  } catch (err) {
    console.error("[AutoBio API Error]", err.message);
    return "⚡ THE-HUB-BOT is live!";
  }
};

// Start the autobio interval
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
  }, 10 * 1000); // Every 10 seconds
};

// Stop the autobio interval
const stopAutoBio = () => {
  if (autobioInterval) clearInterval(autobioInterval);
  autobioInterval = null;
};

// Handle the `autobio` command
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
    return m.reply("🚀 *Auto Bio started!* Your bio will now change every 10 seconds.");
  }

  if (arg === "off") {
    if (!autobioInterval) return m.reply("⚠️ *Auto Bio is not running.*");
    stopAutoBio();
    return m.reply("🛑 *Auto Bio stopped.*");
  }
};

export default autobioCommand;
