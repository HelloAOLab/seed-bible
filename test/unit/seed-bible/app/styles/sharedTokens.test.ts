import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SHARED_TOKENS,
  SHARED_TOKENS_CSS,
} from "@packages/seed-bible/seed-bible/app/styles/sharedTokens";

const baseCss = readFileSync(
  resolve(
    __dirname,
    "../../../../../packages/seed-bible/seed-bible/app/styles/base.inline.css"
  ),
  "utf8"
);

function rootDeclarations(css: string): Record<string, string> {
  const block = /:root\s*\{([^}]*)\}/.exec(css)![1]!;
  const declarations: Record<string, string> = {};
  for (const m of block.matchAll(/(--sb-[\w-]+)\s*:\s*([^;]+);/g)) {
    declarations[m[1]!] = m[2]!.trim();
  }
  return declarations;
}

describe("shared tokens", () => {
  it("match the values base.inline.css gives the app", () => {
    const declared = rootDeclarations(baseCss);
    const sharedNames = Object.keys(declared).filter((name) =>
      name.startsWith("--sb-radius-")
    );

    expect(sharedNames.sort()).toEqual(Object.keys(SHARED_TOKENS).sort());
    for (const [name, value] of Object.entries(SHARED_TOKENS)) {
      expect(declared[name]).toBe(value);
    }
  });

  it("serialize as one declaration per token", () => {
    expect(SHARED_TOKENS_CSS.split("\n")).toEqual(
      Object.entries(SHARED_TOKENS).map(([name, value]) => `${name}: ${value};`)
    );
  });
});
