// src/scripts/ensure-deps.js (CJS)
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function exists(p) { try { return fs.existsSync(p); } catch { return false; } }

function detectPM(cwd = process.cwd()) {
    if (exists(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
    if (exists(path.join(cwd, "yarn.lock")))      return "yarn";
    if (exists(path.join(cwd, "bun.lockb")))      return "bun";
    return "npm";
}

// NO heredar stdout/err por defecto (para no interferir con la barra).
// Si --verbose, heredamos para ver logs en vivo.
function run(cmd, args, { cwd, verbose } = {}) {
    return new Promise((resolve, reject) => {
        const stdio = verbose ? "inherit" : ["ignore", "ignore", "ignore"];
        const child = spawn(cmd, args, { stdio, shell: process.platform === "win32", cwd });
        child.on("exit", code => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} -> exit ${code}`)));
        child.on("error", reject);
    });
}

async function ensureDeps({
                              cwd = process.cwd(),
                              pm,
                              dev = false,
                              batch = false,
                              verbose = false,
                              onProgress // (ev) => void
                          } = {}) {
    const deps = [
        "vue-i18n@11",
        "primeicons",
        "primevue",
        "@primeuix/themes",
        "pinia",
        "axios",
        "primeflex",
        "json-server",
        "vue-router@4",
    ];

    onProgress?.({ type: "start", total: deps.length, deps });

    pm = pm || detectPM(cwd);
    onProgress?.({ type: "pm", pm });

    // Asegura package.json
    const hasPkg = exists(path.join(cwd, "package.json"));
    if (!hasPkg) {
        await run("npm", ["init", "-y"], { cwd, verbose });
        onProgress?.({ type: "init" });
    }

    const toArgs = (pm, pkg, dev) => {
        if (pm === "npm")   return ["install", dev ? "-D" : "", pkg].filter(Boolean);
        if (pm === "yarn")  return ["add",    dev ? "-D" : "", pkg].filter(Boolean);
        if (pm === "pnpm")  return ["add",    dev ? "-D" : "", pkg].filter(Boolean);
        if (pm === "bun")   return ["add",    dev ? "-d" : "", pkg].filter(Boolean);
        throw new Error(`Gestor de paquetes desconocido: ${pm}`);
    };

    if (batch) {
        const base = (pm === "npm") ? ["install"] : (pm === "yarn" || pm === "pnpm") ? ["add"] : ["add"]; // bun
        const flag = (pm === "bun") ? (dev ? "-d" : "") : (dev ? "-D" : "");
        const args = [...base, flag, ...deps].filter(Boolean);
        onProgress?.({ type: "batchStart" });
        await run(pm, args, { cwd, verbose });
        onProgress?.({ type: "dep", dep: "all", index: deps.length, total: deps.length });
    } else {
        for (let i = 0; i < deps.length; i++) {
            const dep = deps[i];
            onProgress?.({ type: "depStart", dep, index: i + 1, total: deps.length });
            await run(pm, toArgs(pm, dep, dev), { cwd, verbose });
            onProgress?.({ type: "dep", dep, index: i + 1, total: deps.length });
        }
    }

    return { pm, deps, mode: batch ? "batch" : "sequential" };
}

module.exports = { ensureDeps, detectPM };
