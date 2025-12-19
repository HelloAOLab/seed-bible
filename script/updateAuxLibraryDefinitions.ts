import { cp } from "node:fs/promises";
import path from "node:path";

async function updateAuxLibraryDefinitions() {
  const sourcePath = path.resolve(
    "node_modules",
    "@casual-simulation",
    "aux-runtime",
    "runtime",
    "AuxLibraryDefinitions.def"
  );
  const destPath = path.resolve("typings", "AuxLibraryDefinitions.d.ts");

  await cp(sourcePath, destPath, { force: true });
  console.log(`Updated AuxLibraryDefinitions.d.ts from aux-runtime package.`);
}

updateAuxLibraryDefinitions();
