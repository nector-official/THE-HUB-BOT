import axios from "axios";
import config from "../../config.cjs";

const sessionGen = async (m, Matrix) => {
  // Extract command and args
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(" ")[0].toLowerCase()
    : "";
  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  // Trigger words
  if (!["session", "gen", "generate"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "⚙️", key: m.key } });

  if (!args || args.length < 10) {
    return m.reply(
      "❌ *Invalid phone number format.*\n\n✅ Example:\n`" +
        config.PREFIX +
        command +
        " 254712345678`"
    );
  }

  try {
    // Call your external Render API service
    const apiUrl = `https://nector-session.onrender.com/session/${encodeURIComponent(
      args
    )}`;

    const res = await axios.get(apiUrl);
    const { code } = res.data;

    if (!code) {
      return m.reply("❌ *No code returned. Try again later.*");
    }

    // Build the message
    const caption = `✅ *Session Generated Successfully!*\n\n📱 *Number:* ${args}\n🔑 *Code:* ${code}\n\n⚙️ _Powered by ${config.BOT_NAME || "Matrix AI"}_`;

    // Send the result as text (you can attach media if available)
    await Matrix.sendMessage(m.from, { text: caption }, { quoted: m });
  } catch (err) {
    console.error("[SessionGen Error]", err.message);
    await Matrix.sendMessage(
      m.from,
      { text: "⚠️ *Error generating session. Please try again later.*" },
      { quoted: m }
    );
  }
};

export default sessionGen;
