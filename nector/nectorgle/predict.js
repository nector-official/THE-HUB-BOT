import axios from "axios";

const SPORTMONKS = {
  base: "https://api.sportmonks.com/v3/football",
  token: "j6c2X1HnBsib0wiGKIU9NJeKFf3Qs8QUOgwtvPcOEK6X7cBZ2h3a6GJxmmkg"
};

const SPORTSDB = {
  base: "https://www.thesportsdb.com/api/v1/json/123" // replace 123 with your API key
};

// =========================
// 🔍 TEAM SEARCH HELPERS
// =========================
const searchTeamSportMonks = async (name) => {
  try {
    const res = await axios.get(`${SPORTMONKS.base}/teams/search/${encodeURIComponent(name)}`, {
      params: { api_token: SPORTMONKS.token }
    });
    const list = res.data?.data || [];
    if (list.length) {
      const best = list[0];
      return { id: best.id, name: best.name, source: "sportmonks" };
    }
  } catch (e) { /* ignore */ }
  return null;
};

const searchTeamSportsDB = async (name) => {
  try {
    const res = await axios.get(`${SPORTSDB.base}/searchteams.php`, {
      params: { t: name }
    });
    const teams = res.data?.teams;
    if (teams && teams.length) {
      const first = teams[0];
      return { id: first.idTeam, name: first.strTeam, source: "sportsdb" };
    }
  } catch (e) { /* ignore */ }
  return null;
};

const searchTeam = async (name) => {
  let t = await searchTeamSportMonks(name);
  if (t) return t;
  t = await searchTeamSportsDB(name);
  if (t) return t;
  return null;
};

// =========================
// 📊 MATCH DATA FETCH
// =========================
const fetchRecentMatchesSportMonks = async (teamId) => {
  try {
    const res = await axios.get(`${SPORTMONKS.base}/teams/${teamId}`, {
      params: { api_token: SPORTMONKS.token, include: "fixtures.results:order(date|desc)" }
    });
    const matches = res.data?.data?.fixtures?.results || [];
    return matches.slice(0, 5).map(m => ({
      home: m.home_team.name,
      away: m.away_team.name,
      score: `${m.scores.home_score}-${m.scores.away_score}`
    }));
  } catch (e) { return []; }
};

const fetchRecentMatchesSportsDB = async (teamId) => {
  try {
    const res = await axios.get(`${SPORTSDB.base}/eventslast.php`, {
      params: { id: teamId }
    });
    const matches = res.data?.results || [];
    return matches.slice(0, 5).map(m => ({
      home: m.strHomeTeam,
      away: m.strAwayTeam,
      score: `${m.intHomeScore}-${m.intAwayScore}`
    }));
  } catch (e) { return []; }
};

const getRecentMatches = async (team) => {
  if (team.source === "sportmonks") return await fetchRecentMatchesSportMonks(team.id);
  if (team.source === "sportsdb") return await fetchRecentMatchesSportsDB(team.id);
  return [];
};

// =========================
// 🔮 PREDICTION LOGIC
// =========================
const analyzeMatches = (matches) => {
  let goals = 0, over25 = 0;
  matches.forEach(m => {
    const [h, a] = m.score.split("-").map(Number);
    const total = h + a;
    goals += total;
    if (total > 2) over25++;
  });
  const avgGoals = (goals / matches.length).toFixed(2);
  const probOver25 = ((over25 / matches.length) * 100).toFixed(0);
  return { avgGoals, probOver25 };
};

// =========================
// 🏆 MAIN COMMAND
// =========================
const predict = async (m, sock) => {
  try {
    const prefix = "!";
    const text = m.body?.trim() || "";
    if (!text.startsWith(prefix)) return;

    const args = text.slice(prefix.length).trim().split(" ");
    const cmd = args.shift().toLowerCase();
    if (cmd !== "predict") return;

    const teamAName = args[0];
    const teamBName = args.slice(1).join(" ");
    if (!teamAName || !teamBName) {
      return sock.sendMessage(m.from, { text: "❌ Usage: !predict <TeamA> <TeamB>" }, { quoted: m });
    }

    // 🔍 Search both teams
    const teamA = await searchTeam(teamAName);
    const teamB = await searchTeam(teamBName);

    if (!teamA || !teamB) {
      return sock.sendMessage(m.from, {
        text: `❌ Could not find both teams. (*${teamAName}*, *${teamBName}*)\nTry spelling differently.`
      }, { quoted: m });
    }

    // 📊 Fetch stats
    const matchesA = await getRecentMatches(teamA);
    const matchesB = await getRecentMatches(teamB);

    const statsA = analyzeMatches(matchesA);
    const statsB = analyzeMatches(matchesB);

    const msg = `
📊 *Prediction Analysis*
${teamA.name} vs ${teamB.name}

📌 ${teamA.name} last 5 matches:
${matchesA.map(m => `${m.home} ${m.score} ${m.away}`).join("\n")}

⚽ Avg Goals: ${statsA.avgGoals}
🔮 Over 2.5 Probability: ${statsA.probOver25}%

📌 ${teamB.name} last 5 matches:
${matchesB.map(m => `${m.home} ${m.score} ${m.away}`).join("\n")}

⚽ Avg Goals: ${statsB.avgGoals}
🔮 Over 2.5 Probability: ${statsB.probOver25}%
    `.trim();

    await sock.sendMessage(m.from, { text: msg }, { quoted: m });

  } catch (err) {
    await sock.sendMessage(m.from, { text: "⚠️ Error fetching prediction. Try again later." }, { quoted: m });
  }
};

export default predict;
