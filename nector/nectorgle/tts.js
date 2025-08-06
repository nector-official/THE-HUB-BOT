import googleTTS from 'google-tts-api';
import config from '../../config.cjs';

const ttsCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (!['tts', 'say'].includes(command)) return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "🗣", key: m.key } });

    if (!args) {
      return m.reply("❗ Please provide some text to convert to speech.\n\nExample: `*tts hello how are you`");
    }

    const url = googleTTS.getAudioUrl(args, {
      lang: 'hi-IN',
      slow: false,
      host: 'https://translate.google.com',
    });

    await Matrix.sendMessage(m.from, {
      audio: { url },
      mimetype: 'audio/mp4',
      ptt: true
    }, { quoted: m });

  } catch (err) {
    console.error('[TTS Error]', err.message);
    m.reply("❌ An error occurred while converting text to speech.");
  }
};

export default ttsCommand;
  
