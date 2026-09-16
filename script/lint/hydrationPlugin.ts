import { definePlugin } from "vite-plus/lint/plugins";
import noImmediateStorageAccessRule from "./noImmediateStorageAccessRule.ts";

// See `i18nPlugin.ts` for why the import carries a `.ts` extension.
export default definePlugin({
  meta: { name: "seed-bible-hydration" },
  rules: {
    "no-immediate-storage-access": noImmediateStorageAccessRule,
  },
});
