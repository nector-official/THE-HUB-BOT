// tip.js — improved, robust predictions (API-Football, in-file key + simple cache)
import axios from "axios";

/**
 * USAGE:    !tip Team A vs Team B
 * Example:  !tip Atalanta vs Brugge
 *
 * Notes:
 * - This uses your API-Football key (hard-coded below).
 * - Team IDs are cached in-memory (process life) to reduce repeated /teams lookups.
 * - Still uses a few API calls (teams, headtohead, last matches). Consider persistent caching if you need heavy usage.
*/

const API_KEY = "a3f7d73d569de1d62fb8147005347f79";
const API_URL = "https://v3.football.api-sports.io";
const HEADERS = { "x-apisports-key": API_KEY };

// Simple in-memory cache for team name -> id (reduces repeated /teams calls)
const TEAM_ID_CACHE = {}; // { normalizedName: { id, name, ts } }
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

const normalize = s => (s || "").toString().trim().toLowerCase();

const getTeamId = async (teamName) => {
  const n = normalize(teamName);
  const cached = TEAM_ID_CACHE[n];
  if (cached && (Date.now() - cached.ts < CACHE_TTL)) return cached.id;

  const res = await axios.get(`${API_URL}/teams`, {
    headers: HEADERS,
    params: { search: teamName }
  });

  const teamObj = res.data?.response?.[0]?.team || null;
  if (teamObj) {
    TEAM_ID_CACHE[n] = { id: teamObj.id, name: teamObj.name, ts: Date.now() };
    return teamObj.id;
  }
  return null;
};

const analyzeMatchesForTeam = (matches, teamId) => {
  const total = (matches && matches.length) || 0;
  if (total === 0) {
    return { total: 0, wins: 0, draws: 0, losses: 0, avgGF: 0, avgGA: 0, bttsPct: 0 };
  }

  let gf = 0, ga = 0, wins = 0, draws = 0, losses = 0, btts = 0;
  for (const m of matches) {
    const homeId = m?.teams?.home?.id;
    const awayId = m?.teams?.away?.id;
    const isHome = homeId === teamId;
    const scored = isHome ? (m?.goals?.home ?? 0) : (m?.goals?.away ?? 0);
    const conceded = isHome ? (m?.goals?.away ?? 0) : (m?.goals?.home ?? 0);

    gf += scored;
    ga += conceded;

    if (scored > conceded) wins++;
    else if (scored === conceded) draws++;
    else losses++;

    if ((m?.goals?.home ?? 0) > 0 && (m?.goals?.away ?? 0) > 0) btts++;
  }

  return {
    total,
    wins,
    draws,
    losses,
    avgGF: gf / total,
    avgGA: ga / total,
    bttsPct: (btts / total) * 100
  };
};

