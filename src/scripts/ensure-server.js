// src/scripts/ensure-server.js (CJS)
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const exists = p => { try { return fs.existsSync(p); } catch { return false; } };

function detectPM(cwd = process.cwd()) {
    if (exists(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
    if (exists(path.join(cwd, "yarn.lock")))      return "yarn";
    if (exists(path.join(cwd, "bun.lockb")))      return "bun";
    return "npm";
}

function run(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, {
            stdio: "inherit",
            shell: process.platform === "win32",
            ...opts
        });
        child.on("exit", code => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} -> exit ${code}`)));
        child.on("error", reject);
    });
}

function hasJsonServer(cwd = process.cwd()) {
    // chequeo local (node_modules)
    if (exists(path.join(cwd, "node_modules", "json-server", "package.json"))) return true;
    try { require.resolve("json-server", { paths: [cwd] }); return true; } catch { return false; }
}

function ensureDir(p) {
    if (!exists(p)) fs.mkdirSync(p, { recursive: true });
}

function writeFile(p, content, force) {
    if (exists(p) && !force) return { path: p, created: false, skipped: true };
    fs.writeFileSync(p, content, "utf8");
    return { path: p, created: true, skipped: false };
}

async function ensureServer({
                                cwd = process.cwd(),
                                dir = "server",
                                pm,
                                installIfMissing = true,
                                dev = true,           // instala json-server como devDependency
                                force = false,
                                onEvent               // callback de progreso
                            } = {}) {
    onEvent?.({ type: "start" });

    pm = pm || detectPM(cwd);
    onEvent?.({ type: "pm", pm });

    // Asegura package.json
    if (!exists(path.join(cwd, "package.json"))) {
        await run("npm", ["init", "-y"], { cwd });
        onEvent?.({ type: "pkginit" });
    }

    // Instala json-server si falta
    let installed = hasJsonServer(cwd);
    if (!installed && installIfMissing) {
        onEvent?.({ type: "install:start" });
        let args;
        if (pm === "npm")   args = ["install", dev ? "-D" : "", "json-server"].filter(Boolean);
        else if (pm === "yarn") args = ["add", dev ? "-D" : "", "json-server"].filter(Boolean);
        else if (pm === "pnpm") args = ["add", dev ? "-D" : "", "json-server"].filter(Boolean);
        else if (pm === "bun")  args = ["add", dev ? "-d" : "", "json-server"].filter(Boolean);
        else throw new Error(`Gestor no soportado: ${pm}`);
        await run(pm, args, { cwd });
        installed = true;
        onEvent?.({ type: "install:done" });
    }

    // Archivos del servidor
    const targetDir = path.isAbsolute(dir) ? dir : path.join(cwd, dir);
    ensureDir(targetDir);
    onEvent?.({ type: "dir", dir: targetDir });

    const files = [];
    // db.json vacío (JSON válido)
    files.push(writeFile(path.join(targetDir, "db.json"), `{}\n`, force));

    // routes.json con el mapeo solicitado
    files.push(writeFile(
        path.join(targetDir, "routes.json"),
        `{
  "/api/v1/*": "/$1"
}
`,
        force
    ));

    // start.sh con el comando
    files.push(writeFile(
        path.join(targetDir, "start.sh"),
        `#!/usr/bin/env sh
json-server --watch db.json --routes routes.json
`,
        force
    ));
    // opcional: marcar ejecutable en POSIX
    try { fs.chmodSync(path.join(targetDir, "start.sh"), 0o755); } catch {}

    onEvent?.({ type: "done", files, installed, pm, dir: targetDir });
    return { pm, installed, dir: targetDir, files };
}

module.exports = { ensureServer, detectPM };
