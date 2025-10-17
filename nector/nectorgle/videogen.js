import config from '../../config.cjs';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const videogenCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (!["genvid", "vidcr", "aivideo", "generatevideo"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "🎬", key: m.key } });

  if (!args) {
    return m.reply(
      "🎞️ *Please describe the video you want to generate.*\n\n" +
      "Example:\n`" + config.PREFIX + command + " a glowing neon text saying Happy Birthday with fireworks in the background`"
    );
  }

  try {
    await m.reply("🎥 *Creating your video... please wait 20–40 seconds.*");

    // Using Pollinations API (it now supports video generation prompts)
    const apiUrl = `https://video.pollinations.ai/prompt/${encodeURIComponent(args)}`;

    const res = await axios.get(apiUrl, { responseType: "arraybuffer" });

    // Temporary save path
    const filePath = path.join("./temp", `video_${Date.now()}.mp4`);
    fs.writeFileSync(filePath, Buffer.from(res.data, "binary"));

    // Send the generated video
    await Matrix.sendMessage(
      m.from,
      {
        video: { url: filePath },
        caption: `🎬 *AI Video Generated for:*\n> ${args}`
      },
      { quoted: m }
    );

    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });

    // Delete after sending
    setTimeout(() => {
      fs.unlinkSync(filePath);
    }, 15000);

  } catch (err) {
    console.error("[AI Video Error]", err.message);
    await m.reply("❌ *Failed to generate video. Please try again later.*");
    await Matrix.sendMessage(m.from, { react: { text: "⚠️", key: m.key } });
  }
};

export default videogenCommand;
