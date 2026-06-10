/// <reference types="vitest/config" />
import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
import preact from "@preact/preset-vite";
import path from "path";

export default defineConfig({
  appType: "spa",
  publicDir: "standalone/public",

  plugins: [preact()],

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
});
