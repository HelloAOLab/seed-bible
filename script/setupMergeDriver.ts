import { execFileSync } from "node:child_process";

/**
 * Registers the `i18n-json` git merge driver in the local clone.
 *
 * Git stores merge driver commands in `.git/config`, which is NOT committed, so
 * every clone must configure the driver locally. This runs as part of the
 * `prepare` script so a plain `pnpm install` wires it up automatically.
 *
 * It is intentionally non-fatal: if we're not inside a git repository (e.g. a
 * shallow CI checkout or an extracted tarball) it does nothing and exits 0 so
 * installs never break.
 */

const DRIVER_NAME = "i18n-json";
const DRIVER_DESCRIPTION = "Three-way merge for i18n translation JSON files";
// %O = base, %A = ours/output, %B = theirs, %L = marker size, %P = real path.
const DRIVER_COMMAND = "bun script/mergeI18nJson.ts %O %A %B %L %P";

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf-8" }).trim();
}

function isInsideGitRepo(): boolean {
  try {
    return git(["rev-parse", "--is-inside-work-tree"]) === "true";
  } catch {
    return false;
  }
}

function main(): void {
  if (!isInsideGitRepo()) {
    // Not a git repo (e.g. CI tarball install) — nothing to configure.
    return;
  }

  try {
    git(["config", `merge.${DRIVER_NAME}.name`, DRIVER_DESCRIPTION]);
    git(["config", `merge.${DRIVER_NAME}.driver`, DRIVER_COMMAND]);
    console.log(`Configured "${DRIVER_NAME}" git merge driver for i18n files.`);
  } catch (error) {
    // Don't fail the install if git config is unavailable for some reason.
    console.warn(
      `Could not configure the "${DRIVER_NAME}" merge driver:`,
      error instanceof Error ? error.message : error
    );
  }
}

main();
