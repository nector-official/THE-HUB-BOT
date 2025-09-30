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

    // Get team statistics
    const getTeamStats = async (teamId) => {
      try {
        const currentSeason = new Date().getFullYear();
        const res = await axios.get(`${API_URL}/teams/statistics`, {
          headers: { "x-apisports-key": API_KEY },
          params: { 
            team: teamId, 
            season: currentSeason,
            league: 39 // Premier League as default, adjust as needed
          }
        });
        return res.data?.response || null;
      } catch (err) {
        console.error("[STATS ERROR]", err.response?.data || err.message);
        return null;
      }
    };

    // 1. Try Head-to-Head
    let matches = [];
    let source = "Head-to-Head";

    try {
      const h2hRes = await axios.get(`${API_URL}/fixtures/headtohead`, {
        headers: { "x-apisports-key": API_KEY },
        params: { h2h: `${teamAId}-${teamBId}` }
      });

      if (h2hRes.data?.response?.length > 0) {
        matches = h2hRes.data.response.slice(0, 5);
      }
    } catch (err) {
      console.error("[H2H ERROR]", err.response?.data || err.message);
    }

    // 2. Get recent form for both teams
    const getRecentMatches = async (teamId, count = 5) => {
      try {
        const res = await axios.get(`${API_URL}/fixtures`, {
          headers: { "x-apisports-key": API_KEY },
          params: { 
            team: teamId, 
            last: count,
            status: "FT" // Finished matches only
          }
        });
        return res.data?.response || [];
      } catch (err) {
        console.error("[RECENT MATCHES ERROR]", err.response?.data || err.message);
        return [];
      }
    };

    const recentMatchesA = await getRecentMatches(teamAId);
    const recentMatchesB = await getRecentMatches(teamBId);
    
    // Combine all matches for analysis
    const allMatches = [...matches, ...recentMatchesA, ...recentMatchesB];
    
    if (allMatches.length === 0) {
      return await sock.sendMessage(m.from, {
        text: `⚠️ No data available for *${teamAName}* vs *${teamBName}*.`
      }, { quoted: m });
    }

    // Advanced Analysis
    let teamAWins = 0, teamBWins = 0, draws = 0;
    let btts = 0, totalGoals = 0;
    let teamAGoals = 0, teamBGoals = 0;
    let teamAHomeGoals = 0, teamBAwayGoals = 0;
    let cleanSheetsA = 0, cleanSheetsB = 0;

    // Score frequency analysis
    const scoreFrequency = {};
    const teamAScores = [];
    const teamBScores = [];

    allMatches.forEach(match => {
      const goalsHome = match.goals?.home ?? 0;
      const goalsAway = match.goals?.away ?? 0;
      totalGoals += goalsHome + goalsAway;

      const homeName = match.teams?.home?.name || "";
      const awayName = match.teams?.away?.name || "";
      const isTeamAHome = homeName.toLowerCase().includes(teamAName.toLowerCase());
      const isTeamBHome = homeName.toLowerCase().includes(teamBName.toLowerCase());

      // Track scores for correct score prediction
      const score = `${goalsHome}-${goalsAway}`;
      scoreFrequency[score] = (scoreFrequency[score] || 0) + 1;

      // Team-specific scoring
      if (isTeamAHome) {
        teamAGoals += goalsHome;
        teamAHomeGoals += goalsHome;
        teamBScores.push(goalsAway);
        if (goalsAway === 0) cleanSheetsA++;
      } else if (awayName.toLowerCase().includes(teamAName.toLowerCase())) {
        teamAGoals += goalsAway;
        teamBScores.push(goalsHome);
        if (goalsHome === 0) cleanSheetsA++;
      }

      if (isTeamBHome) {
        teamBGoals += goalsHome;
        teamBAwayGoals += goalsAway;
        teamAScores.push(goalsAway);
        if (goalsAway === 0) cleanSheetsB++;
      } else if (awayName.toLowerCase().includes(teamBName.toLowerCase())) {
        teamBGoals += goalsAway;
        teamAScores.push(goalsHome);
        if (goalsHome === 0) cleanSheetsB++;
      }

      // Result analysis
      if (goalsHome > goalsAway) {
        if (isTeamAHome) teamAWins++;
        else if (isTeamBHome) teamBWins++;
        else teamBWins++; // Fallback
      } else if (goalsAway > goalsHome) {
        if (!isTeamAHome && awayName.toLowerCase().includes(teamAName.toLowerCase())) teamAWins++;
        else if (!isTeamBHome && awayName.toLowerCase().includes(teamBName.toLowerCase())) teamBWins++;
        else teamAWins++; // Fallback
      } else {
        draws++;
      }

      if (goalsHome > 0 && goalsAway > 0) btts++;
    });

    const total = allMatches.length;
    const avgGoals = (totalGoals / total).toFixed(2);
    const avgTeamAGoals = (teamAGoals / total).toFixed(1);
    const avgTeamBGoals = (teamBGoals / total).toFixed(1);

    // Calculate win probabilities with weighting
    const teamAWinPct = (teamAWins / total * 100).toFixed(1);
    const teamBWinPct = (teamBWins / total * 100).toFixed(1);
    const drawPct = (draws / total * 100).toFixed(1);
    const bttsPct = (btts / total * 100).toFixed(1);

    // Dynamic Correct Score Prediction
    const predictCorrectScores = () => {
      const possibleScores = [];
      
      // Calculate goal expectation based on averages
      const teamAExpected = Math.max(0.5, Math.min(3, parseFloat(avgTeamAGoals)));
      const teamBExpected = Math.max(0.5, Math.min(3, parseFloat(avgTeamBGoals)));
      
      // Generate likely scores based on goal expectations
      const baseScores = [
        { score: "1-0", weight: 0 },
        { score: "2-0", weight: 0 },
        { score: "2-1", weight: 0 },
        { score: "1-1", weight: 0 },
        { score: "0-0", weight: 0 },
        { score: "0-1", weight: 0 },
        { score: "0-2", weight: 0 },
        { score: "1-2", weight: 0 },
        { score: "3-1", weight: 0 },
        { score: "3-2", weight: 0 },
        { score: "2-2", weight: 0 },
        { score: "1-3", weight: 0 }
      ];

      // Weight scores based on team performance
      baseScores.forEach(item => {
        const [a, b] = item.score.split('-').map(Number);
        let weight = 0;
        
        // Consider team strength and recent form
        if (a <= teamAExpected + 1 && b <= teamBExpected + 1) {
          weight = Math.exp(-Math.abs(a - teamAExpected) - Math.abs(b - teamBExpected));
          
          // Boost weight for scores that actually occurred
          if (scoreFrequency[item.score]) {
            weight += scoreFrequency[item.score] * 0.3;
          }
        }
        
        item.weight = weight;
      });

      // Sort by weight and take top 3
      return baseScores
        .filter(item => item.weight > 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3)
        .map(item => item.score);
    };

    const likelyScores = predictCorrectScores();

    // Form indicators
    const teamAForm = recentMatchesA.length >= 3 ? 
      recentMatchesA.slice(0, 3).map(match => {
        const isHome = match.teams.home.name.toLowerCase().includes(teamAName.toLowerCase());
        const goalsFor = isHome ? match.goals.home : match.goals.away;
        const goalsAgainst = isHome ? match.goals.away : match.goals.home;
        return goalsFor > goalsAgainst ? 'W' : goalsFor === goalsAgainst ? 'D' : 'L';
      }).join('') : 'N/A';

    const teamBForm = recentMatchesB.length >= 3 ? 
      recentMatchesB.slice(0, 3).map(match => {
        const isHome = match.teams.home.name.toLowerCase().includes(teamBName.toLowerCase());
        const goalsFor = isHome ? match.goals.home : match.goals.away;
        const goalsAgainst = isHome ? match.goals.away : match.goals.home;
        return goalsFor > goalsAgainst ? 'W' : goalsFor === goalsAgainst ? 'D' : 'L';
      }).join('') : 'N/A';

    const message = `
📊 *Prediction: ${teamAName} vs ${teamBName}*

📌 Based on: ${source} + Recent Form

🏆 *Win Probability:*
- ${teamAName}: ${teamAWinPct}% ${teamAForm !== 'N/A' ? `(Form: ${teamAForm})` : ''}
- ${teamBName}: ${teamBWinPct}% ${teamBForm !== 'N/A' ? `(Form: ${teamBForm})` : ''}
- Draw: ${drawPct}%

⚽ *Goal Analysis:*
- BTTS: ${bttsPct}%
- Avg Goals/Match: ${avgGoals}
- ${teamAName} Avg: ${avgTeamAGoals}
- ${teamBName} Avg: ${avgTeamBGoals}

🎯 *Most Likely Scores:*
${likelyScores.map(score => `- ${score}`).join('\n')}

🔒 *Defensive Stats:*
- ${teamAName} Clean Sheets: ${cleanSheetsA}
- ${teamBName} Clean Sheets: ${cleanSheetsB}

💡 *Analysis based on ${total} matches*
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

export default tip;        text: `⚠️ No finished match data available for *${teamAName}* and *${teamBName}* (H2H or recent).`
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
