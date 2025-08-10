import config from '../../config.cjs';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const ttsCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  // Command aliases
  const aliases = ['tts', 'speak', 'say'];

  if (!aliases.includes(command)) return;

  const text = m.body.slice(prefix.length + command.length).trim();
  if (!text) {
    return m.reply("🗣️ Please provide some text to convert to speech.\nExample: `.tts Hello world`");
  }

  try {
    // Temporary output file
    const outputPath = path.join('./', `tts_${Date.now()}.mp3`);

    // Google Translate TTS (no API key required)
    const lang = 'en'; // Change this to your preferred language code
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(text)}&tl=${lang}`;

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer'
    });

    fs.writeFileSync(outputPath, response.data);

    await Matrix.sendMessage(m.from, {
      audio: { url: outputPath },
      mimetype: 'audio/mp4',
      ptt: false
    }, { quoted: m });

    fs.unlinkSync(outputPath); // Delete after sending
  } catch (err) {
    console.error('[TTS ERROR]', err.message);
    m.reply('❌ *Could not process text-to-speech right now.*');
  }
};

export default ttsCommand;
