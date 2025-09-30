// src/scripts/ask-openai.js
const OpenAI = require("openai");
const { getApiKey } = require("./openai-config.js");

function requireKey() {
    const key = getApiKey();
    if (!key) throw new Error("Falta OPENAI_API_KEY (usa: npx smbm --ask set \"TU_CLAVE\")");
    return key;
}

async function askOnce({ prompt, model = "gpt-4o-mini" }) {
    const client = new OpenAI({ apiKey: requireKey() });
    const res = await client.responses.create({ model, input: prompt });
    return res.output_text;
}

async function askStream({ prompt, model = "gpt-4o-mini" }) {
    const client = new OpenAI({ apiKey: requireKey() });
    const stream = await client.responses.stream({ model, input: prompt });
    let full = "";
    stream.on("text.delta", (chunk) => { full += chunk; process.stdout.write(chunk); });
    await stream.finalMessage();
    return full;
}

module.exports = { askOnce, askStream };
