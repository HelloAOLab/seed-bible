import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Resolves the absolute path to a locally-installed package's CLI entry
 * point, using Node's own module resolution rooted at `projectRoot`. This is
 * package-manager-agnostic on purpose — it never assumes a shell shim (like
 * `node_modules/.bin/tsc`) is on PATH, which npm/pnpm/yarn/bun all set up
 * slightly differently — it just asks Node where the package actually is and
 * reads the `bin` entry out of its own `package.json`.
 */
export async function resolveLocalBin(
  projectRoot: string,
  packageName: string,
  binName: string = packageName
): Promise<string> {
  const require = createRequire(path.join(projectRoot, "package.json"));

  let pkgJsonPath: string;
  try {
    pkgJsonPath = require.resolve(`${packageName}/package.json`);
  } catch {
    throw new Error(
      `Could not resolve "${packageName}" from ${projectRoot}. Make sure it is installed (check package.json and re-run your package manager's install command).`
    );
  }

  const pkgJson = JSON.parse(await readFile(pkgJsonPath, "utf-8")) as {
    bin?: string | Record<string, string>;
  };
  const pkgDir = path.dirname(pkgJsonPath);

  let binRelative: string | undefined;
  if (typeof pkgJson.bin === "string") {
    binRelative = pkgJson.bin;
  } else if (pkgJson.bin && typeof pkgJson.bin === "object") {
    binRelative = pkgJson.bin[binName] ?? Object.values(pkgJson.bin)[0];
  }

  if (!binRelative) {
    throw new Error(
      `"${packageName}" does not declare a "bin" entry in its package.json — cannot run it as a CLI.`
    );
  }

  return path.resolve(pkgDir, binRelative);
}
