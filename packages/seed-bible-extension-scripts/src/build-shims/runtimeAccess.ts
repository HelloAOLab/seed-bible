// Shared accessor used by every generated shim module in this directory.
// These shim files are not run by this package itself — they get aliased in
// (see `standaloneViteConfig.ts`) as the resolution target for bare
// `"seed-bible"`/`"preact"`/etc. specifiers when building an extension with
// `seed-bible-extension-scripts build --standalone`, so this code actually
// runs in the BROWSER, inside the standalone bundle, not in Node.

export interface SeedBibleExtensionRuntimeLike {
  registerExtension: unknown;
  unregisterExtension: unknown;
  preact: unknown;
  preactHooks: unknown;
  preactJsxRuntime: unknown;
  preactSignals: unknown;
  i18n: unknown;
  loadComponents: () => Promise<unknown>;
}

declare global {
  interface Window {
    __seedBibleExtensionRuntime?: SeedBibleExtensionRuntimeLike;
  }
}

/**
 * Reads the small runtime surface the real Seed Bible app exposes on
 * `window.__seedBibleExtensionRuntime` (see `ExtensionManager.tsx`). Throws a
 * clear, actionable error rather than a cryptic `undefined` access if this
 * bundle is ever loaded somewhere that isn't a real, running Seed Bible page
 * — which is the one hard requirement of the standalone build target.
 */
export function getSeedBibleExtensionRuntime(): SeedBibleExtensionRuntimeLike {
  const runtime = globalThis.window?.__seedBibleExtensionRuntime;
  if (!runtime) {
    throw new Error(
      "This extension bundle was built with `seed-bible-extension-scripts build --standalone`, " +
        "which only works when loaded into a running Seed Bible page (window.__seedBibleExtensionRuntime " +
        "is missing). For local development, use `seed-bible-extension-scripts dev` instead — it runs a " +
        "real Seed Bible instance with your extension auto-installed via the fully-supported dev loop."
    );
  }
  return runtime;
}
