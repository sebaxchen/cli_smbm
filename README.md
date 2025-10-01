# smbm

> Utilidades de línea de comando para arrancar proyectos rápido: licencias, docs, DDD, entornos, i18n, dependencias, servidor mock y consultas a ChatGPT.

[![npm](https://img.shields.io/npm/v/smbm.svg)](https://www.npmjs.com/package/smbm)
[![downloads](https://img.shields.io/npm/dw/smbm.svg)](https://www.npmjs.com/package/smbm)
[![license](https://img.shields.io/npm/l/smbm.svg)](#licencia)

---

##  Características

* **`--l`** Crea `LICENSE.md` (ISC/MIT) con autor/año.
* **`--d`** Genera `docs/` con `user-stories.md` y `diagrama.puml`.
* **`--ddd`** Esqueleto **DDD**: `src/<feature>/{application,domain/model,infrastructure,presentation/components}` (solo carpetas).
* **`--env`** Crea `.env.developer` y `.env.production` y actualiza `.gitignore` (opcional).
* **`--lo`** Crea `locales/en.json` y `locales/es.json` (estructura básica de traducciones).
* **`--dep`** Instala **vue-i18n@11**, **primevue**, **@primeuix/themes**, **primeicons**, **pinia**, **axios**, **primeflex** y **json-server** con autodetección de gestor (npm/yarn/pnpm/bun).
* **`--server`** Prepara `server/` con `db.json`, `routes.json` y `start.sh` asegurando `json-server`.
* **`--ask`** Integra ChatGPT (OpenAI): guarda tu API key y haz preguntas (con streaming opcional).
* **Spinners y barras de progreso** en todas las operaciones (`--no-anim` para desactivar; respeta `CI=true`).

> Requisitos: **Node.js ≥ 16** (recomendado ≥ 18). Paquete **CommonJS**.

---

## 🚀 Instalación rápida

No necesitas instalar globalmente:

```bash
npx smbm --help
```

Si prefieres local:

```bash
npm i -D smbm
npx smbm --help
```

---

##  Uso general

```bash
npx smbm [comando] [opciones]
```

Comandos disponibles:

| Comando    | Qué hace                                          |
| ---------- | ------------------------------------------------- |
| `--l`      | Crea `LICENSE.md`                                 |
| `--d`      | Genera `docs/` (historias y diagrama)             |
| `--ddd`    | Crea estructura DDD dentro de `src/`              |
| `--env`    | Genera `.env.developer` y `.env.production`       |
| `--lo`     | Crea `locales/en.json` y `locales/es.json`        |
| `--dep`    | Instala dependencias Vue/Prime/i18n/etc           |
| `--server` | Prepara carpeta `server/` y asegura `json-server` |
| `--ask`    | Pregunta a ChatGPT o guarda tu API key            |

> Opción global: **`--no-anim`** desactiva animaciones.

---

##  `--l`  · LICENSE.md

```bash
npx smbm --l [--type ISC|MIT] [--author "Nombre"] [--year 2025] [--out LICENSE.md] [--force]
```

Crea/actualiza `LICENSE.md` con la plantilla elegida.

---

##  `--d`  · Documentación

```bash
npx smbm --d [--dir docs] [--stories user-stories.md] [--diagram diagrama.puml] [--force]
```

Estructura por defecto:

```
docs/
  user-stories.md
  diagrama.puml
```

---

##  `--ddd`  · Estructura DDD

```bash
npx smbm --ddd [<FeatureName>] [--name <FeatureName>] [--base src]
```

Crea solo carpetas (no archivos):

```
src/
  <FeatureName>/
    application/
    domain/
      model/
    infrastructure/
    presentation/
      components/
```

Ejemplos:

```bash
npx smbm --ddd auth
npx smbm --ddd --name users
npx smbm --ddd orders --base src/modules
```

---

##  `--env`  · Entornos

```bash
npx smbm --env [dev|pro|all] [--dir .] [--force] [--no-ignore]
```

* Genera `.env.developer` y/o `.env.production` en `--dir` (por defecto `.`).
* Añade reglas a `.gitignore` salvo que pases `--no-ignore`.

---

##  `--lo`  · Locales (i18n)

```bash
npx smbm --lo [--dir locales] [--force]
```

Crea archivos base con estructura común:

```
locales/
  en.json   # { app, nav, pages, actions }
  es.json   # { app, nav, pages, actions }
```

---

##  `--deps`  · Dependencias Vue + Prime + utilidades

```bash
npx smbm --dep [--pm npm|yarn|pnpm|bun] [--dev] [--batch] [--verbose]
```

Instala:

* `vue-i18n@11`, `primevue`, `@primeuix/themes`, `primeicons`
* `pinia`, `axios`, `primeflex`, `json-server`

Detalles:

* Autodetección del gestor según lockfile (`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb` o **npm** por defecto).
* `--dev` instala como devDependencies.
* `--batch` instala todas en una sola llamada (más rápido; menos granular en la barra).
* `--verbose` muestra la salida real del instalador (puede “mover” la barra).

---

##  `--s`  · Servidor mock con json‑server

```bash
npx smbm --server [--pm npm|yarn|pnpm|bun] [--dir server] [--force] [--no-install]
```

Hace esto:

1. Asegura `package.json`.
2. Verifica `json-server`; si falta, lo instala (devDep) salvo `--no-install`.
3. Crea `server/` con:

    * `db.json` → `{}`
    * `routes.json` → `{ "/api/v1/*": "/$1" }`
    * `start.sh` → `json-server --watch db.json --routes routes.json`

Arranque rápido:

```bash
sh server/start.sh
# o
npx json-server --watch server/db.json --routes server/routes.json
```

---

##  `--ask`  · ChatGPT (OpenAI)

```bash
# Guardar la API key (se almacena fuera del repo: ~/.smbm/config.json)
npx smbm --ask set "sk-..."

# Consultar (por defecto model: gpt-4o-mini)
npx smbm --ask "¿Qué es DDD?"

# Streaming de respuesta\ nnpx smbm --ask "Resume este texto" --stream

# Elegir modelo\ nnpx smbm --ask "Traduce al inglés" --model gpt-4o-mini
```

**Notas**

* La API de OpenAI es de **pago**; necesitas billing/cuota activa.
* También puedes usar `OPENAI_API_KEY` como variable de entorno.
* Si ves `429 check your plan and billing`, revisa tu plan/límites.

---

##  Animaciones

* Todas las operaciones usan **spinners** y **barras de progreso**.
* Desactiva con `--no-anim` o exporta `CI=true`.

---

##  Solución de problemas

* **`npm ERR! Git working directory not clean`**: haz commit/restore antes de `npm version`.
* **`'smbm' is not recognized`**: ejecuta con `npx smbm ...` o instala local `npm i -D smbm`.
* **Permisos `start.sh` en Windows**: usa `Git Bash`/`WSL` o lanza el comando de `json-server` directamente.
* **Claves**: no commitees `.env*` ni claves. Si expusiste una key, **revócala** y genera otra.

---

##  Package.json recomendado (extracto)

```json
{
  "type": "commonjs",
  "bin": { "smbm": "src/cli.js" },
  "files": ["src/**/*", "README.md", "LICENSE.md", "package.json" ]
}
```

---

##  Contribuir

¡PRs bienvenidos! Abre un issue si ves algo raro o quieres proponer un comando nuevo.



##  Licencia

[ISC](./LICENSE.md)
