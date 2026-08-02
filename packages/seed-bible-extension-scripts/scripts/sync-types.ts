/**
 * Maintenance script — run inside this monorepo only (`pnpm --filter
 * seed-bible-extension-scripts run sync-types` from the repo root), never
 * shipped to third parties.
 *
 * Regenerates the vendored `.d.ts` type declarations that
 * `create-seed-bible-extension`'s template ships to third-party developers,
 * so a scaffolded extension gets accurate `SeedBibleState`/`registerExtension`
 * types without depending on a published `seed-bible` npm package (none
 * exists — it's a pnpm workspace-local package here).
 *
 * Runs a real, full-project `tsc --declaration --emitDeclarationOnly` (via
 * `tsc-silent`, so the same known-noisy pre-existing diagnostics the app's
 * own `pnpm check:ts:client` already tolerates are suppressed the same way)
 * rooted at this repo's own `tsconfig.json`, so every ambient global this
 * codebase relies on (`typings/*.d.ts`: `import.meta.env`/`.glob`, the
 * `posthog` global, `*.css` side-effect imports, the `virtual:@extensions`
 * module) is naturally part of the compiled project — unlike a
 * single-entry-point bundler tool, which has to be told about each of those
 * by hand and (in the case of `dts-bundle-generator`, tried first) can still
 * crash on this codebase's barrel `export *` files regardless.
 *
 * The result is a full mirrored `.d.ts` tree (one file per compiled source
 * file, relative imports between them intact) copied out of the three
 * extension-authoring entry points' reachable set — `seed-bible`
 * (`app/api.tsx`), `seed-bible/components` (`components/index.tsx`),
 * `seed-bible/i18n` (curated — see `I18N_CURATION_NOTE` below). Third-party
 * package imports (`@casual-simulation/*`, `@tiptap/*`, `rxjs`, etc. —
 * whatever `SeedBibleState` transitively touches) are left as real imports
 * in the output, so this script also resolves each one's version (via
 * `pnpm-workspace.yaml`'s `catalog:`, falling back to the root
 * `package.json`) and writes a `devDependencies` fragment the scaffolder
 * merges into a new project's `package.json`.
 *
 * This is a real, sizeable vendored tree by design (see
 * `docs/developer-guide.md`'s extension-tooling section) — full type
 * fidelity was chosen over a narrower, hand-curated surface, so expect a
 * diff here whenever `SeedBibleState` (or anything it touches) changes.
 * Re-run this script and commit the result as part of that change.
 */