// Poisson helper
function factorial(n) {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function poissonP(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

const tip = async (m, sock) => {
  try {
    const prefix = "!";
    const text = (m.body || m.text || "").trim();
    if (!text.startsWith(prefix)) return;
    const cmd = text.slice(prefix.length).split(/\s+/)[0].toLowerCase();
    if (cmd !== "tip") return;

    const args = text.slice(prefix.length + cmd.length).trim();
    // accept " vs " or " v " or " vs. "
    const vsMatch = args.match(/\s+vs\.?\s+|\s+v\s+/i);
    if (!vsMatch) {
      return await sock.sendMessage(m.from, { text: `❌ Format: *!tip Team A vs Team B*\nExample: !tip Atalanta vs Brugge` }, { quoted: m });
    }

    const [left, right] = args.split(vsMatch[0]).map(s => s.trim());
    const teamAName = left;
    const teamBName = right;

    await m.React("⏳");

    // Resolve team IDs (cached)
    const [teamAId, teamBId] = await Promise.all([getTeamId(teamAName), getTeamId(teamBName)]);
    if (!teamAId || !teamBId) {
      return await sock.sendMessage(m.from, { text: `❌ Could not find team IDs for "${teamAName}" or "${teamBName}". Try exact/official names.` }, { quoted: m });
    }

    // Fetch H2H (IDs required)
    let h2hMatches = [];
    try {
      const h2hRes = await axios.get(`${API_URL}/fixtures/headtohead`, {
        headers: HEADERS,
        params: { h2h: `${teamAId}-${teamBId}`, last: 10 } // request up to last 10 H2H
      });
      h2hMatches = h2hRes.data?.response || [];
    } catch (e) {
      // ignore: we'll fallback to form if h2h is empty
      console.error("[H2H FETCH ERROR]", e.response?.status, e.response?.data || e.message);
    }

    // Fetch last matches for each team (limit 5)
    const fetchLast = async (teamId, last = 5) => {
      const res = await axios.get(`${API_URL}/fixtures`, {
        headers: HEADERS,
        params: { team: teamId, last }
      });
      return res.data?.response || [];
    };

    const [lastA, lastB] = await Promise.all([fetchLast(teamAId, 5), fetchLast(teamBId, 5)]);
    // Analyze
    const formA = analyzeMatchesForTeam(lastA, teamAId);
    const formB = analyzeMatchesForTeam(lastB, teamBId);
    // H2H analysis (team-centric)
    const h2hA = analyzeMatchesForTeam(h2hMatches, teamAId);
    const h2hB = analyzeMatchesForTeam(h2hMatches, teamBId);

    // Build expected goals (Poisson lambdas) from recent form primarily:
    // lambda_A ≈ (avg goals scored by A) adjusted by (avg conceded by B)
    let lambdaA = (formA.avgGF + formB.avgGA) / 2;
    let lambdaB = (formB.avgGF + formA.avgGA) / 2;
    // if both forms are empty (rare), attempt to use H2H averages
    if (formA.total === 0 && formB.total === 0) {
      lambdaA = (h2hA.avgGF + h2hB.avgGA) / 2;
      lambdaB = (h2hB.avgGF + h2hA.avgGA) / 2;
    }
    // Guard small values
    if (!isFinite(lambdaA) || lambdaA < 0) lambdaA = 0;
    if (!isFinite(lambdaB) || lambdaB < 0) lambdaB = 0;

    // Small H2H bias: if H2H shows one team clearly stronger, nudge lambdas (bounded)
    let h2hNet = 0;
    if (h2hMatches.length > 0) {
      const hWinsA = h2hA.wins || 0;
      const hWinsB = h2hB.wins || 0;
      h2hNet = (hWinsA - hWinsB) / Math.max(1, h2hMatches.length); // in [-1,1]
      const biasFactor = 0.08; // up to ±8% adjustment
      lambdaA *= (1 + h2hNet * biasFactor);
      lambdaB *= (1 - h2hNet * biasFactor);
      if (lambdaA < 0) lambdaA = 0;
      if (lambdaB < 0) lambdaB = 0;
    }

    // Poisson grid 0..5 goals (higher goals beyond 5 are low-prob)
    const maxG = 5;
    let pWinA = 0, pDraw = 0, pWinB = 0, pBTTS = 0;
    const scoreGrid = [];
    for (let gA = 0; gA <= maxG; gA++) {
      const pA = poissonP(gA, lambdaA);
      for (let gB = 0; gB <= maxG; gB++) {
        const pB = poissonP(gB, lambdaB);
        const p = pA * pB;
        if (gA > gB) pWinA += p;
        else if (gA === gB) pDraw += p;
        else pWinB += p;
        if (gA > 0 && gB > 0) pBTTS += p;
        scoreGrid.push({ score: `${gA}-${gB}`, prob: p });
      }
    }
    // normalize because truncated grid loses some mass
    const mass = pWinA + pDraw + pWinB;
    if (mass > 0) { pWinA /= mass; pDraw /= mass; pWinB /= mass; pBTTS /= mass; }
    else { pWinA = pDraw = pWinB = pBTTS = 0; }

    scoreGrid.sort((a, b) => b.prob - a.prob);
    const topScores = scoreGrid.slice(0, 3).map(s => `${s.score} (${(s.prob * 100).toFixed(1)}%)`).join(", ");
    const topScorePick = scoreGrid[0] ? scoreGrid[0].score : `${Math.round(lambdaA)}-${Math.round(lambdaB)}`;

    // Friendly form lines (last results) — show up to 5 for each team
    const formatResult = (m) => {
      try {
        const d = m?.fixture?.date ? new Date(m.fixture.date).toLocaleDateString() + " " : "";
        const home = m.teams.home.name; const away = m.teams.away.name;
        const scHome = m.goals?.home ?? "-"; const scAway = m.goals?.away ?? "-";
        return `${d}${home} ${scHome}-${scAway} ${away}`;
      } catch (e) { return ""; }
    };
    const lastAtext = (lastA || []).slice(0, 5).map(formatResult).filter(Boolean).join("\n") || "No recent matches";
    const lastBtext = (lastB || []).slice(0, 5).map(formatResult).filter(Boolean).join("\n") || "No recent matches";

    // Build message
    const message = `
📊 *Prediction: ${teamAName} vs ${teamBName}*

📌 Based on: ${h2hMatches.length > 0 ? `H2H (last ${h2hMatches.length}) + recent form` : `Recent form (last ${formA.total || 0}/${formB.total || 0})`}

🟢 Probabilities:
• ${teamAName} win: ${(pWinA * 100).toFixed(1)}%
• Draw: ${(pDraw * 100).toFixed(1)}%
• ${teamBName} win: ${(pWinB * 100).toFixed(1)}%
• BTTS: ${(pBTTS * 100).toFixed(1)}%

📈 Expected goals (λ):
• ${teamAName}: ${lambdaA.toFixed(2)}
• ${teamBName}: ${lambdaB.toFixed(2)}
• Avg goals (expected total): ${(lambdaA + lambdaB).toFixed(2)}

🎯 Top scoreline tips: ${topScores}
🔮 Best single pick: *${topScorePick}*

---
📌 Recent matches (showing up to 5 each)
${teamAName}:
${lastAtext}

${teamBName}:
${lastBtext}

ℹ️ Model: Poisson on recent attack/defense averages, nudged by H2H. Probabilistic — not guaranteed.
`.trim();

    await sock.sendMessage(m.from, { text: message }, { quoted: m });
    await m.React("✅");
  } catch (err) {
    console.error("[TIP ERROR]", err.response?.status, err.response?.data || err.message);
    await sock.sendMessage(m.from, { text: "⚠️ Could not fetch analysis (API error or key/limit issue)." }, { quoted: m });
    await m.React("⚠️");
  }
};

export default tip;
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
