import axios from 'axios';
import config from '../../config.cjs';

const githubStalkCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (command !== 'githubstalk') return;

  if (!args) {
    return m.reply("❓ Please provide a GitHub username!\n\nExample: *.githubstalk drapterlagas*");
  }

  try {
    await Matrix.sendMessage(m.from, { react: { text: "👻", key: m.key } });

    const url = `https://simple-api.luxz.xyz/api/tools/githubstalk?user=${args}`;
    const { data } = await axios.get(url);

    if (!data.status) {
      return m.reply("❌ User not found!");
    }

    const {
      username, nickname, bio, id, nodeId, profile_pic, url: profileUrl, type, admin,
      company, blog, location, email, public_repo, public_gists, followers, following,
      ceated_at, updated_at
    } = data.result;

    let caption = `👨‍💻 *GitHub Profile Stalker*\n\n`;
    caption += `👤 *Username:* ${username}\n`;
    caption += `📛 *Nickname:* ${nickname || "-"}\n`;
    caption += `📜 *Bio:* ${bio || "-"}\n`;
    caption += `🆔 *ID:* ${id}\n`;
    caption += `🔗 *Node ID:* ${nodeId}\n`;
    caption += `🌐 *Profile:* ${profileUrl}\n`;
    caption += `📌 *Type:* ${type}\n`;
    caption += `🛠 *Admin:* ${admin ? "✅" : "❌"}\n`;
    caption += `🏢 *Company:* ${company || "-"}\n`;
    caption += `🔗 *Blog:* ${blog || "-"}\n`;
    caption += `📍 *Location:* ${location || "-"}\n`;
    caption += `📧 *Email:* ${email || "-"}\n`;
    caption += `📂 *Public Repos:* ${public_repo}\n`;
    caption += `📑 *Public Gists:* ${public_gists}\n`;
    caption += `👥 *Followers:* ${followers}\n`;
    caption += `👤 *Following:* ${following}\n`;
    caption += `📅 *Created At:* ${ceated_at}\n`;
    caption += `🔄 *Updated At:* ${updated_at}`;

    await Matrix.sendMessage(m.from, {
      image: { url: profile_pic },
      caption
    }, { quoted: m });

  } catch (err) {
    console.error('[GitHubStalk Error]', err.message);
    m.reply("❌ An error occurred while fetching data.");
  }
};

export default githubStalkCommand;
