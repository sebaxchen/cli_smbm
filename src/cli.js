#!/usr/bin/env node
const fs = require("node:fs");
const { ensureLicense } = require("./scripts/ensurance-license.js");
const { ensureDocs }    = require("./scripts/ensure-docs.js");
const { ensureDDD }     = require("./scripts/ensure-ddd.js");
const { ensureEnv }     = require("./scripts/ensure-env.js");
const { ensureLocales } = require("./scripts/ensure-locales.js");
const {ensureDeps} = require ("./scripts/ensure-deps");
const {ensureServer} = require ("./scripts/ensure-server")

const { makeSpinner } = require("./ui/spinner.js");
const { runWithSpinner } = require("./ui/run.js");

try { require("dotenv").config(); } catch {}
const { askOnce, askStream } = require("./scripts/ask-openai.js");
const { setApiKey } = require("./scripts/openai-config.js");

const args = process.argv.slice(2);
const has = f => args.includes(f);
const get = (k, d) => { const i = args.findIndex(a => a === `--${k}`); return i !== -1 ? args[i + 1] : d; };
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
  npx smbm --env [dev|pro|all] [--dir .] [--force] [--no-ignore]
  npx smbm --lo  [--dir locales] [--force]
  npx smbm --ask set "TU_API_KEY"
  npx smbm --ask "pregunta..." [--model gpt-4o-mini] [--stream] [--no-anim]

Ejemplos:
  npx smbm --ddd auth
  npx smbm --ddd --name users
  npx smbm --ddd orders --base src/modules
  npx smbm --env
  npx smbm --env dev
  npx smbm --env pro --dir config
  npx smbm --lo
  npx smbm --ask set "sk-xxxx"
  npx smbm --ask "¿Qué es DDD?" --stream
