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

        // Better team search with league parameter
        const searchTeam = async (name) => {
            try {
                const res = await axios.get(`${API_URL}/teams`, {
                    headers: { "x-apisports-key": API_KEY },
                    params: { 
                        search: name,
                        season: 2024  // Current season
                    }
                });
                return res.data?.response?.[0]?.team || null;
            } catch (error) {
                console.log("Team search error:", error.message);
                return null;
            }
        };

        const teamAData = await searchTeam(teamA);
        const teamBData = await searchTeam(teamB);

        if (!teamAData || !teamBData) {
            return await sock.sendMessage(m.from, {
                text: `❌ Teams not found. Try popular teams like: "Manchester United", "Barcelona", "Bayern Munich"`
            }, { quoted: m });
        }

        console.log("Found teams:", teamAData.name, teamBData.name);

        // Get fixtures with broader search
        const getFixtures = async (teamId, teamName) => {
            try {
                const res = await axios.get(`${API_URL}/fixtures`, {
                    headers: { "x-apisports-key": API_KEY },
                    params: { 
                        team: teamId,
                        last: 5,
                        status: "FT"  // Only finished matches
                    },
                    timeout: 10000
                });
                
                const matches = res.data?.response || [];
                console.log(`Found ${matches.length} matches for ${teamName}`);
                return matches;
            } catch (error) {
                console.log("Fixtures error:", error.message);
                return [];
            }
        };

        const [matchesA, matchesB] = await Promise.all([
            getFixtures(teamAData.id, teamAData.name),
            getFixtures(teamBData.id, teamBData.name)
        ]);

        const allMatches = [...matchesA, ...matchesB];
        console.log("Total matches found:", allMatches.length);

        // If no recent matches, try head-to-head
        if (allMatches.length === 0) {
            try {
                const h2hRes = await axios.get(`${API_URL}/fixtures/headtohead`, {
                    headers: { "x-apisports-key": API_KEY },
                    params: { 
                        h2h: `${teamAData.id}-${teamBData.id}`,
                        status: "FT"
                    }
                });
                
                const h2hMatches = h2hRes.data?.response || [];
                console.log("H2H matches found:", h2hMatches.length);
                
                if (h2hMatches.length > 0) {
                    allMatches.push(...h2hMatches.slice(0, 5));
                }
            } catch (h2hError) {
                console.log("H2H search failed");
            }
        }

        // If STILL no data, provide basic prediction
        if (allMatches.length === 0) {
            const basicScores = ['1-1', '2-1', '1-0', '0-0', '1-2'];
            const randomIndex = Math.floor(Math.random() * 3);
            
            const fallbackMessage = `
⚽ *Prediction: ${teamA} vs ${teamB}*

📊 Analysis: Limited data available

🎯 Most Likely Scores:
• ${basicScores[0]}
• ${basicScores[1]} 
• ${basicScores[2]}

💡 Try popular teams for detailed analysis
            `.trim();

            await sock.sendMessage(m.from, { text: fallbackMessage }, { quoted: m });
            await m.React("✅");
            return;
        }

        // Analysis with available data
        let winsA = 0, winsB = 0, draws = 0, goalsA = 0, goalsB = 0;

        allMatches.forEach(match => {
            const homeGoals = match.goals?.home ?? 0;
            const awayGoals = match.goals?.away ?? 0;
            
            const homeTeam = match.teams?.home?.name?.toLowerCase() || '';
            const awayTeam = match.teams?.away?.name?.toLowerCase() || '';
            
            const isTeamA = homeTeam.includes(teamA.toLowerCase()) || awayTeam.includes(teamA.toLowerCase());
            const isTeamB = homeTeam.includes(teamB.toLowerCase()) || awayTeam.includes(teamB.toLowerCase());

            if (isTeamA) {
                const teamAGoals = homeTeam.includes(teamA.toLowerCase()) ? homeGoals : awayGoals;
                const opponentGoals = homeTeam.includes(teamA.toLowerCase()) ? awayGoals : homeGoals;
                
                goalsA += teamAGoals;
                goalsB += opponentGoals;
                
                if (teamAGoals > opponentGoals) winsA++;
                else if (teamAGoals < opponentGoals) winsB++;
                else draws++;
            }
        });

        const total = Math.max(allMatches.length, 1);
        
        // Score prediction
        const avgA = goalsA / total;
        const avgB = goalsB / total;
        
        const predictScores = () => {
            const likelyA = Math.max(0, Math.min(3, Math.round(avgA)));
            const likelyB = Math.max(0, Math.min(3, Math.round(avgB)));
            
            const scores = [
                `${likelyA}-${likelyB}`,
                `${likelyB}-${likelyA}`,
                `${Math.max(0, likelyA-1)}-${Math.max(0, likelyB-1)}`,
                '1-1', '2-1', '1-2'
            ];
            
            return [...new Set(scores)].slice(0, 4);
        };

        const likelyScores = predictScores();

        const message = `
⚽ *Prediction: ${teamAData.name} vs ${teamBData.name}*

📊 Based on ${total} recent matches

🏆 Win Probability:
- ${teamAData.name}: ${((winsA/total)*100).toFixed(1)}%
- ${teamBData.name}: ${((winsB/total)*100).toFixed(1)}%  
- Draw: ${((draws/total)*100).toFixed(1)}%

🎯 Expected Scores:
${likelyScores.map(score => `• ${score}`).join('\n')}

⚡ Goal Averages:
- ${teamAData.name}: ${avgA.toFixed(1)}
- ${teamBData.name}: ${avgB.toFixed(1)}
        `.trim();

        await sock.sendMessage(m.from, { text: message }, { quoted: m });
        await m.React("✅");

    } catch (error) {
        console.error("Tip error:", error.message);
        await sock.sendMessage(m.from, {
            text: "⚠️ Service timeout - try popular teams like: Manchester United vs Liverpool"
        }, { quoted: m });
        await m.React("❌");
    }
};

export default tip;
