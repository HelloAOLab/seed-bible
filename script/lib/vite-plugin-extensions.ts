import type { Plugin, ViteDevServer } from "vite";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  generateEntryModuleSource,
  generateLocaleModuleSource,
  parseLocaleModuleId,
  LOCALE_VIRTUAL_PREFIX,
  RESOLVED_ID,
  VIRTUAL_ID,
  type DiscoveredExtension,
  type ExtensionMetaFile,
} from "./extensionsModule";

// Virtual module convention: `virtual:@extensions` resolves to a module whose
// default export is the `ExtensionSet` for the app — auto-discovered from every
// extension package under `packages/` rather than maintained by hand.
//
// An "extension package" is any `packages/<folder>/` directory that contains an
// `extension.json` at its root (the extension's `meta`). This matches every
// extension and excludes the main `packages/seed-bible` app, which has none.
// The same discovery also picks up any external (out-of-tree) extension
// directories named by `SEED_BIBLE_EXTRA_EXTENSION_DIRS` — see below.
//
// The module is generated as source: each extension's `meta` is inlined as a JS
// literal, trimmed to `id`/`dependencies`/`autoinstall` — what the boot path
// needs to resolve install order. Its code and its full per-locale translations
// are `() => import(...)` thunks, so Vite code-splits both into chunks fetched
// only once the extension is installed.
//
// The `title`/`description` shown in the Settings extensions list live in a
// second virtual module family, `virtual:@extensions/locale/<lang>`, one chunk
// per language, reached through the set's `loadListTranslations` map. They used
// to be inlined for all 77 languages, which cost 138 KB (72.5 KB gzipped) in
// the entry chunk for strings a reader sees in one language, in one screen.
//
// The generation itself lives in `./extensionsModule` so it can be unit tested
// without running a build. The `\0` prefix on resolved ids is the Rollup
// convention that tells other plugins to leave the id alone.

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

/** Absolute directory this entry's `extension.json` lives directly under. */
function extensionDir(entry: ExtensionEntry): string {
  return entry.kind === "bundled"
    ? path.resolve(packagesDir, entry.folder)
    : entry.dir;
}

function extensionMetaPath(entry: ExtensionEntry): string {
  return path.resolve(extensionDir(entry), "extension.json");
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
 * The import-specifier prefix for an extension entry's metadata JSON and
 * code (`` `${importBase}/extension.json` `` / `` `${importBase}/index` ``,
 * built by `./extensionsModule`). Bundled entries go through the `@packages`
 * alias (unchanged); external entries use a `/@fs/` URL so Vite can resolve
 * them at their real, out-of-tree location.
 */
function extensionImportBase(entry: ExtensionEntry): string {
  return entry.kind === "bundled"
    ? `@packages/${entry.folder}`
    : toFsImportBase(entry.dir);
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

async function readExtensionMeta(metaPath: string): Promise<ExtensionMetaFile> {
  const raw = await readFile(metaPath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Every extension package under `packages/`, plus any external directories
 * from `SEED_BIBLE_EXTRA_EXTENSION_DIRS`, with its meta parsed.
 */
async function readExtensions(): Promise<DiscoveredExtension[]> {
  const entries = await discoverExtensionEntries();
  return Promise.all(
    entries.map(async (entry) => ({
      dir: extensionDir(entry),
      importBase: extensionImportBase(entry),
      meta: await readExtensionMeta(extensionMetaPath(entry)),
    }))
  );
}

// `load()` runs once for the entry module and once per language module, and
// the entry module names one import per language — so a build asks for ~77
// modules, each of which would otherwise re-`readdir` `packages/` and re-parse
// every `extension.json`. The metas are identical across all of them, so the
// first read is shared. Cleared by the dev-server watcher below when an
// `extension.json` is added or removed.
let cachedExtensions: Promise<DiscoveredExtension[]> | null = null;

function discoverExtensions(): Promise<DiscoveredExtension[]> {
  if (!cachedExtensions) {
    // Cache the promise rather than the result so concurrent `load()` calls —
    // which is how Rollup drives this — share one read instead of racing.
    cachedExtensions = readExtensions().catch((err) => {
      // Don't poison the cache with a failed read; let the next call retry.
      cachedExtensions = null;
      throw err;
    });
  }
  return cachedExtensions;
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
      if (id.startsWith(LOCALE_VIRTUAL_PREFIX)) {
        return "\0" + id;
      }
      return null;
    },

    async load(id) {
      const isEntry = id === RESOLVED_ID;
      const language = parseLocaleModuleId(id);
      if (!isEntry && language === null) {
        return null;
      }

      const extensions = await discoverExtensions();

      // Reload the module if any extension's meta changes.
      for (const { dir } of extensions) {
        this.addWatchFile(path.resolve(dir, "extension.json"));
      }

      return isEntry
        ? generateEntryModuleSource(extensions, EXTENSION_SET_ID)
        : generateLocaleModuleSource(extensions, language!);
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

      /**
       * True for a top-level `packages/<folder>/extension.json`, or an
       * external dir's own root `extension.json` (not nested ones either way).
       */
      const isExtensionManifest = (file: string): boolean => {
        if (path.basename(file) !== "extension.json") {
          return false;
        }
        const resolved = path.resolve(file);

        const relToPackages = path.relative(packagesDir, resolved);
        if (
          !relToPackages.startsWith("..") &&
          relToPackages.split(/[\\/]/).length === 2
        ) {
          return true;
        }

        return externalDirs.some((dir) => {
          const relToDir = path.relative(dir, resolved);
          return !relToDir.startsWith("..") && relToDir === "extension.json";
        });
      };

      // A file's *contents* changing is already handled by the `addWatchFile`
      // calls in `load()`, which make Vite re-run it — but that would now be
      // served the cached metas, so the cache has to be dropped here too.
      server.watcher.on("change", (file) => {
        if (isExtensionManifest(file)) {
          cachedExtensions = null;
        }
      });

      const handle = (file: string) => {
        if (!isExtensionManifest(file)) {
          return;
        }
        // An added or removed package changes the discovered set itself.
        cachedExtensions = null;

        if (pending) {
          clearTimeout(pending);
        }
        pending = setTimeout(() => {
          pending = undefined;
          // The per-locale modules are generated from the same metas, so
          // invalidate them alongside the entry module.
          for (const [moduleId, mod] of server.moduleGraph.idToModuleMap) {
            if (
              moduleId === RESOLVED_ID ||
              parseLocaleModuleId(moduleId) !== null
            ) {
              server.moduleGraph.invalidateModule(mod);
            }
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
