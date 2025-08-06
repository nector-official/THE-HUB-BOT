import config from '../../config.cjs';

const mediafireCommand = async (m, Matrix, { args, react, Replymk }) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  if (!['mediafire', 'mfire'].includes(command)) return;

  await react(m, "✅️");

  if (!args.length) {
    return Replymk("Please provide a valid MediaFire URL.\n\nExample: *mfire https://www.mediafire.com/file/xyz.apk*");
  }

  try {
    const mediafireUrl = args[0];
    const apiUrl = `https://www.dark-yasiya-api.site/download/mfire?url=${encodeURIComponent(mediafireUrl)}`;
    const res = await fetch(apiUrl);
    const json = await res.json();

    if (!json || !json.result || !json.result.url) {
      return Replymk("❌ Failed to fetch download link. Please make sure the MediaFire URL is valid.");
    }

    const { url, filename, mime, filesize, filesizeH } = json.result;

    await Replymk(`📦 *APK DETAILS:*\n\n` +
      `*File:* ${filename}\n` +
      `*Size:* ${filesizeH || filesize}\n` +
      `*Type:* ${mime}\n\n` +
      `📥 *Sending file, please wait...*`);

    await Matrix.sendMessage(m.chat, {
      document: { url },
      mimetype: mime,
      fileName: filename
    }, { quoted: m });

  } catch (err) {
    console.error(err);
    return Replymk("❌ Error while fetching or sending the APK.");
  }
};

export default mediafireCommand;
