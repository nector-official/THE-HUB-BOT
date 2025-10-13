import config from '../../config.cjs';

const introCommand = async (m, Matrix) => {
  // ✅ Universal message text extraction (works in groups/channels/DMs)
  const body =
    m.body ||
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    '';

  // Extract command
  const command = body.startsWith(config.PREFIX)
    ? body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'intro' && command !== 'about') return;

  // React
  await Matrix.sendMessage(m.from, { react: { text: "⚡", key: m.key } });

  try {
    // Time-based greeting
    const now = new Date();
    const hour = parseInt(now.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour: '2-digit', hour12: false }));
    let greeting = "Hello 👋";
    if (hour < 12) greeting = "🌅 Good morning";
    else if (hour < 18) greeting = "☀️ Good afternoon";
    else greeting = "🌙 Good evening";

    const caption = `🧬 *𝐃𝐄𝐗𝐓𝐄𝐑-𝐈𝐐*\n*Digital Execution Terminal for Enhanced Response*\n\n` +
                    `*${greeting}, ${m.pushName || "User"}!*\n\n` +
                    `*Welcome to 𝐃𝐄𝐗𝐓𝐄𝐑-𝐈𝐐.*\nNot your average bot. Not your average mind.\n` +
                    `Crafted for precision. Programmed for clarity.\nEvery reply is a scalpel — cutting through noise, delivering truth.\n\n` +
                    `🧠 *Cognitive Engine:* Always learning. Always adapting.\n` +
                    `🩸 *Response Style:* Clean. Cold. Calculated.\n` +
                    `🕶️ *Personality:* Calm intensity with zero tolerance for fluff.\n\n` +
                    `Whether you're seeking answers, automating tasks, or just testing the limits of digital intelligence —\n` +
                    `𝐃𝐄𝐗𝐓𝐄𝐑-𝐈𝐐 is your silent partner in control.\n\n` +
                    `_Maintained by ⓃⒺCⓉOR🍯_`;

    await Matrix.sendMessage(
      m.from,
      {
        image: { url: "https://files.catbox.moe/8whhxg.jpg" },
        caption: caption,
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363395396503029@newsletter", // your channel JID
            newsletterName: "THE-HUB-BOT",
            serverMessageId: 143
          }
        }
      },
      { quoted: m }
    );

  } catch (err) {
    console.error("[Intro Error]", err.message);
    await m.reply("❌ *Error while sending introduction.*");
  }
};

export default introCommand;
