import { definePlugin } from "vite-plus/lint/plugins";
import noImmediateStorageAccessRule from "./noImmediateStorageAccessRule.ts";

// See `i18nPlugin.ts` for why the import carries a `.ts` extension, and why the
// rule is cast: `RuleCreator`'s `meta.docs` type and oxlint's `RuleDocs`
// disagree nominally but not at runtime.
export default definePlugin({
  meta: { name: "seed-bible-hydration" },
  rules: {
    "no-immediate-storage-access": noImmediateStorageAccessRule as never,
  },
});
