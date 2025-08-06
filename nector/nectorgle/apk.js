import config from '../../config.cjs';

const apkCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'apk') return;

  const args = m.body.slice(config.PREFIX.length + command.length).trim().split(' ');
  const appName = encodeURIComponent(args.join(' '));

  await Matrix.sendMessage(m.from, { react: { text: "📦", key: m.key } });

  if (!args.length) {
    return m.reply("📦 *Please provide an app name to search.*\n\nExample: *apk WhatsApp*");
  }

  const sendApkDetails = async (data) => {
    const { name, icon, package: pkg, lastup, size, dllink } = data;
    const apkBuffer = await (await fetch(dllink)).buffer();

    await Matrix.sendMessage(m.chat, {
      image: { url: icon },
      caption: `📲 *Found App:* ${name}\n⏳ *Downloading APK...*`,
      contextInfo: { mentionedJid: [m.sender] }
    }, { quoted: m });

    return Matrix.sendMessage(m.chat, {
      document: apkBuffer,
      mimetype: 'application/vnd.android.package-archive',
      fileName: `${name}.apk`,
      caption: `📦 *APK DETAILS:*\n\n🔖 *Name:* ${name}\n📦 *Package:* ${pkg}\n📅 *Last Updated:* ${lastup}\n📏 *Size:* ${size}\n\n💠 *Powered by: Malvin King*`,
      contextInfo: { mentionedJid: [m.sender] }
    }, { quoted: m });
  };

  try {
    await m.reply(`🔍 *Searching for "${args.join(" ")}"...*\nPlease wait.`);

    // Try Aptoide API first
    const aptoideApi = `http://ws75.aptoide.com/api/7/apps/search/query=${appName}/limit=1`;
    const aptoideRes = await fetch(aptoideApi);
    const aptoideJson = await aptoideRes.json();

    if (aptoideJson?.list?.length) {
      const app = aptoideJson.list[0];
      if (app?.file?.path) return sendApkDetails(app);
    }

    // Fallback: NexOracle API
    const fallbackApi = `https://api.nexoracle.com/downloader/apk?q=${appName}&apikey=free_key@maher_apis`;
    const fallbackRes = await fetch(fallbackApi);
    const fallbackData = await fallbackRes.json();

    if (!fallbackData?.status === 200 || !fallbackData.result?.dllink) {
      return m.reply("❌ No APK found from either source. Try a different app name.");
    }

    return sendApkDetails(fallbackData.result);

  } catch (err) {
    console.error("[APK Command Error]", err);
    return m.reply("❌ Failed to download the APK. Please try again later.");
  }
};

export default apkCommand;
