// src/scripts/ensure-deps.js (CJS)
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

function run(cmd, args, opts = {}, onEvent) {
    return new Promise((resolve, reject) => {
        onEvent?.({ type: "exec:start", cmd, args });
        const child = spawn(cmd, args, {
            stdio: "inherit",             // dejamos que el gestor pinte su salida
            shell: process.platform === "win32",
            ...opts
        });
        child.on("exit", code => {
            onEvent?.({ type: "exec:end", code });
            code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} -> exit ${code}`));
        });
        child.on("error", (err) => { onEvent?.({ type: "exec:end", error: err }); reject(err); });
    });
}

async function ensureDeps({
                              cwd = process.cwd(),
                              pm,
                              dev = false,
                              batch = false,
                              onProgress
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
    ];

    onProgress?.({ type: "start", total: deps.length, deps });

    pm = pm || detectPM(cwd);
    onProgress?.({ type: "pm", pm });

    if (!exists(path.join(cwd, "package.json"))) {
        await run("npm", ["init", "-y"], { cwd }, onProgress);
        onProgress?.({ type: "init", created: true });
    }

    const toArgs = (pm, list, dev) => {
        if (pm === "npm")   return ["install", dev ? "-D" : "", ...list].filter(Boolean);
        if (pm === "yarn")  return ["add",    dev ? "-D" : "", ...list].filter(Boolean);
        if (pm === "pnpm")  return ["add",    dev ? "-D" : "", ...list].filter(Boolean);
        if (pm === "bun")   return ["add",    dev ? "-d" : "", ...list].filter(Boolean);
        throw new Error(`Gestor desconocido: ${pm}`);
    };

    if (batch) {
        await run(pm, toArgs(pm, deps, dev), { cwd }, onProgress);
        onProgress?.({ type: "dep", dep: "all", index: deps.length, total: deps.length, done: true });
    } else {
        for (let i = 0; i < deps.length; i++) {
            const dep = deps[i];
            onProgress?.({ type: "depStart", dep, index: i + 1, total: deps.length });
            await run(pm, toArgs(pm, [dep], dev), { cwd }, onProgress);
            onProgress?.({ type: "dep", dep, index: i + 1, total: deps.length });
        }
    }

    return { pm, deps, mode: batch ? "batch" : "sequential" };
}

module.exports = { ensureDeps, detectPM };
