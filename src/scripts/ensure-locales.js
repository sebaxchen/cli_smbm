// src/scripts/ensure-locales.js (CJS)
const fs = require("node:fs");
const path = require("node:path");

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeJson(p, obj, force) {
    const content = JSON.stringify(obj, null, 2) + "\n";
    if (fs.existsSync(p) && !force) {
        return { path: p, created: false, skipped: true };
    }
    fs.writeFileSync(p, content, "utf8");
    return { path: p, created: true, skipped: false };
}

function ensureLocales({
                           cwd = process.cwd(),
                           dir = "locales",
                           force = false,
                           projectName
                       } = {}) {
    const targetDir = path.isAbsolute(dir) ? dir : path.join(cwd, "src", dir);
    ensureDir(targetDir);

    const enData = {
        app: { name: projectName || "App" },
        nav: { home: "Home", aboutUs: "About us" },
        pages: {
            home: { title: "Welcome", subtitle: "This is the home page" },
            about:{ title: "About us", subtitle: "Who we are" },
            notFound: { title: "404 Not Found", message: "The page you are looking for does not exist" }
        },
        actions: { back: "Back", retry: "Retry" }
    };

    const esData = {
        app: { name: projectName || "Aplicación" },
        nav: { home: "Inicio", aboutUs: "Sobre nosotros" },
        pages: {
            home: { title: "Bienvenido", subtitle: "Esta es la página de inicio" },
            about:{ title: "Sobre nosotros", subtitle: "Quiénes somos" },
            notFound: { title: "404 No Encontrado", message: "La página que buscas no existe" }
        },
        actions: { back: "Volver", retry: "Reintentar" }
    };

    const enPath = path.join(targetDir, "en.json");
    const esPath = path.join(targetDir, "es.json");

    const r1 = writeJson(enPath, enData, force);
    const r2 = writeJson(esPath, esData, force);

    return { dir: targetDir, files: [r1, r2] };
}

module.exports = { ensureLocales };
