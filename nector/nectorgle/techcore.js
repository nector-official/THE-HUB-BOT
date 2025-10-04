import os from "os";
import config from "../../config.cjs";
import { performance } from "perf_hooks";

const techcoreCommand = async (m, Matrix) => {
  const command = m.body.startsWith(config.PREFIX)
    ? m.body.slice(config.PREFIX.length).split(" ")[0].toLowerCase()
    : "";

  if (!["techcore", "botinfo", "sysinfo"].includes(command)) return;

  await Matrix.sendMessage(m.from, { react: { text: "🧠", key: m.key } });

  // Stage 1: Boot sequence
  await Matrix.sendMessage(m.from, { text: "🧠 Activating neural circuits..." });
  await new Promise((r) => setTimeout(r, 800));

  await Matrix.sendMessage(m.from, { text: "⚙️ Scanning memory clusters..." });
  await new Promise((r) => setTimeout(r, 900));

  await Matrix.sendMessage(m.from, { text: "🔍 Synchronizing AI subroutines..." });
  await new Promise((r) => setTimeout(r, 1000));

  // Measure ping
  const start = performance.now();
  const pingTest = await Matrix.sendMessage(m.from, { text: "⏳ Running system diagnostics..." });
  const ping = (performance.now() - start).toFixed(0);

  // Gather system data
  const uptime = process.uptime();
  const uptimeH = Math.floor(uptime / 3600);
  const uptimeM = Math.floor((uptime % 3600) / 60);
  const usedMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
  const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);

  // Final Report
  const report = `
🧠 *TECHCORE SYSTEM ANALYSIS v3.9*

⚙️ *Bot Identity*
• Name: ${config.BOT_NAME || "Matrix AI"}
• Mode: Adaptive Intelligence
• Framework: Baileys 6.6.0

💻 *System Diagnostics*
• Ping: ${ping}ms
• Uptime: ${uptimeH}h ${uptimeM}m
• Memory Usage: ${usedMem}MB / ${totalMem}GB
• Commands Loaded: ~${Object.keys(require.cache).length}

🛰️ *Environment*
• Platform: ${os.platform()}
• Node.js: ${process.version}
• Host: ${os.hostname()}

🧩 *Core Modules*
• AI Engine: ✅ Active
• Command Parser: ✅ Stable
• Neural Sync: ⚡ Online

🧬 *Status Summary*
> Neural circuits stable.
> Energy levels optimal.
> Ready for higher reasoning tasks.

— *End of TechCore Report* —
`;

  await Matrix.sendMessage(m.from, { text: report }, { quoted: m });
};

export default techcoreCommand;