`);
    process.exit(0);
}

/* --l: LICENSE.md */
if (has("--l")) {
    (async () => {
        let pkg = {}; try { pkg = JSON.parse(fs.readFileSync("package.json","utf8")); } catch {}
        const authorFromPkg = typeof pkg.author === "string" ? pkg.author : (pkg.author?.name);

        await runWithSpinner("Creando LICENSE.md", () => {
            ensureLicense({
                type: (get("type", pkg.license || "ISC")).toUpperCase(),
                author: get("author", authorFromPkg || "Autor"),
                year: Number(get("year", new Date().getFullYear())),
                out: get("out", "LICENSE.md"),
                force: has("--force")
            });
        }, { cliArgs: args, minMs: 300 });

        process.exit(0);
    })();
    return;
}

/* --d: docs/ */
if (has("--d")) {
    (async () => {
        const res = await runWithSpinner("Generando docs", () => {
            let pkg = {}; try { pkg = JSON.parse(fs.readFileSync("package.json","utf8")); } catch {}
            return ensureDocs({
                dir: get("dir", "docs"),
                storiesName: get("stories", "user-stories.md"),
                diagramName: get("diagram", "diagrama.puml"),
                force: has("--force"),
                pkg
            });
        }, { cliArgs: args });

        console.log(`✔ Docs en: ${res.dir}`);
        res.files.forEach(f => console.log(`  - ${f.path} ${f.created ? "(creado/actualizado)" : "(existente)"}`));
        process.exit(0);
    })();
    return;
}

/* --ddd: estructura DDD */
if (has("--ddd")) {
    (async () => {
        const out = await runWithSpinner("Creando estructura DDD", () => {
            const name = get("name", nextAfter("--ddd")) || "myFeature";
            const base = get("base", "src");
            return ensureDDD({ feature: name, base });
        }, { cliArgs: args });

        console.log(`✔ Estructura DDD creada en: ${out.root}`);
        process.exit(0);
    })();
    return;
}

/* --env: .env.developer / .env.production */
if (has("--env")) {
    (async () => {
        const res = await runWithSpinner("Preparando entornos (.env)", () => {
            let pkg = {}; try { pkg = JSON.parse(fs.readFileSync("package.json","utf8")); } catch {}

            const scopeRaw = nextAfter("--env") || get("env", "all");
            const s = String(scopeRaw || "all").toLowerCase();

            const makeDev  = ["dev", "developer", "development", "all", "both"].includes(s);
            const makeProd = ["pro", "prod", "production", "all", "both"].includes(s);

            const makeDevFinal  = (makeDev || (!makeDev && !makeProd));
            const makeProdFinal = (makeProd || (!makeDev && !makeProd));

            const dir   = get("dir", ".");
            const force = has("--force");
            const ignore = !has("--no-ignore");

            return ensureEnv({
                dir,
                makeDev: makeDevFinal,
                makeProd: makeProdFinal,
                force,
                addGitignore: ignore,
                pkg
            });
        }, { cliArgs: args });

        console.log(`✔ .env en: ${res.dir}`);
        res.files.forEach(f => {
            const tag = f.created ? "(creado/actualizado)" : f.skipped ? "(existente)" : "";
            console.log(`  - ${f.path} ${tag}`);
        });
        if (res.gitignore) {
            if (res.gitignore.updated) {
                console.log(`✔ .gitignore actualizado (añadido): ${res.gitignore.added.join(", ")}`);
            } else {
                console.log("ℹ .gitignore ya contenía las reglas necesarias");
            }
        }
        process.exit(0);
    })();
    return;
}

/* --lo: locales/en.json y locales/es.json */
if (has("--lo")) {
    (async () => {
        const res = await runWithSpinner("Generando locales", () => {
            let pkg = {}; try { pkg = JSON.parse(fs.readFileSync("package.json","utf8")); } catch {}
            const dir   = get("dir", "locales");
            const force = has("--force");
            return ensureLocales({ dir, force, projectName: pkg.name || undefined });
        }, { cliArgs: args });

        console.log(`✔ Locales en: ${res.dir}`);
        res.files.forEach(f => {
            const tag = f.created ? "(creado/actualizado)" : f.skipped ? "(existente)" : "";
            console.log(`  - ${f.path} ${tag}`);
        });
        process.exit(0);
    })();
    return;
}

/* --ask: SET y PREGUNTA (con spinner bonito para todo el flujo) */
if (has("--ask")) {
    const idxAsk = args.indexOf("--ask");
    const sub = args[idxAsk + 1];

    // SET: npx smbm --ask set "KEY"
    if (sub && sub.toLowerCase() === "set") {
        (async () => {
            await runWithSpinner("Guardando API key de OpenAI", () => {
                const key = args[idxAsk + 2];
                if (!key) throw new Error('Falta la clave. Uso: npx smbm --ask set "TU_API_KEY"');
                const where = setApiKey(key);
                console.log(`✔ OPENAI_API_KEY guardada en: ${where}`);
            }, { cliArgs: args, minMs: 300 });
            process.exit(0);
        })();
        return;
    }

    // PREGUNTA
    const q = sub && !sub.startsWith("--") ? sub : get("ask", null);
    if (!q) { console.error('Falta la pregunta. Ej: npx smbm --ask "¿Qué es DDD?"'); process.exit(1); }

    const model = get("model", "gpt-4o-mini");
    const streaming = has("--stream");

    if (streaming) {
        (async () => {
            await runWithSpinner("Consultando OpenAI…", async ({ stop }) => {
                await askStream({
                    prompt: q,
                    model,
                    onFirstToken: () => { stop(); } // cortamos spinner en el primer token
                });
                process.stdout.write("\n");
            }, { cliArgs: args, minMs: 400 });
            process.exit(0);
        })();
    } else {
        (async () => {
            const out = await runWithSpinner("Consultando OpenAI…", () => {
                return askOnce({ prompt: q, model });
            }, { cliArgs: args, minMs: 400 });
            console.log(out);
            process.exit(0);
        })();
    }
    return;
}

/* --dep: instala Vue + Prime + utilidades con barra de progreso */
if (has("--deps")) {
    (async () => {
        const pm    = get("pm", null);     // --pm npm|yarn|pnpm|bun
        const dev   = has("--dev");        // --dev => devDependencies
        const batch = has("--batch");      // --batch => todo en una sola llamada

        await runWithSpinner("Instalando dependencias", async ({ progress, update }) => {
            let bar = null;
            await ensureDeps({
                pm, dev, batch,
                onProgress: (ev) => {
                    if (ev.type === "start") {
                        // +2 pasos extra (pm + init) para que la barra “avance” antes de deps
                        bar = progress(ev.total + 2, { label: "Progreso" });
                    } else if (ev.type === "pm") {
                        update(`Usando ${ev.pm}…`);
                        bar?.tick();
                    } else if (ev.type === "init") {
                        update("Creando package.json…");
                        bar?.tick();
                    } else if (ev.type === "depStart") {
                        update(`Instalando ${ev.dep} (${ev.index}/${ev.total})…`);
                    } else if (ev.type === "dep") {
                        bar?.tick();
                    }
                }
            });
        }, { cliArgs: args, minMs: 400 });

        console.log("✔ Dependencias instaladas:");
        console.log("  vue-i18n@11, primeicons, primevue, @primeuix/themes, pinia, axios, primeflex, json-server");
        console.log("ℹ Tip: si usas Vite/Vue, registra Pinia, i18n y PrimeVue en tu main.js/ts.");
        process.exit(0);
    })();
    return;
}

/* --server: prepara carpeta server con db.json, routes.json, start.sh
   y verifica/instala json-server si falta */
if (has("--s")) {
    (async () => {
        const pm     = get("pm", null);   // --pm npm|yarn|pnpm|bun
        const dir    = get("dir", "server");
        const force  = has("--force");
        const noInst = has("--no-install"); // si quieres saltar la instalación

        await runWithSpinner("Preparando servidor JSON", async ({ progress, update }) => {
            const bar = progress(5, { label: "Setup" }); // pm + pkg + install + dir + files

            const res = await ensureServer({
                pm,
                dir,
                force,
                installIfMissing: !noInst,
                onEvent: (ev) => {
                    switch (ev.type) {
                        case "pm":
                            update(`Usando ${ev.pm}…`); bar.tick(); break;
                        case "pkginit":
                            update("Creando package.json…"); bar.tick(); break;
                        case "install:start":
                            update("Instalando json-server…"); break;
                        case "install:done":
                            bar.tick(); break;
                        case "dir":
                            update(`Carpeta: ${ev.dir}`); bar.tick(); break;
                        case "done":
                            bar.tick(); break;
                    }
                }
            });

            console.log(`✔ Server en: ${res.dir}`);
            res.files.forEach(f => {
                const tag = f.created ? "(creado/actualizado)" : f.skipped ? "(existente)" : "";
                console.log(`  - ${f.path} ${tag}`);
            });

            console.log("\nPara arrancar:");
            console.log("  # POSIX (Git Bash/WSL/macOS/Linux)");
            console.log("  sh server/start.sh");
            console.log("  # o directamente:");
            console.log("  npx json-server --watch server/db.json --routes server/routes.json");
        }, { cliArgs: args, minMs: 400 });

        process.exit(0);
    })();
    return;
}




console.error("Nada que hacer. Usa --l, --d, --deps, --s,  --ddd, --env, --lo o --ask (o --help).");
process.exit(1);
