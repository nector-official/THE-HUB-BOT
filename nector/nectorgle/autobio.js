import axios from "axios";
import config from "../../config.cjs";

let autobioInterval = null;

const getRandomBio = async () => {
  const apis = [
    async () => {
      const res = await axios.get("https://zenquotes.io/api/random");
      return res.data?.[0]?.q ? `💡 ${res.data[0].q}` : null;
    },
    async () => {
      const res = await axios.get("https://api.adviceslip.com/advice");
      return res.data?.slip?.advice ? `🧠 ${res.data.slip.advice}` : null;
    },
    async () => {
      const res = await axios.get("https://uselessfacts.jsph.pl/random.json?language=en");
      return res.data?.text ? `📘 ${res.data.text}` : null;
    },
    async () => {
      const res = await axios.get("https://v2.jokeapi.dev/joke/Any?type=single");
      return res.data?.joke ? `😂 ${res.data.joke}` : null;
    }
  ];

  const randomApi = apis[Math.floor(Math.random() * apis.length)];
  try {
    const result = await randomApi();
    return result || "🤖 Auto Bio Active.";
  } catch (err) {
    console.error("[AutoBio API Error]", err.message);
    return "🤖 Auto Bio Running.";
  }
};

const startAutoBio = async (Matrix) => {
  if (autobioInterval) return;

  autobioInterval = setInterval(async () => {
    const quote = await getRandomBio();
    try {
      await Matrix.updateProfileStatus(quote);
      console.log(`[AutoBio] Bio updated to: ${quote}`);
    } catch (err) {
      console.error("[AutoBio Error]", err.message);
    }
  }, 10 * 1000); // Every 10 seconds
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
    return m.reply("🚀 *Auto Bio started!* Your bio will now change every 10 seconds.");
  }

  if (arg === "off") {
    if (!autobioInterval) return m.reply("⚠️ *Auto Bio is not running.*");
    stopAutoBio();
    return m.reply("🛑 *Auto Bio stopped.*");
  }
};

export default autobioCommand;
