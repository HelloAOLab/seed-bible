import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { listPackages } from "./lib/package";
import { getTsconfig } from "get-tsconfig";

type ModulePaths = {
  [key: string]: string[];
};

const defaultPaths = {
  "@packages/*": ["./packages/*"],
  "https://esm.helloao.org/vendor-3PZUL55I.js": ["./lib/vendor.ts"],
};

const moduleFileTypes = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

async function updateModulePaths() {
  const tsconfig = getTsconfig();

  if (!tsconfig) {
    throw new Error("Could not find tsconfig.json");
  }

  if (!tsconfig.config.compilerOptions) {
    tsconfig.config.compilerOptions = {};
  }

  const modulePaths: ModulePaths = { ...defaultPaths };
  for (const p of await listPackages()) {
    const relativePath = path.posix.normalize(path.posix.join("./packages", p));
    const modules = await buildModulePaths(relativePath);
    Object.assign(modulePaths, modules);
  }

  tsconfig.config.compilerOptions.paths = modulePaths;

  await writeFile(
    path.resolve("tsconfig.json"),
    JSON.stringify(tsconfig.config, null, 2),
    "utf-8"
  );
}

async function buildModulePaths(
  dir: string,
  parentModuleName: string = ""
): Promise<ModulePaths> {
  const modules: ModulePaths = {};
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const fileNameWithoutExt = path.basename(e.name, path.extname(e.name));
    const moduleName = parentModuleName
      ? `${parentModuleName}.${fileNameWithoutExt}`
      : fileNameWithoutExt;
    if (e.isFile()) {
      if (moduleFileTypes.includes(path.extname(e.name))) {
        const modulePath = enforceRelativePath(path.posix.join(dir, e.name));
        console.log(`${moduleName} -> ${modulePath}`);
        modules[moduleName] = [modulePath];
      }
    } else if (e.isDirectory()) {
      const childModules = await buildModulePaths(
        path.posix.join(dir, e.name),
        moduleName
      );
      Object.assign(modules, childModules);
    }
  }
  return modules;
}

function enforceRelativePath(p: string): string {
  if (!p.startsWith(".")) {
    return `./${p}`;
  }
  return p;
}

updateModulePaths();
