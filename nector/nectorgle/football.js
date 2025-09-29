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

  const leagueMap = {
    PL: "PL",
    CL: "UCL",
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

  const apiCode = leagueMap[leagueCode];
  if (!apiCode) {
    await sock.sendMessage(m.from, { text: `❌ Unknown league code: ${leagueCode}` }, { quoted: m });
    return;
  }

  await m.React("⚽");

  try {
    const API_KEY = "578d0a840ee047d5a5a7da7410c94bc4";

    // Current week: Sunday → Saturday
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    const url = `https://api.football-data.org/v4/matches`;
    const { data } = await axios.get(url, {
      headers: { "X-Auth-Token": API_KEY }
    });

    // Filter matches by league & week
    const matches = data.matches.filter(match => {
      const matchDate = new Date(match.utcDate);
      return match.competition.code === apiCode && matchDate >= startOfWeek && matchDate <= endOfWeek;
    });

    if (!matches || matches.length === 0) {
      await sock.sendMessage(m.from, {
        text: `❌ *No matches found this week for league:* ${leagueCode}`
      }, { quoted: m });
      await m.React("❌");
      return;
    }

    // Nairobi timezone
    const timezoneOffset = 3; // UTC+3
    const daysMap = {};

    // Group matches by day
    matches.forEach(match => {
      const dateUTC = new Date(match.utcDate);
      const dateLocal = new Date(dateUTC.getTime() + timezoneOffset * 60 * 60 * 1000);
      const weekday = dateLocal.toLocaleDateString('en-GB', { weekday: 'long' });
      const dateStr = dateLocal.toISOString().replace("T", " ").slice(0, 16);

      const matchText = `⚔️ *${match.homeTeam.name} vs ${match.awayTeam.name}*\n🕒 ${dateStr} (Nairobi Time)\n🏟️ ${match.venue || "N/A"}`;

      if (daysMap[weekday]) {
        daysMap[weekday].push(matchText);
      } else {
        daysMap[weekday] = [matchText];
      }
    });

    // Build message
    let matchList = '';
    for (const day of Object.keys(daysMap)) {
      matchList += `📅 *${day}*\n${daysMap[day].join('\n')}\n\n`;
    }

    await sock.sendMessage(m.from, {
      text: `📆 *Matches this week for ${leagueCode}:*\n\n${matchList.trim()}`
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
