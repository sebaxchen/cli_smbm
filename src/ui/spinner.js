// src/ui/spinner.js (CJS) — lindo, sin deps
const framesUnicode = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
const framesAscii   = ["-","\\","|","/"];

function isUnicodeOk() {
    // Si no hay TTY o Windows vieja, usa ASCII
    if (!process.stdout.isTTY) return false;
    const isWin = process.platform === "win32";
    if (isWin) return true; // PowerShell/Windows 10+ ok
    return true;
}

function makeSpinner(text = "Cargando…", { interval = 80, style = "unicode" } = {}) {
    const useUnicode = style === "unicode" ? isUnicodeOk() : false;
    const frames = useUnicode ? framesUnicode : framesAscii;
    let i = 0, timer = null, active = false, lastLen = 0;

    const write = (msg) => {
        process.stdout.write("\r" + msg + " ".repeat(Math.max(0, lastLen - msg.length)));
        lastLen = msg.length;
    };

    return {
        start(label = text) {
            if (active) return this;
            active = true;
            timer = setInterval(() => {
                const frame = frames[i = (i + 1) % frames.length];
                write(`${frame} ${label}`);
            }, interval);
            return this;
        },
        update(label) { if (active) write(`${frames[i]} ${label}`); return this; },
        succeed(msg = "Listo") { this.stop(); console.log(`✔ ${msg}`); return this; },
        fail(msg = "Error") { this.stop(); console.log(`✖ ${msg}`); return this; },
        stop() {
            if (timer) clearInterval(timer);
            timer = null; active = false; write(""); process.stdout.write("\r");
            return this;
        }
    };
}

module.exports = { makeSpinner };
