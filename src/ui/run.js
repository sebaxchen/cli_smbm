// src/ui/run.js (CJS)
const { makeSpinner } = require("./spinner.js");
const { makeProgress } = require("./progress.js"); // si no lo usas, puedes quitarlo

function animationsEnabled({ cliArgs } = {}) {
    const has = f => (cliArgs || []).includes(f);
    return !has("--no-anim") && process.env.CI !== "true" && process.stdout.isTTY;
}

/**
 * Envuelve una operación con spinner.
 * API del callback: { progress(total, opts), update(txt), stop(), pause(), resume() }
 */
async function runWithSpinner(label, fn, { cliArgs = [], minMs = 300 } = {}) {
    const enabled = animationsEnabled({ cliArgs });
    let spinner = enabled ? makeSpinner(label).start() : null;
    const t0 = Date.now();

    let paused = false;
    const api = {
        progress(total, opts) { return enabled ? makeProgress(total, opts || { label }) : dummyProgress(); },
        update(txt) { if (spinner) spinner.update(txt); },
        stop() { if (spinner) spinner.stop(); },
        pause() {
            if (spinner && !paused) { spinner.stop(); process.stdout.write("\n"); paused = true; }
        },
        resume() {
            if (enabled && paused) { spinner = makeSpinner(label).start(); paused = false; }
        }
    };

    try {
        const res = await Promise.resolve(fn(api));
        const elapsed = Date.now() - t0;
        const wait = Math.max(0, minMs - elapsed);
        if (wait) await new Promise(r => setTimeout(r, wait));
        if (spinner) spinner.succeed(label); else console.log(`✔ ${label}`);
        return res;
    } catch (e) {
        if (spinner) spinner.fail(label); else console.error(`✖ ${label}`);
        throw e;
    }
}

function dummyProgress() { return { tick(){}, set(){}, done(){} }; }
module.exports = { runWithSpinner, animationsEnabled };
