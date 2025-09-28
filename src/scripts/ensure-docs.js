// src/scripts/ensure-docs.js  (CJS)
const fs = require("node:fs");
const path = require("node:path");

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeFile(targetPath, content, force = false) {
    if (fs.existsSync(targetPath) && !force) {
        return { path: targetPath, created: false, skipped: true };
    }
    fs.writeFileSync(targetPath, content, "utf8");
    return { path: targetPath, created: true, skipped: false };
}

function ensureDocs({
                        cwd = process.cwd(),
                        dir = "docs",
                        storiesName = "user-stories.md",
                        diagramName = "diagrama.puml",
                        force = false,
                        pkg = {}
                    } = {}) {
    const docsDir = path.join(cwd, dir);
    ensureDir(docsDir);

    const projectName = pkg.name || path.basename(cwd);
    const author =
        typeof pkg.author === "string" ? pkg.author :
            (pkg.author && pkg.author.name) ? pkg.author.name : "Autor";

    const stories = `# User Stories – ${projectName}
> Autor: ${author}

## Historias (ejemplos)
- **US-1**: Como *usuario*, quiero **…** para **…**.
- **US-2**: Como *admin*, quiero **…** para **…**.

## Criterios de Aceptación (Given/When/Then)
| ID  | Dado | Cuando | Entonces |
|-----|------|--------|----------|
| CA1 | ...  | ...    | ...      |
`;

    const puml = `@startuml ${projectName}
title Arquitectura (alto nivel)

actor Usuario
rectangle Frontend as FE
rectangle Backend  as BE
database DB

Usuario --> FE : Usa
FE --> BE : API
BE --> DB : CRUD

@enduml
`;

    const sFile = path.join(docsDir, storiesName);
    const dFile = path.join(docsDir, diagramName);

    const r1 = writeFile(sFile, stories, force);
    const r2 = writeFile(dFile, puml, force);

    return { dir: docsDir, files: [r1, r2] };
}

module.exports = { ensureDocs };
