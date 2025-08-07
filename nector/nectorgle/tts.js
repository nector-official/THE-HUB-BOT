import config from '../../config.cjs';
import axios from 'axios';
import fs from 'fs';

const ttsCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (command !== 'tts') return;

  await Matrix.sendMessage(m.from, { react: { text: "🗣", key: m.key } });

  if (!args) return m.reply('❗ *Enter the text to speak.*');

  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(args)}&tl=en&client=tw-ob`;

    await Matrix.sendMessage(m.chat, {
      audio: { url },
      mimetype: 'audio/mp4',
      ptt: true
    }, { quoted: m });

  } catch (err) {
    console.error('[TTS Error]', err.message);
    m.reply('❌ *Could not generate speech audio.*');
  }
};

export default ttsCommand;
