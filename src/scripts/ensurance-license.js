// scripts/ensurance-license.js (CJS)
const fs = require("node:fs");
const path = require("node:path");

function renderMIT({ year, author }) {
    return `MIT License

Copyright (c) ${year} ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

function renderISC({ year, author }) {
    return `ISC License

Copyright (c) ${year} ${author}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
`;
}

const TEMPLATES = { MIT: renderMIT, ISC: renderISC };

function ensureLicense({
                           cwd = process.cwd(),
                           type = "ISC",
                           author = "Autor",
                           year = new Date().getFullYear(),
                           out = "LICENSE.md",
                           force = false
                       } = {}) {
    const key = String(type).toUpperCase();
    const tpl = TEMPLATES[key] || TEMPLATES.ISC;
    const text = tpl({ year, author });
    const outPath = path.join(cwd, out);

    if (!force && fs.existsSync(outPath)) {
        const current = fs.readFileSync(outPath, "utf8").trim();
        if (current === text.trim()) {
            console.log("LICENSE.md ya está actualizado.");
            return outPath;
        }
    }
    fs.writeFileSync(outPath, text, "utf8");
    console.log(`LICENSE.md generado (${key}) en ${outPath}`);
    return outPath;
}

// Si el script se ejecuta directo: usa package.json para rellenar datos
if (require.main === module) {
    let pkg = {};
    try { pkg = JSON.parse(fs.readFileSync("package.json", "utf8")); } catch {}
    const author =
        typeof pkg.author === "string" ? pkg.author :
            (pkg.author && pkg.author.name) ? pkg.author.name :
                "Autor";
    const type = (pkg.license || "ISC").toUpperCase();

    ensureLicense({ type, author });
}

module.exports = { ensureLicense };
