import axios from "axios";

const tip = async (m, sock) => {
  const prefix = "!";
  const cmd = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(" ")[0].toLowerCase()
    : "";
  const args = m.body.slice(prefix.length + cmd.length).trim();

  if (cmd !== "tip") return;

  if (!args.includes("vs")) {
    return await sock.sendMessage(m.from, {
      text: `❌ Please provide two teams.\n💡 Example: *${prefix}tip Arsenal vs Chelsea*`
    }, { quoted: m });
  }

  await m.React("⚽");

  try {
    // 🔑 Your API-Football key (direct, not RapidAPI)
    const API_KEY = "a3f7d73d569de1d62fb8147005347f79";

    const [teamAName, teamBName] = args.split("vs").map(s => s.trim());

    const headers = { "x-apisports-key": API_KEY };

    // 🔎 Find teams
    const searchTeam = async (name) => {
      const res = await axios.get(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(name)}`, { headers });
      return res.data.response[0]?.team || null;
    };

    const teamA = await searchTeam(teamAName);
    const teamB = await searchTeam(teamBName);

    if (!teamA || !teamB) {
      return await sock.sendMessage(m.from, {
        text: `❌ Could not find both teams.\n\nTeam A: ${teamAName}\nTeam B: ${teamBName}`
      }, { quoted: m });
    }

    // 🕒 Get recent matches
    const fetchLastMatches = async (teamId) => {
      const res = await axios.get(`https://v3.football.api-sports.io/fixtures?team=${teamId}&last=5`, { headers });
      return res.data.response || [];
    };

    const lastA = await fetchLastMatches(teamA.id);
    const lastB = await fetchLastMatches(teamB.id);

    // ⚔️ Head-to-head
    const h2hRes = await axios.get(
      `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${teamA.id}-${teamB.id}&last=5`,
      { headers }
    );
    const h2hMatches = h2hRes.data.response || [];

    // 🔍 Analysis
    const form = (matches, teamId) => {
      let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
      matches.forEach(m => {
        const home = m.teams.home.id === teamId;
        const gf = home ? m.goals.home : m.goals.away;
        const ga = home ? m.goals.away : m.goals.home;
        goalsFor += gf;
        goalsAgainst += ga;
        if (gf > ga) wins++;
        else if (gf === ga) draws++;
        else losses++;
      });
      return { wins, draws, losses, goalsFor, goalsAgainst };
    };

    const statsA = form(lastA, teamA.id);
    const statsB = form(lastB, teamB.id);

    // Estimate win/draw %
    const totalGames = (statsA.wins + statsA.draws + statsA.losses + statsB.wins + statsB.draws + statsB.losses) || 1;
    const winAProb = ((statsA.wins + statsB.losses) / totalGames) * 100;
    const winBProb = ((statsB.wins + statsA.losses) / totalGames) * 100;
    const drawProb = ((statsA.draws + statsB.draws) / totalGames) * 50; // weight draws lower

    // BTTS (both teams to score)
    const bttsCount = h2hMatches.filter(m => m.goals.home > 0 && m.goals.away > 0).length;
    const bttsProb = (bttsCount / (h2hMatches.length || 1)) * 100;

    // Over 2.5 goals
    const over25Count = h2hMatches.filter(m => (m.goals.home + m.goals.away) > 2).length;
    const over25Prob = (over25Count / (h2hMatches.length || 1)) * 100;

    // Guess correct score (average)
    const avgGoalsA = (statsA.goalsFor / 5).toFixed(1);
    const avgGoalsB = (statsB.goalsFor / 5).toFixed(1);
    const likelyScore = `${Math.round(avgGoalsA)}-${Math.round(avgGoalsB)}`;

    // 📩 Build message
    let message = `📊 *Match Prediction*\n\n`;
    message += `⚔️ ${teamA.name} vs ${teamB.name}\n\n`;
    message += `📈 *Win Probabilities:*\n`;
    message += `• ${teamA.name}: ${winAProb.toFixed(1)}%\n`;
    message += `• Draw: ${drawProb.toFixed(1)}%\n`;
    message += `• ${teamB.name}: ${winBProb.toFixed(1)}%\n\n`;
    message += `🎯 *Special Markets:*\n`;
    message += `• Both Teams To Score: ${bttsProb.toFixed(1)}%\n`;
    message += `• Over 2.5 Goals: ${over25Prob.toFixed(1)}%\n\n`;
    message += `🔮 *Likely Correct Score:* ${likelyScore}`;

    await sock.sendMessage(m.from, { text: message }, { quoted: m });
    await m.React("✅");

  } catch (err) {
    console.error("[Tip Command Error]", err.response?.data || err.message);
    await sock.sendMessage(m.from, { text: "⚠️ Could not fetch analysis (API error or limit)." }, { quoted: m });
    await m.React("⚠️");
  }
};

export default tip;
