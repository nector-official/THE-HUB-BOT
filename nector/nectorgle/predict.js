// predict.js
import axios from "axios";

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

    // SportMonks settings
    const API_TOKEN = "j6c2X1HnBsib0wiGKIU9NJeKFf3Qs8QUOgwtvPcOEK6X7cBZ2h3a6GJxmmkg";
    const API_URL = "https://api.sportmonks.com/v3/football";

    // Get team ID by search
    const getTeamId = async (name) => {
      const res = await axios.get(`${API_URL}/teams/search/${encodeURIComponent(name)}`, {
        params: { api_token: API_TOKEN }
      });
      return res.data?.data?.[0]?.id || null;
    };

    const teamAId = await getTeamId(teamAName);
    const teamBId = await getTeamId(teamBName);

    if (!teamAId || !teamBId) {
      return await sock.sendMessage(m.from, {
        text: `❌ Could not find both teams. (*${teamAName}*, *${teamBName}*)`
      }, { quoted: m });
    }

    // Fetch recent matches (last 5 each)
    const getLastMatches = async (teamId) => {
      const res = await axios.get(`${API_URL}/fixtures`, {
        params: {
          api_token: API_TOKEN,
          team_id: teamId,
          last: 5
        }
      });
      return res.data?.data || [];
    };

    const lastA = await getLastMatches(teamAId);
    const lastB = await getLastMatches(teamBId);

    // Combine recent form
    let teamAWins = 0, teamBWins = 0, draws = 0, totalGoals = 0, btts = 0;

    const analyzeMatches = (matches, teamId, isTeamA) => {
      matches.forEach(match => {
        const goalsHome = match.scores?.localteam_score ?? 0;
        const goalsAway = match.scores?.visitorteam_score ?? 0;
        totalGoals += goalsHome + goalsAway;

        const homeId = match.localteam_id;
        const awayId = match.visitorteam_id;

        if (goalsHome > goalsAway) {
          if (homeId === teamId) isTeamA ? teamAWins++ : teamBWins++;
        } else if (goalsAway > goalsHome) {
          if (awayId === teamId) isTeamA ? teamAWins++ : teamBWins++;
        } else {
          draws++;
        }

        if (goalsHome > 0 && goalsAway > 0) btts++;
      });
    };

    analyzeMatches(lastA, teamAId, true);
    analyzeMatches(lastB, teamBId, false);

    const totalMatches = lastA.length + lastB.length;
    if (totalMatches === 0) {
      return await sock.sendMessage(m.from, {
        text: `⚠️ No data available for *${teamAName}* vs *${teamBName}*.`
      }, { quoted: m });
    }

    const avgGoals = (totalGoals / totalMatches).toFixed(2);
    const winA = (teamAWins / totalMatches * 100).toFixed(1);
    const winB = (teamBWins / totalMatches * 100).toFixed(1);
    const drawP = (draws / totalMatches * 100).toFixed(1);
    const bttsP = (btts / totalMatches * 100).toFixed(1);
    const over25 = (avgGoals >= 2.5 ? 70 : 40); // simple heuristic

    // Generate possible correct scores dynamically
    let correctScores = [];
    if (avgGoals <= 2) correctScores = ["1-0", "1-1", "2-0"];
    else if (avgGoals <= 3) correctScores = ["2-1", "2-2", "1-2"];
    else correctScores = ["3-1", "3-2", "2-3"];

    const message = `
📊 *Prediction: ${teamAName} vs ${teamBName}*

🟢 Win %:
- ${teamAName}: ${winA}%
- ${teamBName}: ${winB}%
- Draw: ${drawP}%

⚽ Goal Stats:
- Both Teams to Score: ${bttsP}%
- Over 2.5 Goals Chance: ${over25}%
- Average Goals: ${avgGoals}

🎯 Possible Correct Scores:
${correctScores.map(s => `- ${s}`).join("\n")}

💡 *Note:* Based on last ${totalMatches} matches (recent form).
    `.trim();

    await sock.sendMessage(m.from, { text: message }, { quoted: m });
    await m.React("✅");

  } catch (err) {
    console.error("[PREDICT ERROR]", err.response?.data || err.message);
    await sock.sendMessage(m.from, {
      text: "⚠️ Could not fetch prediction (API error)."
    }, { quoted: m });
    await m.React("⚠️");
  }
};

export default predict;
