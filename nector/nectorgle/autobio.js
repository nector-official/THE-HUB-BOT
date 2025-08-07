import axios from "axios";
import config from "../../config.cjs";

let autobioInterval = null;

// Fetch motivational quote from API
const getMotivation = async () => {
  try {
    const res = await axios.get("https://zenquotes.io/api/random");
    if (res.data && res.data[0] && res.data[0].q && res.data[0].a) {
      return `💭 "${res.data[0].q}" - ${res.data[0].a}`;
    }
  } catch (err) {
    console.error("[AutoBio MotivationAPI Error]", err.message);
  }

  return "🌟 Stay motivated!"; // fallback if API fails
};

const startAutoBio = async (Matrix) => {
  if (autobioInterval) return;

  autobioInterval = setInterval(async () => {
    const quote = await getMotivation();
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
    return m.reply("🌟 *Motivational Auto Bio started!* Updates every 10 seconds.");
  }

  if (arg === "off") {
    if (!autobioInterval) return m.reply("⚠️ *Auto Bio is not running.*");
    stopAutoBio();
    return m.reply("🛑 *Auto Bio stopped.*");
  }
};

export default autobioCommand;
