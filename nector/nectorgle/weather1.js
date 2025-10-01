import config from '../../config.cjs';
import axios from 'axios';

const weatherCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';
  const args = m.body.slice(config.PREFIX.length + command.length).trim();

  if (!["weather", "forecast", "wthr"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "☀️", key: m.key } });

  if (!args) {
    return m.reply(
      `🌍 *Please provide a location (city name).* Example:\n` +
      `\`${config.PREFIX}${command} Eldoret\``
    );
  }

  try {
    const apiKey = "51d6af2ae5834a5b11058fe7256af05d";

    // 1. Current weather
    const currUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(args)}&units=metric&appid=${apiKey}`;
    const currRes = await axios.get(currUrl);
    const curr = currRes.data;

    const name = curr.name;
    const country = curr.sys.country;
    const desc = curr.weather?.[0]?.description || "N/A";
    const temp = curr.main.temp;
    const feels = curr.main.feels_like;
    const humidity = curr.main.humidity;
    const wind = curr.wind.speed;
    const sunrise = new Date(curr.sys.sunrise * 1000).toLocaleTimeString("en-KE");
    const sunset = new Date(curr.sys.sunset * 1000).toLocaleTimeString("en-KE");

    // 2. Forecast (next 2 days from 5-day/3-hour API)
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(args)}&units=metric&appid=${apiKey}`;
    const forecastRes = await axios.get(forecastUrl);
    const forecast = forecastRes.data.list;

    // Pick tomorrow 12:00 and day after 12:00
    const tomorrow = forecast.find(f => f.dt_txt.includes("12:00:00"));
    const dayAfter = forecast.find(f => {
      const date = new Date(f.dt * 1000);
      return f.dt_txt.includes("12:00:00") && date.getDate() > new Date().getDate() + 1;
    });

    let reply = `🌍 *Weather for ${name}, ${country}*\n\n` +
      `☀️ *Current*: ${desc}\n` +
      `🌡 Temp: *${temp}°C* (feels like *${feels}°C*)\n` +
      `💧 Humidity: *${humidity}%*\n` +
      `💨 Wind: *${wind} m/s*\n` +
      `🌅 Sunrise: ${sunrise}\n` +
      `🌇 Sunset: ${sunset}\n\n`;

    if (tomorrow) {
      reply += `📅 *Tomorrow*: ${tomorrow.weather[0].main}, Temp: *${tomorrow.main.temp}°C*\n`;
    }
    if (dayAfter) {
      reply += `📅 *Day After*: ${dayAfter.weather[0].main}, Temp: *${dayAfter.main.temp}°C*`;
    }

    await m.reply(reply);

  } catch (err) {
    console.error("[WEATHER ERROR]", err.response?.data || err.message);
    m.reply("❌ *Could not fetch weather/forecast. Check logs for details.*");
  }
};

export default weatherCommand;
