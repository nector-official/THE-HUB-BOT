import axios from 'axios';
import fs from 'fs';
import path from 'path';
import config from '../../config.cjs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const checkupdateCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'checkupdate') return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "✅", key: m.key } });
    await m.reply("🔍 Checking for new updates... Please wait.");

    const repoUrl = 'https://api.github.com/repos/nectorofficial/THE-HUB-BOT/commits/main';

    const response = await axios.get(repoUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const latestCommitHash = response.data.sha;

    // For ES modules (to resolve __dirname)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const commitFilePath = path.join(__dirname, 'current_commit.json');

    if (fs.existsSync(commitFilePath)) {
      const currentData = fs.readFileSync(commitFilePath, 'utf-8');
      const currentCommit = JSON.parse(currentData).commitHash;

      if (currentCommit !== latestCommitHash) {
        await m.reply("⚡️ *New update available!* A new version of the bot has been released.\nUse the `!update` command to fetch the latest changes.");
        fs.writeFileSync(commitFilePath, JSON.stringify({ commitHash: latestCommitHash }, null, 2));
      } else {
        await m.reply("✅ Your bot is up-to-date! No new updates available.");
      }
    } else {
      fs.writeFileSync(commitFilePath, JSON.stringify({ commitHash: latestCommitHash }, null, 2));
      await m.reply("✅ The bot is now set up to track updates. No updates available yet.");
    }

  } catch (err) {
    console.error('[CheckUpdate Error]', err.message);
    await m.reply("❌ *Error checking for updates!* Something went wrong.");
  }
};

export default checkupdateCommand;
