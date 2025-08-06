import fetch from 'node-fetch';
import config from '../../config.cjs';

const gitcloneCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (command !== 'gitclone') return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "📲", key: m.key } });

    if (!args) {
      return m.reply("❓ Where is the link?");
    }

    if (!args.includes('github.com')) {
      return m.reply("❌ Is that even a GitHub repo link?");
    }

    const regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i;
    const match = args.match(regex);

    if (!match) {
      return m.reply("❌ Invalid GitHub link format.");
    }

    let [, user, repo] = match;
    repo = repo.replace(/\.git$/, '');
    const zipUrl = `https://api.github.com/repos/${user}/${repo}/zipball`;

    const head = await fetch(zipUrl, { method: 'HEAD' });
    const disposition = head.headers.get('content-disposition');
    if (!disposition) return m.reply("❌ Failed to retrieve file info.");

    const filename = disposition.match(/attachment; filename=(.*)/)[1];

    await Matrix.sendMessage(m.from, {
      document: { url: zipUrl },
      fileName: filename + '.zip',
      mimetype: 'application/zip'
    }, { quoted: m });

  } catch (err) {
    console.error('[GitClone Error]', err.message);
    m.reply("❌ An error occurred while cloning the GitHub repo.");
  }
};

export default gitcloneCommand;
