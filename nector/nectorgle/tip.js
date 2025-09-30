import axios from "axios";

const tip = async (m, sock) => {
  try {
    const prefix = "!";
    const text = m.body?.trim() || "";

    // Only trigger on !tip
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

    const [teamA, teamB] = args.split(" vs ").map(t => t.trim());

    await m.React("⏳");

    // API-Football settings
    const API_KEY = "a3f7d73d569de1d62fb8147005347f79";
    const API_URL = "https://v3.football.api-sports.io";

    let matches = [];

    // 1. Try Head-to-Head
    try {
      const h2hRes = await axios.get(`${API_URL}/fixtures/headtohead`, {
        headers: { "x-apisports-key": API_KEY },
        params: { h2h: `${teamA}-${teamB}` }
      });

      if (h2hRes.data?.response?.length > 0) {
        matches = h2hRes.data.response.slice(0, 5);
      }
    } catch (err) {
      console.error("[H2H ERROR]", err.response?.data || err.message);
    }

    // 2. If no H2H, fallback to each team’s last 5
    let source = "H2H";
    if (matches.length === 0) {
      source = "Recent Form";

      const getTeamId = async (teamName) => {
        const res = await axios.get(`${API_URL}/teams`, {
          headers: { "x-apisports-key": API_KEY },
          params: { search: teamName }
        });
        if (res.data?.response?.length > 0) {
          return res.data.response[0].team.id;
        }
        return null;
      };

      const teamAId = await getTeamId(teamA);
      const teamBId = await getTeamId(teamB);

      if (!teamAId || !teamBId) {
        return await sock.sendMessage(m.from, {
          text: `❌ Could not find team IDs for *${teamA}* or *${teamB}*.`
        }, { quoted: m });
      }

      const getLastMatches = async (teamId) => {
        const res = await axios.get(`${API_URL}/fixtures`, {
          headers: { "x-apisports-key": API_KEY },
          params: { team: teamId, last: 5 }
        });
        return res.data?.response || [];
      };

      const lastA = await getLastMatches(teamAId);
      const lastB = await getLastMatches(teamBId);

      matches = [...lastA, ...lastB];
    }

    if (matches.length === 0) {
      return await sock.sendMessage(m.from, {
        text: `⚠️ No data available for *${teamA}* vs *${teamB}*.`
      }, { quoted: m });
    }

    // Analysis
    let homeWins = 0, awayWins = 0, draws = 0, btts = 0, totalGoals = 0;

    matches.forEach(match => {
      const goalsHome = match.goals?.home ?? 0;
      const goalsAway = match.goals?.away ?? 0;
      totalGoals += goalsHome + goalsAway;
      if (goalsHome > goalsAway) homeWins++;
      else if (goalsAway > goalsHome) awayWins++;
      else draws++;
      if (goalsHome > 0 && goalsAway > 0) btts++;
    });

    const total = matches.length;
    const avgGoals = (totalGoals / total).toFixed(2);

    const message = `
📊 *Prediction: ${teamA} vs ${teamB}*

📌 Based on: ${source}

🟢 Win %:
- ${teamA}: ${(homeWins / total * 100).toFixed(1)}%
- ${teamB}: ${(awayWins / total * 100).toFixed(1)}%
- Draw: ${(draws / total * 100).toFixed(1)}%

⚽ Both Teams to Score (BTTS): ${(btts / total * 100).toFixed(1)}%
📈 Average Goals: ${avgGoals}

🎯 Possible Correct Score:
- Tight: 1-1
- Open: 2-1 / 1-2

💡 *Note:* Stats calculated from last ${total} matches.
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
