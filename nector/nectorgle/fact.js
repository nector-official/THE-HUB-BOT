import fetch from 'node-fetch';
import config from '../../config.cjs';

const factCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(' ')[0].toLowerCase()
    : '';

  if (command !== 'fact') return;

  try {
    await Matrix.sendMessage(m.from, { react: { text: "😑", key: m.key } });

    const res = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
    const data = await res.json();

    if (!data.text)
      return m.reply("❌ Couldn't fetch a fact.");

    m.reply(`💡 *Random Fact:*\n\n${data.text}`);
  } catch (err) {
    console.error(err);
    m.reply("❌ Failed to fetch fact.");
  }
};

export default factCommand;
                                               
