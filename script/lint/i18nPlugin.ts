// Oxlint loads JS plugins with a plain Node `import()`, so every relative
// specifier reachable from here — including the ones inside the rule files and
// `i18nRuleShared.ts` — needs its `.ts` extension spelled out; Node's ESM
// resolver does not try extensions. ESLint (via jiti) and tsgo both accept the
// explicit form, so the rules still load from `eslint.config.mts` unchanged.
import { definePlugin } from "vite-plus/lint/plugins";
import i18nMissingKeysRule from "./i18nMissingKeysRule.ts";
import i18nUntranslatedContentRule from "./i18nUntranslatedContentRule.ts";

// The rules are built with `ESLintUtils.RuleCreator`, whose `meta.docs` type
// lacks the string index signature oxlint's `RuleDocs` requires. The runtime
// shape — `{ meta, create, defaultOptions }` — is exactly what oxlint executes,
// so the mismatch is nominal only; `as never` bridges it without rewriting the
// rules (which ESLint still loads from `eslint.config.mts`).
export default definePlugin({
  meta: { name: "seed-bible-i18n" },
  rules: {
    "translation-missing-keys": i18nMissingKeysRule as never,
    "i18n-untranslated-content": i18nUntranslatedContentRule as never,
  },
});
