/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import path from "path";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { analyzer } from "vite-bundle-analyzer";
import { VitePWA } from "vite-plugin-pwa";
import { patternPlugin } from "./script/lib/vite-plugin-patterns";
import { extensionsPlugin } from "./script/lib/vite-plugin-extensions";

// Each branch+version deployment gets its OWN copy of its hashed assets, so the
// asset URL is namespaced by branch and build id: assets for a build live at
// `<assetRoot>branches/<branch>/<buildId>/assets/...`, mirroring where that
// build's server.mjs / index.html already live in the artifact store. Baking
// the branch + build id into `base` at build time is what makes each
// deployment's HTML resolve to its own asset copy (no cross-branch sharing).
//
// `ASSET_BASE_URL` is the CDN root (e.g. https://assets.seedbible.com/);
// `DEPLOY_BRANCH` / `DEPLOY_BUILD_ID` are supplied by CI before the build runs.
// When the deploy vars are absent (local dev / plain build) `base` falls back
// to the bare asset root (default "/"), so `pnpm dev` is unaffected.
const assetRoot = withTrailingSlash(process.env.ASSET_BASE_URL ?? "/");
const deployBranch = process.env.DEPLOY_BRANCH?.trim();
const deployBuildId = process.env.DEPLOY_BUILD_ID?.trim();
const assetBaseUrl =
  deployBranch && deployBuildId
    ? `${assetRoot}branches/${deployBranch}/${deployBuildId}/`
    : assetRoot;

// The service worker is versioned-base-hostile: VitePWA bakes `base` into the
// SW scope and registration URLs, so a per-build base would change the SW's
// scope every deploy and break `autoUpdate`. We therefore only emit a service
// worker for the root deployment (the `main` build, or local dev where no
// deploy branch is set), and pin its files/scope to the site root regardless of
// where the versioned chunks live.
const isRootBuild = !deployBranch || deployBranch === "main";

function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

const clientOutDir = "standalone/dist/client";

/** The subset of Vite's client manifest shape this config reads. */
interface ViteManifestChunk {
  file: string;
  isEntry?: boolean;
  /** Statically imported chunks — needed before the app can run. */
  imports?: string[];
  css?: string[];
  assets?: string[];
}

/**
 * One entry in the precache manifest Workbox builds by globbing the client
 * output. Declared here rather than imported: `workbox-build` is a transitive
 * dependency of vite-plugin-pwa and isn't resolvable from the project root, and
 * the plugin doesn't re-export its types.
 */
interface PrecacheManifestEntry {
  url: string;
  revision?: string | null;
  integrity?: string;
  size?: number;
}

/** Files that count as core regardless of how the bundler reached them. */
const IMAGE_OR_FONT_RE =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot)$/i;

/**
 * The emitted files the app needs in order to *boot*: every entry chunk,
 * everything it statically imports (transitively), and the stylesheets and
 * static assets those chunks reference. Read out of the client build's own Vite
 * manifest, which is written before the service worker is compiled.
 *
 * Selecting these by filename glob instead (`index-*.js`, `vendor-*.js`) looks
 * equivalent but isn't: the bundler splits out chunks of its own accord — right
 * now the rolldown runtime, the i18n bootstrap and the bundled `en` locale —
 * and a shell missing even one static import doesn't start offline at all.
 *
 * Anything reached through a dynamic `import()` is deliberately absent: the
 * other 23 locales, every extension. Those are runtime-cached on first use.
 */
function readCoreAssetFiles(): Set<string> {
  const manifestPath = path.resolve(
    __dirname,
    clientOutDir,
    ".vite/manifest.json"
  );
  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as Record<
    string,
    ViteManifestChunk
  >;

  const core = new Set<string>();
  const visited = new Set<string>();

  function visit(key: string): void {
    if (visited.has(key)) return;
    visited.add(key);

    const chunk = manifest[key];
    if (!chunk) return;

    core.add(chunk.file);
    for (const file of chunk.css ?? []) core.add(file);
    for (const file of chunk.assets ?? []) core.add(file);
    for (const imported of chunk.imports ?? []) visit(imported);
  }

  for (const [key, chunk] of Object.entries(manifest)) {
    if (chunk.isEntry) visit(key);
  }

  return core;
}

/**
 * Narrows the globbed build output down to the core assets, and points each one
 * at the absolute URL it is actually served from.
 *
 * The rewrite is not cosmetic. Workbox produces paths relative to the service
 * worker's own location — `assets/index-abc.js`, which resolves to
 * `<site root>/assets/index-abc.js`. Nothing is served from there: this build's
 * chunks live under `<assetRoot>branches/<branch>/<buildId>/assets/`. Left
 * unrewritten every precache request would 404 during install, and one failed
 * request aborts the whole install — the worker would never register.
 *
 * Entries outside `assets/` (the web manifest, which vite-plugin-pwa appends on
 * its own) really are at the site root and are passed through untouched.
 */
