import fetch from 'node-fetch';
import config from '../../config.cjs';

const translateCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  const argsRaw = m.body.slice(config.PREFIX.length + command.length).trim();

  if (!['translate', 'trt'].includes(command)) return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "🌏", key: m.key } });

    const args = argsRaw.split(' ');
    if (args.length < 2) {
      return m.reply("❗ Please provide a language code and the text to translate.\n\nExample: `*translate sw Hello world`");
    }

    const targetLang = args[0];
    const textToTranslate = args.slice(1).join(' ');

    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=en|${targetLang}`);
    
    if (!response.ok) {
      return m.reply("❌ Failed to fetch translation. Please try again later.");
    }

    const data = await response.json();

    if (!data.responseData || !data.responseData.translatedText) {
      return m.reply("⚠️ No translation found for the provided text.");
    }

    const translatedText = data.responseData.translatedText;

    await Matrix.sendMessage(m.from, {
      text: `🌐 *Translation:* ${translatedText}`
    }, { quoted: m });

  } catch (err) {
    console.error('[Translate Error]', err.message);
    m.reply("❌ An error occurred while translating your text.");
  }
};

export default translateCommand;
