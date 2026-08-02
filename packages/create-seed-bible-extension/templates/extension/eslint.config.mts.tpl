import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import { defineConfig, globalIgnores } from "eslint/config";
import i18nUntranslatedContentRule from "./eslint-rules/i18nUntranslatedContentRule";
import i18nExtensionIncompleteTranslationsRule from "./eslint-rules/i18nExtensionIncompleteTranslationsRule";

const jsonPlugin = json as unknown as Record<string, unknown>;
const i18nPlugin = {
  rules: {
    "i18n-untranslated-content": i18nUntranslatedContentRule,
  },
} as unknown as Record<string, unknown>;
const i18nJsonPlugin = {
  rules: {
    "translation-extension-incomplete-translations":
      i18nExtensionIncompleteTranslationsRule,
  },
} as unknown as Record<string, unknown>;

// These two rules are vendored from the seed-bible monorepo (see
// eslint-rules/) — they're the two i18n lint rules that are genuinely
// self-contained (no dependency on the monorepo's own layout), unlike its
// other i18n rules, which check this project's translations against the
// *app's* own translation directory and don't apply outside it.
export default defineConfig([
  globalIgnores(["**/node_modules/**", "**/dist/**", "types/vendor/**"]),
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx,jsx}"],
    ...pluginJs.configs.recommended,
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,jsx}"],
    plugins: { "seed-bible-i18n": i18nPlugin },
    rules: {
      "seed-bible-i18n/i18n-untranslated-content": "warn",
    },
  },
  {
    files: ["extension.json"],
    language: "json/json",
    plugins: { json: jsonPlugin, "seed-bible-i18n": i18nJsonPlugin },
    rules: {
      "seed-bible-i18n/translation-extension-incomplete-translations": "warn",
    },
  },
]);
