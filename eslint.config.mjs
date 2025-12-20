import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import css from "@eslint/css";

import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/typings/**",
    "tsc-silent.config.cjs",
    "jest.config.cjs",
    "babel.config.cjs",
  ]),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx,jsx}"],
    ...pluginJs.configs.recommended,
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  ...tseslint.configs.recommended,
  // lint css files
  {
    files: ["**/*.css"],
    plugins: {
      css,
    },
    language: "css/css",
    extends: ["css/recommended"],
    rules: {
      "css/no-important": "warn",
      "css/no-empty-blocks": "warn",
      "css/use-baseline": "warn",
      "css/no-invalid-properties": "warn",
    },
  },

  // Disabled rules
  {
    files: [
      "packages/**/*.{js,mjs,cjs,ts,tsx,jsx,css}",
      "script/**/*.{js,mjs,cjs,ts,tsx,jsx,css}",
    ],

    rules: {
      // These rules should be fixed
      "no-constant-binary-expression": "warn",
      "no-constant-condition": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-empty": "warn",
      "no-prototype-builtins": "warn",
      "no-case-declarations": "warn",
      "no-empty-pattern": "warn",

      // These rules can be ignored for now
      "prefer-const": [
        "warn",
        {
          destructuring: "all",
        },
      ],
      "no-useless-escape": "off",
      "no-control-regex": "off",
    },
  },
]);
