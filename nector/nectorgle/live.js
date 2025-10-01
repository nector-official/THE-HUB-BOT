import config from '../../config.cjs';
import axios from 'axios';

const footballCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(config.PREFIX.length + command.length).trim().toLowerCase();

  if (!["football", "soccer", "score"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "⚽", key: m.key } });

  try {
    const res = await axios.get('https://www.scorebat.com/video-api/v3/');
    const matches = res.data.response;

    if (!matches || matches.length === 0) {
      return m.reply("❌ No football updates available right now.");
    }

    // If user specified a league filter
    let filteredMatches = matches;
    if (args) {
      filteredMatches = matches.filter(match =>
        match.competition.toLowerCase().includes(args)
      );
    }

    if (filteredMatches.length === 0) {
      return m.reply(`❌ No matches found for "${args}". Try Premier, Bundesliga, Champions, La Liga, etc.`);
    }

    let msg = "⚽ *Football Updates:*\n\n";
    for (let match of filteredMatches.slice(0, 5)) { // show max 5
      msg += `🏆 ${match.competition}\n`;
      msg += `🔹 ${match.title}\n`;
      msg += `📅 ${match.date}\n`;
      msg += `🎥 Highlight: ${match.videos[0]?.embed ? "Available ✅" : "Not available"}\n\n`;
    }

    await m.reply(msg.trim());
  } catch (err) {
    console.error("[FOOTBALL ERROR]", err.message);
    m.reply("❌ Could not fetch football updates. Try again later.");
  }
};

export default footballCommand;
