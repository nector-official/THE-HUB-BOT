import config from '../../config.cjs';
import axios from 'axios';

const football = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(" ")[0].toLowerCase()
    : '';

  if (cmd !== "epl") return;

  await m.React("⚽");

  try {
    // Free ScoreBat API (no API key required)
    const url = "https://www.scorebat.com/video-api/v3/feed/?token=MTQ1NzNfMTY5NzA2NDc1OF8yZGVmZDM5NjQ3ZTQzNjUxYjVkMzVkNTQ3MzY0ZDNlYjM3ZTI3NGVi"; 
    const { data } = await axios.get(url);

    if (!data.response || data.response.length === 0) {
      return sock.sendMessage(m.from, {
        text: `❌ *No EPL matches found this week.*`
      }, { quoted: m });
    }

    // Filter only EPL (England: Premier League)
    const eplMatches = data.response.filter(
      match => match.competition && match.competition.includes("ENGLAND: Premier League")
    );

    if (eplMatches.length === 0) {
      return sock.sendMessage(m.from, {
        text: `❌ *No EPL matches scheduled this week.*`
      }, { quoted: m });
    }

    let message = "⚽ *This Week's EPL Matches:*\n\n";
    eplMatches.forEach((match, i) => {
      message += `🏟️ ${match.title}\n📅 ${match.date}\n🔗 Highlights: ${match.matchviewUrl}\n\n`;
    });

    await sock.sendMessage(m.from, { text: message.trim() }, { quoted: m });

    await m.React("✅");

  } catch (error) {
    console.error("[Football Command Error]", error.message);
    await sock.sendMessage(m.from, {
      text: `⚠️ *Could not fetch EPL matches.*`
    }, { quoted: m });
    await m.React("⚠️");
  }
};

export default football;
