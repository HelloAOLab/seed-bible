import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// Phone-vs-desktop styles read `<html data-layout>` (see
// `app/layoutAttribute.ts`) instead of checking the window width themselves,
// so they can't disagree with `isMobile` about which layout is showing. A new
// `@media (max-width: 480px)` would bring that disagreement back.

const repoRoot = path.resolve(__dirname, "../../..");
const packagesDir = path.join(repoRoot, "packages");

/**
 * Width queries at the phone breakpoint that are about how much room there is,
 * not about phone vs. desktop. Each has a comment beside it saying so.
 */
const ALLOWED = new Set([
  "packages/seed-bible/seed-bible/components/CreateAnnotationForm/CreateAnnotationForm.css",
  "packages/seed-bible/seed-bible/components/YourContentPane/YourContentPane.css",
]);

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return ["node_modules", "dist"].includes(entry.name)
        ? []
        : cssFiles(full);
    }
    return entry.name.endsWith(".css") ? [full] : [];
  });
}

const MEDIA_PRELUDE = /@media([^{]*)\{/g;
const PHONE_BREAKPOINT = /width[^)]*\b48[01]px/;

/** Each `@media` prelude in `css` that checks the width against 480 or 481px. */
function phoneBreakpointQueries(css: string): string[] {
  return Array.from(css.matchAll(MEDIA_PRELUDE), (match) => match[1]!.trim())
    .filter((prelude) => PHONE_BREAKPOINT.test(prelude))
    .map((prelude) => `@media ${prelude}`);
}

describe("phone breakpoint media queries", () => {
  it("finds the forms a phone breakpoint query can take", () => {
    expect(
      phoneBreakpointQueries(`
        @media (max-width: 480px) { .a { color: red; } }
        @media only screen and (min-width: 481px) { .b { color: red; } }
        @media (width <= 480px) { .c { color: red; } }
        @media (hover: hover) and (min-width:481px) { .d { color: red; } }
      `)
    ).toEqual([
      "@media (max-width: 480px)",
      "@media only screen and (min-width: 481px)",
      "@media (width <= 480px)",
      "@media (hover: hover) and (min-width:481px)",
    ]);
  });

  it("ignores other breakpoints and plain 480px sizes", () => {
    expect(
      phoneBreakpointQueries(`
        @media (max-width: 768px) { .a { width: 480px; } }
        @media (min-width: 1480px) { .b { color: red; } }
      `)
    ).toEqual([]);
  });

  it("are only used where the room matters, not for phone vs. desktop", () => {
    const offenders = cssFiles(packagesDir).flatMap((file) => {
      const relative = path.relative(repoRoot, file).split(path.sep).join("/");
      if (ALLOWED.has(relative)) {
        return [];
      }
      return phoneBreakpointQueries(readFileSync(file, "utf-8")).map(
        (query) => `${relative}: ${query}`
      );
    });

    // Use `:where(html[data-layout="mobile"]) .x` (or
    // `:where(html:not([data-layout="mobile"])) .x` for desktop) instead.
    expect(offenders).toEqual([]);
  });

  it("allows only files that still have such a query", () => {
    const stale = [...ALLOWED].filter(
      (relative) =>
        phoneBreakpointQueries(
          readFileSync(path.join(repoRoot, relative), "utf-8")
        ).length === 0
    );

    expect(stale).toEqual([]);
  });
});
