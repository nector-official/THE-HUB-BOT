import { serialize, decodeJid } from '../../lib/Serializer.js';
import path from 'path';
import fs from 'fs/promises';
import config from '../../config.cjs';
import { smsg } from '../../lib/myfunc.cjs';
import { handleAntilink } from './antilink.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get group admins
export const getGroupAdmins = (participants) => {
    return participants.filter(p => p.admin === "superadmin" || p.admin === "admin").map(a => a.id);
};

const Handler = async (chatUpdate, sock, logger) => {
    try {
        // ❗ FIXED: Baileys no longer uses chatUpdate.type = 'notify'
        if (!chatUpdate.messages) return;
        
        const raw = chatUpdate.messages[0];
        if (!raw.message) return;

        const m = serialize(JSON.parse(JSON.stringify(raw)), sock, logger);

        // ------------------- MESSAGE BODY NORMALIZATION --------------------
        m.body =
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            m.message?.buttonsResponseMessage?.selectedButtonId ||
            m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            "";

        if (!m.body) return;

        // ------------------ GROUP INFO ------------------
        const participants = m.isGroup ? (await sock.groupMetadata(m.from)).participants : [];
        const groupAdmins = m.isGroup ? getGroupAdmins(participants) : [];
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        const isBotAdmins = m.isGroup ? groupAdmins.includes(botId) : false;
        const isAdmins = m.isGroup ? groupAdmins.includes(m.sender) : false;

        // ------------------ COMMAND DETECTION ------------------
        const PREFIX = /^[\\/!#.]/;
        const prefix = PREFIX.test(m.body) ? m.body[0] : config.PREFIX;
        const isCOMMAND = m.body.startsWith(prefix);
        const cmd = isCOMMAND ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";
        const text = m.body.slice(prefix.length + cmd.length).trim();

        // ------------------ AUTO STATUS VIEW ------------------
        if (m.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN) {
            await sock.readMessages([m.key]);
        }

        // --------------- OWNER CHECK ---------------
        const ownerJid = config.OWNER_NUMBER + "@s.whatsapp.net";
        const botJid = await sock.decodeJid(sock.user.id);
        const isCreator = m.sender === ownerJid;

        if (!sock.public && !isCreator) return;

        // ----------- ANTILINK ----------
        await handleAntilink(m, sock, logger, isBotAdmins, isAdmins, isCreator);

        console.log("MESSAGE:", m.body);

        // --------------- LOAD PLUGINS ----------------
        const pluginDir = path.join(__dirname, '..', 'nectorgle');
        const files = await fs.readdir(pluginDir);

        for (const file of files) {
            if (!file.endsWith('.js')) continue;

            try {
                const plugin = await import(`file://${path.join(pluginDir, file)}`);
                await plugin.default(m, sock);
            } catch (err) {
                console.error("❌ Plugin error:", file, err);
            }
        }

    } catch (e) {
        console.log("Handler Error:", e);
    }
};

export default Handler;
