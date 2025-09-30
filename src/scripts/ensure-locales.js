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
