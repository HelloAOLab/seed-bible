// Vendored from the seed-bible monorepo's script/eslint/i18nRuleShared.ts —
// just the rule-creator factory, not the whole file (which also pulls in
// monorepo-layout-specific machinery this standalone project doesn't need).
import { ESLintUtils } from "@typescript-eslint/utils";

export const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/HelloAOLab/seed-bible/eslint-rules/${name}`
);
