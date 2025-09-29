import config from '../../config.cjs';

const fonts = async (m, sock) => {
  const prefix = config.PREFIX;
  const cmd = m.body.startsWith(prefix)
    ? m.body.slice(prefix.length).split(" ")[0].toLowerCase()
    : '';
  const args = m.body.trim().split(" ").slice(1);
  const text = args.join(" ");

  if (cmd !== "fonts") return;

  if (!text) {
    await sock.sendMessage(m.from, {
      text: `❌ *Please provide text to generate fonts!*\n💡 Try: *${prefix}fonts Hello World*`
    }, { quoted: m });
    return;
  }

  await m.React("✍️");

  try {
    // --- FONT VARIATIONS ---
    const styles = [
      { name: "Bold", fn: t => t.split("").map(c => c + "\u035F").join("") },
      { name: "Italic", fn: t => t.split("").map(c => c + "\u0336").join("") },
      { name: "Bubble", fn: t => t.replace(/[a-zA-Z]/g, c => String.fromCodePoint(c.toLowerCase().charCodeAt(0) + 0x1D400 - 65)) },
      { name: "Upside Down", fn: t => t.split("").reverse().map(c => upsideDownMap[c] || c).join("") },
      { name: "Square", fn: t => t.split("").map(c => squareMap[c] || c).join("") },
    ];

    let result = "╭───『 *🖋️ Font Generator* 』\n";
    styles.forEach(s => {
      result += `│ *${s.name}:*\n│ ${s.fn(text)}\n`;
    });
    result += "╰──────────────────────";

    await sock.sendMessage(m.from, { text: result }, { quoted: m });
    await m.React("✅");

  } catch (err) {
    console.error("[Fonts Command Error]", err.message);
    await sock.sendMessage(m.from, { text: "⚠️ *An error occurred generating fonts.*" }, { quoted: m });
    await m.React("⚠️");
  }
};

// --- Maps for special styles ---
const upsideDownMap = {
  a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ",
  i: "ᴉ", j: "ɾ", k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d",
  q: "b", r: "ɹ", s: "s", t: "ʇ", u: "n", v: "ʌ", w: "ʍ", x: "x",
  y: "ʎ", z: "z",
  A: "∀", B: "𐐒", C: "Ɔ", D: "◖", E: "Ǝ", F: "Ⅎ", G: "פ", H: "H",
  I: "I", J: "ſ", K: "⋊", L: "˥", M: "W", N: "N", O: "O", P: "Ԁ",
  Q: "Ὁ", R: "ᴚ", S: "S", T: "⊥", U: "∩", V: "Λ", W: "M", X: "X",
  Y: "⅄", Z: "Z",
  "0":"0","1":"Ɩ","2":"ᄅ","3":"Ɛ","4":"ㄣ","5":"ϛ","6":"9","7":"ㄥ","8":"8","9":"6",
};

const squareMap = {
  a:"🄰", b:"🄱", c:"🄲", d:"🄳", e:"🄴", f:"🄵", g:"🄶", h:"🄷", i:"🄸", j:"🄹", k:"🄺", l:"🄻", m:"🄼",
  n:"🄽", o:"🄾", p:"🄿", q:"🅀", r:"🅁", s:"🅂", t:"🅃", u:"🅄", v:"🅅", w:"🅆", x:"🅇", y:"🅈", z:"🅉",
  A:"🄰", B:"🄱", C:"🄲", D:"🄳", E:"🄴", F:"🄵", G:"🄶", H:"🄷", I:"🄸", J:"🄹", K:"🄺", L:"🄻", M:"🄼",
  N:"🄽", O:"🄾", P:"🄿", Q:"🅀", R:"🅁", S:"🅂", T:"🅃", U:"🅄", V:"🅅", W:"🅆", X:"🅇", Y:"🅈", Z:"🅉",
};

export default fonts;
