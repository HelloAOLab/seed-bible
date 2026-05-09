import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import css from "@eslint/css";
import i18nMissingKeysRule from "./script/eslint/i18nMissingKeysRule";
import i18nUnusedKeysRule from "./script/eslint/i18nUnusedKeysRule";
import i18nIncompleteTranslationsRule from "./script/eslint/i18nIncompleteTranslationsRule";
import i18nExtensionIncompleteTranslationsRule from "./script/eslint/i18nExtensionIncompleteTranslationsRule";
import i18nUntranslatedContentRule from "./script/eslint/i18nUntranslatedContentRule";
import json from "@eslint/json";

import { defineConfig, globalIgnores } from "eslint/config";

const cssPlugin = css as unknown as Record<string, unknown>;
const jsonPlugin = json as unknown as Record<string, unknown>;
const i18nPlugin = {
  rules: {
    "translation-missing-keys": i18nMissingKeysRule,
    "i18n-untranslated-content": i18nUntranslatedContentRule,
  },
} as unknown as Record<string, unknown>;

const i18nJsonPlugin = {
  rules: {
    "translation-unused-keys": i18nUnusedKeysRule,
    "translation-incomplete-translations": i18nIncompleteTranslationsRule,
    "translation-extension-incomplete-translations":
      i18nExtensionIncompleteTranslationsRule,
  },
} as unknown as Record<string, unknown>;

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
      css: cssPlugin,
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
    files: ["**/*.json"],
    language: "json/json",
    plugins: {
      json: jsonPlugin,
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
    files: ["packages/**/*.{js,mjs,cjs,ts,tsx,jsx,ts,tsx}"],
    plugins: {
      "seed-bible-i18n": i18nPlugin,
    },
    rules: {
      "seed-bible-i18n/translation-missing-keys": "error",
      "seed-bible-i18n/i18n-untranslated-content": "warn",
    },
  },
  {
    files: ["packages/seed-bible/seed-bible/i18n/*.json"],
    language: "json/json",
    plugins: {
      json: jsonPlugin,
      "seed-bible-i18n": i18nJsonPlugin,
    },
    rules: {
      "seed-bible-i18n/translation-unused-keys": [
        "warn",
        {
          exemptKeys: [
            "text-section-bookTitle",
            "text-section-heading",
            "text-section-verse",
            "bold",
            "regular",
            "light",
            "1-psalms",
            "2-psalms",
            "3-psalms",
            "4-psalms",
            "5-psalms",
          ],
        },
      ],
      "seed-bible-i18n/translation-incomplete-translations": "warn",
    },
  },
  {
    files: ["packages/**/extension.json"],
    language: "json/json",
    plugins: {
      json: jsonPlugin,
      "seed-bible-i18n": i18nJsonPlugin,
    },
    rules: {
      "seed-bible-i18n/translation-extension-incomplete-translations": "warn",
    },
  },
  {
    files: ["test/**/*.{js,mjs,cjs,ts,tsx,jsx,css}"],

    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
