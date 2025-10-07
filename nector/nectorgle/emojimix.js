import fetch from 'node-fetch';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';
import config from '../../config.cjs';

const emojimixCommand = async (m, Matrix) => {
  try {
    // Detect command name
    const command = m.body.startsWith(config.PREFIX)
      ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
      : '';

    // Allow multiple triggers
    if (!['emojimix', 'mixemoji', 'emojiblend'].includes(command)) return;

    // React on trigger
    await Matrix.sendMessage(m.from, { react: { text: '🎴', key: m.key } });

    // Extract emojis text
    const args = m.body.slice(config.PREFIX.length + command.length).trim();

    if (!args) {
      return m.reply('🎭 *Example:* `' + config.PREFIX + command + ' 😎+🥰`');
    }

    if (!args.includes('+')) {
      return m.reply('✳️ Separate emojis using a *+* sign\n\nExample:\n' + config.PREFIX + command + ' 😎+🥰');
    }

    let [emoji1, emoji2] = args.split('+').map(e => e.trim());
    if (!emoji1 || !emoji2) {
      return m.reply('❌ Invalid format! Use: ' + config.PREFIX + command + ' 😎+🥰');
    }

    // Tenor API
    const apiUrl = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;
    
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      await Matrix.sendMessage(m.from, { react: { text: '❌', key: m.key } });
      return m.reply('❌ These emojis cannot be mixed! Try different ones.');
    }

    const imageUrl = data.results[0].url;
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const tempFile = path.join(tmpDir, `temp_${Date.now()}.png`);
    const outputFile = path.join(tmpDir, `sticker_${Date.now()}.webp`);

    // Download image
    const imgRes = await fetch(imageUrl);
    const buffer = await imgRes.buffer();
    fs.writeFileSync(tempFile, buffer);

    // Convert to webp using ffmpeg
    await new Promise((resolve, reject) => {
      const cmd = `ffmpeg -i "${tempFile}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" "${outputFile}"`;
      exec(cmd, (err) => (err ? reject(err) : resolve()));
    });

    if (!fs.existsSync(outputFile)) throw new Error('Failed to create sticker file');

    const stickerBuffer = fs.readFileSync(outputFile);

    // Send sticker
    await Matrix.sendMessage(m.from, { sticker: stickerBuffer }, { quoted: m });

    // Success reaction
    await Matrix.sendMessage(m.from, { react: { text: '✅', key: m.key } });

    // Cleanup
    fs.unlinkSync(tempFile);
    fs.unlinkSync(outputFile);
  } catch (error) {
    console.error('❌ EmojiMix Error:', error);
    await Matrix.sendMessage(m.from, { react: { text: '❌', key: m.key } });
    await m.reply('❌ Failed to mix emojis! Make sure you use valid emojis.\n\nExample: `' + config.PREFIX + 'emojimix 😎+🥰`');
  }
};

export default emojimixCommand;
