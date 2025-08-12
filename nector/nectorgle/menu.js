import config from '../../config.cjs';

const logos = [
  "🟣✨《 ＴＨＥ-ＨＵＢ 》✨🟣",
  "💜⚡『 ＴＨＥ-ＨＵＢ 』⚡💜",
  "🔮🌟【 ＴＨＥ-ＨＵＢ 】🌟🔮",
  "💠🔥〘 ＴＨＥ-ＨＵＢ 〙🔥💠",
  "🎯💎《 ＴＨＥ-ＨＵＢ 》💎🎯"
];

const menuCommand = async (m, Matrix) => {
  try {
    await react(m, "📜");

    // Pick a random logo style each time
    const randomLogo = logos[Math.floor(Math.random() * logos.length)];

    let menuText = `
${randomLogo}

👤 *Owner:* ${config.OWNER_NAME}
🤖 *Bot:* ${config.BOT_NAME}
📌 *Prefix:* ${config.PREFIX}

╭─❏ *General Commands*
│  📌 ${config.PREFIX}menu - Show this menu
│  🎵 ${config.PREFIX}play <song> - Download audio
│  🎥 ${config.PREFIX}video <title> - Download video
│  🗣 ${config.PREFIX}tts <text> - Text to speech
│  🌐 ${config.PREFIX}translate <lang> <text> - Translate text
│  💬 ${config.PREFIX}ai <question> - Chat with AI
│  📚 ${config.PREFIX}fact - Get a random fact
│  😆 ${config.PREFIX}joke - Get a random joke
│  💡 ${config.PREFIX}advice - Get random advice
╰───────────────

╭─❏ *Group Commands*
│  📢 ${config.PREFIX}tagall - Mention everyone
│  🚫 ${config.PREFIX}antilink on/off - Anti-link
│  📥 ${config.PREFIX}kick <@tag> - Remove member
│  ➕ ${config.PREFIX}add <number> - Add member
│  🛡 ${config.PREFIX}promote <@tag> - Make admin
│  🪶 ${config.PREFIX}demote <@tag> - Remove admin
╰───────────────

💜 *Powered by THE-HUB*
    `;

    await Matrix.sendMessage(m.from, { text: menuText }, { quoted: m });
  } catch (error) {
    console.error(error);
    await m.reply("❌ Could not load menu.");
  }
};