function selectAndRelocateCoreAssets(entries: PrecacheManifestEntry[]): {
  manifest: PrecacheManifestEntry[];
  warnings: string[];
} {
  const core = readCoreAssetFiles();

  const manifest: PrecacheManifestEntry[] = [];
  for (const entry of entries) {
    if (!entry.url.startsWith("assets/")) {
      manifest.push(entry);
      continue;
    }
    if (!core.has(entry.url) && !IMAGE_OR_FONT_RE.test(entry.url)) continue;
    manifest.push({ ...entry, url: `${assetBaseUrl}${entry.url}` });
  }

  return { manifest, warnings: [] };
}

// Baked into the client bundle so a build reports its own version/commit even
// when a stale copy is being served — the value travels inside the JS chunk
// rather than being fetched at request time.
const appVersion = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "packages/seed-bible/package.json"),
    "utf-8"
  )
).version as string;

// CI sets DEPLOY_BUILD_ID to the full commit SHA before `pnpm build` runs (see
// cd.yml); falling back to `git rev-parse` covers local dev/build.
function resolveGitCommit(): string {
  if (deployBuildId) return deployBuildId;
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}
const gitCommit = resolveGitCommit();

export default defineConfig(({ isSsrBuild }) => ({
  // SSR builds must not treat index.html as an input; only the client build
  // is an HTML/SPA build.
  appType: "custom",
  publicDir: false,
  base: assetBaseUrl,

  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __GIT_COMMIT__: JSON.stringify(gitCommit),
    // Read by the service worker (`standalone/sw.ts`) to tell its own build's
    // assets apart from another branch deployment's. vite-plugin-pwa reuses
    // this `define` block when it compiles the worker.
    __ASSET_BASE_URL__: JSON.stringify(assetBaseUrl),
  },

  plugins: [
    preact(),
    patternPlugin(),
    extensionsPlugin(),
    // Only the root build ships a service worker (see `isRootBuild` above).
    ...(isRootBuild
      ? [
          VitePWA({
            registerType: "autoUpdate",
            // A hand-written worker (`standalone/sw.ts`) rather than a
            // generated one: the offline behaviour this deployment needs —
            // network-first HTML keyed so every URL shares one cached copy,
            // and asset caching scoped to this build's own chunks — can't be
            // expressed in `generateSW`'s declarative config.
            strategies: "injectManifest",
            srcDir: "standalone",
            filename: "sw.ts",
            // Pin the SW, its registration script, and the manifest to the site
            // root so they stay at stable, same-origin URLs even though the
            // hashed chunks are served from the versioned absolute CDN `base`.
            base: "/",
            scope: "/",
            injectManifest: {
              // Glob everything cacheable, then let `selectAndRelocateCoreAssets`
              // keep only the core assets — the boot chunks and their CSS, plus
              // images and fonts. Everything the app loads on demand (the other
              // 23 locales, extension chunks) is left to the worker's runtime
              // cache, so installing doesn't pull down the whole app.
              //
              // The web manifest isn't listed: vite-plugin-pwa appends it to the
              // precache list itself. index.html is absent on purpose — the
              // served page is rendered per request by the host, so the built
              // file is only a template; the worker runtime-caches the real
              // response instead.
              globPatterns: [
                "assets/*.{js,css}",
                "assets/*.{png,jpg,jpeg,gif,svg,webp,avif,ico,woff,woff2,ttf,otf,eot}",
              ],
              manifestTransforms: [selectAndRelocateCoreAssets],
              // Workbox drops files over 2 MiB from the precache by default,
              // which would silently leave the vendor chunk — the single most
              // important thing to have offline — unprecached.
              maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
            },
            manifest: {
              id: "seed-bible",
              name: "Seed Bible",
              short_name: "Seed Bible",
              description: "A free, open-source Bible reader and study tool.",
              lang: "en",
              categories: [
                "bible",
                "study",
                "christianity",
                "religion",
                "reference",
                "education",
              ],
              start_url: "/",
              display: "standalone",
              background_color: "#FFFFFF",
              theme_color: "#FFFFFF",
              icons: [
                {
                  src: "https://favicon.ao.bot/pwa/pwa-192x192.png",
                  type: "image/png",
                  sizes: "192x192",
                  purpose: "any",
                },
                {
                  src: "https://favicon.ao.bot/pwa/pwa-512x512.png",
                  type: "image/png",
                  sizes: "512x512",
                  purpose: "any",
                },
                {
                  src: "https://favicon.ao.bot/pwa/pwa-maskable-192x192.png",
                  type: "image/png",
                  sizes: "192x192",
                  purpose: "maskable",
                },
                {
                  src: "https://favicon.ao.bot/pwa/pwa-maskable-512x512.png",
                  type: "image/png",
                  sizes: "512x512",
                  purpose: "maskable",
                },
              ],
              screenshots: [
                {
                  src: "https://favicon.ao.bot/pwa/screenshots/laptop/laptop-home.png",
                  sizes: "1020x775",
                  form_factor: "wide",
                  label: "Home screen of the Seed Bible showing Genesis 1",
                },
                {
                  src: "https://favicon.ao.bot/pwa/screenshots/mobile/mobile-home.png",
                  sizes: "369x766",
                  form_factor: "narrow",
                  label: "Home screen of the Seed Bible showing Proverbs 3",
                },
                {
                  src: "https://favicon.ao.bot/pwa/screenshots/laptop/laptop-translations.png",
                  sizes: "1020x775",
                  form_factor: "wide",
                  label:
                    "Translation selection screen showing several English Bible translations",
                },
                {
                  src: "https://favicon.ao.bot/pwa/screenshots/mobile/mobile-translations.png",
                  sizes: "372x776",
                  form_factor: "narrow",
                  label:
                    "Translation selection screen showing several English Bible translations",
                },
                {
                  src: "https://favicon.ao.bot/pwa/screenshots/laptop/laptop-verse-search.png",
                  sizes: "1021x773",
                  form_factor: "wide",
                  label:
                    "Search results for 'for God so loved' showing a result for John 3:16",
                },
                {
                  src: "https://favicon.ao.bot/pwa/screenshots/mobile/mobile-search.png",
                  sizes: "373x776",
                  form_factor: "narrow",
                  label:
                    "Search results for 'for God so loved' showing a result for John 3:16",
                },
              ],
            },
          }),
        ]
      : []),
    analyzer({
      analyzerMode: "static",
      openAnalyzer: false,
    }),
  ],

  // Bundle all dependencies into the SSR output instead of leaving them as
  // external Node imports. Several deps in the graph are CJS with named-export
  // usage (e.g. hash.js) or ship extensionless internal imports (the
  // CasualOS packages, e.g. "./BlobPolyfill") that Node's ESM loader rejects
  // when external. Bundling lets Vite handle interop/resolution; any module
  // that touches browser globals at import time is then fixed via SSR guards.
  ssr: {
    noExternal: isSsrBuild ? true : [],
    // noExternal: [
    //   // /^hash\.js$/,
    //   /^@casual-simulation\/aux-common(\/.*)?$/,
    //   /^@casual-simulation\/aux-records(\/.*)?$/,
    //   /^@casual-simulation\/websocket(\/.*)?$/,
    //   /^@casual-simulation\/aux-websocket(\/.*)?$/,
    // ],
  },

  build: isSsrBuild
    ? {
        // SSR bundle: a single Node ESM module exporting render(). The host
        // server loads this from S3 per branch and calls it to produce HTML.
        ssr: "standalone/entry-server.tsx",
        outDir: "standalone/dist/server",
        emptyOutDir: true,
        sourcemap: true,
      }
    : {
        // Client build: hashed assets + a manifest mapping the entry to its
        // emitted files. The SSR entry reads the manifest to emit the correct
        // <script>/<link> tags (prefixed with the CDN host).
        outDir: clientOutDir,
        emptyOutDir: true,
        // Also read back by `readCoreAssetFiles()` to work out which emitted
        // files the service worker should precache.
        manifest: true,
        sourcemap: true,
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                {
                  test: /(node_modules|\.pnpm)/,
                  name: "vendor",
                },
              ],
            },
          },
        },
      },

  resolve: {
    alias: {
      "https://esm.sh/react-i18next@15.1.2?alias=react:preact/compat,react-dom:preact/compat&external=preact":
        "react-i18next",
      "https://esm.sh/i18next@23.16.8": "i18next",
      // use-sync-external-store (used by react-i18next) is CJS-only; loading
      // it via Node pulls in preact's CJS build, creating a second preact
      // instance. preact/compat ships useSyncExternalStore natively.
      "use-sync-external-store/shim/index.js": "preact/compat",
      "use-sync-external-store/shim": "preact/compat",
      "@packages": path.resolve(__dirname, "packages"),
      // ...moduleAliases,
    },
    // Force a single preact instance across the host app and dynamically-loaded
    // extensions. Two copies (the CasualOS SDK pulls in preact 10.28.4 while the
    // app uses the catalog's 10.29.2) break hooks with
    // "Cannot read properties of undefined (reading '__H')".
    dedupe: [
      "preact",
      "preact/hooks",
      "preact/compat",
      "preact/jsx-runtime",
      "@preact/signals",
      "@preact/signals-core",
      "prosemirror-model",
      "prosemirror-state",
      "prosemirror-transform",
      "prosemirror-view",
    ],
  },

  test: {
    environment: "jsdom",
    globals: true,
    // Inline react-i18next so the use-sync-external-store alias above applies
    // to its imports (aliases don't reach externalized modules, which are
    // loaded directly by Node).
    server: {
      deps: {
        inline: [/react-i18next/],
      },
    },
    exclude: ["**/node_modules/**", "**/.git/**", "**/obsolete/**"],
    // Suites that bootstrap the full SeedBibleState pay a one-time ~6s
    // dynamic import of the entire app graph in their first test.
    testTimeout: 20000,
  },

  server: {
    middlewareMode: true,
  },
}));
