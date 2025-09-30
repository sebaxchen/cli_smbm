#!/usr/bin/env node
const fs = require("node:fs");
const { ensureLicense } = require("./scripts/ensurance-license.js");
const { ensureDocs }    = require("./scripts/ensure-docs.js");
const { ensureDDD }     = require("./scripts/ensure-ddd.js");
const { ensureEnv }     = require("./scripts/ensure-env.js"); // ⬅️ NUEVO

const args = process.argv.slice(2);
const has = f => args.includes(f);
const get = (k, d) => { const i = args.findIndex(a => a === `--${k}`); return i !== -1 ? args[i + 1] : d; };
// valor posicional justo después de una flag
const nextAfter = flag => {
    const i = args.indexOf(flag);
    if (i !== -1) {
        const v = args[i + 1];
        if (v && !v.startsWith("--")) return v;
    }
    return undefined;
};

if (has("-h") || has("--help")) {
    console.log(`smbm – utilidades
Uso:
  npx smbm --l   [--type ISC|MIT] [--author "Nombre"] [--year 2025] [--out LICENSE.md] [--force]
  npx smbm --d   [--dir docs] [--stories user-stories.md] [--diagram diagrama.puml] [--force]
  npx smbm --ddd [<FeatureName>] [--name <FeatureName>] [--base src]
  npx smbm --env [dev|prod|all] [--dir .] [--force] [--no-ignore]

Ejemplos:
  npx smbm --ddd auth
  npx smbm --ddd --name users
  npx smbm --ddd orders --base src/modules
  npx smbm --env
  npx smbm --env dev
  npx smbm --env prod --dir config
`);
    process.exit(0);
}

/* --l: LICENSE.md */
if (has("--l")) {
    let pkg = {}; try { pkg = JSON.parse(fs.readFileSync("package.json","utf8")); } catch {}
    const authorFromPkg = typeof pkg.author === "string" ? pkg.author : (pkg.author?.name);
    ensureLicense({
        type: (get("type", pkg.license || "ISC")).toUpperCase(),
        author: get("author", authorFromPkg || "Autor"),
        year: Number(get("year", new Date().getFullYear())),
        out: get("out", "LICENSE.md"),
        force: has("--force")
    });
    process.exit(0);
}

/* --d: docs/ */
if (has("--d")) {
    let pkg = {}; try { pkg = JSON.parse(fs.readFileSync("package.json","utf8")); } catch {}
    const res = ensureDocs({
        dir: get("dir", "docs"),
        storiesName: get("stories", "user-stories.md"),
        diagramName: get("diagram", "diagrama.puml"),
        force: has("--force"),
        pkg
    });
    console.log(`✔ Docs en: ${res.dir}`);
    res.files.forEach(f => console.log(`  - ${f.path} ${f.created ? "(creado/actualizado)" : "(existente)"}`));
    process.exit(0);
}

/* --ddd: estructura DDD */
if (has("--ddd")) {
    const name = get("name", nextAfter("--ddd")) || "myFeature";
    const base = get("base", "src");
    const { root } = ensureDDD({ feature: name, base });
    console.log(`✔ Estructura DDD creada en: ${root}`);
    process.exit(0);
}

/* --env: .env.developer / .env.production */
/* --env: .env.developer / .env.production */
if (has("--env")) {
    let pkg = {}; try { pkg = JSON.parse(fs.readFileSync("package.json","utf8")); } catch {}

    // acepta: dev | developer | development | pro | prod | production | all | both
    const scopeRaw = nextAfter("--env") || get("env", "all");
    const s = String(scopeRaw || "all").toLowerCase();

    const makeDev  = ["dev", "developer", "development", "all", "both"].includes(s);
    const makeProd = ["pro", "prod", "production", "all", "both"].includes(s);

    // si pasan algo raro, por defecto crea ambos
    const makeDevFinal  = (makeDev || (!makeDev && !makeProd));
    const makeProdFinal = (makeProd || (!makeDev && !makeProd));

    const dir   = get("dir", ".");          // carpeta destino (por defecto raíz)
    const force = has("--force");
    const ignore = !has("--no-ignore");     // por defecto SÍ añade a .gitignore

    const res = ensureEnv({
        dir,
        makeDev: makeDevFinal,
        makeProd: makeProdFinal,
        force,
        addGitignore: ignore,
        pkg
    });

    console.log(`✔ .env en: ${res.dir}`);
    res.files.forEach(f => {
        const tag = f.created ? "(creado/actualizado)" : f.skipped ? "(existente)" : "";
        console.log(`  - ${f.path} ${tag}`);
    });
    if (ignore) {
        if (res.gitignore.updated) {
            console.log(`✔ .gitignore actualizado (añadido): ${res.gitignore.added.join(", ")}`);
        } else {
            console.log("ℹ .gitignore ya contenía las reglas necesarias");
        }
    }
    process.exit(0);
}


console.error("Nada que hacer. Usa --l, --d, --ddd, --env o --help.");
process.exit(1);
