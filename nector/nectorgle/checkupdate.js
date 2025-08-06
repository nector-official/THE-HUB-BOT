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
    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });
    await m.reply("🔍 Checking for new updates...");

    const repoUrl = 'https://api.github.com/repos/nectorofficial/THE-HUB-BOT/commits/main';

    const response = await axios.get(repoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const latestCommitHash = response.data?.sha;
    if (!latestCommitHash) {
      return await m.reply("❌ GitHub API did not return a commit hash.");
    }

    const commitFilePath = './current_commit.json';
    let currentCommit = null;

    if (fs.existsSync(commitFilePath)) {
      const currentData = fs.readFileSync(commitFilePath, 'utf-8');
      currentCommit = JSON.parse(currentData).commitHash;
    }

    if (currentCommit !== latestCommitHash) {
      await m.reply("⚡️ *New update available!*\nUse the `!update` command to fetch the latest changes.");
    } else {
      await m.reply("✅ Your bot is up-to-date.");
    }

    fs.writeFileSync(commitFilePath, JSON.stringify({ commitHash: latestCommitHash }, null, 2));
  } catch (err) {
    // This sends the real error to WhatsApp
    await m.reply(`❌ *Error checking for updates!*\n\n*Reason:* ${err.message}`);
    console.error('[CheckUpdate Error]', err);
  }
};

export default checkupdateCommand;
