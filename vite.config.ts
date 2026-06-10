/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  appType: "spa",
  publicDir: "standalone/public",

  plugins: [
    react({
      jsxImportSource: "preact/compat",
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["**/node_modules/**", "**/.git/**", "**/obsolete/**"],
  },

  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom/test-utils": "preact/test-utils",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
      "https://esm.sh/react-i18next@15.1.2?alias=react:preact/compat,react-dom:preact/compat&external=preact":
        "react-i18next",
      "https://esm.sh/i18next@23.16.8": "i18next",
      "@packages": path.resolve(__dirname, "packages"),
      // ...moduleAliases,
    },
  },
});
