/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import path from "path";
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

export default defineConfig(({ isSsrBuild }) => ({
  // SSR builds must not treat index.html as an input; only the client build
  // is an HTML/SPA build.
  appType: "custom",
  publicDir: false,
  base: assetBaseUrl,

  plugins: [
    preact(),
    patternPlugin(),
    extensionsPlugin(),
    // Only the root build ships a service worker (see `isRootBuild` above).
    ...(isRootBuild
      ? [
          VitePWA({
            registerType: "autoUpdate",
            // Pin the SW, its registration script, and the manifest to the site
            // root so they stay at stable, same-origin URLs even though the
            // hashed chunks are served from the versioned absolute CDN `base`.
            base: "/",
            scope: "/",
            workbox: {
              // Precache only the root-served web manifest. The hashed chunks
              // (and favicon/apple-touch-icon, which Vite hashes into assets/)
              // live on the versioned absolute CDN, not at the SW's root scope —
              // precaching them by their root-relative path would 404 at install
              // and abort SW registration. The SSR index.html is a placeholder
              // template, not the served page, so it must not be a nav fallback.
              globPatterns: ["manifest.webmanifest"],
              navigateFallback: null,
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
        outDir: "standalone/dist/client",
        emptyOutDir: true,
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
      // @preact/compat's npm package ships separate CJS ("index.js") and ESM
      // ("index.mjs") builds. If one consumer's "react" import resolves
      // through the "require" condition while another resolves through
      // "import", Node treats them as two distinct module instances (a dual
      // package hazard) — breaking hooks the same way two different preact
      // copies would. Aliasing "react"/"react-dom" straight to "preact/compat"
      // routes every consumer (dnd-kit included) through the one specifier
      // the rest of the app already imports directly, sidestepping the
      // hazard entirely instead of relying on pnpm's catalog substitution.
      react: "preact/compat",
      "react-dom/test-utils": "preact/test-utils",
      "react-dom": "preact/compat",
      // @dnd-kit/* ships only legacy "main" (CJS)/"module" (ESM) package.json
      // fields, no "exports" map. Without one, Vite/Vitest can resolve a bare
      // `"@dnd-kit/core"` import through the CJS "main" build in some
      // contexts, whose *internal* `require("react")` bypasses the `react`
      // alias above entirely (Node's own CJS resolution, not Vite's) —
      // loading a second, `require`-condition copy of preact/compat that
      // doesn't share hook state with the app's ESM-resolved one. Aliasing
      // straight to each package's ESM entry file forces the same build (and
      // therefore the same "react" alias) everywhere, regardless of how the
      // bare specifier would otherwise have resolved.
      "@dnd-kit/core": path.resolve(
        __dirname,
        "node_modules/@dnd-kit/core/dist/core.esm.js"
      ),
      "@dnd-kit/sortable": path.resolve(
        __dirname,
        "node_modules/@dnd-kit/sortable/dist/sortable.esm.js"
      ),
      "@dnd-kit/utilities": path.resolve(
        __dirname,
        "node_modules/@dnd-kit/utilities/dist/utilities.esm.js"
      ),
      "@dnd-kit/accessibility": path.resolve(
        __dirname,
        "node_modules/.pnpm/@dnd-kit+accessibility@3.1.1_@preact+compat@18.3.2_preact@10.29.2_/node_modules/@dnd-kit/accessibility/dist/accessibility.esm.js"
      ),
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
      // @dnd-kit/* depends on "react"/"react-dom", aliased to preact/compat
      // by the pnpm catalog — without deduping, pnpm's peer-dependency
      // resolution can still produce a second, distinct preact/compat
      // instance for these packages, breaking hooks the same way as above.
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "@dnd-kit/accessibility",
    ],
  },

  test: {
    environment: "jsdom",
    globals: true,
    // Inline react-i18next so the use-sync-external-store alias above applies
    // to its imports (aliases don't reach externalized modules, which are
    // loaded directly by Node). @dnd-kit/* needs the same treatment: its ESM
    // build (aliased to above) still needs Vite's own transform pipeline to
    // run, rather than Node's native loader (which would choke on `.js`
    // files using `import`/`export` syntax without a `"type": "module"`).
    server: {
      deps: {
        inline: [/react-i18next/, /@dnd-kit\//],
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
