import axios from "axios";

const live = async (m, sock) => {
  try {
    const prefix = "!";
    const text = m.body?.trim() || "";

    if (!text.startsWith(prefix)) return;
    const args = text.slice(prefix.length).split(" ");
    const cmd = args[0].toLowerCase();
    if (cmd !== "live") return;

    await m.React("⏳");

    // League map (short code -> API league ID)
    const leagueMap = {
      PL: 39,    // Premier League
      CL: 2,     // Champions League
      WC: 1,     // World Cup
      BL1: 78,   // Bundesliga
      DED: 88,   // Eredivisie
      BSA: 71,   // Brazil Serie A
      PD: 140,   // La Liga
      FL1: 61,   // Ligue 1
      ELC: 40,   // Championship
      PPL: 94,   // Primeira Liga
      EC: 4,     // Euro Championship
      SA: 135    // Serie A Italy
    };

    const leagueCode = (args[1] || "CL").toUpperCase();
    const leagueId = leagueMap[leagueCode];

    if (!leagueId) {
      return await sock.sendMessage(m.from, {
        text: `❌ Unknown league code: *${leagueCode}*\n\n✅ Available leagues:\n${Object.entries(leagueMap)
          .map(([code, id]) => `• ${code}`)
          .join("\n")}`
      }, { quoted: m });
    }

    // Get today’s date
    const today = new Date().toISOString().split("T")[0];

    // Fetch matches
    const API_KEY = "a3f7d73d569de1d62fb8147005347f79"; // your API-Football key
    const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&date=${today}`;

    const { data } = await axios.get(url, {
      headers: { "x-apisports-key": API_KEY }
    });

    const matches = data.response || [];

    if (matches.length === 0) {
      return await sock.sendMessage(m.from, {
        text: `⚠️ No matches found today for *${leagueCode}*.`
      }, { quoted: m });
    }

    let message = `📊 *${leagueCode} Matches Today:*\n\n`;

    matches.forEach(match => {
      const home = match.teams.home.name;
      const away = match.teams.away.name;
      const homeGoals = match.goals.home;
      const awayGoals = match.goals.away;
      const status = match.fixture.status;

      let statusText;
      if (status.short === "NS") {
        statusText = `🕒 ${new Date(match.fixture.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
      } else if (status.short === "FT") {
        statusText = "✅ Full Time";
      } else if (status.short === "LIVE" || status.short === "1H" || status.short === "2H") {
        statusText = `🔥 Live - ${status.elapsed}'`;
      } else {
        statusText = status.long;
      }

      message += `⚔️ *${home}* vs *${away}*\n` +
                 `📍 Score: ${homeGoals} - ${awayGoals}\n` +
                 `📌 Status: ${statusText}\n\n`;
    });

    await sock.sendMessage(m.from, { text: message.trim() }, { quoted: m });
    await m.React("✅");

  } catch (err) {
    console.error("[LIVE COMMAND ERROR]", err.response?.data || err.message);
    await sock.sendMessage(m.from, {
      text: "⚠️ Could not fetch live scores (API error)."
    }, { quoted: m });
    await m.React("⚠️");
  }
};

export default live;
