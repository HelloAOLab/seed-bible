/**
 * Verifies the built SSR bundle still works once deployed. Deploy uploads only
 * `entry-ssr.js` (as `server.mjs`) and the S3 host stages that one file by
 * itself (`server/store.ts`), so the bundle must not import sibling chunks,
 * and the lazily-imported policy bundles must be inlined into it.
 *
 * Run after `vite build --ssr`; exits non-zero on failure.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const bundlePath = path.resolve("standalone/dist/server/entry-ssr.js");

// Each lazily-imported policy bundle, identified by its title.
const POLICY_TITLES = [
  "AO Lab Web Services Terms of Service",
  "AO Lab Web Services Privacy Policy",
  "AO Lab Web Services Acceptable Use Policy",
];

/**
 * Relative chunk specifiers (static, side-effect and dynamic imports). Only
 * `.js`/`.mjs` paths count: emitted chunks always carry the extension, while
 * bundled JSDoc like `@param {import('../types/index').X}` does not. Comment
 * lines are skipped for the same reason.
 */
function relativeImports(code: string): string[] {
  const pattern =
    /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'](\.{1,2}\/[^"']+\.m?js)["']/g;
  return code
    .split("\n")
    .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
    .flatMap((line) =>
      [...line.matchAll(pattern)].map((match) => match[1] ?? "")
    );
}

const code = await readFile(bundlePath, "utf8");
const errors: string[] = [];

const chunkImports = [...new Set(relativeImports(code))];
if (chunkImports.length > 0) {
  errors.push(
    `imports ${chunkImports.length} sibling file(s) that aren't deployed with it, e.g. ${chunkImports
      .slice(0, 5)
      .join(", ")}`
  );
}

for (const title of POLICY_TITLES) {
  if (!code.includes(title)) {
    errors.push(`is missing the "${title}" text`);
  }
}

if (errors.length > 0) {
  console.error(`SSR bundle check failed: ${path.relative(".", bundlePath)}`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("SSR bundle check passed.");
