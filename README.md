# Locale

A local React SPA for editing i18next translation files. The homepage is pre-rendered at build time for SEO; the workspace runs in the browser. There is no backend, account, analytics, remote font service, or translation API.

## Run locally

Use Node.js 22.12+ (tested with Node 26) and npm.

```sh
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`. Use **Create a project** to start with your files, or **Explore the demo** to try a separate sample project.

## Docker: local development

With Docker and Docker Compose installed, run:

```sh
docker compose -f compose.dev.yaml up --build
```

Open `http://localhost:5173`. `compose.dev.yaml` builds the `development` target, mounts the source for live reload, and keeps container dependencies in a named volume. Node.js does not need to be installed on the host. The port is bound to localhost; set `LOCAL_PORT` to choose another host port, for example `LOCAL_PORT=5174 docker compose -f compose.dev.yaml up --build`.

Stop with `Ctrl+C`, then run `docker compose -f compose.dev.yaml down` to remove the container. After changing `package.json` or `package-lock.json`, refresh the dependency volume and rebuild:

```sh
docker compose -f compose.dev.yaml run --rm --no-deps app npm ci
docker compose -f compose.dev.yaml up --build
```

## Docker: production and Coolify

`compose.prod.yaml` builds the `production` target, which is also the default `Dockerfile` target. It builds and pre-renders the app using Node.js 24, then serves only the generated static files through Nginx running as an unprivileged user on port `8080`. It includes a `/health` endpoint and Docker health check, SPA routing, the separate noindex workspace entry, and long-lived caching for hashed assets. The production Compose file has no source mounts or host port mappings and restarts the app unless explicitly stopped. Choose each Compose file with `-f`; they are standalone alternatives, not files to combine.

To try the production build locally:

```sh
docker build --build-arg SITE_URL=http://localhost:8080 -t locale:production .
docker run --rm --name locale-production -p 127.0.0.1:8080:8080 locale:production
```

Open `http://localhost:8080`. Omit `--build-arg SITE_URL=...` if you do not want a canonical URL or sitemap.

For [Coolify's Docker Compose build pack](https://coolify.io/docs/applications/builds/docker-compose):

1. Create an application from the Git repository and select **Docker Compose** as the build pack (or **Compose** as the build strategy).
2. Use `/` as the base directory and `/compose.prod.yaml` as the Docker Compose location. Save and load the Compose definition. Use Coolify's normal managed Compose deployment so it generates the proxy configuration.
3. Assign a domain to the `app` service, for example `https://locale.example.com:8080`. The `:8080` suffix tells Coolify which internal container port to route to; visitors use `https://locale.example.com`. Coolify's proxy handles HTTPS.
4. Add `SITE_URL=https://locale.example.com` as an environment variable **available at build time**, without the internal `:8080` suffix. Compose passes it through `build.args` to the Dockerfile. Changing it requires a rebuild, since SEO metadata is baked into the static files. Leaving it empty omits the canonical URL and sitemap.
5. Deploy. The image includes its own [health check](https://coolify.io/docs/applications/configuration/health-checks) on `/health` at port `8080`.

The [Dockerfile build pack](https://coolify.io/docs/applications/builds/dockerfile) remains an alternative: select `/Dockerfile`, leave the target empty or set it to `production`, expose port `8080`, and supply the same `SITE_URL` build variable.

No database or persistent container storage is required. Projects remain in the user's browser IndexedDB, scoped to the site origin. The local development, local production, and hosted URLs each have separate browser storage; export/import files to move data between them.

## Workflow

1. Create a project with a name and optional description.
2. Choose **Add language** to create a language or dialect without uploading. Copy an existing language’s files and keys with all strings blank, or start without files. **Import files** remains available for selecting or dropping multiple `.json` files. Both flows support custom BCP 47 codes.
3. Edit translations side by side. Search values and full key paths, filter namespaces, or show keys with missing translations. `Ctrl/Cmd + K` focuses search.
4. Download an individual JSON file, a ZIP for one language, or a ZIP for all languages. ZIPs contain folders such as `en/common.json` and `pt-PT/common.json`.

File names become namespaces. For example, `common.json` containing `{"meters":{"smart_meter":"Smart meter"}}` appears as `en.common.meters.smart_meter`. Focus or hover over a translation to see its full path, or copy it using the icon below the field. Paths are displayed in the editor and are never used as page URLs.

The editor preserves nested objects, arrays, interpolation tokens, plural keys, empty containers, and non-string JSON values. Only strings are editable. New language templates retain the source structure and non-string values while clearing strings. Editing a missing translation adds it to that language; incompatible existing JSON structures are shown read-only. Literal dotted property names are kept separate from nested paths. Replacing an existing file requires confirmation. Imports accept JSON objects, with a limit of 10 MB per file.

## Appearance

The sun/moon button in the homepage navigation and workspace header offers **Light**, **Dark**, and **System**. The selection is saved locally and applies across pages, menus, dialogs, and notifications. System mode follows device appearance changes. A small initialization script applies the theme before the first paint while preserving the homepage’s pre-rendered HTML.

Main controls and body text use a larger 14–16px type scale, with wider table columns, taller controls, and responsive navigation. The workspace sidebar becomes a drawer on tablets and phones, and translation columns scroll horizontally while the key column stays visible.

## Local storage

Projects and edits are saved to IndexedDB as you type. The save indicator reports success or failure, and failed writes can be retried. No imported file or translation is sent to a server. Fonts and application dependencies are bundled locally.

Storage belongs to the browser profile and site origin. Use a consistent local URL and port to return to the same workspace. Clearing site data, deleting a browser profile, or ending a private browsing session can remove projects. Export regular backups. Use one editor tab per project; concurrent edits across tabs are not merged. The app needs its local/static server to load; it does not install an offline service worker.

## Production and homepage SEO

```sh
npm run build
npm run preview
```

Deploy the `dist` directory to a static host. Build output contains fully rendered homepage HTML, title and description metadata, Open Graph metadata, SoftwareApplication structured data, `robots.txt`, and a separate `/workspace/index.html` entry. The workspace is excluded from indexing. A Netlify-compatible `_redirects` file is included for SPA routing.

Set the public origin when building a hosted version to generate its canonical URL and sitemap:

```sh
SITE_URL=https://your-domain.example npm run build
```

Without `SITE_URL`, the build omits the canonical URL and sitemap instead of assuming a domain. Serve the site at the root of its origin. If your host does not serve directory index files, configure `/workspace` to serve `/workspace/index.html`.

## Validation

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests cover safe JSON editing, exact value preservation, creation of empty and templated languages, dialect validation, and ZIP contents. Browser tests cover pre-rendered HTML, responsive navigation, project and language creation, duplicate dialect prevention, multi-file import, persistence after reload, theme preferences and system appearance changes, search and filtering, actual JSON and ZIP downloads, malformed input, replacement confirmation, project deletion, and absence of external requests during editing.

To reuse a locally installed Chromium binary, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when running browser tests.

## Stack

React, TypeScript, Vite, Tailwind CSS, shadcn/ui components built on Radix UI, Lucide icons, IndexedDB via `idb`, JSZip, Vitest, and Playwright. The shadcn configuration is in `components.json`, with editable component sources in `src/components/ui`.
