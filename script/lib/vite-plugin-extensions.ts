import type { Plugin, ViteDevServer } from "vite";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// Virtual module convention: `virtual:@extensions` resolves to a module whose
// default export is the `ExtensionSet` for the app — auto-discovered from every
// extension package under `packages/` rather than maintained by hand.
//
// An "extension package" is any `packages/<folder>/` directory that contains an
// `extension.json` at its root (the extension's `meta`). This matches every
// extension and excludes the main `packages/seed-bible` app, which has none.
//
// The module is generated as source: the `meta` for each extension is inlined
// as a JS literal, but trimmed down to just `title`/`description` per locale —
// the only translations needed before an extension is installed (to render it
// in the Settings extensions list). The full per-locale translations (every
// other UI string the extension uses) and the extension's code are each
// exposed as `() => import(...)` thunks, so Vite code-splits both into chunks
// that are only fetched once the extension is actually installed.
//
// The `\0` prefix on the resolved id is the Rollup convention that tells other
// plugins to leave the id alone.
const VIRTUAL_ID = "virtual:@extensions";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

// Must match the `id` of the hand-written set this replaces.
const EXTENSION_SET_ID = "seed-bible";

const packagesDir = path.resolve("packages");

// An extension package either lives under `packages/<folder>/` (bundled — the
// normal case, discovered below) or, for local development of an
// out-of-tree/third-party extension (see `seed-bible-extension-scripts dev`),
// in an arbitrary external directory supplied via `SEED_BIBLE_EXTRA_EXTENSION_DIRS`.
// Both are discovered the same way (an `extension.json` at the directory's
// root) but need different import specifiers, since the `@packages` alias
// only reaches inside `packagesDir`.
interface BundledExtensionEntry {
  kind: "bundled";
  /** Folder name directly under `packages/`. */
  folder: string;
}

interface ExternalExtensionEntry {
  kind: "external";
  /** Absolute path to the extension's root directory. */
  dir: string;
}

type ExtensionEntry = BundledExtensionEntry | ExternalExtensionEntry;

/**
 * Parses `SEED_BIBLE_EXTRA_EXTENSION_DIRS` — a comma-separated list of
 * absolute (or cwd-relative) paths to extension directories living outside
 * `packages/`. Unset/empty by default, which is what every normal dev/build
 * run uses; this only matters for `seed-bible-extension-scripts dev`, which
 * sets it to point at a scaffolded third-party extension project.
 */
export function parseExtraExtensionDirs(): string[] {
  const raw = process.env.SEED_BIBLE_EXTRA_EXTENSION_DIRS;
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => path.resolve(entry));
}

function extensionMetaPath(entry: ExtensionEntry): string {
  return entry.kind === "bundled"
    ? path.resolve(packagesDir, entry.folder, "extension.json")
    : path.resolve(entry.dir, "extension.json");
}

/**
 * Builds a Vite `/@fs/` URL for an absolute directory, mirroring Vite's own
 * `FS_PREFIX` convention for importing files outside the project root — this
 * is what lets an external extension directory be imported by the dev server
 * without needing to live under the `@packages` alias. Works for both POSIX
 * (`/@fs/home/user/my-ext`) and Windows (`/@fs/C:/Users/dev/my-ext`) paths.
 */
function toFsImportBase(absDir: string): string {
  const normalized = absDir.split(path.sep).join("/");
  return path.posix.join("/@fs", normalized);
}

/**
 * Import specifiers for an extension entry's metadata JSON and code. Bundled
 * entries go through the `@packages` alias (unchanged); external entries use
 * a `/@fs/` URL so Vite can resolve them at their real, out-of-tree location.
 */
function extensionImportSpecifiers(entry: ExtensionEntry): {
  metaImportSpecifier: string;
  codeImportSpecifier: string;
} {
  if (entry.kind === "bundled") {
    return {
      metaImportSpecifier: `@packages/${entry.folder}/extension.json`,
      codeImportSpecifier: `@packages/${entry.folder}/index`,
    };
  }
  const fsBase = toFsImportBase(entry.dir);
  return {
    metaImportSpecifier: `${fsBase}/extension.json`,
    codeImportSpecifier: `${fsBase}/index`,
  };
}

// The folders under `packages/` that are extensions, sorted for deterministic
// output (ordering is not load-bearing — ExtensionManager resolves
// `dependencies` itself — but determinism keeps diffs/HMR stable), plus any
// external directories from `SEED_BIBLE_EXTRA_EXTENSION_DIRS`. External
// directories without an `extension.json` at their root are skipped with a
// warning rather than failing discovery outright.
async function discoverExtensionEntries(): Promise<ExtensionEntry[]> {
  const dirEntries = await readdir(packagesDir, { withFileTypes: true });
  const bundled: ExtensionEntry[] = dirEntries
    .filter(
      (e) =>
        e.isDirectory() &&
        existsSync(path.resolve(packagesDir, e.name, "extension.json"))
    )
    .map((e) => ({ kind: "bundled" as const, folder: e.name }))
    .sort((a, b) => a.folder.localeCompare(b.folder));

  const external: ExtensionEntry[] = [];
  for (const dir of parseExtraExtensionDirs()) {
    if (!existsSync(path.resolve(dir, "extension.json"))) {
      console.warn(
        `[extensions] SEED_BIBLE_EXTRA_EXTENSION_DIRS entry '${dir}' has no extension.json at its root; skipping.`
      );
      continue;
    }
    external.push({ kind: "external", dir });
  }

  return [...bundled, ...external];
}

