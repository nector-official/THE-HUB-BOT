import config from '../../config.cjs';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const sttCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  const aliases = ['stt', 'speech', 'listen'];
  if (!aliases.includes(command)) return;

  // Determine if audio is from reply or from current message
  const audioMsg = 
    (m.quoted && (m.quoted.audioMessage || m.quoted.videoMessage)) ||
    (m.audioMessage || m.videoMessage);

  if (!audioMsg) {
    return m.reply("🎙️ Please send or reply to a voice note/audio message with `.stt` to transcribe it.");
  }

  await Matrix.sendMessage(m.from, { react: { text: "⏳", key: m.key } });

  try {
    // Download the audio file
    const audioBuffer = await Matrix.downloadMediaMessage(m.quoted || m);
    const tempPath = path.join('./', `voice_${Date.now()}.ogg`);
    fs.writeFileSync(tempPath, audioBuffer);

    // Send audio to free Whisper API
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempPath));
    formData.append('model', 'whisper-1');

    const res = await axios.post('https://stt.api.freefq.com/v1/transcribe', formData, {
      headers: formData.getHeaders(),
    });

    fs.unlinkSync(tempPath); // delete after use

    const transcription = res.data.text || "❌ Could not transcribe.";
    await m.reply(`📝 *Transcription:*\n${transcription}`);
  } catch (err) {
    console.error('[STT ERROR]', err.message);
    await m.reply('❌ *Could not process speech-to-text right now.*');
  }
};

export default sttCommand;
