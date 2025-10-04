// session-detect.js  (debug only)
import axios from 'axios';
import config from '../../config.cjs';

const sessionDetect = async (m, Matrix) => {
  try {
    const command = m.body.startsWith(config.PREFIX)
      ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
      : '';
    if (!['sessiontest', 'pair'].includes(command)) return;

    const args = m.body.slice(config.PREFIX.length + command.length).trim();
    if (!args) return return m.reply('Usage: ' + config.PREFIX + command + ' <phone>');

    const phone = args.trim();
    const base = 'https://pair-nector-session.onrender.com';
    const candidates = [
      `/session/${phone}`,
      `/api/session?phone=${phone}`,
      `/gen?phone=${phone}`,
      `/create-session?phone=${phone}`,
      `/pair?phone=${phone}`,
      `/api/pair?number=${phone}`,
      `/api/pair?phone=${phone}`,
      `/pair/${phone}`,
      `/create/${phone}`,
      `/api/create?phone=${phone}`,
      `/v1/session?phone=${phone}`,
    ];

    await Matrix.sendMessage(m.from, { text: `🔎 Starting endpoint discovery against ${base} ...` });

    for (const path of candidates) {
      const url = base + path;
      console.log('[SessionDetect] Trying', url);
      try {
        const r = await axios.get(url, { timeout: 8000, validateStatus: () => true });
        console.log('[SessionDetect] Status', r.status, 'URL', url, 'Body:', r.data);
        // If status 200 and has code-like property
        if (r.status === 200 && r.data && (r.data.code || r.data?.result || r.data?.session)) {
          const code = r.data.code || r.data.result || r.data.session;
          await Matrix.sendMessage(m.from, {
            text: `✅ Found working endpoint:\nURL: ${url}\nStatus: ${r.status}\nReturned: ${JSON.stringify(r.data)}\n\nUse this path in your real session command.`
          }, { quoted: m });
          return;
        }
      } catch (innerErr) {
        console.warn('[SessionDetect] Error for', url, innerErr.message);
      }
      // small delay to avoid hammering
      await new Promise(r => setTimeout(r, 350));
    }

    await Matrix.sendMessage(m.from, { text: '❌ No working endpoint found in candidate list. Check render logs or give me the axios.get line from original code.' }, { quoted: m });

  } catch (err) {
    console.error('SessionDetect Error', err);
    await m.reply('Error running detection: ' + (err.message || err));
  }
};

export default sessionDetect;
