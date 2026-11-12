import stylelint from "stylelint";
import useDesignTokensRule, {
  readSharedTokens,
  ruleName,
} from "../../../../script/stylelint/useDesignTokensRule.mjs";
import { SHARED_TOKENS } from "@packages/seed-bible/seed-bible/app/styles/sharedTokens";

async function lint(code: string) {
  const { results } = await stylelint.lint({
    code,
    config: { plugins: [useDesignTokensRule], rules: { [ruleName]: true } },
  });
  return results[0]!.warnings.map((w) => w.text);
}

describe(ruleName, () => {
  it("reads exactly the shared tokens", () => {
    expect(readSharedTokens()).toEqual(SHARED_TOKENS);
  });

  it.each([
    [".a { border-radius: 0.5rem; }", "--sb-radius-md"],
    [".a { border-top-left-radius: 8px; }", "--sb-radius-md"],
    [".a { border-radius: 999px; }", "--sb-radius-full"],
    [".a { z-index: 500; }", "--sb-layer-popover"],
    [".a { transition: opacity 0.15s ease; }", "--sb-duration-fast"],
    [".a { animation: spin 300ms linear; }", "--sb-duration-slow"],
    [".a { transition-duration: 0.2s; }", "--sb-duration-base"],
    [".a { font-size: 0.875rem; }", "--sb-font-size-14"],
    [".a { font-size: 14px; }", "--sb-font-size-14"],
    [":root { --sb-thing-font-size: 0.75rem; }", "--sb-font-size-12"],
    [
      ".a { box-shadow: 0 10px  30px var(--sb-shadow-color); }",
      "--sb-shadow-popover",
    ],
  ])("reports %s", async (code, token) => {
    const warnings = await lint(code);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(`var(${token})`);
  });

  it("reports each raw corner in a shorthand", async () => {
    const warnings = await lint(".a { border-radius: 0.5rem 0.5rem 0 0; }");
    expect(warnings).toHaveLength(2);
  });

  it.each([
    ["an off-scale value", ".a { border-radius: 0.3rem; font-size: 0.85rem; }"],
    ["a tiny corner", ".a { border-radius: 2px; }"],
    ["an em size", ".a { font-size: 0.875em; }"],
    ["a local stacking value", ".a { z-index: 2; }"],
    ["a token already", ".a { border-radius: var(--sb-radius-md); }"],
    ["a value inside calc()", ".a { font-size: calc(1rem + 2px); }"],
    ["a var() fallback", ".a { border-radius: var(--x, 0.5rem); }"],
    ["a delay", ".a { transition: opacity 0.4s 0.15s; }"],
    ["a long animation", ".a { animation: spin 1s linear infinite; }"],
    ["an icon size", ".a .material-symbols-outlined { font-size: 1.25rem; }"],
    ["a focus ring", ".a { box-shadow: 0 0 0 2px var(--sb-primary-color); }"],
    [
      "keyframes",
      "@keyframes k { from { font-size: 1rem; } to { font-size: 2rem; } }",
    ],
    ["the token definitions", ":root { --sb-radius-md: 0.5rem; }"],
  ])("ignores %s", async (_name, code) => {
    expect(await lint(code)).toEqual([]);
  });

  it("respects a reasoned disable comment", async () => {
    const code = `.a {
  /* stylelint-disable-next-line ${ruleName} -- reader box */
  border-radius: 4px;
}`;
    expect(await lint(code)).toEqual([]);
  });
});