import { mkdir, readFile, writeFile, rm, cp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { resolveLocalBin } from "../src/lib/resolveLocalBin.js";
import { runNodeScript } from "../src/lib/spawn.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Walks up from `startDir` to find the directory containing `pnpm-workspace.yaml`. */
function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (;;) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Could not find pnpm-workspace.yaml above ${startDir} — this script must run inside the seed-bible monorepo.`
      );
    }
    dir = parent;
  }
}

const repoRoot = findRepoRoot(here);
const packageRoot = path.resolve(here, "..");
const outDir = path.resolve(packageRoot, "vendor-types");
const tmpDir = path.resolve(packageRoot, ".sync-types-tmp");
const rawOutDir = path.join(tmpDir, "raw");
const seedBibleSourceDir = path.join(
  repoRoot,
  "packages",
  "seed-bible",
  "seed-bible"
);

/**
 * `seed-bible/i18n`'s vendored "entry" is a curated re-export list, not
 * `i18n/index.tsx` itself: extensions only ever use `useI18n()` (confirmed
 * against every extension in this repo), never `createI18nManager` (an
 * app-bootstrap-only factory, called exactly once by
 * `SeedBibleStateManager.tsx`) — so there's no reason to vendor it. This
 * incidentally also sidesteps a real declaration-emission wrinkle
 * `createI18nManager` used to have (TS2883: its `changeLanguage` was
 * inferred from `i18next.changeLanguage.bind(...)`, which carried an
 * unnameable internal i18next type) — since fixed at the source
 * (`I18nManager.tsx` now types `changeLanguage` explicitly), but the curated
 * entry stays regardless, on its own "extensions don't need this" merits.
 */
interface EntryTarget {
  /** Module specifier this vendored file stands in for, e.g. "seed-bible". */
  moduleSpecifier: string;
  /** Absolute path to the real source file whose declaration output represents this entry. */
  sourceFile: string;
}

const entryTargets: EntryTarget[] = [
  {
    moduleSpecifier: "seed-bible",
    sourceFile: path.join(seedBibleSourceDir, "app", "api.tsx"),
  },
  {
    moduleSpecifier: "seed-bible/components",
    sourceFile: path.join(seedBibleSourceDir, "components", "index.tsx"),
  },
  {
    moduleSpecifier: "seed-bible/i18n",
    // Not `i18n/index.tsx` — see I18N_CURATION_NOTE above. This curated
    // wrapper lives in this package (not the real app source) since it's
    // purely a vendoring concern, not something the app itself needs.
    sourceFile: path.join(here, "i18n-entry.ts"),
  },
];

const I18N_ENTRY_SOURCE =
  'export { useI18n, addTranslations, i18n } from "../../seed-bible/seed-bible/i18n/I18nManager";\n' +
  'export type { I18nHook, BotTranslations } from "../../seed-bible/seed-bible/i18n/I18nManager";\n';

/** Extracts the bare package name a non-relative import specifier resolves to, e.g. "rxjs/operators" -> "rxjs", "@casual-simulation/aux-common" -> "@casual-simulation/aux-common". */
function packageNameFromSpecifier(specifier: string): string | null {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    return null;
  }
  const segments = specifier.split("/");
  if (specifier.startsWith("@")) {
    return segments.slice(0, 2).join("/");
  }
  return segments[0]!;
}

async function collectImportedPackagesInTree(
  dir: string
): Promise<Set<string>> {
  const packages = new Set<string>();
  // Anchored to the start of a (possibly indented) line and requires an
  // `import`/`export` keyword before `from` — emitted `.d.ts` files retain
  // the original source's JSDoc comments verbatim, and a looser pattern
  // matches prose that happens to contain "from ... quote-mark ... quote-mark"
  // (observed: a comment's "...uninstalled elsewhere..." sentence, matched as
  // a fake "package name" spanning to the next unrelated quote in the file).
  const importRe =
    /^[ \t]*(?:import|export)\b[^;\n]*\bfrom\s+["']([^"']+)["']/gm;

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.name.endsWith(".d.ts")) {
        continue;
      }
      const text = await readFile(full, "utf-8");
      let match: RegExpExecArray | null;
      while ((match = importRe.exec(text))) {
        const pkg = packageNameFromSpecifier(match[1]!);
        if (pkg) {
          packages.add(pkg);
        }
      }
    }
  }

  await walk(dir);
  return packages;
}

async function resolvePackageVersions(
  packageNames: Set<string>
): Promise<{ resolved: Record<string, string>; unresolved: string[] }> {
  const workspaceYaml = parseYaml(
    await readFile(path.join(repoRoot, "pnpm-workspace.yaml"), "utf-8")
  ) as { catalog?: Record<string, string> };
  const catalog = workspaceYaml.catalog ?? {};

  const rootPackageJson = JSON.parse(
    await readFile(path.join(repoRoot, "package.json"), "utf-8")
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const resolved: Record<string, string> = {};
  const unresolved: string[] = [];

  for (const name of [...packageNames].sort()) {
    const version =
      catalog[name] ??
      rootPackageJson.dependencies?.[name] ??
      rootPackageJson.devDependencies?.[name];
    if (version) {
      resolved[name] = version;
    } else {
      unresolved.push(name);
    }
  }

  return { resolved, unresolved };
}

/** Writes the temp project's tsconfig.json, reusing the real tsc-silent.config.cjs as-is. */
async function writeTempProjectFiles(): Promise<{
  tsconfigPath: string;
  suppressConfigPath: string;
}> {
  const tsconfigPath = path.join(tmpDir, "tsconfig.json");
  const tsconfig = {
    extends: path.join(repoRoot, "tsconfig.json"),
    compilerOptions: {
      noEmit: false,
      declaration: true,
      emitDeclarationOnly: true,
      outDir: rawOutDir,
      rootDir: repoRoot,
    },
    include: [
      path.join(repoRoot, "typings"),
      ...entryTargets
        .filter((e) => path.dirname(e.sourceFile) !== here)
        .map((e) => e.sourceFile),
      path.join(here, "i18n-entry.ts"),
      // A file that's only ever reached through a plain pass-through
      // re-export (`export { x } from "./Y"` / `export * from "./Y"`)
      // doesn't automatically get its own `.d.ts` emitted — tsc only
      // guarantees that for `include`d root files. `I18nManager.tsx` is
      // reached exactly that way (by `i18n-entry.ts` above, and by the real
      // `i18n/index.tsx` barrel other entries pull in), so without this it's
      // referenced by path from emitted re-exports but never actually
      // written, leaving a dangling reference in the vendored output.
      path.join(seedBibleSourceDir, "i18n", "I18nManager.tsx"),
    ],
  };
  await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2), "utf-8");

  return {
    tsconfigPath,
    suppressConfigPath: path.join(repoRoot, "tsc-silent.config.cjs"),
  };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });

  try {
    await writeFile(
      path.join(here, "i18n-entry.ts"),
      I18N_ENTRY_SOURCE,
      "utf-8"
    );
    const { tsconfigPath, suppressConfigPath } = await writeTempProjectFiles();

    const tscSilentBin = await resolveLocalBin(
      repoRoot,
      "tsc-silent",
      "tsc-silent"
    );
    console.log("Running tsc-silent --declaration --emitDeclarationOnly …");
    const exitCode = await runNodeScript(
      tscSilentBin,
      ["--project", tsconfigPath, "--suppressConfig", suppressConfigPath],
      { cwd: repoRoot }
    );
    if (exitCode !== 0) {
      throw new Error(`tsc-silent exited with code ${exitCode}`);
    }

    // Copy just the seed-bible source subtree (not `typings/`, which only
    // mattered for compiling — third parties never import
    // `virtual:@extensions`/`posthog`/etc.) into vendor-types/, dropping the
    // `packages/seed-bible/seed-bible/` prefix `rootDir` mirrored it under.
    const rawSeedBibleDir = path.join(
      rawOutDir,
      path.relative(repoRoot, seedBibleSourceDir)
    );
    await rm(outDir, { recursive: true, force: true });
    await cp(rawSeedBibleDir, outDir, { recursive: true });

    // The curated i18n entry compiled from `here` (this script's own
    // directory, sitting under `packages/seed-bible-extension-scripts/
    // scripts/`), so its `.d.ts` landed at that mirrored path instead —
    // move it alongside the other two entries' outputs for a flat,
    // consistent `vendor-types/` layout. Flattening changes the correct
    // relative import depth (it was written correct for its *original*,
    // deeper location), so rewrite it to point at the copy of
    // `I18nManager.d.ts` that's now a sibling under `vendor-types/i18n/`.
    const rawI18nEntry = path.join(
      rawOutDir,
      path.relative(repoRoot, here),
      "i18n-entry.d.ts"
    );
    const i18nEntryContent = (await readFile(rawI18nEntry, "utf-8")).replaceAll(
      "../../seed-bible/seed-bible/i18n/I18nManager",
      "./i18n/I18nManager"
    );
    await writeFile(
      path.join(outDir, "i18n-entry.d.ts"),
      i18nEntryContent,
      "utf-8"
    );

    // Report each entry's resolved output path relative to vendor-types/,
    // for the template's tsconfig "paths" mapping (see create-seed-bible-
    // extension's tsconfig.json.tpl).
    for (const entry of entryTargets) {
      const isI18n = entry.moduleSpecifier === "seed-bible/i18n";
      const relOutput = isI18n
        ? "i18n-entry.d.ts"
        : path
            .relative(seedBibleSourceDir, entry.sourceFile)
            .replace(/\.tsx?$/, ".d.ts");
      console.log(`"${entry.moduleSpecifier}" -> vendor-types/${relOutput}`);
    }

    const allImportedPackages = await collectImportedPackagesInTree(outDir);
    const { resolved, unresolved } =
      await resolvePackageVersions(allImportedPackages);

    await writeFile(
      path.join(outDir, "devDependencies.generated.json"),
      `${JSON.stringify(resolved, null, 2)}\n`,
      "utf-8"
    );

    console.log(
      `\nResolved ${Object.keys(resolved).length} type-only devDependency version(s).`
    );
    if (unresolved.length > 0) {
      console.warn(
        `\nCould not resolve a version for: ${unresolved.join(", ")}. These packages are referenced by the vendored types but have no pnpm-workspace.yaml catalog entry or root package.json dependency — add one, or the scaffolded template's TypeScript check will fail to resolve them.`
      );
    }
  } finally {
    await rm(path.join(here, "i18n-entry.ts"), { force: true });
    await rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
