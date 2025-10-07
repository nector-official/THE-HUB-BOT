const fetch = require('node-fetch');
const config = require('../config.cjs');

module.exports = async (Matrix, m) => {
    try {
        // Command detection
        const command = m.body.startsWith(config.PREFIX)
            ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
            : '';

        // Trigger words
        if (!['ss', 'ssweb', 'screenshot'].includes(command)) return;

        // React when command is detected
        await Matrix.sendMessage(m.from, { react: { text: '🕒', key: m.key } });

        // Extract the URL after the command
        const text = m.body.slice(config.PREFIX.length + command.length).trim();
        if (!text) {
            return await m.reply(
                `🖼️ *SCREENSHOT TOOL*\n\n` +
                `*.ss <url>*\n*.ssweb <url>*\n*.screenshot <url>*\n\n` +
                `Take a screenshot of any website.\n\n` +
                `*Example:*\n.ss https://google.com\n.ssweb https://google.com`
            );
        }

        // Validate URL
        if (!text.startsWith('http://') && !text.startsWith('https://')) {
            return await m.reply('❌ Please provide a valid URL starting with http:// or https://');
        }

        // Fetch screenshot from API
        const apiUrl = `https://api.siputzx.my.id/api/tools/ssweb?url=${encodeURIComponent(text)}&theme=light&device=desktop`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            await Matrix.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            return await m.reply(`🚫 Screenshot failed.\nAPI responded with status: ${response.status}`);
        }

        const imageBuffer = await response.buffer();

        // Send screenshot
        await Matrix.sendMessage(
            m.from,
            {
                image: imageBuffer,
                caption: `🖼️ Screenshot of: ${text}`
            },
            { quoted: m }
        );

        // React success
        await Matrix.sendMessage(m.from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('❌ Screenshot command error:', error);
        await Matrix.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        await m.reply(
            `❌ Failed to take screenshot. Please try again later.\n\n` +
            `*Possible reasons:*\n` +
            `• Invalid URL\n` +
            `• Website is blocking screenshots\n` +
            `• Website is down\n` +
            `• API service is temporarily unavailable`
        );
    }
};
