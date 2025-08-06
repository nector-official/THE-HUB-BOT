import axios from 'axios';
import fs from 'fs';
import path from 'path';
import config from '../../config.cjs';

const checkupdateCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'checkupdate') return;

  try {
    console.log('[CheckUpdate] Started...');
    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });
    await m.reply("🔍 Checking for new updates... Please wait...");

    const repoUrl = 'https://api.github.com/repos/nectorofficial/THE-HUB-BOT/commits/main';

    const response = await axios.get(repoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const latestCommitHash = response.data.sha;
    console.log('[CheckUpdate] Latest commit:', latestCommitHash);

    const commitFilePath = './current_commit.json';

    let currentCommit = null;

    if (fs.existsSync(commitFilePath)) {
      const currentData = fs.readFileSync(commitFilePath, 'utf-8');
      currentCommit = JSON.parse(currentData).commitHash;
      console.log('[CheckUpdate] Current commit from file:', currentCommit);
    }

    if (currentCommit !== latestCommitHash) {
      await m.reply("⚡️ *New update available!*\nUse the `!update` command to fetch the latest changes.");
    } else {
      await m.reply("✅ Your bot is up-to-date! No new updates available.");
    }

    fs.writeFileSync(commitFilePath, JSON.stringify({ commitHash: latestCommitHash }, null, 2));
    console.log('[CheckUpdate] Commit hash saved to file.');

  } catch (err) {
    console.error('[CheckUpdate Error]', err);
    await m.reply("❌ *Error checking for updates!* Please check logs.");
  }
};

export default checkupdateCommand;
