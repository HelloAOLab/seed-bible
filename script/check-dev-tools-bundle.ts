/**
 * Fails the build if developer tools would reach people who didn't ask for
 * them: in the web build, no file loaded at startup may contain them (they
 * must only be fetched after someone unlocks them); in the native apps'
 * build (`--native`), they must not exist at all.
 *
 * Run after `vite build`; exits non-zero on failure.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ViteManifestChunk } from "./lib/precacheManifest";
import { findDevToolsLeaks } from "./lib/devToolsBundleCheck";

const native = process.argv.includes("--native");
const outDir = path.resolve(
  import.meta.dirname,
  native ? "../standalone/dist/native" : "../standalone/dist/client"
);

const manifest = JSON.parse(
  readFileSync(path.join(outDir, ".vite/manifest.json"), "utf-8")
) as Record<string, ViteManifestChunk>;

const allScripts = readdirSync(path.join(outDir, "assets"))
  .filter((name) => name.endsWith(".js"))
  .map((name) => `assets/${name}`);

const problems = findDevToolsLeaks(manifest, {
  native,
  allScripts,
  readFile: (file) => readFileSync(path.join(outDir, file), "utf-8"),
});

if (problems.length > 0) {
  console.error("Developer tools check failed:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  native
    ? "Developer tools check passed: none in the native build."
    : "Developer tools check passed: none load at startup."
);
