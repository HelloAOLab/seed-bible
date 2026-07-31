import type { Plugin, ViteDevServer } from "vite";
import { readdir, readFile } from "node:fs/promises";
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

function extensionJsonPath(folder: string): string {
  return path.resolve(packagesDir, folder, "extension.json");
}

// The folders under `packages/` that are extensions, sorted for deterministic
// output (ordering is not load-bearing — ExtensionManager resolves
// `dependencies` itself — but determinism keeps diffs/HMR stable).
async function discoverExtensionFolders(): Promise<string[]> {
  const entries = await readdir(packagesDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && existsSync(extensionJsonPath(e.name)))
    .map((e) => e.name)
    .sort();
}

async function readExtensionMeta(folder: string): Promise<ExtensionMetaFile> {
  const raw = await readFile(extensionJsonPath(folder), "utf-8");
  return JSON.parse(raw);
}

/** Every extension package under `packages/`, with its meta parsed. */
async function discoverExtensions(): Promise<DiscoveredExtension[]> {
  const folders = await discoverExtensionFolders();
  return Promise.all(
    folders.map(async (folder) => ({
      folder,
      meta: await readExtensionMeta(folder),
    }))
  );
}

/**
 * Vite plugin that exposes a `virtual:@extensions` module: the `ExtensionSet`
 * assembled from every extension package — a directory under `packages/` that
 * contains an `extension.json` — discovered under `packages/`.
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
      for (const { folder } of extensions) {
        this.addWatchFile(extensionJsonPath(folder));
      }

      return isEntry
        ? generateEntryModuleSource(extensions, EXTENSION_SET_ID)
        : generateLocaleModuleSource(extensions, language!);
    },

    configureServer(server: ViteDevServer) {
      // Reflect added/removed extension packages in dev: when an
      // `extension.json` appears or disappears, the discovered set changes, so
      // invalidate the virtual module and reload.
      server.watcher.add(packagesDir);

      let pending: NodeJS.Timeout | undefined;

      const handle = (file: string) => {
        if (path.basename(file) !== "extension.json") {
          return;
        }
        const rel = path.relative(packagesDir, path.resolve(file));
        // Only top-level `packages/<folder>/extension.json` (not nested ones).
        const segments = rel.split(/[\\/]/);
        if (rel.startsWith("..") || segments.length !== 2) {
          return;
        }

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
