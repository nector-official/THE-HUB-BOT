import axios from "axios";
import cron from "node-cron";
import config from "../../config.cjs";

const calendarFeedCommand = async (m, Matrix) => {
  const command = m?.body?.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(" ")[0].toLowerCase()
    : "";

  // ✅ Manual trigger
  if (!["calendarfeed"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "📰", key: m.key } });

  const message = await buildCalendarFeed();
  await Matrix.sendMessage(m.from, { text: message }, { quoted: m });
};

// ✅ Function to build the feed
async function buildCalendarFeed() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let weather = "Unavailable";
  let quote = "Unavailable";
  let news = "No Kenyan news available.";
  let holiday = "No public holiday today.";
  let fact = "No fact available.";

  // 🌤 Weather
  try {
    const res = await axios.get(config.WEATHER_API);
    weather = res.data || weather;
  } catch (err) {
    console.error("Weather API Error:", err.message);
  }

  // 💭 Quote
  try {
    const res = await axios.get(config.QUOTE_API);
    if (res.data?.[0]?.q && res.data?.[0]?.a) {
      quote = `"${res.data[0].q}" — ${res.data[0].a}`;
    }
  } catch (err) {
    console.error("Quote API Error:", err.message);
  }

  // 📰 Kenyan News (filtered + clickable)
  try {
    const res = await axios.get(config.NEWS_API);
    const articles = res.data?.results || [];
    const filtered = articles.filter(
      (a) =>
        a.title &&
        a.link &&
        !/bet|celebrity|gossip|football|entertainment|transfer/i.test(a.title)
    );

    if (filtered.length > 0) {
      news = filtered
        .slice(0, 3)
        .map((a, i) => `• [${a.title}](${a.link})`)
        .join("\n");
    }
  } catch (err) {
    console.error("News API Error:", err.message);
  }

  // 🎉 Holiday (Kenya)
  try {
    const year = today.getFullYear();
    const res = await axios.get(`${config.HOLIDAY_API}/${year}/KE`);
    const todayISO = today.toISOString().split("T")[0];
    holiday = res.data.find((h) => h.date === todayISO)?.localName || holiday;
  } catch (err) {
    console.error("Holiday API Error:", err.message);
  }

  // 😂 Fun Fact
  try {
    const res = await axios.get(config.FACT_API);
    fact = res.data?.text || fact;
  } catch (err) {
    console.error("Fact API Error:", err.message);
  }

  // 🗓️ Final message
  const message = `
🗓️ *Daily Update Feed*
━━━━━━━━━━━━━━
📅 *Date:* ${dateStr}
🌤️ *Weather:* ${weather}
🎉 *Holiday Today:* ${holiday}
📰 *Top Kenyan News:*
${news}

💬 *Quote:* ${quote}
😂 *Fun Fact:* ${fact}
━━━━━━━━━━━━━━
`;

  return message;
}

// ✅ Automatic 6 AM schedule (Kenya time)
cron.schedule(
  "0 6 * * *",
  async () => {
    try {
      const message = await buildCalendarFeed();
      await Matrix.sendMessage(config.OWNER_JID, { text: message });
      console.log("✅ Daily calendar feed sent at 6 AM Africa/Nairobi time");
    } catch (err) {
      console.error("Auto CalendarFeed Error:", err.message);
    }
  },
  { timezone: "Africa/Nairobi" }
);

export default calendarFeedCommand;
