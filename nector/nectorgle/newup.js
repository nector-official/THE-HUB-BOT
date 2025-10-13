import config from '../../config.cjs';
import os from 'os';

const uptimeCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== "uptime") return;

  await Matrix.sendMessage(m.from, { react: { text: "⏱️", key: m.key } });

  try {
    // Kenya timezone date & time
    const now = new Date();
    const options = {
      timeZone: 'Africa/Nairobi',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };
    const formattedTime = now.toLocaleString('en-KE', options);
    const [date, time] = formattedTime.split(', ');

    // Greeting
    const hour = parseInt(now.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour: '2-digit', hour12: false }));
    let greeting = "Hello 👋";
    if (hour < 12) greeting = "🌅 Good morning";
    else if (hour < 18) greeting = "☀️ Good afternoon";
    else greeting = "🌙 Good evening";

    // Uptime
    const totalSeconds = process.uptime();
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    // System info
    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const cpuModel = os.cpus()[0].model;
    const platform = os.platform();

    const caption = `*${greeting}, ${m.pushName || "User"}!*\n\n` +
                    `*🤖 BOT 𝐃𝐄𝐗𝐓𝐄𝐑-𝐈𝐐 REPORT*\n\n` +
                    `📅 *Date:* ${date}\n` +
                    `🕓 *Time:* ${time}\n` +
                    `🕐 *Uptime:* ${uptime}\n` +
                    `💻 *Platform:* ${platform}\n` +
                    `⚙️ *CPU:* ${cpuModel}\n` +
                    `💾 *RAM Usage:* ${memoryUsage} MB\n\n` +
                    `_its active 🚀✊._`;

    // ✅ Send image with proper channel preview
    await Matrix.sendMessage(
      m.from,
      {
        image: { url: "https://files.catbox.moe/8whhxg.jpg" },
        caption: caption,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363395396503029@newsletter", // your channel ID
            newsletterName: "THE-HUB-BOT", // channel name displayed
            serverMessageId: 143
          }
        }
      },
      { quoted: m }
    );

  } catch (error) {
    console.error("[Uptime Error]", error.message);
    await m.reply("❌ *Error while checking uptime. Try again later.*");
  }
};

export default uptimeCommand;
