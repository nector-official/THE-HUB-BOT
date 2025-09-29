import config from '../../config.cjs';
import axios from 'axios';

const football = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(" ")[0].toLowerCase()
    : '';
  const args = m.body.trim().split(" ").slice(1);
  const leagueCode = args[0] ? args[0].toUpperCase() : null;

  if (cmd !== "football" && cmd !== "match") return;

  if (!leagueCode) {
    await sock.sendMessage(m.from, {
      text: `❌ *Please provide a league code!*\n💡 Example: *${prefix}football PL*\n\nAvailable leagues:\nPL | Premier League\nCL | UEFA Champions League\nWC | FIFA World Cup\nBL1 | Bundesliga\nDED | Eredivisie\nBSA | Campeonato Brasileiro Série A\nPD | Primera Division\nFL1 | Ligue 1\nELC | Championship\nPPL | Primeira Liga\nEC | European Championship\nSA | Serie A`
    }, { quoted: m });
    return;
  }

  await m.React("⚽");

  try {
    const API_KEY = "578d0a840ee047d5a5a7da7410c94bc4";
    const url = `https://api.football-data.org/v4/matches`;
    const { data } = await axios.get(url, {
      headers: { "X-Auth-Token": API_KEY }
    });

    // Filter by league code
    const matches = data.matches.filter(match => match.competition.code === leagueCode);

    if (matches.length === 0) {
      await sock.sendMessage(m.from, {
        text: `❌ *No matches found for league:* ${leagueCode}`
      }, { quoted: m });
      await m.React("❌");
      return;
    }

    // Nairobi timezone conversion
    const timezoneOffset = 3; // UTC+3
    const matchList = matches.map(match => {
      const dateUTC = new Date(match.utcDate);
      const dateLocal = new Date(dateUTC.getTime() + timezoneOffset * 60 * 60 * 1000);
      const dateStr = dateLocal.toISOString().replace("T", " ").slice(0, 16);

      return `⚔️ *${match.homeTeam.name} vs ${match.awayTeam.name}*\n🗓️ ${dateStr} (Nairobi Time)\n🏟️ ${match.venue || "N/A"}\n`;
    }).join("\n─────────────────\n");

    await sock.sendMessage(m.from, {
      text: `📅 *Matches for ${leagueCode}:*\n\n${matchList}`
    }, { quoted: m });

    await m.React("✅");

  } catch (error) {
    console.error("[Football Command Error]", error.message);
    await sock.sendMessage(m.from, {
      text: `⚠️ *Could not fetch matches.*`
    }, { quoted: m });
    await m.React("⚠️");
  }
};

export default football;
