// tip.js
import axios from "axios";

const tip = async (m, sock) => {
  try {
    const prefix = "!"; // change if your bot uses a different prefix
    const text = (m.body || "").trim();
    if (!text.startsWith(prefix)) return;

    const cmd = text.slice(prefix.length).split(/\s+/)[0].toLowerCase();
    if (cmd !== "tip") return;

    const args = text.slice(prefix.length + cmd.length).trim();
    if (!args.includes(" vs ")) {
      return await sock.sendMessage(m.from, {
        text: "❌ Format: *!tip TeamA vs TeamB*\nExample: *!tip Liverpool vs Chelsea*"
      }, { quoted: m });
    }

    const [teamAName, teamBName] = args.split(" vs ").map(s => s.trim());
    try { if (m?.React) await m.React("⏳"); } catch (e) {}

    // API-Football details - keep your key here
    const API_KEY = "a3f7d73d569de1d62fb8147005347f79";
    const API_URL = "https://v3.football.api-sports.io";

    // --- Helpers ---
    const safeGet = (o, path, fallback = null) => path.split('.').reduce((a,k)=>a && a[k] !== undefined ? a[k] : null, o) ?? fallback;

    const getTeam = async (name) => {
      const res = await axios.get(`${API_URL}/teams`, {
        headers: { "x-apisports-key": API_KEY },
        params: { search: name }
      });
      const teamObj = res.data?.response?.[0]?.team ?? null;
      return teamObj;
    };

    const getH2H = async (idA, idB, limit = 10) => {
      const res = await axios.get(`${API_URL}/fixtures/headtohead`, {
        headers: { "x-apisports-key": API_KEY },
        params: { h2h: `${idA}-${idB}` }
      });
      return res.data?.response || [];
    };

    const getLastMatches = async (teamId, last = 10) => {
      const res = await axios.get(`${API_URL}/fixtures`, {
        headers: { "x-apisports-key": API_KEY },
        params: { team: teamId, last }
      });
      return res.data?.response || [];
    };

    // Poisson PMF
    const factorial = (n) => {
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      return f;
    };
    const poisson = (k, lambda) => {
      if (lambda <= 0) return k === 0 ? 1 : 0;
      return Math.pow(lambda, k) * Math.exp(-lambda) / factorial(k);
    };

    // --- Identify teams ---
    const teamA = await getTeam(teamAName);
    const teamB = await getTeam(teamBName);

    if (!teamA || !teamB) {
      return await sock.sendMessage(m.from, {
        text: `❌ Could not find both teams: (*${teamAName}*, *${teamBName}*). Make sure names are spelled correctly.`
      }, { quoted: m });
    }

    const teamAId = teamA.id;
    const teamBId = teamB.id;

    // --- Fetch matches (H2H + recent for each team) and deduplicate by fixture id ---
    let rawMatches = [];
    try {
      const [h2h, lastA, lastB] = await Promise.all([
        getH2H(teamAId, teamBId),
        getLastMatches(teamAId, 10),
        getLastMatches(teamBId, 10),
      ]);
      rawMatches = [...(h2h || []), ...(lastA || []), ...(lastB || [])];
    } catch (err) {
      console.error("[FETCH MATCHES ERROR]", err.response?.data || err.message || err);
    }

    // dedupe fixtures by fixture.id and keep only finished (FT/Finished) matches with goals available
    const map = new Map();
    for (const fm of rawMatches) {
      const fid = safeGet(fm, "fixture.id");
      if (!fid) continue;
      if (map.has(fid)) continue;
      // only include matches with goals numeric (skip scheduled or in-play without final score)
      const gh = safeGet(fm, "goals.home");
      const ga = safeGet(fm, "goals.away");
      if (gh === null || ga === null) continue;
      map.set(fid, fm);
    }
    const matches = Array.from(map.values());

    if (matches.length === 0) {
      return await sock.sendMessage(m.from, {
        text: `⚠️ No finished match data available for *${teamAName}* and *${teamBName}* (H2H or recent).`
      }, { quoted: m });
    }

    // --- Compute per-team stats from the available data (only matches where the team appears) ---
    const computeStatsFor = (teamId) => {
      let played = 0, gf = 0, ga = 0, wins = 0, draws = 0, losses = 0;
      for (const fm of matches) {
        const home = safeGet(fm, "teams.home.id");
        const away = safeGet(fm, "teams.away.id");
        if (home !== teamId && away !== teamId) continue;

        const goalsHome = safeGet(fm, "goals.home") ?? 0;
        const goalsAway = safeGet(fm, "goals.away") ?? 0;

        const isHome = home === teamId;
        const teamGoals = isHome ? goalsHome : goalsAway;
        const oppGoals = isHome ? goalsAway : goalsHome;

        // if nulls, skip
        if (teamGoals === null || oppGoals === null) continue;

        played++;
        gf += teamGoals;
        ga += oppGoals;
        if (teamGoals > oppGoals) wins++;
        else if (teamGoals === oppGoals) draws++;
        else losses++;
      }
      const avgGF = played ? gf / played : 0;
      const avgGA = played ? ga / played : 0;
      return { played, gf, ga, wins, draws, losses, avgGF, avgGA };
    };

    const statsA = computeStatsFor(teamAId);
    const statsB = computeStatsFor(teamBId);

    // If either team has too few matches, also try to fallback to lastMatches endpoint results (in case dedupe removed them)
    if (statsA.played < 3) {
      const lastA = await getLastMatches(teamAId, 10);
      const tmpA = lastA.filter(fm => {
        const gh = safeGet(fm, "goals.home");
        const ga = safeGet(fm, "goals.away");
        return gh !== null && ga !== null;
      });
      if (tmpA.length >= statsA.played) {
        // recompute from lastA
        const tmpStats = { played:0, gf:0, ga:0, wins:0, draws:0, losses:0, avgGF:0, avgGA:0 };
        for (const fm of tmpA) {
          const home = safeGet(fm, "teams.home.id");
          const away = safeGet(fm, "teams.away.id");
          const isHome = home === teamAId;
          const tg = isHome ? safeGet(fm,"goals.home") : safeGet(fm,"goals.away");
          const og = isHome ? safeGet(fm,"goals.away") : safeGet(fm,"goals.home");
          tmpStats.played++; tmpStats.gf += tg; tmpStats.ga += og;
          if (tg > og) tmpStats.wins++;
          else if (tg === og) tmpStats.draws++;
          else tmpStats.losses++;
        }
        tmpStats.avgGF = tmpStats.played ? tmpStats.gf / tmpStats.played : 0;
        tmpStats.avgGA = tmpStats.played ? tmpStats.ga / tmpStats.played : 0;
        Object.assign(statsA, tmpStats);
      }
    }
    if (statsB.played < 3) {
      const lastB = await getLastMatches(teamBId, 10);
      const tmpB = lastB.filter(fm => {
        const gh = safeGet(fm, "goals.home");
        const ga = safeGet(fm, "goals.away");
        return gh !== null && ga !== null;
      });
      if (tmpB.length >= statsB.played) {
        const tmpStats = { played:0, gf:0, ga:0, wins:0, draws:0, losses:0, avgGF:0, avgGA:0 };
        for (const fm of tmpB) {
          const home = safeGet(fm, "teams.home.id");
          const away = safeGet(fm, "teams.away.id");
          const isHome = home === teamBId;
          const tg = isHome ? safeGet(fm,"goals.home") : safeGet(fm,"goals.away");
          const og = isHome ? safeGet(fm,"goals.away") : safeGet(fm,"goals.home");
          tmpStats.played++; tmpStats.gf += tg; tmpStats.ga += og;
          if (tg > og) tmpStats.wins++;
          else if (tg === og) tmpStats.draws++;
          else tmpStats.losses++;
        }
        tmpStats.avgGF = tmpStats.played ? tmpStats.gf / tmpStats.played : 0;
        tmpStats.avgGA = tmpStats.played ? tmpStats.ga / tmpStats.played : 0;
        Object.assign(statsB, tmpStats);
      }
    }

    // If still too few data, fallback to global average lambdas
    const fallbackGoal = 1.25; // conservative league average
    const lambdaA = ( (statsA.avgGF || fallbackGoal) + (statsB.avgGA || fallbackGoal) ) / 2;
    const lambdaB = ( (statsB.avgGF || fallbackGoal) + (statsA.avgGA || fallbackGoal) ) / 2;

    // Build probability matrix 0..maxGoal
    const maxGoal = 5; // consider scorelines from 0 to 5
    const probs = []; // rows for teamA goals
    let gridSum = 0;
    for (let i = 0; i <= maxGoal; i++) {
      probs[i] = [];
      const pA = poisson(i, lambdaA);
      for (let j = 0; j <= maxGoal; j++) {
        const pB = poisson(j, lambdaB);
        const p = pA * pB;
        probs[i][j] = p;
        gridSum += p;
      }
    }
    const remainder = Math.max(0, 1 - gridSum); // probability where at least one side scores > maxGoal

    // compute win/draw probabilities (from the matrix and remainder approximations)
    let pAwin = 0, pBwin = 0, pDraw = 0, pBTTS = 0;
    const scorelines = [];
    for (let i = 0; i <= maxGoal; i++) {
      for (let j = 0; j <= maxGoal; j++) {
        const p = probs[i][j];
        if (i > j) pAwin += p;
        else if (j > i) pBwin += p;
        else pDraw += p;
        if (i > 0 && j > 0) pBTTS += p;
        scorelines.push({ score: `${i}-${j}`, prob: p });
      }
    }

    // crude distribution for remainder: assign to high-scoring outcomes (e.g., 3-3, 4-3, 3-4, 4-4, 5-4...) 
    // We will distribute remainder proportionally to a few high-scoring patterns for display purposes:
    const highPatterns = ["3-3","4-3","3-4","4-4","5-3","3-5"];
    const share = remainder / highPatterns.length;
    for (const pattern of highPatterns) {
      scorelines.push({ score: pattern, prob: share });
      const [a,b] = pattern.split("-").map(Number);
      if (a > b) pAwin += share;
      else if (b > a) pBwin += share;
      else pDraw += share;
      if (a > 0 && b > 0) pBTTS += share;
    }

    // Normalize small floating rounding issues
    const totalProbSum = pAwin + pBwin + pDraw;
    if (totalProbSum > 0) {
      const norm = 1 / totalProbSum;
      pAwin *= norm; pBwin *= norm; pDraw *= norm;
    }

    // Top predicted scores
    scorelines.sort((a,b) => b.prob - a.prob);
    const topN = scorelines.slice(0, 6);

    // Average goals expected
    const expectedTotalGoals = lambdaA + lambdaB;

    // Build message
    const totalMatchesUsed = matches.length;
    const message = [
      `📊 *Prediction: ${teamAName} vs ${teamBName}*`,
      ``,
      `📌 *Data used:* H2H + recent form (deduped) — *${totalMatchesUsed}* finished matches used.`,
      ``,
      `📈 *Model (Poisson) results — expected goals (λ):*`,
      `- ${teamAName}: ${lambdaA.toFixed(2)} (avg GF ${statsA.avgGF.toFixed(2)} | conceded ${statsA.avgGA.toFixed(2)})`,
      `- ${teamBName}: ${lambdaB.toFixed(2)} (avg GF ${statsB.avgGF.toFixed(2)} | conceded ${statsB.avgGA.toFixed(2)})`,
      ``,
      `🟢 *Win probabilities (model):*`,
      `- ${teamAName}: ${(pAwin * 100).toFixed(1)}%`,
      `- ${teamBName}: ${(pBwin * 100).toFixed(1)}%`,
      `- Draw: ${(pDraw * 100).toFixed(1)}%`,
      ``,
      `⚽ *Both Teams To Score (BTTS):* ${(pBTTS * 100).toFixed(1)}%`,
      `⚖️ *Expected total goals:* ${expectedTotalGoals.toFixed(2)}`,
      ``,
      `🎯 *Top predicted correct scores:*`
    ];

    for (const s of topN) {
      message.push(`- ${s.score} : ${(s.prob * 100).toFixed(1)}%`);
    }

    message.push("", `ℹ️ *Notes:* Predictions use a Poisson model from the recent form + H2H; confidence improves with more historical matches. Adjust max goals in code to expand scoreline range.`);

    await sock.sendMessage(m.from, { text: message.join("\n") }, { quoted: m });
    try { if (m?.React) await m.React("✅"); } catch (e) {}

  } catch (err) {
    console.error("[TIP ERROR]", err.response?.data || err.message || err);
    try { if (m?.React) await m.React("⚠️"); } catch (e) {}
    await sock.sendMessage(m.from, {
      text: "⚠️ Could not fetch analysis (API error or key problem)."
    }, { quoted: m });
  }
};

export default tip;
