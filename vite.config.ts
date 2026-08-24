/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import path from "path";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { analyzer } from "vite-bundle-analyzer";
import { VitePWA } from "vite-plugin-pwa";
import { patternPlugin } from "./script/lib/vite-plugin-patterns";
import {
  selectAndRelocateCoreAssets,
  selectCoreAssetFiles,
  type PrecacheManifestEntry,
  type ViteManifestChunk,
} from "./script/lib/precacheManifest";
import { extensionsPlugin } from "./script/lib/vite-plugin-extensions";
import { htmlMetaAssetsPlugin } from "./script/lib/vite-plugin-html-meta-assets";

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

/**
 * Reads this build's Vite client manifest, which is written before the service
 * worker is compiled, and works out which emitted files the app needs to boot.
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
  return selectCoreAssetFiles(manifest);
}

/**
 * The `manifestTransforms` hook Workbox calls with the globbed build output.
 *
 * The selection and URL rewriting live in `script/lib/precacheManifest.ts` so
 * they can be unit tested; this only supplies the two build-time inputs and
 * reports anything the transform flagged.
 */
function transformPrecacheManifest(entries: PrecacheManifestEntry[]) {
  const result = selectAndRelocateCoreAssets(entries, {
    coreFiles: readCoreAssetFiles(),
    assetBaseUrl,
  });
  // Returned as `warnings` because that is the hook's contract, and logged here
  // as well: whether the plugin surfaces them is not something to rely on, and a
  // missing core asset breaks offline boot with no other symptom.
  for (const warning of result.warnings) {
    console.warn(`[sw precache] ${warning}`);
  }
  return result;
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
    htmlMetaAssetsPlugin(),
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
              manifestTransforms: [transformPrecacheManifest],
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
          // `@casual-simulation/aux-common` ships no `sideEffects` field, so
          // every module in it is assumed to have import-time side effects and
          // cannot be tree-shaken away. That matters because `aux-websocket`'s
          // `WebsocketConnectionClient` — which the boot path needs — imports
          // the aux-common package root, and that barrel re-exports
          // `./partitions`, which reaches the Yjs document classes. The result
          // was Yjs + lib0 (~97 KB) sitting in the eager vendor chunk even
          // though the app only touches shared documents behind a dynamic
          // import. Declaring these two directories side-effect-free lets the
          // barrel shake out; anything genuinely imported from them (we use
          // `PartitionAuthSource` at boot and `RemoteYjsSharedDocument`
          // on demand) is still kept, and the one real side effect in the
          // subtree — `import '../BlobPolyfill'` — also reaches the bundle via
          // the package root, which is untouched by this rule.
          treeshake: {
            moduleSideEffects: [
              {
                test: /aux-common[\\/](documents|partitions)[\\/]/,
                sideEffects: false,
              },
            ],
          },
          output: {
            codeSplitting: {
              groups: [
                {
                  test: /(node_modules|\.pnpm)/,
                  name: "vendor",
                  // `$initial` restricts the group to modules a user-defined
                  // entry imports statically (or reaches through a static
                  // import chain). Without it, rolldown reads the `test` above
                  // literally and puts *every* node_modules module in `vendor`
                  // — including ones only reachable via `import()`. Because the
                  // entry statically needs some of `vendor`, the chunk loads
                  // eagerly, so that hoisting silently undid every lazy import
                  // in the app: TipTap/ProseMirror (~500 KB), the transcript
                  // extension's reference parser (~120 KB), and dompurify all
                  // shipped on first paint. Tagging keeps one long-cacheable
                  // vendor chunk for boot-path libraries and lets everything
                  // else land in the lazy chunk that actually needs it.
                  tags: ["$initial"],
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
    // Only packages this project depends on directly belong here: `dedupe`
    // resolves to the copy in the project root `node_modules`, which under
    // pnpm's strict layout only exists for direct dependencies. The
    // prosemirror packages used to be listed and had no effect for exactly
    // that reason — they are pinned in `pnpm-workspace.yaml`'s `overrides`
    // instead, which is the mechanism that reaches transitive dependencies.
    dedupe: [
      "preact",
      "preact/hooks",
      "preact/compat",
      "preact/jsx-runtime",
      "@preact/signals",
      "@preact/signals-core",
    ],
  },

  test: {
    environment: "jsdom",
    globals: true,
    // Blocks real WebSocket connections, so a test that reaches the network
    // fails in its own file instead of as an unattributed async error.
    setupFiles: ["./test/setup/blockRealSockets.ts"],
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
    // dynamic import of the entire app graph in their first test. Both limits
    // need the allowance: a suite that builds the state in `beforeEach` is
    // judged by `hookTimeout`, not `testTimeout` (BibleReaderToolbar's first
    // hook lands at ~9.5s, against a 10s default).
    testTimeout: 20000,
    hookTimeout: 20000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      include: ["packages/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "**/obsolete/**",
        "patterns/**",
      ],
    },
  },

  server: {
    middlewareMode: true,
  },
}));
