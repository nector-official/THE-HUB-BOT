import config from '../../config.cjs';
import os from 'os';

const pingCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== "ping") return;

  await Matrix.sendMessage(m.from, { react: { text: "🏓", key: m.key } });

  try {
    const start = Date.now();
    const temp = await Matrix.sendMessage(m.from, { text: "⏳ Checking ping..." });
    const latency = Date.now() - start;

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

    // System info
    const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2); // Total memory in MB
    const freeMem = (os.freemem() / 1024 / 1024).toFixed(2);   // Free memory in MB
    const usedMem = (totalMem - freeMem).toFixed(2);           // Used memory
    const cpuModel = os.cpus()[0].model;
    const platform = os.platform();

    const caption = `*${greeting}, ${m.pushName || "User"}!*\n\n` +
                    `*🏓 BOT PING REPORT*\n\n` +
                    `📅 *Date:* ${date}\n` +
                    `🕓 *Time:* ${time}\n` +
                    `⚡ *Ping:* ${latency} ms\n` +
                    `💻 *Platform:* ${platform}\n` +
                    `⚙️ *CPU:* ${cpuModel}\n` +
                    `💾 *Memory:* ${usedMem} MB / ${totalMem} MB (used/total)\n\n` +
                    `_Bot is responsive and running smoothly._`;

    // Send image with proper channel preview
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
            newsletterName: config.BOT_NAME || "THE-HUB-BOT", // channel name displayed
            serverMessageId: 143
          }
        }
      },
      { quoted: m }
    );

  } catch (error) {
    console.error("[Ping Error]", error.message);
    await m.reply("❌ *Error checking ping.*");
  }
};

export default pingCommand;
      
