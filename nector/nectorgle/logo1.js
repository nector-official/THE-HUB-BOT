import config from '../../config.cjs';

const logoCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'logo') return;

  // Get text from arguments or quoted message
  const args = m.body.slice(prefix.length + command.length).trim();
  const text = args || (m.quoted && m.quoted.text);

  if (!text) {
    return m.reply("🖌️ Please provide text or reply to a message to make a logo.\nExample: `.logo My Brand`");
  }

  // Send loading message
  await Matrix.sendMessage(m.from, { text: "🎨 Generating logos, please wait..." }, { quoted: m });

  try {
    // Expanded style pool
    const styles = [
      "chrome", "fluffy", "runner", "graffiti", "neon",
      "ice", "fire", "glow", "outline", "comic",
      "3d-gradient", "sketch", "alien", "steel", "blood",
      "lava", "snow", "matrix", "bubble", "water"
    ];

    // Pick 5 random styles (can repeat)
    const randomStyles = Array.from({ length: 5 }, () => styles[Math.floor(Math.random() * styles.length)]);

    // Send logos one by one
    for (let style of randomStyles) {
      const url = `https://flamingtext.com/net-fu/proxy_form.cgi?imageoutput=true&script=${style}-logo&doScale=true&scaleWidth=800&scaleHeight=500&fontsize=100&text=${encodeURIComponent(text)}`;
      
      await Matrix.sendMessage(
        m.from,
        { image: { url }, caption: `🎨 *Style:* ${style}\n🖋️ *Text:* ${text}` },
        { quoted: m }
      );
    }

  } catch (err) {
    console.error('[LOGO ERROR]', err.message);
    m.reply('❌ Could not generate logo right now.');
  }
};

export default logoCommand;
