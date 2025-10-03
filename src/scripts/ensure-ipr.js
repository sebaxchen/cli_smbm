// src/scripts/ensure-ipr.js
const fs = require("node:fs");
const path = require("node:path");

function writeIfNeeded(p, content, force = false) {
    if (fs.existsSync(p) && !force) return { path: p, created: false, skipped: true };
    fs.writeFileSync(p, content, "utf8");
    return { path: p, created: true, skipped: false };
}

function ensureIpr({ cwd = process.cwd(), force = false } = {}) {
    const files = [];

    const i18nJs = `// i18n.js
import { createI18n } from "vue-i18n";
import en from "./src/locales/en.json";
import es from "./src/locales/es.json";

export const i18n = createI18n({
  legacy: false,
  locale: "es",
  fallbackLocale: "en",
  messages: { en, es },
});
export default i18n;
`;

    const piniaJs = `// pinia.js
import { createPinia } from "pinia";
const pinia = createPinia();
export default pinia;
`;

    const routerJs = `// router.js
import { createRouter, createWebHistory } from "vue-router";

// Rutas mínimas de ejemplo (sin dependencias a archivos .vue)
const routes = [
  { path: "/", name: "home", component: { template: "<div>Home</div>" } },
  { path: "/about", name: "about", component: { template: "<div>About</div>" } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
`;

    files.push(writeIfNeeded(path.join(cwd, "i18n.js"),  i18nJs,  force));
    files.push(writeIfNeeded(path.join(cwd, "pinia.js"), piniaJs, force));
    files.push(writeIfNeeded(path.join(cwd, "router.js"), routerJs, force));

    return { dir: cwd, files };
}

module.exports = { ensureIpr };
