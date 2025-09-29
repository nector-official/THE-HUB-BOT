import axios from 'axios';
import config from '../../config.cjs';

const fonts = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(" ")[0].toLowerCase()
    : '';
  const text = m.body.slice(prefix.length + cmd.length).trim();

  if (cmd !== "fonts") return;
  if (!text) return sock.sendMessage(m.from, { text: `❌ Provide text: *${prefix}fonts Hello*` }, { quoted: m });

  await m.React("✍️");

  try {
    // Call API to generate multiple fonts
    const res = await axios.get(`https://api.styledtext.io/v1/fonts?text=${encodeURIComponent(text)}`);
    // API should return an array of different styled texts
    const fontsList = res.data.fonts; 

    for (const f of fontsList) {
      await sock.sendMessage(m.from, { text: f }, { quoted: m });
    }

    await m.React("✅");

  } catch (err) {
    console.error(err);
    await sock.sendMessage(m.from, { text: "⚠️ Could not generate fonts via API." }, { quoted: m });
    await m.React("⚠️");
  }
};

export default fonts;
