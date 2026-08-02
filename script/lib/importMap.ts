/**
 * The browser import map that lets an extension loaded from a URL use the same
 * bare specifiers a bundled extension uses.
 *
 * Bundled extensions write `import { registerExtension } from "seed-bible"` and
 * Vite resolves it at build time. An extension fetched from someone else's URL
 * is imported by the *browser* (`loadExtensionFromUrl` in
 * `packages/seed-bible/seed-bible/managers/ExtensionManager.tsx`), and the
 * browser has no bundler — a bare name means nothing to it. An import map is
 * the standard way to tell it which URL each name resolves to.
 *
 * The URLs must point at the modules the host page **already loaded**, not at a
 * second copy. A second copy of `seed-bible` would give the extension its own
 * `ExtensionInitalizer`, so `registerExtension()` would file the extension in a
 * registry nobody reads; a second copy of preact breaks hooks outright. That is
 * why each specifier is served by a shim under `standalone/extension-api/` that
 * only re-exports the real module: the bundler routes the shim to the same
 * chunk the app uses, so there is exactly one instance of everything.
 *
 * The logic lives here rather than in the plugin so
 * `test/unit/script/lib/importMap.test.ts` can pin it down — the way an import
 * map fails is quiet (the page still renders; only third-party extensions
 * break), so it is worth testing directly.
 */

/** One bare specifier exposed to URL-loaded extensions. */
export interface ExtensionApiSpecifier {
  /** The bare specifier an extension author writes in their import. */
  specifier: string;
  /**
   * The bundler entry name for this specifier's shim. Doubles as the key in
   * `build.rolldownOptions.input` and as the emitted chunk's `name`, which is
   * how the plugin finds the hashed filename again.
   */
  entryName: string;
  /** The shim's path, relative to the project root. */
  sourcePath: string;
}

const shim = (specifier: string, slug: string): ExtensionApiSpecifier => ({
  specifier,
  entryName: `extension-api-${slug}`,
  sourcePath: `standalone/extension-api/${slug}.ts`,
});

/**
 * Every bare specifier a URL-loaded extension may import, and the shim that
 * serves it.
 *
 * `seed-bible/managers` is deliberately absent. It re-exports all 26 manager
 * modules — including `OsManager` and `LoginManager` — and extensions get the
 * managers they need through the `SeedBibleState` handed to `init(context)`
 * instead. Adding it later is a one-line change here plus the matching shim.
 *
 * Anything an extension imports that is *not* on this list has to be bundled
 * into the extension's own file.
 *
 * Note what each entry costs. Publishing a module means the bundler can no
 * longer tree-shake it — it has no way to know which exports a
 * yet-to-be-written extension will use, so it has to keep them all.
 * `seed-bible/components` is the one where that is material: it re-exports the
 * whole icon set, and keeping every icon adds ~74 KiB to the assets the app
 * loads on first paint (measured against a build with this line removed; every
 * other entry here together costs under 2 KiB). Worth it to let third-party
 * extensions render UI that matches the app, but worth knowing before adding
 * another broad barrel to this list.
 */
export const EXTENSION_API_SPECIFIERS: readonly ExtensionApiSpecifier[] = [
  shim("seed-bible", "seed-bible"),
  shim("seed-bible/components", "seed-bible-components"),
  shim("seed-bible/i18n", "seed-bible-i18n"),
  shim("preact", "preact"),
  shim("preact/hooks", "preact-hooks"),
  shim("preact/jsx-runtime", "preact-jsx-runtime"),
  shim("preact/compat", "preact-compat"),
  shim("@preact/signals", "preact-signals"),
];

export interface ImportMap {
  imports: Record<string, string>;
}

/**
 * The `build.rolldownOptions.input` entries for the shims.
 *
 * Spreading this alongside the HTML entry is what makes each shim its own
 * chunk with its own URL. Note that supplying `input` at all replaces Vite's
 * default, so `index.html` has to be listed explicitly next to these.
 */
export function extensionApiBuildInputs(): Record<string, string> {
  return Object.fromEntries(
    EXTENSION_API_SPECIFIERS.map((entry) => [entry.entryName, entry.sourcePath])
  );
}

/**
 * The URL a shim is served from by the dev server.
 *
 * Vite serves project source over HTTP at its root-relative path and transforms
 * it on the way out, so the shim's own `export * from "preact"` is rewritten to
 * whatever pre-bundled dependency URL (`?v=<hash>`) the app is using. Pointing
 * the map at `/node_modules/.vite/deps/preact.js` directly would look
 * equivalent and quietly produce a *second* preact instance, because that URL
 * differs from the app's by the version query.
 */
export function devImportMapUrl(entry: ExtensionApiSpecifier): string {
  return `/${entry.sourcePath}`;
}

/**
 * Builds the import map from a per-specifier URL resolver.
 *
 * `resolve` returns the URL for a shim's entry name — its dev server path in
 * development, or its emitted chunk URL in a build. Returning nothing is a bug
 * in the caller (a shim that was never emitted), and it would silently ship a
 * page where third-party extensions fail to load, so it throws rather than
 * emitting a partial map.
 */
export function buildImportMap(
  resolve: (entry: ExtensionApiSpecifier) => string | undefined
): ImportMap {
  const imports: Record<string, string> = {};

  for (const entry of EXTENSION_API_SPECIFIERS) {
    const url = resolve(entry);
    if (!url) {
      throw new Error(
        `Could not resolve a URL for the extension API shim "${entry.entryName}" ` +
          `(${entry.sourcePath}). Extensions loaded from a URL would fail to import ` +
          `"${entry.specifier}". Check that it is listed in build.rolldownOptions.input.`
      );
    }
    imports[entry.specifier] = url;
  }

  return { imports };
}

/** Renders the map as the script tag that goes in the page. */
export function renderImportMapScript(map: ImportMap): string {
  // `<` cannot appear in these URLs, but escaping it is what stops a JSON
  // payload from ever closing the script tag early — the same precaution
  // `standalone/entry-ssr.tsx` takes with the config JSON.
  const json = JSON.stringify(map, null, 2).replace(/</g, "\\u003c");
  return `<script type="importmap">\n${json}\n</script>`;
}

/**
 * Inserts the import map immediately after the opening `<head>` tag.
 *
 * Position is load-bearing: a browser rejects an import map that appears after
 * module loading has already begun, and in development Vite prepends its own
 * `<script type="module" src="/@vite/client">` to `<head>`. Inserting straight
 * after `<head>` puts the map above anything an earlier transform prepended,
 * without depending on how injected tags happen to be ordered.
 *
 * A template with no `<head>` would produce a page where the map is silently
 * absent and only third-party extensions break, so that throws instead.
 */
export function injectImportMap(html: string, map: ImportMap): string {
  const headMatch = /<head(\s[^>]*)?>/i.exec(html);
  if (!headMatch) {
    throw new Error(
      "Could not inject the extension import map: no <head> tag in the HTML template."
    );
  }

  const insertAt = headMatch.index + headMatch[0].length;
  return (
    html.slice(0, insertAt) +
    `\n    ${renderImportMapScript(map).replace(/\n/g, "\n    ")}` +
    html.slice(insertAt)
  );
}
