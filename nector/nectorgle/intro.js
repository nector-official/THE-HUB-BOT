import config from '../../config.cjs';

const introCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== "intro") return;

  await Matrix.sendMessage(m.from, { react: { text: "🧬", key: m.key } });

  try {
    const caption = `
🧬 *𝐃𝐄𝐗𝐓𝐄𝐑-𝐈𝐐*
_Digital Execution Terminal for Enhanced Response_

*Welcome to 𝐃𝐄𝐗𝐓𝐄𝐑-𝐈𝐐.*
Not your average bot. Not your average mind.
Crafted for precision. Programmed for clarity.
Every reply is a scalpel—cutting through noise, delivering truth.

🧠 _Cognitive Engine:_ Always learning. Always adapting.
🩸 _Response Style:_ Clean. Cold. Calculated.
🕶️ _Personality:_ Calm intensity with zero tolerance for fluff.

Whether you're seeking answers, automating tasks, or just testing the limits of digital intelligence—𝐃𝐄𝐗𝐓𝐄𝐑-𝐈𝐐 is your silent partner in control.

💡 _Tip:_ Use \`${config.PREFIX}help\` to see all commands.
`;

    await Matrix.sendMessage(
      m.from,
      {
        image: { url: "https://files.catbox.moe/8whhxg.jpg" }, // Optional intro image
        caption: caption.trim(),
        contextInfo: {
          forwardingScore: 999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363395396503029@newsletter", // your channel ID
            newsletterName: config.BOT_NAME || "DEXTER-IQ",
            serverMessageId: 143
          }
        }
      },
      { quoted: m }
    );

  } catch (error) {
    console.error("[Intro Error]", error.message);
    await m.reply("❌ *Error sending introduction message.*");
  }
};

export default introCommand;
