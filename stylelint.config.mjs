/**
 * Deliberately not extending a broad preset like `stylelint-config-standard`:
 * this is scoped to catching real bugs (a copy-pasted rule, an accidental
 * re-declaration, a not-yet-baseline feature) rather than enforcing a
 * formatting style oxfmt already owns.
 */
export default {
  plugins: ["stylelint-plugin-use-baseline"],
  rules: {
    "no-duplicate-selectors": true,
    "declaration-block-no-duplicate-properties": [
      true,
      { ignore: ["consecutive-duplicates-with-different-values"] },
    ],
    "declaration-block-no-duplicate-custom-properties": true,
    "keyframe-block-no-duplicate-selectors": true,
    "declaration-no-important": [true, { severity: "warning" }],
    "block-no-empty": [true, { severity: "warning" }],
    "plugin/use-baseline": [true, { severity: "warning" }],
  },
  overrides: [
    {
      // The reader's co-located component CSS intentionally uses
      // not-yet-baseline features; the original monolith disabled this rule
      // at the top of the file, so keep it off here.
      files: [
        "packages/seed-bible/seed-bible/components/**/*.css",
        "packages/seed-bible/seed-bible/app/styles/**/*.css",
      ],
      rules: { "plugin/use-baseline": null },
    },
  ],
};
