// predict.js
import axios from "axios";

const predict = async (m, sock) => {
  try {
    const prefix = "!";
    const text = m.body?.trim() || "";

    if (!text.startsWith(prefix)) return;
    const cmd = text.slice(prefix.length).split(" ")[0].toLowerCase();
    if (cmd !== "predict") return;

    // Parse teams (accept "vs" or " VS " etc.)
    const args = text.slice(prefix.length + cmd.length).trim();
    const parts = args.split(/vs/i).map(p => p && p.trim()).filter(Boolean);
    if (parts.length < 2) {
      return await sock.sendMessage(m.from, {
        text: "❌ Format: *!predict TeamA vs TeamB*\nExample: *!predict Monaco vs Man City*"
      }, { quoted: m });
    }
    const teamAName = parts[0];
    const teamBName = parts.slice(1).join(" vs ").trim();

    await m.React("⏳");

    // ====== CONFIG ======
    const API_TOKEN = "j6c2X1HnBsib0wiGKIU9NJeKFf3Qs8QUOgwtvPcOEK6X7cBZ2h3a6GJxmmkg"; // your token
    const BASE_URL = "https://api.sportmonks.com/v3/football";
    // ====================

    // Helper: search team by name (auto-correct)
    const searchTeam = async (name) => {
      try {
        const res = await axios.get(`${BASE_URL}/teams/search/${encodeURIComponent(name)}`, {
          params: { api_token: API_TOKEN, per_page: 5 },
          timeout: 10000
        });
        const list = res.data?.data || [];
        if (!list.length) return null;

        // prefer an entry whose name includes the typed name (case-insensitive)
        const lower = name.toLowerCase();
        const best = list.find(t => (t.name || "").toLowerCase().includes(lower)) || list[0];
        return { id: best.id, name: best.name };
      } catch (err) {
        // silent fail -> null
        return null;
      }
    };

    // Helper: get head-to-head fixtures (most recent first)
    const getH2H = async (idA, idB, limit = 5) => {
      try {
        const res = await axios.get(`${BASE_URL}/fixtures/head-to-head/${idA}/${idB}`, {
          params: { api_token: API_TOKEN, per_page: limit, include: "scores,localTeam,visitorTeam" },
          timeout: 10000
        });
        return res.data?.data || [];
      } catch (err) {
        return [];
      }
    };

    // Helper: get recent fixtures for a team (tries a few ways)
    const getRecentForTeam = async (teamId, teamName, limit = 5) => {
      // 1) try team-by-id include=fixtures (preferred)
      try {
        const res = await axios.get(`${BASE_URL}/teams/${teamId}`, {
          params: { api_token: API_TOKEN, include: "fixtures", per_page: limit },
          timeout: 10000
        });
        // fixtures may be nested
        const fixturesFromTeam = res.data?.data?.fixtures?.data || res.data?.data?.fixtures || [];
        if (fixturesFromTeam && fixturesFromTeam.length) {
          return fixturesFromTeam.slice(0, limit);
        }
      } catch (e) { /* ignore and fallback */ }

      // 2) fallback: /fixtures with participantSearch filter (teamName)
      try {
        const res2 = await axios.get(`${BASE_URL}/fixtures`, {
          params: {
            api_token: API_TOKEN,
            include: "scores,localTeam,visitorTeam",
            per_page: limit,
            filters: `participantSearch:{${teamName}}`
          },
          timeout: 10000
        });
        return res2.data?.data || [];
      } catch (e) {
        return [];
      }
    };

    // score extractor (robust across response shapes)
    const extractScores = (fixture) => {
      const local = fixture.scores?.localteam_score ?? fixture.localteam_score ?? fixture.score?.local ?? 0;
      const visitor = fixture.scores?.visitorteam_score ?? fixture.visitorteam_score ?? fixture.score?.visitor ?? 0;
      const localId = fixture.localteam_id ?? fixture.localteam?.data?.id ?? fixture.participants?.[0]?.id ?? null;
      const visitorId = fixture.visitorteam_id ?? fixture.visitorteam?.data?.id ?? fixture.participants?.[1]?.id ?? null;
      const fixtureId = fixture.id ?? fixture.fixture_id ?? null;
      return { local: Number(local ?? 0), visitor: Number(visitor ?? 0), localId, visitorId, fixtureId };
    };

    // find teams (auto-correct)
    const teamA = await searchTeam(teamAName);
    const teamB = await searchTeam(teamBName);

    if (!teamA || !teamB) {
      return await sock.sendMessage(m.from, {
        text: `❌ Could not find both teams. (*${teamAName}*, *${teamBName}*)\nTry a different spelling or include more of the name.`
      }, { quoted: m });
    }

    // fetch matches
    const [h2h, recentA, recentB] = await Promise.all([
      getH2H(teamA.id, teamB.id, 5),
      getRecentForTeam(teamA.id, teamA.name, 5),
      getRecentForTeam(teamB.id, teamB.name, 5)
    ]);

    // merge matches (dedupe by fixture id)
    const merged = [];
    const seen = new Set();
    const pushUnique = (arr) => {
      for (const f of arr) {
        const id = f.id ?? f.fixture_id ?? null;
        if (!id) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        merged.push(f);
      }
    };
    pushUnique(h2h || []);
    pushUnique(recentA || []);
    pushUnique(recentB || []);

    if (merged.length === 0) {
      return await sock.sendMessage(m.from, {
        text: `⚠️ No fixtures/data found for *${teamA.name}* vs *${teamB.name}*.`
      }, { quoted: m });
    }

    // ANALYSIS
    let teamAWins = 0, teamBWins = 0, draws = 0;
    let bttsCount = 0, over25Count = 0, totalGoals = 0, totalMatches = 0;

    merged.forEach(f => {
      const { local, visitor, localId, visitorId } = extractScores(f);

      // if both ids missing, try to infer via included localTeam/visitorTeam
      const homeId = localId;
      const awayId = visitorId;

      // Only count finished / recorded matches (some fixtures might be upcoming - scores may be null)
      // We'll still accept 0-0 as valid if present.
      // We'll treat matches that have a numeric score.
      const matchHasScore = (typeof local === "number" && typeof visitor === "number");
      if (!matchHasScore) return;

      totalMatches++;
      totalGoals += (local + visitor);
      if (local > visitor) {
        // home won
        if (homeId === teamA.id) teamAWins++;
        else if (homeId === teamB.id) teamBWins++;
        else {
          // if homeId doesn't match either, try to match by name (fallback)
          const nameHome = (f.localTeam?.data?.name || f.localteam?.name || "").toLowerCase();
          if (nameHome && nameHome.includes(teamA.name.toLowerCase())) teamAWins++;
          else teamBWins++;
        }
      } else if (visitor > local) {
        // away won
        if (awayId === teamA.id) teamAWins++;
        else if (awayId === teamB.id) teamBWins++;
        else {
          const nameAway = (f.visitorTeam?.data?.name || f.visitorteam?.name || "").toLowerCase();
          if (nameAway && nameAway.includes(teamA.name.toLowerCase())) teamAWins++;
          else teamBWins++;
        }
      } else {
        draws++;
      }

      if (local > 0 && visitor > 0) bttsCount++;
      if ((local + visitor) > 2) over25Count++;
    });

    // If merged returned fixtures but none had scores, warn
    if (totalMatches === 0) {
      return await sock.sendMessage(m.from, {
        text: `⚠️ Found fixtures for *${teamA.name}* and *${teamB.name}* but none contain final scores yet. Try again after matches are finished.`
      }, { quoted: m });
    }

    // probabilities (percentages)
    const pct = (n) => Number(((n / totalMatches) * 100).toFixed(1));
    const teamAwinP = pct(teamAWins);
    const teamBwinP = pct(teamBWins);
    const drawP = pct(draws);
    const bttsP = pct(bttsCount);
    const over25P = pct(over25Count);
    const avgGoals = Number((totalGoals / totalMatches).toFixed(2));

    // classify probability
    const classify = (p) => {
      if (p >= 70) return "High";
      if (p >= 50) return "Moderate";
      return "Low";
    };

    // simple correct scores (kept simple as requested)
    const correctScores = ["2-1", "1-2", "1-1"];

    // confidence note
    const confidence = totalMatches >= 5 ? "High" : (totalMatches >= 3 ? "Medium" : "Low");

    // Build message
    const message = `
📊 *Match Prediction*: ${teamA.name} vs ${teamB.name}

📌 Data used: ${h2h.length ? "Head-to-Head + Recent Form" : "Recent Form only"}
📎 Matches analysed: ${totalMatches} (H2H: ${h2h.length}, TeamA recent: ${recentA.length}, TeamB recent: ${recentB.length})

🟢 *Win probabilities*:
- ${teamA.name}: ${teamAwinP}% (${classify(teamAwinP)})
- ${teamB.name}: ${teamBwinP}% (${classify(teamBwinP)})
- Draw: ${drawP}%

⚽ *Goal stats*:
- Both Teams To Score (BTTS): ${bttsP}% (${classify(bttsP)})
- Over 2.5 goals: ${over25P}% (${classify(over25P)})
- Average goals per match (sample): ${avgGoals}

🎯 *Possible correct scores* (simple suggestions):
${correctScores.map(s => `- ${s}`).join("\n")}

🔒 Confidence of result: ${confidence}
💡 Note: Percentages are computed from the ${totalMatches} historical matches we could fetch and combine. Use as guidance, not guarantee.
    `.trim();

    await sock.sendMessage(m.from, { text: message }, { quoted: m });
    await m.React("✅");

  } catch (err) {
    console.error("[PREDICT ERROR]", err?.response?.data || err?.message || err);
    await sock.sendMessage(m.from, {
      text: "⚠️ Could not fetch prediction (API error or rate limit)."
    }, { quoted: m });
    try { await m.React("⚠️"); } catch (e) { /* ignore */ }
  }
};

export default predict;
