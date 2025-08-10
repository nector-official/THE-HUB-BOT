import config from '../../config.cjs';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

const voiceEffectCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  const aliases = ['effect', 'voice', 'audiofx'];
  if (!aliases.includes(command)) return;

  const args = m.body.slice(prefix.length + command.length).trim().split(' ');
  const effect = args[0]?.toLowerCase();

  const quotedMsg = m.quoted && m.quoted.message;
  const hasAudio = 
    (quotedMsg && quotedMsg.audioMessage) ||
    (m.message && m.message.audioMessage);

  if (!hasAudio) {
    return m.reply("🎙️ Please reply to a voice note/audio message with an effect.\n\n*Examples:*\n.effect chipmunk\n.effect deep\n.effect slow\n.effect fast");
  }

  await Matrix.sendMessage(m.from, { react: { text: "🎛️", key: m.key } });

  try {
    const audioBuffer = await Matrix.downloadMediaMessage(m.quoted || m);
    const inputPath = path.join('./', `input_${Date.now()}.ogg`);
    const wavPath = path.join('./', `temp_${Date.now()}.wav`);
    const outputPath = path.join('./', `output_${Date.now()}.ogg`);
    fs.writeFileSync(inputPath, audioBuffer);

    // Convert OGG → WAV first
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('wav')
        .save(wavPath)
        .on('end', resolve)
        .on('error', reject);
    });

    // Choose filter
    let filter;
    switch (effect) {
      case 'chipmunk':
      case 'soprano':
        filter = 'asetrate=44100*1.5,aresample=44100';
        break;
      case 'deep':
      case 'bass':
        filter = 'asetrate=44100*0.8,aresample=44100';
        break;
      case 'slow':
        filter = 'atempo=0.8';
        break;
      case 'fast':
        filter = 'atempo=1.3';
        break;
      case 'loud':
        filter = 'volume=2.0';
        break;
      case 'quiet':
        filter = 'volume=0.5';
        break;
      default:
        return m.reply("❌ Unknown effect. Try: chipmunk, deep, slow, fast, loud, quiet.");
    }

    // Apply effect to WAV → back to OGG
    await new Promise((resolve, reject) => {
      ffmpeg(wavPath)
        .audioFilters(filter)
        .toFormat('ogg')
        .save(outputPath)
        .on('end', resolve)
        .on('error', reject);
    });

    await Matrix.sendMessage(m.from, {
      audio: fs.readFileSync(outputPath),
      mimetype: 'audio/ogg; codecs=opus',
      ptt: true
    }, { quoted: m });

    // Cleanup
    fs.unlinkSync(inputPath);
    fs.unlinkSync(wavPath);
    fs.unlinkSync(outputPath);

  } catch (err) {
    console.error('[VOICE EFFECT ERROR]', err);
    m.reply('❌ Could not apply effect to the audio.');
  }
};

export default voiceEffectCommand;
