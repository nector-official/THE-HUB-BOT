import config from '../../config.cjs';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const ttsCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  const aliases = ['tts', 'say', 'speak'];
  if (!aliases.includes(command)) return;

  // Get text from arguments or quoted message
  const args = m.body.slice(prefix.length + command.length).trim();
  const text = args || (m.quoted && m.quoted.text);

  if (!text) {
    return m.reply("🗣️ Please provide text or reply to a message to convert it to speech.");
  }

  await Matrix.sendMessage(m.from, { react: { text: "🎤", key: m.key } });

  try {
    // Google Translate TTS free endpoint
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(text)}&tl=en`;

    const audioPath = path.join('./', `tts_${Date.now()}.mp3`);
    const response = await axios.get(ttsUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(audioPath, response.data);

    await Matrix.sendMessage(m.from, {
      audio: { url: audioPath },
      mimetype: 'audio/mpeg',
      ptt: true // sends as push-to-talk (voice note)
    }, { quoted: m });

    fs.unlinkSync(audioPath);
  } catch (err) {
    console.error('[TTS ERROR]', err.message);
    await m.reply('❌ *Could not convert text to speech right now.*');
  }
};

export default ttsCommand;
