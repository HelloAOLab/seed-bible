/**
 * Duplicate-selector/declaration checks and our own theme-color-pair rule —
 * things `eslint.config.mts`'s `css/*` block (backed by `@eslint/css`) can't
 * do; that plugin has no equivalent even at its latest version. Everything else CSS-related
 * (no-important, no-empty-blocks, use-baseline, no-invalid-properties) stays
 * on `@eslint/css`.
 *
 * Deliberately not extending a broader preset like `stylelint-config-standard`:
 * this is scoped to catching real bugs (a copy-pasted rule, an accidental
 * re-declaration), not enforcing a formatting style Prettier already owns.
 */
import themeColorPairRule from "./script/stylelint/themeColorPairRule.mjs";
import useDesignTokensRule from "./script/stylelint/useDesignTokensRule.mjs";

export default {
  // Build output (e.g. the published `seed-bible` package's bundled
  // `dist/style.css`) concatenates many source files, so it trips the
  // duplicate-selector rules even when every source file is clean.
  ignoreFiles: ["**/dist/**"],
  plugins: [themeColorPairRule, useDesignTokensRule],
  rules: {
    "no-duplicate-selectors": true,
    "declaration-block-no-duplicate-properties": [
      true,
      { ignore: ["consecutive-duplicates-with-different-values"] },
    ],
    "declaration-block-no-duplicate-custom-properties": true,
    "keyframe-block-no-duplicate-selectors": true,
    // A fixed text color on a themed background (or the reverse) only looks
    // right in the theme it was written against.
    "seed-bible/theme-color-pair": true,
    // A raw corner, layer, speed, text size or shadow that already has a
    // `--sb-*` name. A warning, not an error: it nudges without blocking.
    "seed-bible/use-design-tokens": [true, { severity: "warning" }],
  },
};
