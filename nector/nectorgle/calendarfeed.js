import axios from "axios";
import cron from "node-cron";
import config from "../../config.cjs";

const calendarFeedCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(" ")[0].toLowerCase()
    : "";

  // ✅ Trigger manually with .calendarfeed
  if (!["calendarfeed"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "📰", key: m.key } });

  try {
    // 🌤 Weather (simple API)
    const weatherRes = await axios.get(config.WEATHER_API);
    const weather = weatherRes.data || "Weather data unavailable.";

    // 💭 Quote
    const quoteRes = await axios.get(config.QUOTE_API);
    const quote =
      quoteRes.data?.[0]?.q && quoteRes.data?.[0]?.a
        ? `"${quoteRes.data[0].q}" — ${quoteRes.data[0].a}`
        : "No quote available.";

    // 📰 News
    const newsRes = await axios.get(config.NEWS_API);
    const news = newsRes.data?.results?.slice(0, 3)
      ?.map((a, i) => `• ${a.title}`)
      ?.join("\n") || "No trending news at the moment.";

    // 🎉 Holiday check (Kenya)
    const year = new Date().getFullYear();
    const holidayRes = await axios.get(`${config.HOLIDAY_API}/${year}/KE`);
    const today = new Date().toISOString().split("T")[0];
    const todayHoliday =
      holidayRes.data.find((h) => h.date === today)?.localName ||
      "No public holiday today.";

    const message = `🗓️ *Daily Update Feed*\n━━━━━━━━━━━━━━━
🌤 *Weather:* ${weather}
🎉 *Today:* ${todayHoliday}
📰 *Top News:*\n${news}
💬 *Quote:* ${quote}
━━━━━━━━━━━━━━━
📅 *Time:* ${new Date().toLocaleString("en-KE", {
      timeZone: "Africa/Nairobi",
    })}`;

    await Matrix.sendMessage(m.from, { text: message }, { quoted: m });
  } catch (err) {
    console.error("CalendarFeed Error:", err);
    await m.reply("⚠️ *Error fetching data:* " + err.message);
  }
};

// ✅ Automatic scheduler (Kenya time)
cron.schedule(
  "0 6 * * *",
  async () => {
    try {
      const message = `🗓️ *Good Morning!* 🌅\nHere's your daily update:\n\nUse *.calendarfeed* anytime to get the latest updates manually.`;
      await Matrix.sendMessage(
        `${config.OWNER_NUMBER}@s.whatsapp.net`,
        { text: message }
      );
    } catch (e) {
      console.error("Auto CalendarFeed Error:", e.message);
    }
  },
  {
    timezone: "Africa/Nairobi",
  }
);

export default calendarFeedCommand;
