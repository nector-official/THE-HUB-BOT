import config from '../../config.cjs';
import axios from 'axios';

const epl = async (m, sock) => {
    const prefix = config.PREFIX;
    const cmd = m.body.startsWith(prefix)
        ? m.body.slice(prefix.length).split(" ")[0].toLowerCase()
        : '';
    if (cmd !== 'epl') return;

    await m.React("⚽");

    try {
        const API_KEY = '578d0a840ee047d5a5a7da7410c94bc4'; // Replace with your Football-Data API key
        const LEAGUE = '2026'; // EPL code for 2024/25 season may vary
        const today = new Date();
        const startDate = today.toISOString().split('T')[0];
        const endDateObj = new Date();
        endDateObj.setDate(today.getDate() + 7);
        const endDate = endDateObj.toISOString().split('T')[0];

        const url = `https://api.football-data.org/v4/competitions/${LEAGUE}/matches?dateFrom=${startDate}&dateTo=${endDate}`;
        const { data } = await axios.get(url, { headers: { 'X-Auth-Token': API_KEY } });

        if (!data.matches || data.matches.length === 0) {
            return await sock.sendMessage(m.from, { text: '⚠️ *Could not fetch EPL matches for this week.*' }, { quoted: m });
        }

        let message = '📅 *EPL Matches This Week:*\n\n';
        data.matches.forEach(match => {
            const home = match.homeTeam.name;
            const away = match.awayTeam.name;
            const date = new Date(match.utcDate).toLocaleString('en-GB', { timeZone: 'Europe/London', hour12: false });
            message += `⚽ ${home} vs ${away}\n🗓️ ${date}\n\n`;
        });

        await sock.sendMessage(m.from, { text: message }, { quoted: m });
        await m.React("✅");

    } catch (err) {
        console.error("[EPL Command Error]", err.message);
        await sock.sendMessage(m.from, { text: '⚠️ *Could not fetch EPL matches.*' }, { quoted: m });
        await m.React("⚠️");
    }
};

export default epl;
