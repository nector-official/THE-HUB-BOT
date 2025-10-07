const fetch = require('node-fetch');
const config = require('../../config.cjs'); // Adjust path if needed

module.exports = {
  name: 'ss',
  alias: ['ssweb', 'screenshot'],
  category: 'tools',
  desc: 'Takes a screenshot of any website.',
  async run(m, Matrix) {
    try {
      // Extract command arguments
      const text = m.body.slice(config.PREFIX.length).trim().split(/ +/).slice(1).join(' ');
      const url = text?.trim();

      // No URL provided
      if (!url) {
        return await m.reply(
          `*🖼️ SCREENSHOT TOOL*\n\n` +
          `*.ss <url>*\n*.ssweb <url>*\n*.screenshot <url>*\n\n` +
          `Take a screenshot of any website.\n\nExample:\n` +
          `.ss https://google.com\n.ssweb https://google.com\n.screenshot https://google.com`
        );
      }

      // Validate URL format
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return await m.reply('❌ Please provide a valid URL starting with http:// or https://');
      }

      // React while processing
      await Matrix.sendMessage(m.from, { react: { text: '🕒', key: m.key } });

      // Build API request
      const apiUrl = `https://api.siputzx.my.id/api/tools/ssweb?url=${encodeURIComponent(url)}&theme=light&device=desktop`;

      const response = await fetch(apiUrl, { headers: { 'accept': '*/*' } });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const imageBuffer = await response.buffer();

      // Send screenshot image
      await Matrix.sendMessage(m.from, {
        image: imageBuffer,
        caption: `🖼️ Screenshot of: ${url}`
      }, { quoted: m });

      // Success reaction
      await Matrix.sendMessage(m.from, { react: { text: '✅', key: m.key } });

    } catch (error) {
      console.error('❌ Error in ss command:', error);
      await m.reply(
        '❌ Failed to take screenshot. Please try again in a few minutes.\n\n' +
        'Possible reasons:\n' +
        '• Invalid URL\n' +
        '• Website is blocking screenshots\n' +
        '• Website is down\n' +
        '• API service is temporarily unavailable'
      );
      await Matrix.sendMessage(m.from, { react: { text: '❌', key: m.key } });
    }
  }
};
