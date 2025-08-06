import fetch from 'node-fetch';
import config from '../../config.cjs';

const lyricsCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (command !== 'lyrics') return;

  if (!args) {
    return m.reply("❓ Please provide a song name to search lyrics for.");
  }

  try {
    await Matrix.sendMessage(m.from, { react: { text: "🎶", key: m.key } });

    const apiUrl = `https://api.dreaded.site/api/lyrics?title=${encodeURIComponent(args)}`;
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data.success || !data.result || !data.result.lyrics) {
      return m.reply(`❌ Sorry, no lyrics found for "${args}".`);
    }

    const { title, artist, link, thumb, lyrics } = data.result;
    const imageUrl = thumb || "https://files.catbox.moe/v4uikp.jpg";

    const imageBuffer = await fetch(imageUrl)
      .then(res => res.buffer())
      .catch(err => {
        console.error('❌ Error fetching image:', err);
        return null;
      });

    if (!imageBuffer) {
      return m.reply("❌ Failed to fetch the song cover image.");
    }

    const caption = `🎼 *Title:* ${title}\n🎤 *Artist:* ${artist}\n\n📝 *Lyrics:*\n\n${lyrics}`;

    await Matrix.sendMessage(m.from, {
      image: imageBuffer,
      caption: caption
    }, { quoted: m });

  } catch (error) {
    console.error('[Lyrics Error]', error.message);
    m.reply(`❌ An error occurred while fetching lyrics for "${args}".`);
  }
};

export default lyricsCommand;
