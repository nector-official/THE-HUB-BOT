import config from '../../config.cjs';
import axios from 'axios';

const API_KEY = '578d0a840ee047d5a5a7da7410c94bc4'; // your key

// small helpers
const normalize = s => (s || '').toString().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
function levenshtein(a, b) {
  if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_,i) => Array(n+1).fill(0));
  for (let i=0;i<=m;i++) dp[i][0]=i;
  for (let j=0;j<=n;j++) dp[0][j]=j;
  for (let i=1;i<=m;i++){
    for (let j=1;j<=n;j++){
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}
function similarityScore(a,b){
  a = normalize(a); b = normalize(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.96;
  const aTokens = a.split(/\s+/), bTokens = b.split(/\s+/);
  const common = aTokens.filter(t => bTokens.includes(t)).length;
  const tokenScore = common / Math.max(aTokens.length, bTokens.length);
  const lev = levenshtein(a,b);
  const levScore = 1 - lev / Math.max(a.length, b.length);
  // combine heuristics (bounded)
  return Math.max(levScore * 0.75, tokenScore * 0.9, 0);
}
function poisson(k, lambda) {
  // small k only (0..6) — compute directly
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}
function factorial(n){
  if (n <= 1) return 1;
  let r = 1;
  for (let i=2;i<=n;i++) r *= i;
  return r;
}

const tip = async (m, sock) => {
  const prefix = config.PREFIX;
  if (!m.body || !m.body.startsWith(prefix)) return;
  const raw = m.body.slice(prefix.length).trim();
  const parts = raw.split(/\s+/);
  const cmd = parts.shift()?.toLowerCase();
  if (cmd !== 'tip') return;

  await m.React("🔎");

  try {
    // 1) Build teams list from matches in the past ~2 years (fallback to find team ids robustly)
    const today = new Date();
    const from = new Date(); from.setDate(today.getDate() - 365); // 1 year back
    const dateFrom = from.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];

    const matchesUrl = `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const { data: matchesData } = await axios.get(matchesUrl, { headers: { 'X-Auth-Token': API_KEY } });

    if (!matchesData || !matchesData.matches) {
      await sock.sendMessage(m.from, { text: '⚠️ Could not retrieve matches from API to build team list.' }, { quoted: m });
      await m.React("⚠️");
      return;
    }

    // create unique team list (id + name)
    const teamsMap = new Map();
    matchesData.matches.forEach(match => {
      if (match.homeTeam?.id && match.homeTeam?.name) teamsMap.set(match.homeTeam.id, { id: match.homeTeam.id, name: match.homeTeam.name });
      if (match.awayTeam?.id && match.awayTeam?.name) teamsMap.set(match.awayTeam.id, { id: match.awayTeam.id, name: match.awayTeam.name });
    });
    const teamsList = Array.from(teamsMap.values());

    // 2) parse user input for two team names (support separators and multi-word names)
    const rest = parts.join(' ').trim();
    if (!rest) {
      await sock.sendMessage(m.from, { text: `❌ Please provide two teams, e.g. *${prefix}tip Arsenal Chelsea* or *${prefix}tip "Manchester United" "Liverpool"*` }, { quoted: m });
      return;
    }

    // try common separators first
    let splitParts = rest.split(/\s+vs\.?\s+|\s+v\s+|[-–—]|,|:/i).map(s => s.trim()).filter(Boolean);

    let teamAinput, teamBinput;
    if (splitParts.length >= 2) {
      teamAinput = splitParts[0];
      teamBinput = splitParts.slice(1).join(' ');
    } else {
      // no explicit separator -> try greedy token split (best fuzzy combined score)
      const tokens = rest.split(/\s+/);
      let best = { score: -1, left: null, right: null, leftMatch: null, rightMatch: null };
      for (let i = 1; i < tokens.length; i++) {
        const left = tokens.slice(0, i).join(' ');
        const right = tokens.slice(i).join(' ');
        // find best candidate for left and right
        let bestLeft = {score:0, team:null}, bestRight = {score:0, team:null};
        for (const t of teamsList) {
          const sL = similarityScore(left, t.name);
          if (sL > bestLeft.score) bestLeft = {score: sL, team: t};
          const sR = similarityScore(right, t.name);
          if (sR > bestRight.score) bestRight = {score: sR, team: t};
        }
        const combined = bestLeft.score + bestRight.score - (bestLeft.team && bestRight.team && bestLeft.team.id === bestRight.team.id ? 0.5 : 0);
        if (combined > best.score) {
          best = { score: combined, left, right, leftMatch: bestLeft, rightMatch: bestRight };
        }
      }
      if (best.score > 0.4) { // threshold
        teamAinput = best.left;
        teamBinput = best.right;
      } else {
        // fallback: treat whole string as a single team (can't parse two teams)
        await sock.sendMessage(m.from, { text: `❌ Could not split your input into two teams. Please separate teams with "vs", "v", "-", or comma.\nExample: *${prefix}tip Arsenal Chelsea* or *${prefix}tip Arsenal vs Chelsea*` }, { quoted: m });
        return;
      }
    }

    // 3) find best matching team objects for both inputs
    const findBest = (input) => {
      const inorm = normalize(input);
      let best = { score: 0, team: null };
      for (const t of teamsList) {
        const s = similarityScore(inorm, t.name);
        if (s > best.score) best = { score: s, team: t };
      }
      return best;
    };

    const matchA = findBest(teamAinput);
    const matchB = findBest(teamBinput);

    if (!matchA.team || !matchB.team || matchA.team.id === matchB.team.id || matchA.score < 0.35 || matchB.score < 0.35) {
      await sock.sendMessage(m.from, {
        text: `❌ Could not find both teams with enough confidence.\nFound: ${matchA.team ? matchA.team.name + ` (score ${ (matchA.score*100).toFixed(0) }%)` : '—'} and ${matchB.team ? matchB.team.name + ` (score ${ (matchB.score*100).toFixed(0) }%)` : '—'}.\n\nTips: use clearer separators or full official names, e.g. *${prefix}tip "Manchester United" "Arsenal"*`
      }, { quoted: m });
      return;
    }

    const team1 = matchA.team;
    const team2 = matchB.team;

    // 4) get recent finished matches for both teams (limit 10-12)
    const getTeamMatches = async (teamId, limit=12) => {
      const url = `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=${limit}`;
      const { data } = await axios.get(url, { headers: { 'X-Auth-Token': API_KEY } });
      return data.matches || [];
    };

    const [team1Matches, team2Matches] = await Promise.all([ getTeamMatches(team1.id), getTeamMatches(team2.id) ]);

    if ((!team1Matches || team1Matches.length === 0) || (!team2Matches || team2Matches.length === 0)) {
      await sock.sendMessage(m.from, { text: '⚠️ Not enough recent match data for one or both teams to analyze.' }, { quoted: m });
      return;
    }

    // analyze function (recent matches)
    const analyzeMatches = (matches, teamId) => {
      // weight recent matches more: newest first
      let wins=0, draws=0, losses=0, gf=0, ga=0, btts=0, total=0;
      for (let i=0;i<matches.length;i++){
        const match = matches[i];
        if (!match.score || !match.score.fullTime) continue;
        const isHome = match.homeTeam.id === teamId;
        const scored = isHome ? match.score.fullTime.home : match.score.fullTime.away;
        const conceded = isHome ? match.score.fullTime.away : match.score.fullTime.home;
        if (typeof scored !== 'number' || typeof conceded !== 'number') continue;
        total++;
        gf += scored;
        ga += conceded;
        if (scored > conceded) wins++;
        else if (scored === conceded) draws++;
        else losses++;
        if (scored > 0 && conceded > 0) btts++;
      }
      return {
        total,
        winRate: total ? (wins/total*100) : 0,
        drawRate: total ? (draws/total*100) : 0,
        lossRate: total ? (losses/total*100) : 0,
        avgGF: total ? (gf/total) : 0,
        avgGA: total ? (ga/total) : 0,
        bttsRate: total ? (btts/total*100) : 0
      };
    };

    const stats1 = analyzeMatches(team1Matches, team1.id);
    const stats2 = analyzeMatches(team2Matches, team2.id);

    // 5) H2H (last 10)
    let h2h = [];
    try {
      const h2hUrl = `https://api.football-data.org/v4/teams/${team1.id}/matches?status=FINISHED&limit=10&opponents=${team2.id}`;
      const { data: h2hData } = await axios.get(h2hUrl, { headers: { 'X-Auth-Token': API_KEY } });
      h2h = h2hData.matches || [];
    } catch (e) {
      // ignore H2H failure, it's optional
    }

    let h2hSummary = 'No recent H2H data.';
    if (h2h && h2h.length > 0) {
      let w1=0,w2=0,d=0;
      h2h.forEach(match => {
        const isHome1 = match.homeTeam.id === team1.id;
        const g1 = isHome1 ? match.score.fullTime.home : match.score.fullTime.away;
        const g2 = isHome1 ? match.score.fullTime.away : match.score.fullTime.home;
        if (g1 > g2) w1++;
        else if (g1 === g2) d++;
        else w2++;
      });
      h2hSummary = `${team1.name}: ${w1} | ${team2.name}: ${w2} | Draws: ${d} (last ${h2h.length})`;
    }

    // 6) Prediction model — Poisson based
    // expected goals (simple heuristic): avgGF_of_team + avgGA_of_opponent divided by 2
    const lambda1 = (stats1.avgGF + stats2.avgGA) / 2;
    const lambda2 = (stats2.avgGF + stats1.avgGA) / 2;

    // compute score probabilities 0..5 for each side (beyond 5 negligible)
    const maxGoals = 5;
    const scoreProbs = [];
    let pWin1 = 0, pDraw = 0, pWin2 = 0, pBTTS = 0;
    for (let g1 = 0; g1 <= maxGoals; g1++) {
      const p1 = poisson(g1, lambda1);
      for (let g2 = 0; g2 <= maxGoals; g2++) {
        const p2 = poisson(g2, lambda2);
        const p = p1 * p2;
        if (g1 > g2) pWin1 += p;
        else if (g1 === g2) pDraw += p;
        else pWin2 += p;
        if (g1 > 0 && g2 > 0) pBTTS += p;
        scoreProbs.push({ score: `${g1}-${g2}`, prob: p });
      }
    }
    // normalize small leftover from truncated grid
    const totalGrid = pWin1 + pDraw + pWin2;
    pWin1 /= totalGrid; pDraw /= totalGrid; pWin2 /= totalGrid; pBTTS /= totalGrid;

    scoreProbs.sort((a,b) => b.prob - a.prob);
    const topScores = scoreProbs.slice(0,3).map(s => `${s.score} (${(s.prob*100).toFixed(1)}%)`).join(', ');

    // 7) Combine simple form & H2H influence for a final 'confidence' weighting
    // We'll weight probabilities slightly by winRate difference and H2H (simple heuristic)
    const formDiff = stats1.winRate - stats2.winRate; // positive favors team1
    const h2hInfluence = (() => {
      if (!h2h || h2h.length === 0) return 0;
      // compute simple h2h net wins ratio in [-1,1]
      let w1=0,w2=0;
      h2h.forEach(match => {
        const isHome1 = match.homeTeam.id === team1.id;
        const g1 = isHome1 ? match.score.fullTime.home : match.score.fullTime.away;
        const g2 = isHome1 ? match.score.fullTime.away : match.score.fullTime.home;
        if (g1>g2) w1++; else if (g1<g2) w2++;
      });
      const net = (w1 - w2) / h2h.length;
      return net * 10; // scale small
    })();

    // final adjusted probabilities (bounded between 0 and 1)
    let adjP1 = pWin1 + (formDiff / 200) + (h2hInfluence / 100);
    let adjP2 = pWin2 - (formDiff / 200) - (h2hInfluence / 100);
    let adjD  = pDraw;
    // normalize and floor to 0
    adjP1 = Math.max(0, adjP1); adjP2 = Math.max(0, adjP2); adjD = Math.max(0, adjD);
    const ssum = adjP1 + adjD + adjP2 || 1;
    adjP1 = adjP1/ssum; adjD = adjD/ssum; adjP2 = adjP2/ssum;

    const message = `
📊 *Match Analysis: ${team1.name} vs ${team2.name}*

🔵 ${team1.name}
• Recent Win Rate: ${stats1.winRate.toFixed(1)}%
• Avg Goals For: ${stats1.avgGF.toFixed(2)} | Avg Conceded: ${stats1.avgGA.toFixed(2)}
• BTTS rate: ${stats1.bttsRate.toFixed(1)}%

🔴 ${team2.name}
• Recent Win Rate: ${stats2.winRate.toFixed(1)}%
• Avg Goals For: ${stats2.avgGF.toFixed(2)} | Avg Conceded: ${stats2.avgGA.toFixed(2)}
• BTTS rate: ${stats2.bttsRate.toFixed(1)}%

🤝 *Head-to-Head (recent):*
${h2hSummary}

📌 *Predicted probabilities (model):*
• ${team1.name} win: ${(adjP1*100).toFixed(1)}%
• Draw: ${(adjD*100).toFixed(1)}%
• ${team2.name} win: ${(adjP2*100).toFixed(1)}%
• BTTS (both teams to score): ${(pBTTS*100).toFixed(1)}%

🏆 *Top scoreline tips:* ${topScores}

ℹ️ (Model: Poisson on recent scoring rates + simple form & H2H adjustments — probabilistic, not guaranteed.)
    `.trim();

    await sock.sendMessage(m.from, { text: message }, { quoted: m });
    await m.React("✅");

  } catch (err) {
    console.error("[Tip Command Error]", err.response ? err.response.data : err.message);
    await sock.sendMessage(m.from, { text: '⚠️ *Could not fetch analysis (API error or rate limit).*' }, { quoted: m });
    await m.React("⚠️");
  }
};

export default tip;
