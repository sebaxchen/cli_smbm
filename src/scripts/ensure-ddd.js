// src/scripts/ensure-ddd.js (CJS)
const fs = require("node:fs");
const path = require("node:path");

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function toSafeName(s, def = "myFeature") {
    if (!s || typeof s !== "string") return def;
    return s.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function ensureDDD({
                       cwd = process.cwd(),
                       base = "src",
                       feature = "myFeature"
                   } = {}) {
    const feat = toSafeName(feature);
    const root = path.join(cwd, base, feat);

    const dirs = [
        "",                    // raíz de la feature
        "application",
        "domain",
        "domain/model",
        "infrastructure",
        "presentation",
        "presentation/components",
        "presentation/views"
    ].map(d => path.join(root, d));

    dirs.forEach(ensureDir);

    return { root, created: dirs };
}

module.exports = { ensureDDD };
