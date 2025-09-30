// src/ui/progress.js (CJS)
function makeProgress(total, { width = 24, label = "Progreso" } = {}) {
    let current = 0;
    const draw = () => {
        const ratio = Math.min(1, current / total);
        const filled = Math.round(ratio * width);
        const bar = "█".repeat(filled) + "░".repeat(width - filled);
        const pct = (ratio * 100).toFixed(0).padStart(3, " ");
        process.stdout.write(`\r${label} [${bar}] ${pct}%`);
    };
    return {
        tick(step = 1) { current += step; draw(); if (current >= total) this.done(); },
        set(n) { current = n; draw(); if (current >= total) this.done(); },
        done(msg = "Completado") { process.stdout.write(`\n✔ ${msg}\n`); }
    };
}
module.exports = { makeProgress };
