// @vitest-environment node
import { execFile } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(__dirname, "../../..");

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

describe("SSR bundle", () => {
  let outDir: string;
  let stageDir: string;
  let stagedCode: string;

  beforeAll(async () => {
    outDir = await mkdtemp(path.join(os.tmpdir(), "ssr-build-"));
    stageDir = await mkdtemp(path.join(os.tmpdir(), "ssr-stage-"));

    // Keep the pattern plugin from uploading anything during this build.
    const env = { ...process.env };
    delete env.PATTERN_SESSION_KEY;
    delete env.PATTERN_RECORD_KEY;

    await execFileAsync(
      process.execPath,
      [
        path.join(repoRoot, "node_modules/vite/bin/vite.js"),
        "build",
        "--ssr",
        "standalone/entry-ssr.tsx",
        "--outDir",
        outDir,
        "--emptyOutDir",
      ],
      { cwd: repoRoot, env, maxBuffer: 64 * 1024 * 1024 }
    );

    // Mirror the S3 host (server/store.ts): only `entry-ssr.js` is deployed,
    // and it is staged by itself under a new name in a temp directory.
    const stagedPath = path.join(stageDir, "main__build.mjs");
    await copyFile(path.join(outDir, "entry-ssr.js"), stagedPath);
    stagedCode = await readFile(stagedPath, "utf8");
  }, 300_000);

  afterAll(async () => {
    await Promise.all([
      rm(outDir, { recursive: true, force: true }),
      rm(stageDir, { recursive: true, force: true }),
    ]);
  });

  it("does not import any sibling file that isn't deployed with it", () => {
    const missing = relativeImports(stagedCode).filter(
      (specifier) => !existsSync(path.resolve(stageDir, specifier))
    );

    expect(missing).toEqual([]);
  });

  it.each(POLICY_TITLES)("includes the %s text", (title) => {
    expect(stagedCode).toContain(title);
  });
});
