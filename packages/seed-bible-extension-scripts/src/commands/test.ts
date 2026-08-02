import { resolveLocalBin } from "../lib/resolveLocalBin.js";
import { runNodeScript } from "../lib/spawn.js";

/** Runs the extension project's Vitest suite. */
export async function runTest(
  extraArgs: string[] = [],
  root: string = process.cwd()
): Promise<number> {
  const vitestPath = await resolveLocalBin(root, "vitest");
  console.log("[test] Running vitest run …");
  return runNodeScript(vitestPath, ["run", ...extraArgs], { cwd: root });
}
