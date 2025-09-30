import axios from "axios";

const tip = async (m, sock) => {
    const prefix = "!";
    const text = m.body?.trim() || "";
    
    if (!text.startsWith(prefix + "tip")) return;
    
    const args = text.slice(prefix.length + 3).trim();
    if (!args.includes(" vs ")) {
        return await sock.sendMessage(m.from, {
            text: "❌ Format: *!tip TeamA vs TeamB*"
        }, { quoted: m });
    }

    const [teamA, teamB] = args.split(" vs ").map(t => t.trim());
    await m.React("⏳");

    try {
        const API_KEY = "a3f7d73d569de1d62fb8147005347f79";
        const API_URL = "https://v3.football.api-sports.io";

        // Quick team search
        const searchTeam = async (name) => {
            const res = await axios.get(`${API_URL}/teams`, {
                headers: { "x-apisports-key": API_KEY },
                params: { search: name }
            });
            return res.data?.response?.[0]?.team || null;
        };

        const teamAData = await searchTeam(teamA);
        const teamBData = await searchTeam(teamB);

        if (!teamAData || !teamBData) {
            return await sock.sendMessage(m.from, {
                text: `❌ Teams not found: ${teamA} vs ${teamB}`
            }, { quoted: m });
        }

        // Get recent matches (limited to avoid timeout)
        const getMatches = async (teamId) => {
            const res = await axios.get(`${API_URL}/fixtures`, {
                headers: { "x-apisports-key": API_KEY },
                params: { 
                    team: teamId, 
                    last: 3,
                    status: "FT"
                }
            });
            return res.data?.response || [];
        };

        const matchesA = await getMatches(teamAData.id);
        const matchesB = await getMatches(teamBData.id);
        const allMatches = [...matchesA, ...matchesB];

        if (allMatches.length === 0) {
            return await sock.sendMessage(m.from, {
                text: "❌ No recent match data available"
            }, { quoted: m });
        }

        // Quick analysis
        let winsA = 0, winsB = 0, draws = 0, goalsA = 0, goalsB = 0;

        allMatches.forEach(match => {
            const homeGoals = match.goals?.home || 0;
            const awayGoals = match.goals?.away || 0;
            
            const isAHome = match.teams.home.name.toLowerCase().includes(teamA.toLowerCase());
            const isBHome = match.teams.home.name.toLowerCase().includes(teamB.toLowerCase());

            if (isAHome) {
                goalsA += homeGoals;
                goalsB += awayGoals;
                if (homeGoals > awayGoals) winsA++;
                else if (awayGoals > homeGoals) winsB++;
                else draws++;
            } else if (isBHome) {
                goalsA += awayGoals;
                goalsB += homeGoals;
                if (awayGoals > homeGoals) winsA++;
                else if (homeGoals > awayGoals) winsB++;
                else draws++;
            }
        });

        const total = allMatches.length;
        
        // Smart score prediction
        const avgA = goalsA / total;
        const avgB = goalsB / total;
        
        const predictScores = () => {
            const scores = [];
            // Base on averages
            const likelyA = Math.round(avgA);
            const likelyB = Math.round(avgB);
            
            scores.push(`${likelyA}-${likelyB}`, `${likelyB}-${likelyA}`);
            
            // Add common variations
            if (likelyA > 0 && likelyB > 0) scores.push(`${likelyA}-${likelyB-1}`, `${likelyA-1}-${likelyB}`);
            scores.push('1-1', '2-1', '1-2');
            
            return [...new Set(scores)].slice(0, 4);
        };

        const likelyScores = predictScores();

        const message = `
⚽ *Prediction: ${teamA} vs ${teamB}*

📊 Form Analysis (Last ${total} matches):
- ${teamA}: ${((winsA/total)*100).toFixed(1)}% win rate
- ${teamB}: ${((winsB/total)*100).toFixed(1)}% win rate  
- Draw: ${((draws/total)*100).toFixed(1)}%

🎯 Expected Scores:
${likelyScores.map(score => `• ${score}`).join('\n')}

⚡ Avg Goals:
- ${teamA}: ${avgA.toFixed(1)}
- ${teamB}: ${avgB.toFixed(1)}

💡 Based on recent performance data
        `.trim();

        await sock.sendMessage(m.from, { text: message }, { quoted: m });
        await m.React("✅");

    } catch (error) {
        console.error("Tip error:", error.message);
        await sock.sendMessage(m.from, {
            text: "⚠️ Service timeout - try again later"
        }, { quoted: m });
        await m.React("❌");
    }
};

export default tip;
