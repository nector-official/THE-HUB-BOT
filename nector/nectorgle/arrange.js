import config from '../../config.cjs';

const arrangeCommand = async (m, Matrix) => {
  const prefix = config.PREFIX;
  const command = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(' ')[0].toLowerCase()
    : '';

  if (command === 'arrange') {
    let args = m.body.slice(prefix.length + command.length).trim();

    if (!args) {
      return m.reply(`❌ Please provide a list of names.\nExample: *${prefix}arrange 3 John, Mary, Peter, Alice*`);
    }

    // Check if first argument is a number (limit)
    let limit = null;
    let nameString = args;

    const firstArg = args.split(' ')[0];
    if (!isNaN(firstArg)) {
      limit = parseInt(firstArg);
      nameString = args.slice(firstArg.length).trim();
    }

    // Split names and clean spaces
    let people = nameString.split(',').map(name => name.trim()).filter(name => name.length > 0);

    if (people.length < 2) {
      return m.reply(`❌ You need at least 2 names to arrange.`);
    }

    // Shuffle array (Fisher–Yates algorithm)
    for (let i = people.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [people[i], people[j]] = [people[j], people[i]];
    }

    // If limit is set, cut to that length
    if (limit && limit > 0 && limit <= people.length) {
      people = people.slice(0, limit);
    }

    // Emoji decorations for ranking
    const rankEmojis = [
      '🥇', '🥈', '🥉', '✨', '🌟', '💫', '🔥', '🎯', '⚡', '🌈'
    ];

    // Build arranged list with emojis
    let arrangedList = people.map((name, index) => {
      let emoji = rankEmojis[index] || '🔹';
      return `${emoji} ${index + 1}. ${name}`;
    }).join('\n');

    await Matrix.sendMessage(m.from, {
      text: `🎲 *Random Arrangement:*\n\n${arrangedList}`,
      quoted: m // <-- makes bot reply to your message
    });
  }
};

export default arrangeCommand;
