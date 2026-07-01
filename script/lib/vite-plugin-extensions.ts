import type { Plugin, ViteDevServer } from "vite";
import { readdir } from "node:fs/promises";
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
// The module is generated as source (static `extension.json` imports for the
// meta + `() => import(...)` thunks for the code) so Vite still bundles the meta
// statically and code-splits each extension's entry point.
//
// The `\0` prefix on the resolved id is the Rollup convention that tells other
// plugins to leave the id alone.
const VIRTUAL_ID = "virtual:@extensions";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

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

function generateModuleSource(folders: string[]): string {
  const imports = folders
    .map(
      (folder, i) =>
        `import meta${i} from "@packages/${folder}/extension.json";`
    )
    .join("\n");

  const entries = folders
    .map(
      (folder, i) =>
        `  { meta: meta${i}, import: () => import("@packages/${folder}/index") },`
    )
    .join("\n");

  return `${imports}

const extensions = [
${entries}
];

export default { id: ${JSON.stringify(EXTENSION_SET_ID)}, extensions };
`;
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
      return null;
    },

    async load(id) {
      if (id !== RESOLVED_ID) {
        return null;
      }

      const folders = await discoverExtensionFolders();

      // Reload the module if any extension's meta changes.
      for (const folder of folders) {
        this.addWatchFile(extensionJsonPath(folder));
      }

      return generateModuleSource(folders);
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
