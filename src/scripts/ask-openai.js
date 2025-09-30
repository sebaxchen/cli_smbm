// src/scripts/ask-openai.js (CJS)
const OpenAI = require("openai");
const { getApiKey } = require("./openai-config.js");

function requireKey(key) {
    if (!key) throw new Error('Falta OPENAI_API_KEY (usa: npx smbm --ask set "TU_CLAVE")');
    return key;
}

async function askOnce({ prompt, model = "gpt-4o-mini", apiKey }) {
    const key = requireKey(getApiKey({ fallback: apiKey }) || apiKey);
    const client = new OpenAI({ apiKey: key });
    const res = await client.responses.create({ model, input: prompt });
    return res.output_text;
}

async function askStream({ prompt, model = "gpt-4o-mini", apiKey, onFirstToken } = {}) {
    const key = requireKey(getApiKey({ fallback: apiKey }) || apiKey);
    const client = new OpenAI({ apiKey: key });

    const stream = await client.responses.stream({ model, input: prompt });

    let first = true;
    stream.on("text.delta", (chunk) => {
        if (first && typeof onFirstToken === "function") { onFirstToken(); first = false; }
        process.stdout.write(chunk);
    });

    await stream.finalMessage();
}

module.exports = { askOnce, askStream };
