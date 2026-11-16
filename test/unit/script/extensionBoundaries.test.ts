import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

// Built-in extensions share code through shared packages (a `packages/<name>/`
// with no `extension.json`), never by importing from, or depending on, one
// another. See `docs/developer-guide.md` §8.2.4.

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

/**
 * The text from the bracket at `open` to the one that closes it, skipping
 * brackets inside strings.
 */
function bracketed(source: string, open: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < source.length; i++) {
    const char = source[i]!;
    if (quote) {
      if (char === "\\") {
        i++;
      } else if (char === quote) {
        quote = null;
      }
    } else if (char === '"' || char === "'" || char === "`") {
      quote = char;
    } else if ("({[".includes(char)) {
      depth++;
    } else if (")}]".includes(char) && --depth === 0) {
      return source.slice(open, i + 1);
    }
  }
  return source.slice(open);
}

/**
 * What each `registerExtension(...)` call in `source` is given: the call's
 * own text, plus the object literal a variable it's passed was built from.
 */
function registrations(source: string): string[] {
  const found: string[] = [];
  for (const call of source.matchAll(/\bregisterExtension\s*\(/g)) {
    const args = bracketed(source, call.index + call[0].length - 1);
    found.push(args);
    const variable = /^\(\s*([A-Za-z_$][\w$]*)\s*[,)]/.exec(args)?.[1];
    if (variable) {
      const declaration = new RegExp(
        `\\b(?:const|let|var)\\s+${variable.replace("$", "\\$")}\\b[^=]*=\\s*\\{`
      ).exec(source);
      if (declaration) {
        found.push(
          bracketed(source, declaration.index + declaration[0].length - 1)
        );
      }
    }
  }
  return found;
}

function declaresDependencies(source: string): boolean {
  return registrations(source).some((text) =>
    /\bdependencies\b/.test(
      text.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""')
    )
  );
}

describe("declaresDependencies", () => {
  it.each([
    ["before init", `registerExtension({ id, dependencies: ["a"], init })`],
    [
      "after init",
      `registerExtension({ id, init() { return {}; }, dependencies: ["a"] })`,
    ],
    [
      "as shorthand",
      `const dependencies = ["a"];\nregisterExtension({ id, init, dependencies });`,
    ],
    [
      "in a config built first",
      `const config = { id, init, dependencies: ["a"] };\nregisterExtension(config);`,
    ],
  ])("finds dependencies declared %s", (_, source) => {
    expect(declaresDependencies(source)).toBe(true);
  });

  it("ignores a `dependencies` that isn't part of a registration", () => {
    const source = `useClickAndHold({ dependencies: [book] });\nregisterExtension({ id: "x", init: () => ({ label: "a (dependencies) note" }) });`;
    expect(declaresDependencies(source)).toBe(false);
  });
});

describe("built-in extension boundaries", () => {
  it("finds the extensions and the packages they share", () => {
    expect(extensionFolders).toContain("theographic-extension");
    expect(extensionFolders).not.toContain("bible-locations");
    expect(extensionFolders).not.toContain("transcription");
    expect(extensionFolders).not.toContain("seed-bible-utils");
  });

  // Every package, not just extensions: a shared package that imports an
  // extension would tie the extensions using it to that one again.
  it.each(folders)("%s imports from no extension but itself", (folder) => {
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
      (file) => declaresDependencies(readFileSync(file, "utf-8"))
    );
    expect(declaring.map((file) => path.relative(packagesDir, file))).toEqual(
      []
    );
  });
});