interface ExtensionTranslationFile {
  title: string;
  description: string;
  [key: string]: string;
}

interface ExtensionMetaFile {
  id: string;
  translations: Record<string, ExtensionTranslationFile>;
  dependencies?: string[];
  autoinstall?: boolean;
}

async function readExtensionMeta(metaPath: string): Promise<ExtensionMetaFile> {
  const raw = await readFile(metaPath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Reduces an extension's meta to just what's needed before it's installed:
 * `title`/`description` per locale (for the Settings extensions list), plus
 * `id`/`dependencies`/`autoinstall` (needed to resolve install order and
 * auto-install eligibility). Every other translation key is dropped — it's
 * only available via the extension's `loadFullTranslations()` thunk.
 */
function trimMeta(meta: ExtensionMetaFile): ExtensionMetaFile {
  const translations: Record<string, ExtensionTranslationFile> = {};
  for (const [lang, translation] of Object.entries(meta.translations)) {
    translations[lang] = {
      title: translation.title,
      description: translation.description,
    };
  }

  return {
    id: meta.id,
    translations,
    ...(meta.dependencies ? { dependencies: meta.dependencies } : {}),
    ...(meta.autoinstall !== undefined
      ? { autoinstall: meta.autoinstall }
      : {}),
  };
}

// U+2028/U+2029 are valid JSON string characters but, unescaped, are illegal
// in JS string literals in some contexts — escape them before inlining.
function toJsLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

async function generateModuleSource(
  entries: ExtensionEntry[]
): Promise<string> {
  const metas = await Promise.all(
    entries.map((entry) => readExtensionMeta(extensionMetaPath(entry)))
  );

  const source = entries
    .map((entry, i) => {
      const trimmed = trimMeta(metas[i]!);
      const { metaImportSpecifier, codeImportSpecifier } =
        extensionImportSpecifiers(entry);
      return `  {
    meta: ${toJsLiteral(trimmed)},
    loadFullTranslations: () => import(${JSON.stringify(metaImportSpecifier)}).then((m) => m.default.translations),
    import: () => import(${JSON.stringify(codeImportSpecifier)}),
  },`;
    })
    .join("\n");

  return `const extensions = [
${source}
];

export default { id: ${JSON.stringify(EXTENSION_SET_ID)}, extensions };
`;
}

/**
 * Vite plugin that exposes a `virtual:@extensions` module: the `ExtensionSet`
 * assembled from every extension package — a directory under `packages/` that
 * contains an `extension.json` — discovered under `packages/`, plus (in dev,
 * when set) any external directories named by `SEED_BIBLE_EXTRA_EXTENSION_DIRS`.
 */
export function extensionsPlugin(): Plugin {
  return {
    name: "vite-plugin-extensions",

    resolveId(id) {
      if (id === VIRTUAL_ID) {
        return RESOLVED_ID;
      }
      return null;
    },

    async load(id) {
      if (id !== RESOLVED_ID) {
        return null;
      }

      const entries = await discoverExtensionEntries();

      // Reload the module if any extension's meta changes.
      for (const entry of entries) {
        this.addWatchFile(extensionMetaPath(entry));
      }

      return await generateModuleSource(entries);
    },

    configureServer(server: ViteDevServer) {
      // Reflect added/removed extension packages in dev: when an
      // `extension.json` appears or disappears, the discovered set changes, so
      // invalidate the virtual module and reload. External dirs (if any) are
      // watched the same way as `packagesDir`, so editing an out-of-tree
      // extension under active development triggers the same reload path.
      server.watcher.add(packagesDir);
      const externalDirs = parseExtraExtensionDirs();
      for (const dir of externalDirs) {
        server.watcher.add(dir);
      }

      let pending: NodeJS.Timeout | undefined;

      const isRelevantChange = (file: string): boolean => {
        if (path.basename(file) !== "extension.json") {
          return false;
        }
        const resolved = path.resolve(file);

        // Only top-level `packages/<folder>/extension.json` (not nested ones).
        const relToPackages = path.relative(packagesDir, resolved);
        if (
          !relToPackages.startsWith("..") &&
          relToPackages.split(/[\\/]/).length === 2
        ) {
          return true;
        }

        // Only an external dir's own root `extension.json` (not nested ones).
        return externalDirs.some((dir) => {
          const relToDir = path.relative(dir, resolved);
          return !relToDir.startsWith("..") && relToDir === "extension.json";
        });
      };

      const handle = (file: string) => {
        if (!isRelevantChange(file)) {
          return;
        }

        if (pending) {
          clearTimeout(pending);
        }
        pending = setTimeout(() => {
          pending = undefined;
          const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
          if (mod) {
            server.moduleGraph.invalidateModule(mod);
          }
          server.config.logger.info("[extensions] extension set changed");
          server.ws.send({ type: "full-reload" });
        }, 150);
      };

      server.watcher.on("add", handle);
      server.watcher.on("unlink", handle);
    },
  };
}
