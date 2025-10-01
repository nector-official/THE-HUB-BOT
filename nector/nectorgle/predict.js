// predict.js — Prediction Command (API-Football)
/*
 USAGE:
   !predict Team A vs Team B
 EXAMPLE:
   !predict Monaco vs Manchester City
*/

import axios from "axios";
import fs from "fs";

const API_KEY = "YOUR_API_KEY"; // put your API key here
const BASE_URL = "https://v3.football.api-sports.io";
const TEAM_CACHE = "./team_cache.json";

// Load / create team cache
let cache = {};
if (fs.existsSync(TEAM_CACHE)) {
  cache = JSON.parse(fs.readFileSync(TEAM_CACHE));
}

// Helper: get team ID by name
async function getTeamId(teamName) {
  if (cache[teamName]) return cache[teamName];
  const res = await axios.get(`${BASE_URL}/teams`, {
    params: { search: teamName },
    headers: { "x-apisports-key": API_KEY },
  });
  if (res.data.response.length === 0) throw new Error(`Team not found: ${teamName}`);
  const id = res.data.response[0].team.id;
  cache[teamName] = id;
  fs.writeFileSync(TEAM_CACHE, JSON.stringify(cache, null, 2));
  return id;
}

// Helper: get recent matches & calculate stats
async function getTeamStats(teamId) {
  const res = await axios.get(`${BASE_URL}/fixtures`, {
    params: { team: teamId, last: 5 },
    headers: { "x-apisports-key": API_KEY },
  });

  const games = res.data.response;
  let wins = 0, draws = 0, losses = 0;
  let goalsFor = 0, goalsAgainst = 0;
  let btts = 0;

  games.forEach(g => {
    const { goals, teams } = g;
    const isHome = teams.home.id === teamId;
    const gf = isHome ? goals.home : goals.away;
    const ga = isHome ? goals.away : goals.home;

    goalsFor += gf;
    goalsAgainst += ga;

    if (gf > ga) wins++;
    else if (gf === ga) draws++;
    else losses++;

    if (gf > 0 && ga > 0) btts++;
  });

  return {
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    btts,
    played: games.length,
  };
}

// Better correct score prediction
function getPossibleScore(statsA, statsB) {
  const avgA = statsA.goalsFor / statsA.played;
  const avgB = statsB.goalsFor / statsB.played;

  let goalsA = Math.round(avgA);
  let goalsB = Math.round(avgB);

  // Tilt towards the team with more wins
  if (statsA.wins > statsB.wins && goalsA <= goalsB) goalsA++;
  if (statsB.wins > statsA.wins && goalsB <= goalsA) goalsB++;

  // Avoid 0-0 too often
  if (goalsA === 0 && goalsB === 0) goalsB = 1;

  return `${goalsA}-${goalsB}`;
}

// Main Command
export const predictCommand = async (sock, chatId, text) => {
  try {
    const match = text.split(" ").slice(1).join(" ");
    const [teamA, teamB] = match.split(" vs ").map(t => t.trim());

    if (!teamA || !teamB) {
      await sock.sendMessage(chatId, { text: "❌ Usage: !predict TeamA vs TeamB" });
      return;
    }

    const [idA, idB] = await Promise.all([getTeamId(teamA), getTeamId(teamB)]);
    const [statsA, statsB] = await Promise.all([getTeamStats(idA), getTeamStats(idB)]);

    const winPctA = ((statsA.wins / statsA.played) * 100).toFixed(1);
    const winPctB = ((statsB.wins / statsB.played) * 100).toFixed(1);
    const drawPct = (((statsA.draws + statsB.draws) / (statsA.played + statsB.played)) * 100).toFixed(1);

    const avgGoals = ((statsA.goalsFor + statsA.goalsAgainst + statsB.goalsFor + statsB.goalsAgainst) / (statsA.played + statsB.played)).toFixed(2);
    const bttsPct = (((statsA.btts + statsB.btts) / (statsA.played + statsB.played)) * 100).toFixed(1);

    const possibleScore = getPossibleScore(statsA, statsB);

    const message = `
📊 *Prediction: ${teamA} vs ${teamB}*

📌 Based on: current team form 

🟢 Win %:
- ${teamA}: ${winPctA}%
- ${teamB}: ${winPctB}%
- Draw: ${drawPct}%

⚽ Both Teams to Score (BTTS): ${bttsPct}%
📈 Average Goals: ${avgGoals}

🎯 Possible Correct Score:
_${possibleScore}_

💡 *Note:* Stats based on the last 5 matches.
`;

    await sock.sendMessage(chatId, { text: message });
  } catch (err) {
    console.error(err);
    await sock.sendMessage(chatId, { text: "⚠️ Error fetching prediction." });
  }
};
