// src/scripts/ensure-shared.js
const fs = require("node:fs");
const path = require("node:path");

function ensureDirReport(p) {
    const existed = fs.existsSync(p);
    if (!existed) fs.mkdirSync(p, { recursive: true });
    return { path: p, created: !existed, skipped: existed };
}

/**
 * Estructura:
 * <base>/<name>/
 *   ├─ infrastructure/
 *   └─ presentation/
 *       ├─ components/
 *       └─ views/
 */
async function ensureShared({
                                cwd = process.cwd(),
                                base = "src",
                                name = "shared"
                            } = {}) {
    const baseDir   = path.isAbsolute(base) ? base : path.join(cwd, base);
    const sharedDir = path.join(baseDir, name);
    const infraDir  = path.join(sharedDir, "infrastructure");
    const presDir   = path.join(sharedDir, "presentation");
    const compsDir  = path.join(presDir, "components");
    const viewsDir  = path.join(presDir, "views");

    const files = [];
    files.push(ensureDirReport(sharedDir));
    files.push(ensureDirReport(infraDir));
    files.push(ensureDirReport(presDir));
    files.push(ensureDirReport(compsDir));
    files.push(ensureDirReport(viewsDir));

    return { dir: sharedDir, files };
}

module.exports = { ensureShared };
