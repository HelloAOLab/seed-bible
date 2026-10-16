import { resolveLocalBin } from "../lib/resolveLocalBin.js";
import { runNodeScript } from "../lib/spawn.js";

/** Type-checks the extension project with its own `tsconfig.json`. */
export async function runCheck(root: string = process.cwd()): Promise<number> {
  const tscPath = await resolveLocalBin(root, "typescript", "tsc");
  console.log("[check] Running tsc --noEmit …");
  return runNodeScript(tscPath, ["--noEmit"], { cwd: root });
}
