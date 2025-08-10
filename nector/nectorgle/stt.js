import config from '../../config.cjs';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const sttCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  const aliases = ['stt', 'speech', 'listen'];
  if (!aliases.includes(command)) return;

  // Ensure the message is an audio or voice note
  if (!m.quoted || !m.quoted.audioMessage) {
    return m.reply("🎙️ Please reply to a voice note or audio message with `.stt` to transcribe it.");
  }

  await Matrix.sendMessage(m.from, { react: { text: "⏳", key: m.key } });

  try {
    // Download the audio
    const audioBuffer = await Matrix.downloadMediaMessage(m.quoted);
    const tempPath = path.join('./', `voice_${Date.now()}.ogg`);
    fs.writeFileSync(tempPath, audioBuffer);

    // Send to a free Whisper API endpoint
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempPath));
    formData.append('model', 'whisper-1');

    const res = await axios.post('https://stt.api.freefq.com/v1/transcribe', formData, {
      headers: formData.getHeaders(),
    });

    fs.unlinkSync(tempPath); // delete file after use

    const transcription = res.data.text || "❌ Could not transcribe.";
    await m.reply(`📝 *Transcription:*\n${transcription}`);
  } catch (err) {
    console.error('[STT ERROR]', err.message);
    await m.reply('❌ *Could not process speech-to-text right now.*');
  }
};

export default sttCommand;
