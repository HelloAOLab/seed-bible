import type { Plugin, ResolvedConfig } from "vite";
import {
  EXTENSION_API_SPECIFIERS,
  buildImportMap,
  devImportMapUrl,
  injectImportMap,
} from "./importMap";

/**
 * Vite plugin that writes the extension import map into `index.html`.
 *
 * See `script/lib/importMap.ts` for what the map is for. This plugin's job is
 * to make each shim reachable at a URL, which works differently per mode:
 *
 * - **serve** — the dev server serves the shim sources directly, so the map
 *   points at their project paths and Vite transforms them on request.
 * - **build** — each shim is emitted as its own chunk (see `buildStart`), so
 *   the map points at that chunk's hashed filename under the build's `base`.
 *
 * The hook runs in the `post` phase so it sees the HTML after Vite has added
 * its own tags — `injectImportMap` then places the map above them, which the
 * import map spec requires (see its doc comment).
 */
export function importMapPlugin(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "vite-plugin-import-map",

    configResolved(resolved) {
      config = resolved;
    },

    buildStart() {
      if (config.command !== "build") {
        return;
      }

      for (const entry of EXTENSION_API_SPECIFIERS) {
        this.emitFile({
          type: "chunk",
          id: entry.sourcePath,
          name: entry.entryName,
          // Without this the shims come out as empty side-effect stubs.
          //
          // Vite sets `preserveEntrySignatures: false` for a client build,
          // which is right for a page's entry script — nothing imports it, so
          // its exports really are dead code. The shims are the exception:
          // what imports them is an extension fetched at runtime, which the
          // bundler cannot see. At the default they were tree-shaken down to
          // 29 bytes with no exports at all, and `import { registerExtension }
          // from "seed-bible"` failed with "does not provide an export named".
          //
          // Set per emitted chunk rather than build-wide on purpose: flipping
          // it globally also changed how the app's own code was split, which
          // cost ~76 KiB of extra precached assets for no benefit.
          preserveSignature: "allow-extension",
        });
      }
    },

    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        const bundle = ctx.bundle;

        if (config.command === "build" && !bundle) {
          // Without the bundle there is no way to know the hashed filenames,
          // and emitting the dev paths instead would ship an HTML page whose
          // import map 404s. Fail the build rather than produce that.
          throw new Error(
            "vite-plugin-import-map: no bundle available while building index.html, " +
              "so the extension API chunk URLs cannot be resolved. Resolve them from " +
              "the client manifest (standalone/dist/client/.vite/manifest.json) instead."
          );
        }

        const map = buildImportMap((entry) => {
          if (!bundle) {
            return devImportMapUrl(entry);
          }

          for (const file of Object.values(bundle)) {
            if (file.type === "chunk" && file.name === entry.entryName) {
              // `config.base` always carries a trailing slash (Vite normalizes
              // it), and in CI it is the absolute per-branch CDN URL built in
              // `vite.config.ts`, so the extension API resolves to the same
              // deployment's copy as the rest of the app.
              return `${config.base}${file.fileName}`;
            }
          }

          return undefined;
        });

        return injectImportMap(html, map);
      },
    },
  };
}
