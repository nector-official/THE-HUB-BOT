import config from "../../config.cjs";
import axios from "axios";

// Helper to convert UTC to Nairobi time
const formatTime = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleTimeString("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper to get emoji based on weather condition
const getWeatherEmoji = (main) => {
  switch (main.toLowerCase()) {
    case "clear": return "☀️";
    case "clouds": return "☁️";
    case "rain": return "🌧️";
    case "drizzle": return "🌦️";
    case "thunderstorm": return "⛈️";
    case "snow": return "❄️";
    case "mist": case "fog": return "🌫️";
    default: return "🌍";
  }
};

const weatherCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(" ")[0].toLowerCase()
    : "";
  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (!["weather", "forecast"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "⛅", key: m.key } });

  if (!args) {
    return m.reply(
      `🌍 *Please provide a city name.*\n\nExample:\n${config.PREFIX}weather Eldoret\n${config.PREFIX}forecast Nairobi`
    );
  }

  const apiKey = "51d6af2ae5834a5b11058fe7256af05d";

  try {
    if (command === "weather") {
      const res = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          args
        )}&appid=${apiKey}&units=metric`
      );

      const data = res.data;
      const weather = data.weather[0];
      const emoji = getWeatherEmoji(weather.main);

      const reply = `🌦️ *Weather in ${data.name}, ${data.sys.country}*\n
${emoji} Condition: ${weather.description}
🌡️ Temperature: ${data.main.temp}°C (Feels like ${data.main.feels_like}°C)
💧 Humidity: ${data.main.humidity}%
🌬️ Wind: ${data.wind.speed} m/s
🌅 Sunrise: ${formatTime(data.sys.sunrise)}
🌇 Sunset: ${formatTime(data.sys.sunset)}`;

      await m.reply(reply);

    } else if (command === "forecast") {
      const res = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
          args
        )}&appid=${apiKey}&units=metric`
      );

      const data = res.data;

      // Take forecast at 12:00 local time (UTC+3) for next 3 days
      const forecastList = data.list.filter((item) =>
        item.dt_txt.includes("12:00:00")
      ).slice(0, 3);

      let forecastText = `📅 *3-Day Forecast for ${data.city.name}, ${data.city.country}*\n\n`;

      for (const item of forecastList) {
        const date = new Date(item.dt * 1000).toLocaleDateString("en-KE", {
          weekday: "long",
          day: "numeric",
          month: "short",
          timeZone: "Africa/Nairobi",
        });
        const emoji = getWeatherEmoji(item.weather[0].main);

        forecastText += `📌 *${date}*\n${emoji} ${item.weather[0].description}\n🌡️ Temp: ${item.main.temp}°C\n💧 Humidity: ${item.main.humidity}%\n\n`;
      }

      await m.reply(forecastText);
    }
  } catch (err) {
    console.error("[WEATHER ERROR]", err.message);
    m.reply("❌ *Could not fetch weather/forecast. Check logs for details.*");
  }
};

export default weatherCommand;
