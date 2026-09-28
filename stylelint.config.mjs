/**
 * Duplicate-selector/declaration checks — the one thing `eslint.config.mts`'s
 * `css/*` block (backed by `@eslint/css`) can't do; that plugin has no
 * equivalent to these even at its latest version. Everything else CSS-related
 * (no-important, no-empty-blocks, use-baseline, no-invalid-properties) stays
 * on `@eslint/css`.
 *
 * Deliberately not extending a broader preset like `stylelint-config-standard`:
 * this is scoped to catching real bugs (a copy-pasted rule, an accidental
 * re-declaration), not enforcing a formatting style Prettier already owns.
 */
export default {
  rules: {
    "no-duplicate-selectors": true,
    "declaration-block-no-duplicate-properties": [
      true,
      { ignore: ["consecutive-duplicates-with-different-values"] },
    ],
    "declaration-block-no-duplicate-custom-properties": true,
    "keyframe-block-no-duplicate-selectors": true,
  },
};
