import config from '../../config.cjs';
import axios from 'axios';

const tip = async (m, sock) => {
  const prefix = config.PREFIX;
  const args = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).trim().split(" ")
    : [];
  const cmd = args.shift()?.toLowerCase();

  if (cmd !== "tip") return;

  const teamArgs = args.join(" ").split(" ");
  if (teamArgs.length < 2) {
    return await sock.sendMessage(m.from, {
      text: `❌ *Please provide two teams!*\n💡 Example: *${prefix}tip Arsenal Chelsea*`
    }, { quoted: m });
  }

  const team1Name = teamArgs[0];
  const team2Name = teamArgs.slice(1).join(" ");

  await m.React("🔎");

  try {
    const API_KEY = '578d0a840ee047d5a5a7da7410c94bc4';

    // Step 1: Get all teams to match IDs
    const teamsUrl = `https://api.football-data.org/v4/teams`;
    const { data: teamsData } = await axios.get(teamsUrl, { headers: { 'X-Auth-Token': API_KEY } });

    const team1 = teamsData.teams.find(t => t.name.toLowerCase().includes(team1Name.toLowerCase()));
    const team2 = teamsData.teams.find(t => t.name.toLowerCase().includes(team2Name.toLowerCase()));

    if (!team1 || !team2) {
      return await sock.sendMessage(m.from, { text: `❌ Could not find both teams. Please check spelling.` }, { quoted: m });
    }

    // Step 2: Get last matches for both teams
    const getMatches = async (teamId) => {
      const url = `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=10`;
      const { data } = await axios.get(url, { headers: { 'X-Auth-Token': API_KEY } });
      return data.matches;
    };

    const team1Matches = await getMatches(team1.id);
    const team2Matches = await getMatches(team2.id);

    const analyzeMatches = (matches, teamId) => {
      let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0, btts = 0;
      matches.forEach(match => {
        const isHome = match.homeTeam.id === teamId;
        const gf = isHome ? match.score.fullTime.home : match.score.fullTime.away;
        const ga = isHome ? match.score.fullTime.away : match.score.fullTime.home;

        goalsFor += gf;
        goalsAgainst += ga;
        if (gf > ga) wins++;
        else if (gf === ga) draws++;
        else losses++;

        if (gf > 0 && ga > 0) btts++;
      });
      const total = matches.length;
      return {
        winRate: ((wins / total) * 100).toFixed(1),
        drawRate: ((draws / total) * 100).toFixed(1),
        lossRate: ((losses / total) * 100).toFixed(1),
        avgGF: (goalsFor / total).toFixed(2),
        avgGA: (goalsAgainst / total).toFixed(2),
        bttsRate: ((btts / total) * 100).toFixed(1)
      };
    };

    const stats1 = analyzeMatches(team1Matches, team1.id);
    const stats2 = analyzeMatches(team2Matches, team2.id);

    // Step 3: H2H between team1 & team2
    const h2hUrl = `https://api.football-data.org/v4/teams/${team1.id}/matches?status=FINISHED&limit=10&opponents=${team2.id}`;
    const { data: h2hData } = await axios.get(h2hUrl, { headers: { 'X-Auth-Token': API_KEY } });

    let h2hSummary = "No recent H2H data.";
    if (h2hData.matches && h2hData.matches.length > 0) {
      let wins1 = 0, wins2 = 0, draws = 0;
      h2hData.matches.forEach(match => {
        const hGF = match.homeTeam.id === team1.id ? match.score.fullTime.home : match.score.fullTime.away;
        const hGA = match.homeTeam.id === team1.id ? match.score.fullTime.away : match.score.fullTime.home;
        if (hGF > hGA) wins1++;
        else if (hGF === hGA) draws++;
        else wins2++;
      });
      h2hSummary = `${team1.name}: ${wins1} wins | ${team2.name}: ${wins2} wins | Draws: ${draws}`;
    }

    // Step 4: Simple prediction
    const likelyOutcome = (parseFloat(stats1.winRate) > parseFloat(stats2.winRate)) 
      ? `${team1.name} more likely to win ✅` 
      : `${team2.name} more likely to win ✅`;

    const correctScore = (parseFloat(stats1.avgGF) > 1.5 && parseFloat(stats2.avgGF) > 1.2)
      ? "2-1"
      : (parseFloat(stats1.avgGF) < 1 && parseFloat(stats2.avgGF) < 1)
      ? "0-0"
      : "1-1";

    // Step 5: Build response
    const message = `
📊 *Match Analysis: ${team1.name} vs ${team2.name}*

🔵 ${team1.name}
• Win Rate: ${stats1.winRate}%
• Avg Goals: ${stats1.avgGF}
• Avg Conceded: ${stats1.avgGA}
• BTTS: ${stats1.bttsRate}%

🔴 ${team2.name}
• Win Rate: ${stats2.winRate}%
• Avg Goals: ${stats2.avgGF}
• Avg Conceded: ${stats2.avgGA}
• BTTS: ${stats2.bttsRate}%

🤝 *Head-to-Head (last 10):*
${h2hSummary}

📌 *Prediction:*
• Outcome: ${likelyOutcome}
• BTTS: ${(stats1.bttsRate > 50 || stats2.bttsRate > 50) ? "Yes" : "No"}
• Expected Goals: ${(parseFloat(stats1.avgGF) + parseFloat(stats2.avgGF)).toFixed(1)}
• Correct Score Tip: *${correctScore}*
    `.trim();

    await sock.sendMessage(m.from, { text: message }, { quoted: m });
    await m.React("✅");

  } catch (err) {
    console.error("[Tip Command Error]", err.response ? err.response.data : err.message);
    await sock.sendMessage(m.from, { text: '⚠️ *Could not fetch analysis.*' }, { quoted: m });
    await m.React("⚠️");
  }
};

export default tip;
