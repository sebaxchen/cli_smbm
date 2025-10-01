// src/ui/progress.js (CJS)
// Barra discreta por pasos (makeProgress) y barra "suave" por % (makeSmoothProgress)

const ESC = "\x1b[";

function hideCursor(){ try{ process.stderr.write(ESC + "?25l"); }catch{} }
function showCursor(){ try{ process.stderr.write(ESC + "?25h"); }catch{} }
function eraseLine(){  try{ process.stderr.write("\r" + ESC + "2K"); }catch{} }

function drawLine(label, bar, pct){
    eraseLine();
    process.stderr.write(`${label} [${bar}] ${String(pct).padStart(3," ")}%`);
}

// Barra por pasos (N pasos conocidos). Avanza por tick().
function makeProgress(total, { width = 28, label = "Progreso" } = {}) {
    let current = 0;
    const render = () => {
        const ratio = Math.min(1, current / total);
        const filled = Math.round(ratio * width);
        const bar = "█".repeat(filled) + "░".repeat(width - filled);
        const pct = Math.round(ratio * 100);
        drawLine(label, bar, pct);
    };
    hideCursor(); render();
    return {
        tick(step = 1) { current += step; render(); if (current >= total) this.done(); },
        set(n) { current = n; render(); if (current >= total) this.done(); },
        done(msg = "Completado") { eraseLine(); showCursor(); process.stderr.write(`✔ ${msg}\n`); }
    };
}

// Barra "suave" por porcentaje. Avanza de 1 en 1 hasta target.
function makeSmoothProgress({ label = "Progreso", width = 28, stepMs = 35 } = {}) {
    let current = 0;
    let target  = 0;
    let timer   = null;
    function render() {
        const filled = Math.round((current / 100) * width);
        const bar = "█".repeat(filled) + "░".repeat(width - filled);
        drawLine(label, bar, current);
    }
    function start() {
        hideCursor();
        if (timer) return;
        timer = setInterval(() => {
            if (current < target) { current++; render(); }
        }, stepMs);
        render();
    }
    function to(pct) {
        target = Math.min(100, Math.max(target, Math.round(pct)));
    }
    function done(msg = "Completado") {
        target = 100;
        const fin = setInterval(() => {
            if (current < target) { current++; render(); }
            else {
                clearInterval(fin);
                if (timer) clearInterval(timer);
                timer = null;
                eraseLine(); showCursor(); process.stderr.write(`✔ ${msg}\n`);
            }
        }, stepMs);
    }
    start();
    return { to, done };
}

module.exports = { makeProgress, makeSmoothProgress };
