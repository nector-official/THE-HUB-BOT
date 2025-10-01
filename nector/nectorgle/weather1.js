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

    // 1. Geocoding to get coordinates
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(args)}&limit=1&appid=${apiKey}`;
    const geoRes = await axios.get(geoUrl);

    if (!geoRes.data.length) {
      return m.reply("❌ *Location not found. Try another city.*");
    }

    const { lat, lon, name, country } = geoRes.data[0];

    // 2. Weather with One Call v2.5
    const weatherUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    const res = await axios.get(weatherUrl);
    const data = res.data;

    // Current weather
    const current = data.current;
    const currDesc = current.weather?.[0]?.description || "N/A";
    const currTemp = current.temp;
    const feels = current.feels_like;
    const humidity = current.humidity;
    const wind = current.wind_speed;
    const sunrise = new Date(current.sunrise * 1000).toLocaleTimeString("en-KE");
    const sunset = new Date(current.sunset * 1000).toLocaleTimeString("en-KE");

    // Forecast: today + tomorrow
    const today = data.daily[0];
    const tomorrow = data.daily[1];

    const todayDesc = today.weather?.[0]?.main || "N/A";
    const todayMin = today.temp.min;
    const todayMax = today.temp.max;

    const tomDesc = tomorrow.weather?.[0]?.main || "N/A";
    const tomMin = tomorrow.temp.min;
    const tomMax = tomorrow.temp.max;

    const replyMsg =
      `🌍 *Weather for ${name}, ${country}*\n\n` +
      `☀️ *Current*: ${currDesc}\n` +
      `🌡 Temp: *${currTemp}°C* (feels like *${feels}°C*)\n` +
      `💧 Humidity: *${humidity}%*\n` +
      `💨 Wind: *${wind} m/s*\n` +
      `🌅 Sunrise: ${sunrise}\n` +
      `🌇 Sunset: ${sunset}\n\n` +
      `📅 *Today*: ${todayDesc}, Min: *${todayMin}°C*, Max: *${todayMax}°C*\n` +
      `📅 *Tomorrow*: ${tomDesc}, Min: *${tomMin}°C*, Max: *${tomMax}°C*`;

    await m.reply(replyMsg);

  } catch (err) {
    console.error("[WEATHER ERROR]", err.response?.data || err.message);
    m.reply("❌ *Could not fetch weather/forecast. Check logs for details.*");
  }
};

export default weatherCommand;
