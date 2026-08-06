/**
 * Deciding which of a build's emitted files the service worker precaches, and
 * which URL it fetches each one from.
 *
 * This lives apart from `vite.config.ts` because it makes the decisions offline
 * boot depends on, and getting one wrong fails silently: the build succeeds, the
 * worker installs, and the app simply doesn't start without a connection. Pure
 * functions here, so `test/unit/script/lib/precacheManifest.test.ts` can pin
 * them down.
 */

/** The subset of Vite's client manifest shape this module reads. */
export interface ViteManifestChunk {
  file: string;
  isEntry?: boolean;
  /** Statically imported chunks — needed before the app can run. */
  imports?: string[];
  css?: string[];
  assets?: string[];
}

/**
 * One entry in the precache manifest Workbox builds by globbing the client
 * output. Declared here rather than imported: `workbox-build` is a transitive
 * dependency of vite-plugin-pwa and isn't resolvable from the project root, and
 * the plugin doesn't re-export its types.
 */
export interface PrecacheManifestEntry {
  url: string;
  revision?: string | null;
  integrity?: string;
  size?: number;
}

/** Files that count as core regardless of how the bundler reached them. */
export const IMAGE_OR_FONT_RE =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot)$/i;

/** Where the globbed entries live, and so what a warning can be raised about. */
const ASSET_DIR_PREFIX = "assets/";

/**
 * The emitted files the app needs in order to *boot*: every entry chunk,
 * everything it statically imports (transitively), and the stylesheets and
 * static assets those chunks reference.
 *
 * Selecting these by filename glob instead (`index-*.js`, `vendor-*.js`) looks
 * equivalent but isn't: the bundler splits out chunks of its own accord — right
 * now the rolldown runtime, the i18n bootstrap and the bundled `en` locale —
 * and a shell missing even one static import doesn't start offline at all.
 *
 * Anything reached through a dynamic `import()` is deliberately absent: the
 * other 23 locales, every extension. Those are runtime-cached on first use.
 */
export function selectCoreAssetFiles(
  manifest: Record<string, ViteManifestChunk>
): Set<string> {
  const core = new Set<string>();
  const visited = new Set<string>();

  function visit(key: string): void {
    if (visited.has(key)) return;
    visited.add(key);

    const chunk = manifest[key];
    if (!chunk) return;

    core.add(chunk.file);
    for (const file of chunk.css ?? []) core.add(file);
    for (const file of chunk.assets ?? []) core.add(file);
    for (const imported of chunk.imports ?? []) visit(imported);
  }

  for (const [key, chunk] of Object.entries(manifest)) {
    if (chunk.isEntry) visit(key);
  }

  return core;
}

export interface RelocateCoreAssetsOptions {
  /** The boot-critical files, from {@link selectCoreAssetFiles}. */
  coreFiles: Set<string>;
  /**
   * Absolute prefix this build's hashed chunks are served from, with a trailing
   * slash — e.g. `https://assets.example/branches/main/<buildId>/`.
   */
  assetBaseUrl: string;
}

/**
 * Narrows the globbed build output down to the core assets, and points each one
 * at the absolute URL it is actually served from.
 *
 * The rewrite is not cosmetic. Workbox produces paths relative to the service
 * worker's own location — `assets/index-abc.js`, which resolves to
 * `<site root>/assets/index-abc.js`. Nothing is served from there: this build's
 * chunks live under `<assetRoot>branches/<branch>/<buildId>/assets/`. Left
 * unrewritten every precache request would 404 during install, and one failed
 * request aborts the whole install — the worker would never register.
 *
 * Entries outside `assets/` (the web manifest, which vite-plugin-pwa appends on
 * its own) really are at the site root and are passed through untouched.
 *
 * Images and fonts are kept whether or not a boot chunk was found to reference
 * one. Narrowing them to `chunk.assets` would be tempting — it is a smaller
 * install — but Vite attributes an asset to the chunk whose *JavaScript*
 * references it, and the shell's fonts and background images are reached from
 * CSS `url()` instead. Dropping one of those breaks the offline shell visually
 * with nothing to point at, so the broad rule stays.
 */
export function selectAndRelocateCoreAssets(
  entries: PrecacheManifestEntry[],
  options: RelocateCoreAssetsOptions
): { manifest: PrecacheManifestEntry[]; warnings: string[] } {
  const { coreFiles, assetBaseUrl } = options;

  const manifest: PrecacheManifestEntry[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    seen.add(entry.url);
    if (!entry.url.startsWith(ASSET_DIR_PREFIX)) {
      manifest.push(entry);
      continue;
    }
    if (!coreFiles.has(entry.url) && !IMAGE_OR_FONT_RE.test(entry.url))
      continue;
    manifest.push({ ...entry, url: `${assetBaseUrl}${entry.url}` });
  }

  // A boot-critical file the glob never produced will not be precached, and the
  // app will fail to start offline with no other sign that anything is wrong.
  // Workbox applies `maximumFileSizeToCacheInBytes` while globbing, before this
  // runs, so an oversized vendor chunk shows up here — which is the case most
  // likely to bite, and the reason this check exists.
  const warnings = [...coreFiles]
    .filter((file) => file.startsWith(ASSET_DIR_PREFIX) && !seen.has(file))
    .sort()
    .map(
      (file) =>
        `Core asset "${file}" is missing from the precache manifest, so the app will not boot offline. ` +
        `Check the injectManifest globPatterns and maximumFileSizeToCacheInBytes in vite.config.ts.`
    );

  return { manifest, warnings };
}
