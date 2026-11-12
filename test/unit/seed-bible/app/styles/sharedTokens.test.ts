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

// The shadow tokens live on `body` (they read the theme's shadow color, which
// is set there); everything else is on `:root`.
function tokenDeclarations(css: string): Record<string, string> {
  const blocks = [
    /:root\s*\{([^}]*)\}/.exec(css)![1]!,
    /^body\s*\{([^}]*)\}/m.exec(css)![1]!,
  ];
  const declarations: Record<string, string> = {};
  for (const block of blocks) {
    for (const m of block.matchAll(/(--sb-[\w-]+)\s*:\s*([^;]+);/g)) {
      declarations[m[1]!] = m[2]!.replace(/\s+/g, " ").trim();
    }
  }
  return declarations;
}

describe("shared tokens", () => {
  it("match the values base.inline.css gives the app", () => {
    const declared = tokenDeclarations(baseCss);
    // Each family is its tokens' shared prefix (`--sb-radius-`), so a new
    // family is covered as soon as it's added to SHARED_TOKENS.
    const families = new Set(
      Object.keys(SHARED_TOKENS).map((name) => name.replace(/[^-]+$/, ""))
    );
    const sharedNames = Object.keys(declared).filter(
      (name) =>
        [...families].some((family) => name.startsWith(family)) &&
        // The theme's shadow color, which the shadow tokens are built on.
        name !== "--sb-shadow-color"
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
