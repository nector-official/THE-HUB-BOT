import config from '../../config.cjs';
import axios from 'axios';

const footballCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(config.PREFIX.length + command.length).trim().toLowerCase();

  if (!["result", "soccer", "score"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "⚽", key: m.key } });

  try {
    const res = await axios.get('https://www.scorebat.com/video-api/v3/');
    const matches = res.data.response;

    if (!matches || matches.length === 0) {
      return m.reply("❌ No football updates available right now.");
    }

    // Get today's date in Nairobi timezone
    const now = new Date();
    const nairobiDate = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(now);
    const today = nairobiDate.split("/").reverse().join("-"); // YYYY-MM-DD

    // Filter today’s games
    let todayMatches = matches.filter(match => match.date.startsWith(today));
    if (todayMatches.length === 0) todayMatches = matches; // fallback

    // If league filter
    let filteredMatches = todayMatches;
    if (args) {
      filteredMatches = todayMatches.filter(match =>
        match.competition.toLowerCase().includes(args)
      );
    }

    // Prioritize top leagues
    const topLeagues = ["champions", "premier", "la liga", "serie a", "bundesliga", "ligue 1"];
    filteredMatches.sort((a, b) => {
      const aTop = topLeagues.some(l => a.competition.toLowerCase().includes(l));
      const bTop = topLeagues.some(l => b.competition.toLowerCase().includes(l));
      return (aTop === bTop) ? 0 : aTop ? -1 : 1;
    });

    if (filteredMatches.length === 0) {
      return m.reply(`❌ No matches found for "${args}". Try typing Premier, Serie A, Champions, etc.`);
    }

    let msg = "⚽ *Football Updates:*\n\n";
    for (let match of filteredMatches.slice(0, 10)) {
      // Format date to Nairobi local time
      const localTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Nairobi",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short"
      }).format(new Date(match.date));

      msg += `🏆 ${match.competition}\n`;
      msg += `🔹 ${match.title}\n`;
      msg += `📅 ${localTime} (Nairobi)\n`;

      // Try to extract highlight link
      if (match.videos?.length > 0 && match.videos[0].embed) {
        const embed = match.videos[0].embed;
        const linkMatch = embed.match(/src=['"]([^'"]+)['"]/);
        if (linkMatch) {
          msg += `🎥 Highlight: ${linkMatch[1]}\n`;
        }
      }

      msg += `\n`;
    }

    await m.reply(msg.trim());
  } catch (err) {
    console.error("[FOOTBALL ERROR]", err.message);
    m.reply("❌ Could not fetch football updates. Try again later.");
  }
};

export default footballCommand;
