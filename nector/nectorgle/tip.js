import axios from "axios";

const tip = async (m, sock) => {
  try {
    const prefix = "!";
    const text = m.body?.trim() || "";

    if (!text.startsWith(prefix)) return;
    const cmd = text.slice(prefix.length).split(" ")[0].toLowerCase();
    if (cmd !== "tip") return;

    const args = text.slice(prefix.length + cmd.length).trim();
    if (!args.includes(" vs ")) {
      return await sock.sendMessage(m.from, {
        text: "❌ Format: *!tip TeamA vs TeamB*"
      }, { quoted: m });
    }

    const [teamAName, teamBName] = args.split(" vs ").map(t => t.trim());
    await m.React("⏳");

    const API_KEY = "a3f7d73d569de1d62fb8147005347f79";
    const API_URL = "https://v3.football.api-sports.io";

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
        text: `❌ Could not find both teams (*${teamAName}*, *${teamBName}*).`
      }, { quoted: m });
    }

    // --- Head to Head ---
    let h2hMatches = [];
    try {
      const h2hRes = await axios.get(`${API_URL}/fixtures/headtohead`, {
        headers: { "x-apisports-key": API_KEY },
        params: { h2h: `${teamAId}-${teamBId}` }
      });
      h2hMatches = h2hRes.data?.response || [];
    } catch (err) {
      console.error("[H2H ERROR]", err.response?.data || err.message);
    }

    // --- Recent form ---
    const getLastMatches = async (teamId) => {
      const res = await axios.get(`${API_URL}/fixtures`, {
        headers: { "x-apisports-key": API_KEY },
        params: { team: teamId, last: 5 }
      });
      return res.data?.response || [];
    };

    const lastA = await getLastMatches(teamAId);
    const lastB = await getLastMatches(teamBId);

    // Helper: analyse matches
    const analyseMatches = (matches, teamName) => {
      let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0, btts = 0;
      matches.forEach(match => {
        const home = match.teams?.home?.name;
        const away = match.teams?.away?.name;
        const gh = match.goals?.home ?? 0;
        const ga_ = match.goals?.away ?? 0;

        let scored, conceded;
        if (home?.toLowerCase().includes(teamName.toLowerCase())) {
          scored = gh; conceded = ga_;
        } else {
          scored = ga_; conceded = gh;
        }

        gf += scored;
        ga += conceded;
        if (scored > conceded) wins++;
        else if (scored < conceded) losses++;
        else draws++;
        if (scored > 0 && conceded > 0) btts++;
      });

      return {
        total: matches.length,
        wins, draws, losses,
        avgGF: gf / matches.length || 0,
        avgGA: ga / matches.length || 0,
        bttsPct: (btts / matches.length * 100).toFixed(1)
      };
    };

    const h2hStatsA = analyseMatches(h2hMatches, teamAName);
    const h2hStatsB = analyseMatches(h2hMatches, teamBName);
    const formStatsA = analyseMatches(lastA, teamAName);
    const formStatsB = analyseMatches(lastB, teamBName);

    // Combine H2H + Form (50/50 weighting)
    const winPctA = ((h2hStatsA.wins + formStatsA.wins) / (h2hStatsA.total + formStatsA.total) * 100).toFixed(1);
    const winPctB = ((h2hStatsB.wins + formStatsB.wins) / (h2hStatsB.total + formStatsB.total) * 100).toFixed(1);
    const drawPct = (((h2hStatsA.draws + formStatsA.draws) / (h2hStatsA.total + formStatsA.total)) * 100).toFixed(1);

    const avgGoals = (((formStatsA.avgGF + formStatsB.avgGF) + (formStatsA.avgGA + formStatsB.avgGA)) / 2).toFixed(2);

    // Predict score using avg goals
    const predictedA = Math.round((formStatsA.avgGF + formStatsB.avgGA) / 2);
    const predictedB = Math.round((formStatsB.avgGF + formStatsA.avgGA) / 2);
    const correctScore = `${predictedA}-${predictedB}`;

    const message = `
📊 *Prediction: ${teamAName} vs ${teamBName}*

🟢 Win Chances:
- ${teamAName}: ${winPctA}%
- ${teamBName}: ${winPctB}%
- Draw: ${drawPct}%

⚽ Both Teams to Score (BTTS): ${(Number(formStatsA.bttsPct) + Number(formStatsB.bttsPct)) / 2}%
📈 Avg Goals Expected: ${avgGoals}

🎯 Predicted Correct Score: *${correctScore}*

💡 Based on last ${h2hMatches.length} H2H and recent form (last 5 each).
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
