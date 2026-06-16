/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import path from "path";

// Asset URLs are decoupled from the deployment path: every branch references
// its hashed chunks at one stable, absolute CDN host, so the branch path
// (e.g. /d/branch-develop) never appears in an asset URL. That is what makes
// cross-branch asset reuse free — identical bytes hash to the same filename
// and therefore the same URL regardless of which branch deployed them.
// Falls back to "/" for local dev / same-origin serving.
const assetBaseUrl = process.env.ASSET_BASE_URL ?? "/";

export default defineConfig(({ isSsrBuild }) => ({
  // SSR builds must not treat index.html as an input; only the client build
  // is an HTML/SPA build.
  appType: "custom",
  publicDir: false,
  base: assetBaseUrl,

  plugins: [preact()],

  // Bundle all dependencies into the SSR output instead of leaving them as
  // external Node imports. Several deps in the graph are CJS with named-export
  // usage (e.g. hash.js) or ship extensionless internal imports (the
  // CasualOS packages, e.g. "./BlobPolyfill") that Node's ESM loader rejects
  // when external. Bundling lets Vite handle interop/resolution; any module
  // that touches browser globals at import time is then fixed via SSR guards.
  ssr: {
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
      }
    : {
        // Client build: hashed assets + a manifest mapping the entry to its
        // emitted files. The SSR entry reads the manifest to emit the correct
        // <script>/<link> tags (prefixed with the CDN host).
        outDir: "standalone/dist/client",
        emptyOutDir: true,
        manifest: true,
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
