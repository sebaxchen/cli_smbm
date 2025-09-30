// src/scripts/ensure-env.js (CJS)
const fs = require("node:fs");
const path = require("node:path");

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeEnvFile(p, content, force) {
    if (fs.existsSync(p) && !force) return { path: p, created: false, skipped: true };
    fs.writeFileSync(p, content, "utf8");
    return { path: p, created: true, skipped: false };
}

function ensureGitignoreLines(cwd, lines) {
    const gi = path.join(cwd, ".gitignore");
    let current = "";
    if (fs.existsSync(gi)) current = fs.readFileSync(gi, "utf8");
    const missing = lines.filter(l => !current.split(/\r?\n/).includes(l));
    if (missing.length) {
        const next = (current ? current.replace(/\s*$/, "\n") : "") + missing.join("\n") + "\n";
        fs.writeFileSync(gi, next, "utf8");
        return { updated: true, added: missing };
    }
    return { updated: false, added: [] };
}

/**
 * Crea .env.developer y/o .env.production en `dir` (por defecto, raíz del proyecto).
 * Opcional: agrega reglas a .gitignore.
 */
function ensureEnv({
                       cwd = process.cwd(),
                       dir = ".",
                       makeDev = true,
                       makeProd = true,
                       force = false,
                       addGitignore = true,
                       pkg = {}
                   } = {}) {
    const targetDir = path.isAbsolute(dir) ? dir : path.join(cwd, dir);
    ensureDir(targetDir);

    const name = pkg.name || path.basename(cwd);

    const devContent = `# ${name} – desarrollo
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000
# JWT_SECRET=dev-secret
# DB_URL=postgres://user:pass@localhost:5432/dbname
`;
    const prodContent = `# ${name} – producción
NODE_ENV=production
PORT=8080
API_BASE_URL=https://api.tu-dominio.com
# JWT_SECRET=pon-un-secreto-fuerte
# DB_URL=postgres://user:pass@host:5432/dbname
`;

    const results = [];
    if (makeDev) {
        results.push(
            writeEnvFile(path.join(targetDir, ".env.developer"), devContent, force)
        );
    }
    if (makeProd) {
        results.push(
            writeEnvFile(path.join(targetDir, ".env.production"), prodContent, force)
        );
    }

    let gitignore = { updated: false, added: [] };
    if (addGitignore) {
        gitignore = ensureGitignoreLines(cwd, [
            ".env",
            ".env.*",
            "!.env.example"
        ]);
    }

    return { dir: targetDir, files: results, gitignore };
}

module.exports = { ensureEnv };
