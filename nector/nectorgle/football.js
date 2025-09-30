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

  // Map league codes to API endpoints
  const leagueMap = {
    PL: "PL",
    CL: "CL",
    WC: "WC",
    BL1: "BL1",
    DED: "DED",
    BSA: "BSA",
    PD: "PD",
    FL1: "FL1",
    ELC: "ELC",
    PPL: "PPL",
    EC: "EC",
    SA: "SA"
  };

  const apiLeague = leagueMap[leagueCode];
  if (!apiLeague) {
    await sock.sendMessage(m.from, { text: `❌ Unknown league code: ${leagueCode}` }, { quoted: m });
    return;
  }

  await m.React("⚽");

  try {
    const API_KEY = '578d0a840ee047d5a5a7da7410c94bc4';

    // Week range: today → 7 days later
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDateObj = new Date();
    endDateObj.setDate(today.getDate() + 7);
    const endDate = endDateObj.toISOString().split('T')[0];

    const url = `https://api.football-data.org/v4/competitions/${apiLeague}/matches?dateFrom=${startDate}&dateTo=${endDate}`;
    const { data } = await axios.get(url, { headers: { 'X-Auth-Token': API_KEY } });

    if (!data.matches || data.matches.length === 0) {
      return await sock.sendMessage(m.from, { text: `⚠️ *No matches found this week for league:* ${leagueCode}` }, { quoted: m });
    }

    // Nairobi timezone (UTC+3)
    const timezoneOffset = 3; // hours
    const daysMap = {};

    // Group matches by day
    data.matches.forEach(match => {
      const dateUTC = new Date(match.utcDate);
      const dateLocal = new Date(dateUTC.getTime() + timezoneOffset * 60 * 60 * 1000);
      const weekday = dateLocal.toLocaleDateString('en-GB', { weekday: 'long' });
      const dateStr = dateLocal.toISOString().replace("T", " ").slice(0, 16);
      const matchText = `⚔️ *${match.homeTeam.name} vs ${match.awayTeam.name}*\n🕒 ${dateStr} (Nairobi Time)\n🏟️ ${match.venue || "N/A"}`;

      if (daysMap[weekday]) daysMap[weekday].push(matchText);
      else daysMap[weekday] = [matchText];
    });

    // Build message
    let message = `📆 *Matches this week for ${leagueCode}:*\n\n`;
    for (const day of Object.keys(daysMap)) {
      message += `📅 *${day}*\n${daysMap[day].join('\n')}\n\n`;
    }

    await sock.sendMessage(m.from, { text: message.trim() }, { quoted: m });
    await m.React("✅");

  } catch (err) {
    console.error("[Football Command Error]", err.response ? err.response.data : err.message);
    await sock.sendMessage(m.from, { text: '⚠️ *Could not fetch matches.*' }, { quoted: m });
    await m.React("⚠️");
  }
};

export default football;
