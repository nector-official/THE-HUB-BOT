import axios from "axios";

const API_BASE = "https://www.thesportsdb.com/api/v1/json/123"; // replace 123 with your own key if you have premium

// Normalize names (strip FC, CF, etc.)
const normalizeName = (name) => {
  return name
    .toLowerCase()
    .replace(/\b(fc|cf|sc|ac|club|team)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// Search and fuzzy match a team
const getTeam = async (teamName) => {
  try {
    const res = await axios.get(`${API_BASE}/searchteams.php`, {
      params: { t: teamName }
    });
    const teams = res.data?.teams;
    if (!teams || !teams.length) return null;

    // Try to find closest match
    const query = normalizeName(teamName);
    let bestMatch = teams[0];
    for (const t of teams) {
      if (normalizeName(t.strTeam) === query) {
        bestMatch = t;
        break;
      }
      if (normalizeName(t.strTeam).includes(query)) {
        bestMatch = t;
        break;
      }
    }
    return bestMatch;
  } catch (err) {
    console.error("[TEAM SEARCH ERROR]", err.message);
    return null;
  }
};

// Get last matches
const getLastMatches = async (teamId) => {
  try {
    const res = await axios.get(`${API_BASE}/eventslast.php`, {
      params: { id: teamId }
    });
    return res.data?.results || [];
  } catch (err) {
    return [];
  }
};

const predict = async (m, sock) => {
  try {
    const prefix = "!";
    const text = m.body?.trim() || "";

    if (!text.startsWith(prefix)) return;
    const cmd = text.slice(prefix.length).split(" ")[0].toLowerCase();
    if (cmd !== "predict") return;

    const args = text.slice(prefix.length + cmd.length).trim();
    if (!args.includes(" vs ")) {
      return await sock.sendMessage(m.from, {
        text: "❌ Format: *!predict TeamA vs TeamB*"
      }, { quoted: m });
    }

    const [teamAName, teamBName] = args.split(" vs ").map(t => t.trim());

    await m.React("⏳");

    const teamA = await getTeam(teamAName);
    const teamB = await getTeam(teamBName);

    if (!teamA || !teamB) {
      return await sock.sendMessage(m.from, {
        text: `❌ Could not find both teams. (*${teamAName}*, *${teamBName}*)\nTry a different spelling.`
      }, { quoted: m });
    }

    const lastA = await getLastMatches(teamA.idTeam);
    const lastB = await getLastMatches(teamB.idTeam);

    const matches = [...lastA.slice(0, 5), ...lastB.slice(0, 5)];
    if (matches.length === 0) {
      return await sock.sendMessage(m.from, {
        text: `⚠️ No recent match data for *${teamA.strTeam}* or *${teamB.strTeam}*.`
      }, { quoted: m });
    }

    // Stats
    let teamAWins = 0, teamBWins = 0, draws = 0, goals = 0, btts = 0;

    matches.forEach(match => {
      const home = parseInt(match.intHomeScore ?? 0);
      const away = parseInt(match.intAwayScore ?? 0);
      goals += home + away;

      if (home > 0 && away > 0) btts++;

      if (home > away) {
        if (normalizeName(match.strHomeTeam) === normalizeName(teamA.strTeam)) teamAWins++;
        if (normalizeName(match.strHomeTeam) === normalizeName(teamB.strTeam)) teamBWins++;
      } else if (away > home) {
        if (normalizeName(match.strAwayTeam) === normalizeName(teamA.strTeam)) teamAWins++;
        if (normalizeName(match.strAwayTeam) === normalizeName(teamB.strTeam)) teamBWins++;
      } else {
        draws++;
      }
    });

    const total = matches.length;
    const avgGoals = (goals / total).toFixed(2);

    const message = `
📊 *Prediction: ${teamA.strTeam} vs ${teamB.strTeam}*

📌 Based on last ${total} matches

🟢 Win %:
- ${teamA.strTeam}: ${(teamAWins / total * 100).toFixed(1)}%
- ${teamB.strTeam}: ${(teamBWins / total * 100).toFixed(1)}%
- Draw: ${(draws / total * 100).toFixed(1)}%

⚽ BTTS: ${(btts / total * 100).toFixed(1)}%
📈 Avg Goals: ${avgGoals}

🎯 Possible Correct Score:
- Tight: 1-1
- Open: 2-1 / 1-2
    `.trim();

    await sock.sendMessage(m.from, { text: message }, { quoted: m });
    await m.React("✅");

  } catch (err) {
    console.error("[PREDICT ERROR]", err.message);
    await sock.sendMessage(m.from, {
      text: "⚠️ Could not fetch prediction (API error)."
    }, { quoted: m });
    await m.React("⚠️");
  }
};

export default predict;
