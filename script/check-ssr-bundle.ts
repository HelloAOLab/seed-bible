/**
 * Verifies the built SSR bundle still works once deployed. Deploy uploads only
 * `entry-ssr.js` (as `server.mjs`) and the S3 host stages that one file by
 * itself (`server/store.ts`), so the bundle must load on its own, must not
 * reference sibling chunks, and must carry the lazily-imported policy bundles
 * inline.
 *
 * Run with Bun (the host's runtime) after `vite build --ssr`; exits non-zero
 * on failure.
 */
import { copyFile, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const bundlePath = path.resolve(
  import.meta.dirname,
  "../standalone/dist/server/entry-ssr.js"
);
const policiesDir = path.resolve(
  import.meta.dirname,
  "../packages/seed-bible/seed-bible/i18n/policies"
);

/**
 * Relative sibling-file references: static, side-effect and dynamic imports,
 * plus `new URL("./x", import.meta.url)` assets. Import specifiers only count
 * with a `.js`/`.mjs` extension: emitted chunks always carry one, while
 * bundled JSDoc like `@param {import('../types/index').X}` does not. JSDoc
 * continuation lines (`*`) and `//` comments are skipped for the same reason.
 */
function siblingReferences(code: string): string[] {
  const patterns = [
    /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'](\.{1,2}\/[^"']+\.m?js)["']/g,
    /\bnew\s+URL\(\s*["'](\.{1,2}\/[^"']+)["']\s*,\s*import\.meta\.url/g,
  ];
  return code
    .split("\n")
    .filter((line) => !/^\s*(\*|\/\/)/.test(line))
    .flatMap((line) =>
      patterns.flatMap((pattern) =>
        [...line.matchAll(pattern)].map((match) => match[1] ?? "")
      )
    );
}

/** The `<h1>` title of each policy's English bundle, keyed by policy folder. */
async function policyTitles(): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  for (const policy of await readdir(policiesDir)) {
    const resources = JSON.parse(
      await readFile(path.join(policiesDir, policy, "en.json"), "utf8")
    ) as Record<string, string>;
    const title = Object.values(resources)
      .map((html) => /<h1[^>]*>([^<]+)<\/h1>/.exec(html)?.[1])
      .find(Boolean);
    if (!title) {
      throw new Error(`No <h1> title found in the ${policy} policy bundle`);
    }
    titles.set(policy, title);
  }
  return titles;
}

async function check(stageDir: string): Promise<string[]> {
  const errors: string[] = [];
  const stagedPath = path.join(stageDir, "server.mjs");
  await copyFile(bundlePath, stagedPath);
  const code = await readFile(stagedPath, "utf8");

  const missing = [...new Set(siblingReferences(code))].filter(
    (specifier) => !existsSync(path.resolve(stageDir, specifier))
  );
  if (missing.length > 0) {
    errors.push(
      `references ${missing.length} sibling file(s) that aren't deployed with it, e.g. ${missing
        .slice(0, 5)
        .join(", ")}`
    );
  }

  for (const [policy, title] of await policyTitles()) {
    if (!code.includes(title)) {
      errors.push(`is missing the ${policy} text ("${title}")`);
    }
  }

  // Load it exactly as `server/index.ts` does, from its staged copy.
  try {
    const mod = (await import(pathToFileURL(stagedPath).href)) as {
      render?: unknown;
    };
    if (typeof mod.render !== "function") {
      errors.push("doesn't export render()");
    }
  } catch (error) {
    errors.push(`fails to load: ${String(error)}`);
  }

  return errors;
}

if (!existsSync(bundlePath)) {
  console.error(
    `SSR bundle check failed: ${bundlePath} doesn't exist. Run \`vite build --ssr\` first.`
  );
  process.exit(1);
}

const stageDir = await mkdtemp(path.join(os.tmpdir(), "ssr-check-"));
let errors: string[];
try {
  errors = await check(stageDir);
} finally {
  await rm(stageDir, { recursive: true, force: true });
}

if (errors.length > 0) {
  console.error(`SSR bundle check failed: ${bundlePath}`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log("SSR bundle check passed.");
// Importing the bundle may leave timers or handles open; don't wait on them.
process.exit(0);
