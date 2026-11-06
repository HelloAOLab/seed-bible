import { resolveLocalBin } from "../lib/resolveLocalBin.js";
import { runNodeScript } from "../lib/spawn.js";

/** Lints the extension project with its own `eslint.config.mts`. */
export async function runLint(
  options: { fix: boolean },
  root: string = process.cwd()
): Promise<number> {
  const eslintPath = await resolveLocalBin(root, "eslint");
  const args = options.fix ? [".", "--fix"] : ["."];
  console.log(`[lint] Running eslint${options.fix ? " --fix" : ""} …`);
  return runNodeScript(eslintPath, args, { cwd: root });
}
