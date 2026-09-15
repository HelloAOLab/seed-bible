// Oxlint loads JS plugins with a plain Node `import()`, so every relative
// specifier reachable from here — including the ones inside the rule files and
// `i18nRuleShared.ts` — needs its `.ts` extension spelled out; Node's ESM
// resolver does not try extensions. tsgo and Vitest both accept the explicit
// form too.
import { definePlugin } from "vite-plus/lint/plugins";
import i18nMissingKeysRule from "./i18nMissingKeysRule.ts";
import i18nUntranslatedContentRule from "./i18nUntranslatedContentRule.ts";

// The rules are built with `ESLintUtils.RuleCreator`, whose `meta.docs` type
// lacks the string index signature oxlint's `RuleDocs` requires. The runtime
// shape — `{ meta, create, defaultOptions }` — is exactly what oxlint executes,
// so the mismatch is nominal only; `as never` bridges the type gap between
// `@typescript-eslint/utils`' rule objects and `definePlugin`'s expected shape
// without rewriting the rules.
export default definePlugin({
  meta: { name: "seed-bible-i18n" },
  rules: {
    "translation-missing-keys": i18nMissingKeysRule as never,
    "i18n-untranslated-content": i18nUntranslatedContentRule as never,
  },
});
