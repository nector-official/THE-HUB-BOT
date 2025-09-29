// fonts.js
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
    // Prepare the list of styles (name + transform function)
    const styles = [
      { name: "Bold", fn: mapToMath('bold') },
      { name: "Italic", fn: mapToMath('italic') },
      { name: "Bold Italic", fn: mapToMath('bolditalic') },
      { name: "Script", fn: mapToMath('script') },
      { name: "Fraktur", fn: mapToMath('fraktur') },
      { name: "Double-Struck", fn: mapToMath('double') },
      { name: "Monospace", fn: mapToMath('mono') },
      { name: "Circled (Bubble)", fn: circled },
      { name: "Small Caps", fn: smallCaps },
      { name: "Upside Down", fn: upsideDown },
      { name: "Zalgo", fn: zalgo },
      { name: "Spaced / Stacked", fn: spaced }
    ];

    // Send each font style as its own message
    for (const style of styles) {
      const transformed = style.fn(text);
      // Keep messages short — include name and the transformed text
      await sock.sendMessage(m.from, {
        text: `*${style.name}*\n${transformed}`
      }, { quoted: m });
    }

    await m.React("✅");
  } catch (err) {
    console.error("[Fonts Command Error]", err);
    await sock.sendMessage(m.from, { text: "⚠️ *An error occurred generating fonts.*" }, { quoted: m });
    await m.React("⚠️");
  }
};

export default fonts;

/* -----------------------
   Helper functions below
   ----------------------- */

/**
 * mapToMath(style)
 * Uses Unicode Mathematical Alphanumeric Symbols ranges where available.
 * Supported styles: 'bold','italic','bolditalic','script','fraktur','double','mono'
 * Returns a function that maps a string to that Unicode variant with fallback.
 */
function mapToMath(style) {
  // Offsets for A-Z and a-z (if available)
  // Each object: { upperStart: codepoint, lowerStart: codepoint }
  const ranges = {
    bold:          { upper: 0x1D400, lower: 0x1D41A },
    italic:        { upper: 0x1D434, lower: 0x1D44E },
    bolditalic:    { upper: 0x1D468, lower: 0x1D482 },
    script:        { upper: 0x1D49C, lower: 0x1D4B6 }, // some gaps exist
    fraktur:       { upper: 0x1D504, lower: 0x1D51E },
    double:        { upper: 0x1D538, lower: 0x1D552 },
    mono:          { upper: 0x1D670, lower: 0x1D68A },
  };

  const range = ranges[style];

  return (input) => {
    if (!range) return input;
    let out = "";
    for (const ch of input) {
      const code = ch.codePointAt(0);
      if (ch >= 'A' && ch <= 'Z') {
        const mapped = String.fromCodePoint(range.upper + (code - 65));
        out += mapped;
      } else if (ch >= 'a' && ch <= 'z') {
        const mapped = String.fromCodePoint(range.lower + (code - 97));
        out += mapped;
      } else if (ch >= '0' && ch <= '9' && style === 'double') {
        // Double-struck digits exist starting at U+1D7D8 ? (not consistent) - fallback to digits
        out += ch;
      } else {
        // leave punctuation/spaces/numbers as-is
        out += ch;
      }
    }
    return out;
  };
}

/* Circled / Bubble letters
   - Uses Unicode circled letters (A-Z: U+24B6; a-z: U+24D0)
   - Fallback to original char */
function circled(input) {
  let out = "";
  for (const ch of input) {
    if (ch >= 'A' && ch <= 'Z') {
      out += String.fromCodePoint(0x24B6 + (ch.charCodeAt(0) - 65)); // A->ⓐ uppercase circle variants
    } else if (ch >= 'a' && ch <= 'z') {
      out += String.fromCodePoint(0x24D0 + (ch.charCodeAt(0) - 97));
    } else if (ch === ' ') {
      out += ' ';
    } else {
      out += ch;
    }
  }
  return out;
}

/* Small caps mapping — uses available small-cap Unicode characters for many letters */
const smallCapsMap = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ',
  i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ',
  q: 'ϙ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x',
  y: 'ʏ', z: 'ᴢ',
  A: 'ᴀ', B: 'ʙ', C: 'ᴄ', D: 'ᴅ', E: 'ᴇ', F: 'ꜰ', G: 'ɢ', H: 'ʜ',
  I: 'ɪ', J: 'ᴊ', K: 'ᴋ', L: 'ʟ', M: 'ᴍ', N: 'ɴ', O: 'ᴏ', P: 'ᴘ',
  Q: 'ϙ', R: 'ʀ', S: 's', T: 'ᴛ', U: 'ᴜ', V: 'ᴠ', W: 'ᴡ', X: 'x',
  Y: 'ʏ', Z: 'ᴢ'
};
function smallCaps(input) {
  return input.split("").map(ch => smallCapsMap[ch] || ch).join("");
}

/* Spaced / Stacked style (adds spaces between characters) */
function spaced(input) {
  return input.split("").join(" ");
}

/* Upside-down mapping */
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
  ".":"˙", ",":"'", "?":"¿", "!":"¡", "\"":",", "'":",", "(" : ")", ")" : "(" , "[" : "]", "]" : "[", "{" : "}", "}" : "{", "<" : ">", ">" : "<", "_":"‾"
};
function upsideDown(input) {
  const transformed = input.split("").reverse().map(ch => upsideDownMap[ch] || upsideDownMap[ch.toLowerCase()] || ch).join("");
  return transformed;
}

/* Zalgo generator — combining characters above/below/mid */
const zalgoUp = [
  '\u030d','\u030e','\u0304','\u0305','\u033f','\u0311','\u0306','\u0310',
  '\u0352','\u0357','\u0351','\u0307','\u0308','\u030a','\u0342','\u0343',
  '\u0344','\u034a','\u034b','\u034c','\u0303','\u0302','\u030c','\u0350',
  '\u0300','\u0301','\u030b','\u030f','\u0312','\u0313','\u0314','\u033d',
  '\u0309','\u0363','\u0364','\u0365','\u0366','\u0367','\u0368','\u0369',
  '\u036a','\u036b','\u036c','\u036d','\u036e','\u036f','\u033e','\u035b',
  '\u0346','\u031a'
];
const zalgoDown = [
  '\u0316','\u0317','\u0318','\u0319','\u031c','\u031d','\u031e','\u031f',
  '\u0320','\u0324','\u0325','\u0326','\u0329','\u032a','\u032b','\u032c',
  '\u032d','\u032e','\u032f','\u0330','\u0331','\u0332','\u0333','\u0339',
  '\u033a','\u033b','\u033c','\u0345','\u0347','\u0348','\u0349','\u034d',
  '\u034e','\u0353','\u0354','\u0355','\u0356','\u0359','\u035a','\u0323'
];
const zalgoMid = [
  '\u0315','\u031b','\u0340','\u0341','\u0358','\u0321','\u0322','\u0327',
  '\u0328','\u0334','\u0335','\u0336','\u034f','\u035c','\u035d','\u035e',
  '\u035f','\u0360','\u0362','\u0338','\u0337','\u0361','\u0489'
];
function randChoice(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function zalgo(input) {
  // moderate intensity
  const upCount = 1, midCount = 1, downCount = 1;
  let out = "";
  for (const ch of input) {
    out += ch;
    for (let i=0; i < upCount; i++) out += randChoice(zalgoUp);
    for (let i=0; i < midCount; i++) out += randChoice(zalgoMid);
    for (let i=0; i < downCount; i++) out += randChoice(zalgoDown);
  }
  return out;
}

/* -----------------------
   End of helper functions
   ----------------------- */
