import config from '../../config.cjs';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const voiceToTextCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'voicetotext') return;

  await Matrix.sendMessage(m.from, { react: { text: "🗣️", key: m.key } });

  if (!m.quoted || !m.quoted.message.audioMessage) {
    return m.reply("🎙️ *Please reply to a voice message with:* `*voicetotext`");
  }

  try {
    const audioPath = `./temp_${Date.now()}.mp3`;

    const voiceFile = await Matrix.downloadAndSaveMediaMessage(m.quoted, audioPath);

    const { data } = await axios.post('https://api.safone.dev/speech2text', {
      file: fs.createReadStream(voiceFile)
    }, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    fs.unlinkSync(voiceFile);

    const text = data?.text || 'Could not understand audio.';
    m.reply(`📝 *Transcribed Text:*\n\n${text}`);

  } catch (err) {
    console.error('[VoiceToText Error]', err.message);
    m.reply("❌ *Failed to convert voice to text.*");
  }
};

export default voiceToTextCommand;
  
