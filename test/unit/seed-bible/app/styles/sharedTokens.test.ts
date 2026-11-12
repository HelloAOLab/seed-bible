import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SHARED_TOKENS,
  SHARED_TOKENS_CSS,
} from "@packages/seed-bible/seed-bible/app/styles/sharedTokens";
import { tokenFamily } from "../../../../../script/stylelint/useDesignTokensRule.mjs";

const baseCss = readFileSync(
  resolve(
    __dirname,
    "../../../../../packages/seed-bible/seed-bible/app/styles/base.inline.css"
  ),
  "utf8"
);

/**
 * Every token declaration in the file, wherever it is (`:root`, `body`, or an
 * override inside a media query), so an override the sandbox never gets
 * shows up too. A name declared twice appears twice.
 */
function tokenDeclarations(css: string): [string, string][] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...withoutComments.matchAll(/(--sb-[\w-]+)\s*:\s*([^;]+);/g)]
    .filter((m) => tokenFamily(m[1]!))
    .map((m) => [m[1]!, m[2]!.replace(/\s+/g, " ").trim()]);
}

describe("shared tokens", () => {
  const declared = tokenDeclarations(baseCss);
  const shared: Record<string, string> = SHARED_TOKENS;

  it("all belong to a family the lint rule knows", () => {
    const unknown = Object.keys(SHARED_TOKENS).filter((n) => !tokenFamily(n));
    expect(unknown).toEqual([]);
  });

  it("are all declared in base.inline.css", () => {
    const names = new Set(declared.map(([name]) => name));
    const missing = Object.keys(SHARED_TOKENS).filter((n) => !names.has(n));
    expect(missing).toEqual([]);
  });

  it("match every declaration in base.inline.css", () => {
    const mismatched = declared
      .filter(([name, value]) => shared[name] !== value)
      .map(([name, value]) => `${name}: ${value} (shared: ${shared[name]})`);
    expect(mismatched).toEqual([]);
  });

  it("serialize as one declaration per token", () => {
    expect(SHARED_TOKENS_CSS.split("\n")).toEqual(
      Object.entries(SHARED_TOKENS).map(([name, value]) => `${name}: ${value};`)
    );
  });
});
