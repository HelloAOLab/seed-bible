/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { getTsconfig } from "get-tsconfig";
import path from "path";

const tsconfig = getTsconfig();

const moduleAliases: Record<string, string> = {};
for (const [alias, paths] of Object.entries(
  tsconfig?.config.compilerOptions?.paths || {}
)) {
  // Vite expects aliases in the form { alias: path }
  // We will take the first path from the array of paths for each alias
  moduleAliases[alias] = path.resolve(paths[0]);
}

export default defineConfig({
  appType: "spa",
  publicDir: "standalone/public",

  plugins: [
    react({
      jsxImportSource: "preact/compat",
    }),
  ],
  test: {
    globals: true,
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
      ...moduleAliases,
    },
  },
});
