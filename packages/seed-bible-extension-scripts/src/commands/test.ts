import { resolveLocalBin } from "../lib/resolveLocalBin.js";
import { runNodeScript } from "../lib/spawn.js";

/** Runs the extension project's Vitest suite. */
export async function runTest(
  extraArgs: string[] = [],
  root: string = process.cwd()
): Promise<number> {
  const vitestPath = await resolveLocalBin(root, "vitest");
  console.log("[test] Running vitest run …");
  // A project without tests yet can still be built.
  return runNodeScript(vitestPath, ["run", "--passWithNoTests", ...extraArgs], {
    cwd: root,
  });
}
