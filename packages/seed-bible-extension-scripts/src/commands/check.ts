import { resolveLocalBin } from "../lib/resolveLocalBin.js";
import { runNodeScript } from "../lib/spawn.js";
import { loadExtensionProjectInfo } from "../lib/project.js";
import {
  checkManifestPermissions,
  checkPermissionUses,
  findPermissionUses,
} from "../lib/manifestPolicy.js";
import {
  isSandboxedProject,
  readProjectSources,
} from "../lib/sandboxedProject.js";

/**
 * Type-checks the extension project with its own `tsconfig.json`, and, for a
 * sandboxed extension, checks `extension.json` against what Seed Bible will
 * install and what the code uses.
 */
export async function runCheck(root: string = process.cwd()): Promise<number> {
  const tscPath = await resolveLocalBin(root, "typescript", "tsc");
  console.log("[check] Running tsc --noEmit …");
  const tscCode = await runNodeScript(tscPath, ["--noEmit"], { cwd: root });
  const permissionsCode = await checkPermissions(root);
  return tscCode !== 0 ? tscCode : permissionsCode;
}

/** Prints what's wrong with the manifest's permissions; 1 if anything is. */
export async function checkPermissions(root: string): Promise<number> {
  const info = await loadExtensionProjectInfo(root);
  const sources = await readProjectSources(root);
  if (!isSandboxedProject(sources)) {
    return 0;
  }
  console.log("[check] Checking extension.json's permissions …");
  const { errors, warnings } = checkPermissionUses(
    info.meta,
    findPermissionUses(sources)
  );
  const problems = [...checkManifestPermissions(info.meta), ...errors];
  for (const problem of problems) {
    console.error(`[check] ${problem}`);
  }
  for (const warning of warnings) {
    console.warn(`[check] warning: ${warning}`);
  }
  return problems.length > 0 ? 1 : 0;
}
