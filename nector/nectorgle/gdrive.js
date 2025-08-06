import config from '../../config.cjs';

const gdriveCommand = async (m, Matrix, { args, react, Replymk }) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'gdrive') return;

  await react(m, "✅️");

  if (!args.length || !args[0].includes("drive.google.com")) {
    return Replymk("📥 *Please provide a valid Google Drive URL.*\n\nExample: *gdrive https://drive.google.com/...*");
  }

  try {
    const gdriveUrl = args[0];
    const apiUrl = `https://api.nexoracle.com/downloader/gdrive?url=${encodeURIComponent(gdriveUrl)}&apikey=free_key@maher_apis`;
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (!data?.result?.downloadUrl) {
      return Replymk("❌ Unable to fetch the file. Make sure the Google Drive URL is accessible.");
    }

    const { downloadUrl, fileName, fileSize, mimetype } = data.result;
    const fileBuffer = await (await fetch(downloadUrl)).buffer();

    await Matrix.sendMessage(m.chat, {
      document: fileBuffer,
      mimetype,
      fileName,
      caption: `📥 *FILE DETAILS:*\n\n` +
               `🔖 *Name:* ${fileName}\n` +
               `📏 *Size:* ${fileSize}\n\n` +
               `> 💠 *Powered By ⓃⒺCⓉOR🍯*`
    }, { quoted: m });

  } catch (err) {
    console.error(err);
    return Replymk("❌ Failed to download from Google Drive. Please try again.");
  }
};

export default gdriveCommand;
