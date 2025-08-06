import config from '../../config.cjs';

const autobioCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'autobio') return;

  await Matrix.sendMessage(m.from, { react: { text: "📣", key: m.key } });

  const quotes = [
    "⚡ Powered by THE-HUB-BOT",
    "🕐 Time now: " + new Date().toLocaleTimeString(),
    "🚀 Active since: " + new Date().toLocaleDateString(),
    "📡 Online — serving users...",
    "✨ Stay connected. Stay secured."
  ];

  // Pick a random quote
  const bio = quotes[Math.floor(Math.random() * quotes.length)];

  try {
    await Matrix.updateProfileStatus(bio);
    m.reply(`✅ *Bio updated to:*\n\n${bio}`);
  } catch (err) {
    console.error('[AutoBio Error]', err.message);
    m.reply("❌ *Failed to update bio. Make sure your session is active.*");
  }
};

export default autobioCommand;
