
// settings.js - Cleaned and structured

import moment from "moment-timezone";
import fs from "fs";
import os from "os";
import baileys from "@whiskeysockets/baileys";
import config from "../../config.cjs";

const { generateWAMessageFromContent, proto } = baileys;

// Bot Settings
const settings = {
  botName: "THE-HUB",
  botMode: "PUBLIC", // PUBLIC | PRIVATE
  owner: {
    name: "ⓃⒺCⓉOR🍯",
    number: "254725474072"
  },
  autoread: true,
  autotyping: true,
  autosticker: true,
  autoblock: false,
  autorecording: true,
  antidelete: true,
  antilink: false,
  chatBotMode: "disabled", // enabled | disabled
  workMode: "active" // active | inactive
};

// Helper function (example: formatting timestamps)
function getFormattedTime() {
  return moment().tz("Africa/Nairobi").format("HH:mm:ss");
}

// Example startup log
console.log("Good Evening 🌃");
console.log(`Bot Name: ${settings.botName}`);
console.log(`Owner: ${settings.owner.name}`);
console.log(`Mode: ${settings.botMode}`);
console.log(`Autoread: ${settings.autoread}`);
console.log(`Autotyping: ${settings.autotyping}`);
console.log(`Antidelete: ${settings.antidelete}`);

export default settings;

