// Oxlint loads JS plugins with a plain Node `import()`, so every relative
// specifier reachable from here — including the ones inside the rule files and
// `i18nRuleShared.ts` — needs its `.ts` extension spelled out; Node's ESM
// resolver does not try extensions. tsgo and Vitest both accept the explicit
// form too.
import { definePlugin } from "vite-plus/lint/plugins";
import i18nMissingKeysRule from "./i18nMissingKeysRule.ts";
import i18nUntranslatedContentRule from "./i18nUntranslatedContentRule.ts";

export default definePlugin({
  meta: { name: "seed-bible-i18n" },
  rules: {
    "translation-missing-keys": i18nMissingKeysRule,
    "i18n-untranslated-content": i18nUntranslatedContentRule,
  },
});
