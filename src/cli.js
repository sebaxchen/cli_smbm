#!/usr/bin/env node
const fs = require("node:fs");
const { ensureLicense } = require("./scripts/ensurance-license.js");
const { ensureDocs }    = require("./scripts/ensure-docs.js");
const { ensureDDD }     = require("./scripts/ensure-ddd.js");
const { ensureEnv }     = require("./scripts/ensure-env.js");
const { ensureLocales } = require("./scripts/ensure-locales.js");
const {ensureDeps} = require ("./scripts/ensure-deps");
const {ensureServer} = require ("./scripts/ensure-server")
const { makeSmoothProgress } = require("./ui/progress.js");
const { ensureShared } = require("./scripts/ensure-shared.js");
const { ensureIpr } = require("./scripts/ensure-ipr.js");



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

/* --dep: instala Vue + Prime + utilidades con barra suave (1% por tick) */
if (has("--deps")) {
    (async () => {
        const pm      = get("pm", null);     // --pm npm|yarn|pnpm|bun
        const dev     = has("--dev");        // --dev => devDependencies
        const batch   = has("--batch");      // --batch => todo en una llamada
        const verbose = has("--verbose");    // --verbose => heredar logs del instalador

        // Usamos runWithSpinner para título y errores, pero detenemos el spinner
        // y mostramos nuestra barra suave en su lugar.
        await runWithSpinner("Instalando dependencias…", async ({ stop, update }) => {
            let totalUnits = 0;
            let stepPct = 0;
            const bar = makeSmoothProgress({ label: "Instalando", width: 32, stepMs: 35 });

            await ensureDeps({
                pm, dev, batch, verbose,
                onProgress: (ev) => {
                    if (ev.type === "start") {
                        // pm + (posible init) + N dependencias
                        totalUnits = ev.total + 2; // +2: pm + init (aunque init puede no ocurrir, lo compensamos con tiempo)
                        stepPct = 100 / totalUnits;
                        // matamos el spinner y dejamos solo la barra
                        stop?.();
                        bar.to(1); // arranque visual
                    } else if (ev.type === "pm") {
                        update(`Usando ${ev.pm}…`);
                        bar.to(stepPct * 1);
                    } else if (ev.type === "init") {
                        update("Creando package.json…");
                        bar.to(stepPct * 2);
                    } else if (ev.type === "batchStart") {
                        update("Instalando paquetes (batch) …");
                        // Deja que la barra siga subiendo por tiempo hasta el final
                    } else if (ev.type === "depStart") {
                        update(`Instalando ${ev.dep} (${ev.index}/${ev.total})…`);
                        // objetivo parcial: pm(1) + init(1) + índice actual
                        const targetUnits = 2 + (ev.index - 1); // antes de instalar completarse
                        bar.to(stepPct * targetUnits + 1);      // +1 para que avance algo al comenzar
                    } else if (ev.type === "dep") {
                        // completado ese paquete
                        const targetUnits = 2 + ev.index;
                        bar.to(stepPct * targetUnits);
                    }
                }
            });

            // Terminar al 100% suavemente
            bar.done("Dependencias instaladas");
            console.log("✔ Paquetes: vue-i18n@11, primeicons, primevue, @primeuix/themes, pinia, axios, primeflex, json-server");
            console.log("ℹ Tip: usa --verbose si quieres ver la salida del instalador.");
        }, { cliArgs: args, minMs: 0 });

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

/* --sh: crea src/shared con infrastructure y presentation (components/views) */
if (has("--sh")) {
    (async () => {
        const base  = get("base", "src");
        const name  = get("name", "shared");
        const force = has("--force");

        const res = await runWithSpinner("Creando estructura shared", () => {
            return ensureShared({ base, name, force });
        }, { cliArgs: args, minMs: 250 });

        console.log(`✔ Shared en: ${res.dir}`);
        res.files.forEach(f => {
            const tag = f.created ? "(creado/actualizado)" : f.skipped ? "(existente)" : "";
            console.log(`  - ${f.path} ${tag}`);
        });
        process.exit(0);
    })();
    return;
}
/* --ipr: crea i18n.js, pinia.js y router.js en la raíz */
if (has("--ipr")) {
    (async () => {
        const force = has("--force");
        const res = await runWithSpinner("Creando archivos raíz (i18n/pinia/router)", () => {
            return ensureIpr({ force });
        }, { cliArgs: args, minMs: 250 });

        console.log("✔ Archivos en raíz:");
        res.files.forEach(f => {
            const tag = f.created ? "(creado/actualizado)" : f.skipped ? "(existente)" : "";
            console.log(`  - ${f.path} ${tag}`);
        });
        process.exit(0);
    })();
    return;
}
/* --all: ejecuta todo con barra de progreso suave y usa el argumento como nombre de la feature DDD */
if (has("--all")) {
    (async () => {
        const featureName = nextAfter("--all") || "myFeature";
        const force       = has("--force");

        // Opcionales
        const pm        = get("pm", null);     // npm|yarn|pnpm|bun
        const withDeps  = has("--with-deps");
        const devDeps   = has("--dev");
        const batch     = has("--batch");
        const verbose   = has("--verbose");
        const skipServ  = has("--skip-server");

        let pkg = {};
        try { pkg = JSON.parse(fs.readFileSync("package.json","utf8")); } catch {}

        await runWithSpinner("Armando proyecto…", async ({ stop, update }) => {
            // Usaremos UNA barra "suave" para todas las etapas
            stop(); // ocultar spinner
            const baseSteps = 7; // licencia, docs, ddd, shared, locales, env, ipr
            const totalSteps = baseSteps + (skipServ ? 0 : 1) + (withDeps ? 1 : 0);
            const stepPct = 100 / totalSteps;
            let step = 0;

            const bar = makeSmoothProgress({ label: "Progreso", width: 32, stepMs: 35 });
            const tick = (msg) => { step += 1; update(msg); bar.to(Math.min(99, Math.round(step * stepPct))); };

            // 1) LICENSE.md
            tick("Creando LICENSE.md…");
            await ensureLicense({
                type: (get("type", pkg.license || "ISC")).toUpperCase(),
                author: (() => {
                    const a = typeof pkg.author === "string" ? pkg.author : (pkg.author?.name);
                    return get("author", a || "Autor");
                })(),
                year: Number(get("year", new Date().getFullYear())),
                out: get("out", "LICENSE.md"),
                force
            });

            // 2) docs/
            tick("Generando docs…");
            await ensureDocs({
                dir: get("docsDir", "docs"),
                storiesName: get("stories", "user-stories.md"),
                diagramName: get("diagram", "diagrama.puml"),
                force,
                pkg
            });

            // 3) DDD
            tick(`Creando DDD (${featureName})…`);
            await ensureDDD({ feature: featureName, base: get("base", "src") });

            // 4) shared (infra/presentation/components/views)
            tick("Creando shared (infra/presentation/components/views)…");
            await ensureShared({ base: get("base", "src"), name: get("sharedName", "shared") });

            // 5) locales (en/es) – si ya moviste a src, tu ensure-locales lo hará ahí
            tick("Generando locales (en/es)…");
            await ensureLocales({ force, projectName: pkg.name || undefined });

            // 6) .env (dev y prod) + .gitignore
            tick("Preparando entornos (.env)…");
            await ensureEnv({
                dir: get("envDir", "."),
                makeDev: true,
                makeProd: true,
                force,
                addGitignore: !has("--no-ignore"),
                pkg
            });

            // 7) Archivos raíz: i18n.js, pinia.js, router.js
            tick("Creando i18n.js, pinia.js y router.js…");
            await ensureIpr({ force });

            // 8) server/ (opcional)
            if (!skipServ) {
                tick("Preparando servidor JSON (server/)…");
                await ensureServer({
                    pm,
                    dir: get("serverDir", "server"),
                    force,
                    installIfMissing: !has("--no-install"),
                    onEvent: (ev) => {
                        // Solo actualizamos el texto mientras avanza esta etapa
                        if (ev.type === "pm")         update(`Usando ${ev.pm}…`);
                        if (ev.type === "pkginit")    update("Creando package.json…");
                        if (ev.type === "install:start") update("Instalando json-server…");
                        if (ev.type === "dir")        update(`Carpeta: ${ev.dir}`);
                    }
                });
            }

            // 9) Dependencias (opcional)
            if (withDeps) {
                tick("Instalando dependencias base…");
                await ensureDeps({
                    pm, dev: devDeps, batch, verbose,
                    // Si quieres granularidad, podrías mapear ev.index al % dentro de este paso,
                    // pero mantenemos el avance global por etapas para que la barra siga suave.
                });
            }

            bar.done("Proyecto listo");
        }, { cliArgs: args, minMs: 0 });

        console.log("\n✔ Todo listo.");
        console.log(`   DDD feature: ${featureName}`);
        if (withDeps) console.log("   (con dependencias instaladas)");
        if (skipServ) console.log("   (servidor omitido: --skip-server)");
        process.exit(0);
    })();
    return;
}


if (has("--val")) {
    (async () => {
        // Mini pausa "sorpresa"
        await runWithSpinner("Preparando algo especial…", () => new Promise(r => setTimeout(r, 400)), { cliArgs: args, minMs: 300 });

        const cols = Math.max(60, Math.min(process.stdout.columns || 80, 100));
        const c = (code, s) => `\x1b[${code}m${s}\x1b[0m`;
        const center = (s) => {
            const len = s.replace(/\x1b\[[0-9;]*m/g, "").length; // sin ANSI
            const pad = Math.max(0, Math.floor((cols - len) / 2));
            return " ".repeat(pad) + s;
        };

        // Corazón ASCII con gradiente (magenta -> rojo)
        const heart = [
            "      *****       *****      ",
            "   **********   **********   ",
            "  ************ ************  ",
            "  *************************  ",
            "   ***********************   ",
            "     *******************     ",
            "       ***************       ",
            "         ***********         ",
            "           *******           ",
            "             ***             ",
            "              *              "
        ];
        const palette = [95,95,95,91,91,31,31,31,31,31,31]; // 95=bright magenta, 91=bright red, 31=red

        console.log("");
        heart.forEach((line, i) => console.log(center(c(palette[i], line))));
        console.log("");

        // Helpers para la carta
        const wrap = (text, width) => {
            const words = text.split(/\s+/);
            const lines = [];
            let cur = "";
            for (const w of words) {
                if ((cur + w).length + 1 > width) { lines.push(cur.trim()); cur = w + " "; }
                else { cur += w + " "; }
            }
            if (cur.trim()) lines.push(cur.trim());
            return lines;
        };
        const box = (text, title, width = 72) => {
            const lines = wrap(text, width);
            const top = "┌" + "─".repeat(width + 2) + "┐";
            const ttl = "│ " + (title.padEnd(width)) + " │";
            const sep = "├" + "─".repeat(width + 2) + "┤";
            const out = [top, ttl, sep];
            for (const ln of lines) out.push("│ " + ln.padEnd(width) + " │");
            out.push("└" + "─".repeat(width + 2) + "┘");
            return out.join("\n");
        };

        // Carta (versión ajustada: “tuvimos problemas, los solucionamos y hoy estamos bien”)
        const letter = `Hola, mi amor:

No siempre encuentro palabras que alcancen para decirte cuánto te amo. A veces me quedo en silencio, no por falta de ganas, sino porque lo que siento por ti es más grande que cualquier frase.

Eres de las personas más lindas que he conocido. No solo por lo que se ve, sino por lo que eres: tu luz, tu alegría y esa forma natural de conectar con los demás. Estar a tu lado se siente como volver a respirar después de mucho tiempo bajo el agua.

Sé que pasamos por momentos difíciles. Nos dolió, aprendimos y elegimos quedarnos. Y hoy estamos bien: más fuertes, más pacientes y más nosotros. Contigo, hasta lo difícil vale la pena.

A veces, en la madrugada, cierro los ojos y agradezco que existas. No sé si llegaste tarde o si el mundo se demoró en presentarnos; solo sé que ahora estás aquí y eso me basta.

Gracias por ser mi canción y mi color favorito en un mundo ruidoso y gris. Gracias por hacerme sentir paz, por recordarme que sí estaba hecho para amar.

Te amo.

Con todo lo que soy,

Chebas`;

        const width = Math.min(72, Math.max(56, (cols - 8)));
        console.log(center(c(95, "╭─────────────── Para ti ❤️ ───────────────╮")));
        console.log(box(letter, " Carta ", width));

        // Enlace a la canción (subrayado)
        const song = "https://www.youtube.com/watch?v=JoFkQ7iAQcw";
        console.log("\n" + center(c(4, "Nuestra canción: " + song)));
        console.log(center(" "));

        process.exit(0);
    })();
    return;
}

/* --del: elimina TODO lo creado por --all (o partes con flags) con barra suave */
if (has("--del")) {
    (async () => {
        const path = require("node:path");
        const { spawnSync } = require("node:child_process");

        await runWithSpinner("Eliminando recursos…", async ({ stop, update }) => {
            stop(); // usamos barra "suave"
            const bar = makeSmoothProgress({ label: "Eliminando", width: 32, stepMs: 35 });

            // === Config coherente con --all ===
            const base      = get("base", "src");
            const baseDir   = path.join(process.cwd(), base);
            const docsDir   = path.join(process.cwd(), get("docsDir", "docs"));
            const sharedDir = path.join(baseDir, get("sharedName", "shared"));
            const localesSrc= path.join(process.cwd(), "src", "locales");
            const localesRt = path.join(process.cwd(), "locales");
            const envDir    = path.join(process.cwd(), get("envDir", "."));
            const serverDir = path.join(process.cwd(), get("serverDir", "server"));
            const license   = path.join(process.cwd(), get("out", "LICENSE.md"));

            const uninstallPkgs = has("--deps"); // si quieres también desinstalar lo que instaló --with-deps
            const pm = get("pm", (() => {
                // autodetecta si no pasas --pm
                const has = f => fs.existsSync(path.join(process.cwd(), f));
                if (has("pnpm-lock.yaml")) return "pnpm";
                if (has("yarn.lock"))      return "yarn";
                if (has("bun.lockb"))      return "bun";
                return "npm";
            })());

            const fsExists = p => { try { return fs.existsSync(p); } catch { return false; } };

            // Detecta features DDD (o usa --ddd --name Nombre)
            const wantOnly = {
                ddd:   has("--ddd"),
                docs:  has("--docs"),
                sh:    has("--shared") || has("--sh"),
                lo:    has("--lo") || has("--locales"),
                env:   has("--env"),
                ipr:   has("--ipr"),
                serv:  has("--s") || has("--server"),
                lic:   has("--l") || has("--license"),
                allSpecific: false
            };
            wantOnly.allSpecific = Object.values({ ...wantOnly }).some(Boolean);

            // Construimos operaciones (cada op incrementa la barra)
            const ops = [];

            // DDD
            if (!wantOnly.allSpecific || wantOnly.ddd) {
                const nameFromFlag = get("name", nextAfter("--ddd")) || null;
                const markers = ["application","domain","infrastructure","presentation"];
                const pushDDD = (dir) => {
                    if (markers.every(d => fsExists(path.join(dir, d)))) {
                        ops.push({ label: `DDD:${path.basename(dir)}`, run: () => fs.rmSync(dir, { recursive: true, force: true }) });
                    }
                };
                if (nameFromFlag) {
                    pushDDD(path.join(baseDir, nameFromFlag));
                } else {
                    let candidates = [];
                    try {
                        candidates = fs.readdirSync(baseDir, { withFileTypes: true })
                            .filter(d => d.isDirectory())
                            .map(d => path.join(baseDir, d.name));
                    } catch {}
                    candidates.forEach(pushDDD);
                }
            }

            // docs/
            if (!wantOnly.allSpecific || wantOnly.docs) {
                if (fsExists(docsDir)) ops.push({ label: "docs/", run: () => fs.rmSync(docsDir, { recursive: true, force: true }) });
            }

            // shared/
            if (!wantOnly.allSpecific || wantOnly.sh) {
                if (fsExists(sharedDir)) ops.push({ label: "shared/", run: () => fs.rmSync(sharedDir, { recursive: true, force: true }) });
            }

            // locales (src/locales y fallback locales/)
            if (!wantOnly.allSpecific || wantOnly.lo) {
                if (fsExists(localesSrc)) ops.push({ label: "src/locales", run: () => fs.rmSync(localesSrc, { recursive: true, force: true }) });
                if (fsExists(localesRt))  ops.push({ label: "locales",     run: () => fs.rmSync(localesRt,  { recursive: true, force: true }) });
            }

            // .env.* y revertir .gitignore si agregó esas líneas
            if (!wantOnly.allSpecific || wantOnly.env) {
                const envDev = path.join(envDir, ".env.developer");
                const envProd= path.join(envDir, ".env.production");
                if (fsExists(envDev))  ops.push({ label: ".env.developer",  run: () => fs.rmSync(envDev,  { force: true }) });
                if (fsExists(envProd)) ops.push({ label: ".env.production", run: () => fs.rmSync(envProd, { force: true }) });

                const gitignore = path.join(process.cwd(), ".gitignore");
                if (fsExists(gitignore)) {
                    ops.push({
                        label: ".gitignore (limpieza líneas .env)",
                        run: () => {
                            try {
                                const raw = fs.readFileSync(gitignore, "utf8").split(/\r?\n/);
                                const toRemove = new Set([".env.developer", ".env.production"]);
                                const cleaned = raw.filter(line => !toRemove.has(line.trim()));
                                fs.writeFileSync(gitignore, cleaned.join("\n"), "utf8");
                            } catch {}
                        }
                    });
                }
            }

            // Archivos raíz: i18n.js, pinia.js, router.js
            if (!wantOnly.allSpecific || wantOnly.ipr) {
                ["i18n.js", "pinia.js", "router.js"].forEach(f => {
                    const p = path.join(process.cwd(), f);
                    if (fsExists(p)) ops.push({ label: f, run: () => fs.rmSync(p, { force: true }) });
                });
            }

            // server/
            if (!wantOnly.allSpecific || wantOnly.serv) {
                if (fsExists(serverDir)) ops.push({ label: "server/", run: () => fs.rmSync(serverDir, { recursive: true, force: true }) });
            }

            // LICENSE.md
            if (!wantOnly.allSpecific || wantOnly.lic) {
                if (fsExists(license)) ops.push({ label: "LICENSE.md", run: () => fs.rmSync(license, { force: true }) });
            }

            // Desinstalar dependencias instaladas por --with-deps (opcional con --deps)
            if (uninstallPkgs) {
                const pkgs = ["vue-i18n", "primeicons", "primevue", "@primeuix/themes", "pinia", "axios", "primeflex", "json-server"];
                ops.push({
                    label: `Desinstalando deps (${pm})`,
                    run: () => {
                        try {
                            const cmdMap = {
                                npm:  ["npm",  ["uninstall", ...pkgs]],
                                yarn: ["yarn", ["remove",    ...pkgs]],
                                pnpm: ["pnpm", ["remove",    ...pkgs]],
                                bun:  ["bun",  ["remove",    ...pkgs]],
                            };
                            const [bin, args] = cmdMap[pm] || cmdMap.npm;
                            const res = spawnSync(bin, args, { stdio: "ignore" });
                            // ignoramos el código de salida para no romper la limpieza
                        } catch {}
                    }
                });
            }

            // Ejecutar operaciones con barra
            if (ops.length === 0) {
                update("Nada que borrar");
                bar.done("Sin cambios");
            } else {
                let done = 0;
                for (const op of ops) {
                    update(`Borrando ${op.label}…`);
                    try { op.run(); } catch {}
                    done++;
                    bar.to(Math.round((done / ops.length) * 100));
                }
                bar.done("Eliminación completada");
            }
        }, { cliArgs: args, minMs: 0 });

        process.exit(0);
    })();
    return;
}




console.error("Nada que hacer. Usa --l, --d, --deps, --s,  --ddd, --env, --lo o --ask (o --help).");
process.exit(1);
