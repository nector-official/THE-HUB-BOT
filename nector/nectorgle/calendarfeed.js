import config from "../../config.cjs";
import cron from "node-cron";
import axios from "axios";

const calendarFeed = async (m, Matrix) => {
  // ✅ MANUAL COMMAND MODE (.calendarfeed)
  const command = m?.body
    ?.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(" ")[0].toLowerCase()
    : "";

  if (["calendarfeed", "feed", "dailyupdate"].includes(command)) {
    await Matrix.sendMessage(m.from, { react: { text: "🕒", key: m.key } });
    await sendCalendarFeed(Matrix, m.from);
    return;
  }

  // ✅ AUTOMATIC MODE — runs daily at 6:00 AM Africa/Nairobi time
  cron.schedule(
    "0 6 * * *",
    async () => {
      await sendCalendarFeed(Matrix, config.OWNER_JID);
    },
    {
      timezone: "Africa/Nairobi",
    }
  );

  console.log("⏰ Calendar Feed scheduled for 6:00 AM Africa/Nairobi time");
};

// 💡 Function that fetches data and sends the daily feed
async function sendCalendarFeed(Matrix, to) {
  try {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-KE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // 💭 Quote
    const quoteRes = await axios.get(config.QUOTE_API);
    const quote = quoteRes.data[0]?.q + " — " + quoteRes.data[0]?.a;

    // 😂 Fact
    const factRes = await axios.get(config.FACT_API);
    const fact = factRes.data?.text;

    // 🌦️ Weather
    const weatherRes = await axios.get(config.WEATHER_API);
    const weather = weatherRes.data || "Weather data unavailable";

    // 🗓️ Next Kenyan Holiday
    const year = today.getFullYear();
    const holidayRes = await axios.get(`${config.HOLIDAY_API}/${year}/KE`);
    const upcoming = holidayRes.data.find((h) => new Date(h.date) > today);
    const nextHoliday = upcoming
      ? `${upcoming.localName} on ${upcoming.date}`
      : "No upcoming holidays soon.";

    // 📰 Trending News
    const newsRes = await axios.get(config.NEWS_API);
    const topNews =
      newsRes.data?.results?.[0]?.title ||
      "No trending news found at the moment.";

    // 🧾 Format Message
    const message = `
🌞 *Good Morning ⓃⒺCⓉOR🍯!*

🗓️ *Date:* ${dateStr}
🌤️ *Weather:* ${weather}
🇰🇪 *Next Holiday:* ${nextHoliday}
📰 *Trending News:* ${topNews}
💭 *Quote:* ${quote}
😂 *Fun Fact:* ${fact}

Have a bright and productive day ahead! 🚀
`;

    await Matrix.sendMessage(to, { text: message });
    console.log(`✅ Daily update sent to ${to}`);
  } catch (err) {
    console.error("❌ Error sending daily update:", err.message);
  }
}

export default calendarFeed;
