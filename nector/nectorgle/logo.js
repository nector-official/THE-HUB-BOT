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

  await Matrix.sendMessage(m.from, { react: { text: "🎨", key: m.key } });

  try {
    // 5 FlamingText styles
    const styles = ["chrome", "fluffy", "runner", "graffiti", "neon"];
    const gallery = styles.map(style => ({
      image: { 
        url: `https://flamingtext.com/net-fu/proxy_form.cgi?imageoutput=true&script=${style}-logo&doScale=true&scaleWidth=800&scaleHeight=500&fontsize=100&text=${encodeURIComponent(text)}`
      },
      caption: `🎨 *Style:* ${style}\n🖋️ *Text:* ${text}`
    }));

    // Send as a WhatsApp album
    await Matrix.sendMessage(m.from, { 
      image: gallery[0].image, caption: gallery[0].caption 
    }, { quoted: m });

    // Send the rest as an album
    if (gallery.length > 1) {
      await Matrix.sendMessage(m.from, gallery.slice(1), { quoted: m });
    }

  } catch (err) {
    console.error('[LOGO ERROR]', err.message);
    m.reply('❌ Could not generate logo right now.');
  }
};

export default logoCommand;
