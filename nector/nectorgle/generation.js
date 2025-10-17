import config from '../../config.cjs';
import axios from 'axios';

const imagegenCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  // Supported command names
  if (!["create", "imgcr", "aiimage", "generateimage"].includes(command)) return;

  // React emoji while processing
  await Matrix.sendMessage(m.from, { react: { text: "🎨", key: m.key } });

  if (!args) {
    return m.reply(
      "🖌️ *Please describe the image you want to generate.*\n\n" +
      "Example:\n`" + config.PREFIX + command + " happy father's day with glowing candles and black background`"
    );
  }

  try {
    // Send generation notice
    await m.reply("🧠 Generating your image... please wait a few seconds.");

    // Pollinations API (free, no key needed)
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(args)}`;
    const res = await axios.get(url, { responseType: "arraybuffer" });

    // Convert image to buffer
    const buffer = Buffer.from(res.data, "binary");

    // Send generated image
    await Matrix.sendMessage(
      m.from,
      {
        image: buffer,
        caption: `🖼️ *AI Image Generated for:*\n> ${args}`
      },
      { quoted: m }
    );

    // React with success emoji
    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });

  } catch (err) {
    console.error("[AI Image Error]", err.message);
    await m.reply("❌ *Failed to generate image. Please try again later.*");
    await Matrix.sendMessage(m.from, { react: { text: "⚠️", key: m.key } });
  }
};

export default imagegenCommand;
