import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// Built-in extensions share code through shared packages (a `packages/<name>/`
// with no `extension.json`), never by importing from, or depending on, one
// another. See `docs/developer-guide.md` §4.4.

const packagesDir = path.resolve(__dirname, "../../../packages");

const folders = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const extensionFolders = folders.filter((folder) =>
  existsSync(path.join(packagesDir, folder, "extension.json"))
);

const folderByPackageName = new Map<string, string>();
for (const folder of folders) {
  const packageJson = path.join(packagesDir, folder, "package.json");
  if (existsSync(packageJson)) {
    const { name } = JSON.parse(readFileSync(packageJson, "utf-8")) as {
      name?: string;
    };
    if (name) {
      folderByPackageName.set(name, folder);
    }
  }
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return ["node_modules", "dist"].includes(entry.name)
        ? []
        : sourceFiles(full);
    }
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [full] : [];
  });
}

const IMPORT_SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"']+)["']/g;

/** The `packages/` folder an import specifier points into, if any. */
function targetFolder(file: string, specifier: string): string | undefined {
  if (specifier.startsWith(".")) {
    const relative = path.relative(
      packagesDir,
      path.resolve(path.dirname(file), specifier)
    );
    return relative.startsWith("..") ? undefined : relative.split(path.sep)[0];
  }
  if (specifier.startsWith("@packages/")) {
    return specifier.split("/")[1];
  }
  for (const [name, folder] of folderByPackageName) {
    if (specifier === name || specifier.startsWith(`${name}/`)) {
      return folder;
    }
  }
  return undefined;
}

describe("built-in extension boundaries", () => {
  it("finds the extensions and the packages they share", () => {
    expect(extensionFolders).toContain("theographic-extension");
    expect(extensionFolders).not.toContain("bible-locations");
    expect(extensionFolders).not.toContain("transcription");
    expect(extensionFolders).not.toContain("seed-bible-utils");
  });

  it.each(extensionFolders)("%s imports from no other extension", (folder) => {
    const crossings: string[] = [];
    for (const file of sourceFiles(path.join(packagesDir, folder))) {
      const source = readFileSync(file, "utf-8");
      for (const [, specifier = ""] of source.matchAll(IMPORT_SPECIFIER)) {
        const target = targetFolder(file, specifier);
        if (
          target !== undefined &&
          target !== folder &&
          extensionFolders.includes(target)
        ) {
          crossings.push(
            `${path.relative(packagesDir, file)} imports "${specifier}"`
          );
        }
      }
    }
    expect(crossings).toEqual([]);
  });

  it.each(extensionFolders)("%s declares no dependencies", (folder) => {
    const meta = JSON.parse(
      readFileSync(path.join(packagesDir, folder, "extension.json"), "utf-8")
    ) as { dependencies?: string[] };
    expect(meta.dependencies ?? []).toEqual([]);

    const declaring = sourceFiles(path.join(packagesDir, folder)).filter(
      (file) =>
        /registerExtension\(\{(?:(?!\binit\b)[\s\S])*\bdependencies\b/.test(
          readFileSync(file, "utf-8")
        )
    );
    expect(declaring.map((file) => path.relative(packagesDir, file))).toEqual(
      []
    );
  });
});
