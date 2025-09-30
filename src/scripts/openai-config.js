// src/scripts/openai-config.js
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const CONFIG_DIR = path.join(os.homedir(), ".smbm");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

function readConfig() {
    try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); }
    catch { return {}; }
}
function writeConfig(obj) {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(obj, null, 2), "utf8");
}
function setApiKey(key) {
    const cfg = readConfig();
    cfg.OPENAI_API_KEY = key;
    writeConfig(cfg);
    return CONFIG_PATH;
}
function getApiKey() {
    return process.env.OPENAI_API_KEY || readConfig().OPENAI_API_KEY || null;
}

module.exports = { setApiKey, getApiKey, CONFIG_PATH };
