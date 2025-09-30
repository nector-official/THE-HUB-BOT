import axios from "axios";

const tip = async (m, sock) => {
  try {
    const prefix = "!";
    const text = m.body?.trim() || "";

    if (!text.startsWith(prefix)) return;
    const cmd = text.slice(prefix.length).split(" ")[0].toLowerCase();
    if (cmd !== "tip") return;

    // Extract teams
    const args = text.slice(prefix.length + cmd.length).trim();
    if (!args.includes(" vs ")) {
      return await sock.sendMessage(m.from, {
        text: "❌ Format: *!tip TeamA vs TeamB*"
      }, { quoted: m });
    }

    const [teamAName, teamBName] = args.split(" vs ").map(t => t.trim());

    await m.React("⏳");

    // API-Football settings
    const API_KEY = "a3f7d73d569de1d62fb8147005347f79";
    const API_URL = "https://v3.football.api-sports.io";

    // Helper: get team ID
    const getTeamId = async (teamName) => {
      const res = await axios.get(`${API_URL}/teams`, {
        headers: { "x-apisports-key": API_KEY },
        params: { search: teamName }
      });
      return res.data?.response?.[0]?.team?.id || null;
    };

    const teamAId = await getTeamId(teamAName);
    const teamBId = await getTeamId(teamBName);

    if (!teamAId || !teamBId) {
      return await sock.sendMessage(m.from, {
        text: `❌ Could not find both teams. (*${teamAName}*, *${teamBName}*)`
      }, { quoted: m });
    }

    // Collect data
    let matches = [];
    let source = "Head-to-Head + Recent Form";

    // 1. Head-to-Head (last 5)
    try {
      const h2hRes = await axios.get(`${API_URL}/fixtures/headtohead`, {
        headers: { "x-apisports-key": API_KEY },
        params: { h2h: `${teamAId}-${teamBId}`, last: 5 }
      });
      if (h2hRes.data?.response?.length > 0) {
        matches = [...matches, ...h2hRes.data.response];
      }
    } catch (err) {
      console.error("[H2H ERROR]", err.response?.data || err.message);
    }

    // 2. Recent form for both (last 5)
    const getLastMatches = async (teamId) => {
      const res = await axios.get(`${API_URL}/fixtures`, {
        headers: { "x-apisports-key": API_KEY },
        params: { team: teamId, last: 5 }
      });
      return res.data?.response || [];
    };

    const lastA = await getLastMatches(teamAId);
    const lastB = await getLastMatches(teamBId);
    matches = [...matches, ...lastA, ...lastB];

    if (matches.length === 0) {
      return await sock.sendMessage(m.from, {
        text: `⚠️ No data available for *${teamAName}* vs *${teamBName}*.`
      }, { quoted: m });
    }

    // Analysis
    let teamAWins = 0, teamBWins = 0, draws = 0, btts = 0, totalGoals = 0;
    let goalsForA = 0, goalsForB = 0, gamesA = 0, gamesB = 0;

    matches.forEach(match => {
      const goalsHome = match.goals?.home ?? 0;
      const goalsAway = match.goals?.away ?? 0;
      totalGoals += goalsHome + goalsAway;

      const homeName = match.teams?.home?.name || "";
      const awayName = match.teams?.away?.name || "";

      // Count goals per team
      if (homeName.toLowerCase().includes(teamAName.toLowerCase())) {
        goalsForA += goalsHome;
        gamesA++;
      }
      if (awayName.toLowerCase().includes(teamAName.toLowerCase())) {
        goalsForA += goalsAway;
        gamesA++;
      }
      if (homeName.toLowerCase().includes(teamBName.toLowerCase())) {
        goalsForB += goalsHome;
        gamesB++;
      }
      if (awayName.toLowerCase().includes(teamBName.toLowerCase())) {
        goalsForB += goalsAway;
        gamesB++;
      }

      // W/D/L
      if (goalsHome > goalsAway) {
        if (homeName.toLowerCase().includes(teamAName.toLowerCase())) teamAWins++;
        else teamBWins++;
      } else if (goalsAway > goalsHome) {
        if (awayName.toLowerCase().includes(teamAName.toLowerCase())) teamAWins++;
        else teamBWins++;
      } else {
        draws++;
      }

      if (goalsHome > 0 && goalsAway > 0) btts++;
    });

    const total = matches.length;
    const avgGoals = (totalGoals / total).toFixed(2);

    // Average goals per team
    const avgGoalsA = gamesA > 0 ? (goalsForA / gamesA).toFixed(2) : 1;
    const avgGoalsB = gamesB > 0 ? (goalsForB / gamesB).toFixed(2) : 1;

    // Predictive scoring (Poisson-like)
    const predictScore = () => {
      const possibleScores = [];
      for (let a = 0; a <= 3; a++) {
        for (let b = 0; b <= 3; b++) {
          const prob = Math.exp(-avgGoalsA) * Math.pow(avgGoalsA, a) / factorial(a) *
                       Math.exp(-avgGoalsB) * Math.pow(avgGoalsB, b) / factorial(b);
          possibleScores.push({ score: `${a}-${b}`, prob });
        }
      }
      return possibleScores.sort((x, y) => y.prob - x.prob).slice(0, 3);
    };

    const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));
    const topScores = predictScore();

    const message = `
📊 *Prediction: ${teamAName} vs ${teamBName}*

📌 Based on: ${source}

🟢 Win %:
- ${teamAName}: ${(teamAWins / total * 100).toFixed(1)}%
- ${teamBName}: ${(teamBWins / total * 100).toFixed(1)}%
- Draw: ${(draws / total * 100).toFixed(1)}%

⚽ Both Teams to Score (BTTS): ${(btts / total * 100).toFixed(1)}%
📈 Average Goals: ${avgGoals}

🎯 Likely Correct Scores:
${topScores.map(s => `- ${s.score} (${(s.prob * 100).toFixed(1)}%)`).join("\n")}

💡 *Note:* Stats from last ${total} matches.
    `.trim();

    await sock.sendMessage(m.from, { text: message }, { quoted: m });
    await m.React("✅");

  } catch (err) {
    console.error("[TIP ERROR]", err.response?.data || err.message);
    await sock.sendMessage(m.from, {
      text: "⚠️ Could not fetch analysis (API error or key issue)."
    }, { quoted: m });
    await m.React("⚠️");
  }
};

export default tip;
