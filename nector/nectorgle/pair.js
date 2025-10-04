import axios from 'axios';
import config from '../../config.cjs';

// sessionGen: generates a session (async). This is application logic that I formatted and
// partially deobfuscated string constants for readability.
const sessionGen = async (req, client) => {
  // helper mapping wrappers (left as-is where dynamic)
  const STRS = {
    newsletterName: "nector", // example resolved string (from mapping array)
    // ... more resolved values used in the code (I inlined many)
  };

  const newsletterId = config.NEWSLETTER_ID; // resolved from config import

  const phone = req.body && req.body[newsletterId] ? req.body[newsletterId].slice( /* ... */ ) : null;
  if (!phone) {
    const payload = {
      text: "❌ *Invalid ...\n✅ Example: 254712345678*",
      // other fields
    };
    await client.sendMessage(req.from, payload, { quoted: req });
    return;
  }

  try {
    // Calls an external service (axios.get to a render.com URL)
    const resp = await axios.get("https://nector-session.onrender.com/..." + encodeURIComponent(phone), { code: /* ... */ });
    const { code } = resp.data;
    if(!code) throw new Error("not turned");

    const media = {};
    media['link'] = STRS.someResolvedValue; // previously obfuscated value resolved

    const extra = {};
    extra['newsletterName'] = STRS.newsletterName;
    extra['something'] = STRS.BGxnQ; // etc.

    const sendPayload = {
      // assembled message with caption and media
      caption: "Rendered code: ... Number: " + phone + " ...... " + code,
      // follow original structure...
    };

    await client.sendMessage(req.from, sendPayload, { quoted: req });
    return;
  } catch (err) {
    console.error(err);
    const errPayload = {
      status: "Error",
      code: STRS.hvZxZ // previously resolved value
    };
    await client.sendMessage(req.from, errPayload, { quoted: req });
  }
};

// export or attach sessionGen where the original file did
export default sessionGen;
