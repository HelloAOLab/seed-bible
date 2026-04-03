import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import css from "@eslint/css";
import i18nMissingKeysRule from "./script/eslint/i18nMissingKeysRule";
import i18nUnusedKeysRule from "./script/eslint/i18nUnusedKeysRule";
import i18nIncompleteTranslationsRule from "./script/eslint/i18nIncompleteTranslationsRule";
import json from "@eslint/json";

import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/typings/**",
    "**/obsolete/**",
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
  {
    files: ["packages/**/*.json"],
    language: "json/json",
    plugins: {
      json,
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
      "no-constant-binary-expression": "error",
      "no-constant-condition": "error",
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "no-empty": "error",
      "no-prototype-builtins": "error",
      "no-case-declarations": "error",
      "no-empty-pattern": "error",

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
  {
    files: ["packages/seed-bible/seed-bible/**/*.{ts,tsx}"],
    plugins: {
      "seed-bible-i18n": {
        rules: {
          "translation-missing-keys": i18nMissingKeysRule,
          "translation-unused-keys": i18nUnusedKeysRule,
          "translation-incomplete-translations": i18nIncompleteTranslationsRule,
        },
      },
    },
    rules: {
      "seed-bible-i18n/translation-missing-keys": "error",
    },
  },
  {
    files: ["packages/seed-bible/seed-bible/i18n/*.json"],
    plugins: {
      "seed-bible-i18n": {
        rules: {
          "translation-missing-keys": i18nMissingKeysRule,
          "translation-unused-keys": i18nUnusedKeysRule,
          "translation-incomplete-translations": i18nIncompleteTranslationsRule,
        },
      },
    },
    rules: {
      "seed-bible-i18n/translation-unused-keys": "error",
      "seed-bible-i18n/translation-incomplete-translations": "error",
    },
  },
  {
    files: ["test/**/*.{js,mjs,cjs,ts,tsx,jsx,css}"],

    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
