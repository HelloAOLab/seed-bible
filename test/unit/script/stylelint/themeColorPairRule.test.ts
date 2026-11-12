import stylelint from "stylelint";
import themeColorPairRule, {
  ruleName,
} from "../../../../script/stylelint/themeColorPairRule.mjs";

async function lint(code: string) {
  const { results } = await stylelint.lint({
    code,
    config: { plugins: [themeColorPairRule], rules: { [ruleName]: true } },
  });
  return results[0]!.warnings.map((w) => ({ line: w.line, text: w.text }));
}

describe(ruleName, () => {
  it.each([
    [
      "a fixed text color on the primary color",
      ".a { background: var(--sb-primary-color); color: #fff; }",
    ],
    [
      "a named text color on a themed background-color",
      ".a { background-color: var(--sb-secondary-color); color: white; }",
    ],
    [
      "a fixed background behind themed text",
      ".a { color: var(--sb-font-color); background: rgb(255 255 255); }",
    ],
    [
      "a fixed icon fill on a themed background",
      ".a { background: var(--sb-primary-color); fill: hsl(0 0% 100%); }",
    ],
    [
      "a themed background with a fixed fallback",
      ".a { background: var(--sb-secondary-color, #eee); color: #fff; }",
    ],
    [
      "a color-mix of a theme color",
      ".a { background: color-mix(in srgb, var(--sb-primary-color), #000 25%); color: #fff; }",
    ],
    [
      "a nested rule",
      ".a { &:hover { background: var(--sb-primary-color); color: black; } }",
    ],
  ])("reports %s", async (_name, code) => {
    const warnings = await lint(code);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.text).toContain(ruleName);
  });

  it("reports the fixed declaration and names the themed one", async () => {
    const warnings = await lint(`.a {
  background: var(--sb-primary-color);
  color: #fff;
}`);
    expect(warnings).toEqual([
      {
        line: 3,
        text: expect.stringContaining(
          '"color: #fff" is a fixed color but "background: var(--sb-primary-color)" follows the theme'
        ),
      },
    ]);
  });

  it.each([
    [
      "both colors themed",
      ".a { background: var(--sb-primary-color); color: var(--sb-primary-font-color); }",
    ],
    ["both colors fixed", ".a { background: #e07b4c; color: #fff; }"],
    [
      "a themed background with no text color",
      ".a { background: var(--sb-primary-color); border: 1px solid #fff; }",
    ],
    [
      "color keywords that don't clash",
      ".a { background: var(--sb-primary-color); color: inherit; fill: currentColor; stroke: none; }",
    ],
    [
      "a transparent background",
      ".a { background: transparent; color: var(--sb-font-color); }",
    ],
    [
      "an image url that looks like a color",
      ".a { background: url(white.png) no-repeat; color: var(--sb-font-color); }",
    ],
    [
      "the pair split across separate rules",
      ".a { background: var(--sb-primary-color); } .a span { color: #fff; }",
    ],
    [
      "theme variable definitions",
      ":root { --sb-primary-color: #e07b4c; color: var(--sb-font-color); }",
    ],
    [
      "a disable comment",
      ".a { background: var(--sb-primary-color);\n/* stylelint-disable-next-line seed-bible/theme-color-pair */\ncolor: #fff; }",
    ],
  ])("allows %s", async (_name, code) => {
    expect(await lint(code)).toEqual([]);
  });
});
