import axios from 'axios';
import config from '../../config.cjs';

const sessionGen = async (m, Matrix) => {
  try {
    // ✅ Detect command name and args
    const command = m.body.startsWith(config.PREFIX)
      ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
      : '';
    const args = m.body.slice(config.PREFIX.length + command.length).trim();

    // ✅ Only run for your chosen command trigger
    if (!["session", "gensession"].includes(command)) return;

    // ✅ React while processing
    await Matrix.sendMessage(m.from, { react: { text: "⏳", key: m.key } });

    // ✅ Require phone number
    if (!args) {
      return m.reply(
        "📱 *Please provide your phone number.*\n\nExample:\n" +
        "`" + config.PREFIX + command + " 254712345678`"
      );
    }

    const phone = args.trim();
    console.log("[SessionGen] Phone:", phone);

    // ✅ Request to your Render API (check that this URL matches your working one)
    const apiURL = `https://nector-session.onrender.com/session/${encodeURIComponent(phone)}`;
    console.log("[SessionGen] Requesting:", apiURL);

    const response = await axios.get(apiURL);

    console.log("[SessionGen] Raw response:", response.data);

    const { code } = response.data || {};

    // ✅ Validate code
    if (!code) {
      console.warn("[SessionGen] Missing code field in response");
      throw new Error("No 'code' field returned from API.");
    }

    // ✅ Build success message
    const msg = `✅ *Session Generated Successfully!*\n\n📞 Number: ${phone}\n🔑 Code: ${code}\n\n⚙️ Use this code in your bot setup.`;

    await Matrix.sendMessage(m.from, { text: msg }, { quoted: m });

  } catch (error) {
    console.error("SessionGen Error:", error);
    await m.reply(`⚠️ *Error generating session.*\n\n🧩 Details: ${error.message || error}`);
  }
};

export default sessionGen;
