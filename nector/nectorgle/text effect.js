import config from '../../config.cjs';

const effectMap = {
  metallic: ["https://en.ephoto360.com/impressive-decorative-3d-metal-text-effect-798.html", "✅"],
  ice: ["https://en.ephoto360.com/ice-text-effect-online-101.html", "🧊"],
  snow: ["https://en.ephoto360.com/create-a-snow-3d-text-effect-free-online-621.html", "❄️"],
  impressive: ["https://en.ephoto360.com/create-3d-colorful-paint-text-effect-online-801.html", "🌌"],
  noel: ["https://en.ephoto360.com/noel-text-effect-online-99.html", "⚡️"],
  water: ["https://en.ephoto360.com/create-water-effect-text-online-295.html", "🌊"],
  matrix: ["https://en.ephoto360.com/matrix-text-effect-154.html", "🌙"],
  light: ["https://en.ephoto360.com/light-text-effect-futuristic-technology-style-648.html", "☀️"],
  neon: ["https://en.ephoto360.com/create-colorful-neon-light-text-effects-online-797.html", "🌌"],
  silver: ["https://en.ephoto360.com/create-glossy-silver-3d-text-effect-online-802.html", "🌀"],
  silva: ["https://en.ephoto360.com/create-glossy-silver-3d-text-effect-online-802.html", "🌀"],
  devil: ["https://en.ephoto360.com/neon-devil-wings-text-effect-online-683.html", "😈"],
  typography: ["https://en.ephoto360.com/create-typography-text-effect-on-pavement-online-774.html", "✍️"],
  purple: ["https://en.ephoto360.com/purple-text-effect-online-100.html", "😈"],
  thunder: ["https://en.ephoto360.com/thunder-text-effect-online-97.html", "⚡️"],
  leaves: ["https://en.ephoto360.com/green-brush-text-effect-typography-maker-online-153.html", "🍃"],
  "1917": ["https://en.ephoto360.com/1917-style-text-effect-523.html", "😅"],
  arena: ["https://en.ephoto360.com/create-cover-arena-of-valor-by-mastering-360.html", "🙃"],
  hacker: ["https://en.ephoto360.com/create-anonymous-hacker-avatars-cyan-neon-677.html", "👨‍💻"],
  sand: ["https://en.ephoto360.com/write-names-and-messages-on-the-sand-online-582.html", "👨‍🚒"]
};

const texteffectsCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (!Object.keys(effectMap).includes(command)) return;

  const [url, emoji] = effectMap[command];

  try {
    await Matrix.sendMessage(m.from, { react: { text: emoji, key: m.key } });

    if (!args) return m.reply("❓ Please provide text to generate effect.\nExample: *" + config.PREFIX + command + " THE-HUB-BOT*");

    // Assuming `generateImageEffect` is globally defined or imported
    if (typeof generateImageEffect !== 'function') {
      return m.reply("❌ Internal error: generateImageEffect() is not defined.");
    }

    await generateImageEffect(url, args, m, config.PREFIX);

  } catch (err) {
    console.error(`[${command.toUpperCase()} Effect Error]`, err.message);
    m.reply("❌ Failed to generate image effect. Try again later.");
  }
};

export default texteffectsCommand;
