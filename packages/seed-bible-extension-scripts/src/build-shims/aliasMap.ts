import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Bare specifiers the standalone build (`build --standalone`) must not let
 * Rollup resolve normally — either because there's no real npm package to
 * resolve them to (`seed-bible`, `seed-bible/components`, `seed-bible/i18n`
 * — nothing is published), or because resolving to a *second* copy would
 * break at runtime (`preact`/`@preact/signals` — bundling a second Preact
 * instance breaks hooks; see `preact.shim.ts`). Each maps to a small shim in
 * this directory that proxies to `window.__seedBibleExtensionRuntime`
 * instead, defined once here so the Vite alias config
 * (`commands/build.ts`) and this directory's actual shim files can't drift
 * out of sync with each other.
 *
 * Order matters: Vite/Rollup's alias resolution matches a string `find` key
 * as either the exact specifier or a `key + "/"` prefix, and uses the FIRST
 * entry that matches — so a shorter key checked before a longer, more
 * specific one silently swallows it (`"preact"` matching before
 * `"preact/jsx-runtime"` produced a broken resolved path,
 * `.../preact.shim.js/jsx-runtime`, when this was unordered). Every
 * multi-segment specifier is listed before its own shorter prefix.
 */
export const STANDALONE_BUILD_ALIASES: Record<string, string> = {
  "preact/hooks": path.join(here, "preactHooks.shim.js"),
  "preact/jsx-runtime": path.join(here, "preactJsxRuntime.shim.js"),
  preact: path.join(here, "preact.shim.js"),
  "@preact/signals": path.join(here, "preactSignals.shim.js"),
  "seed-bible/components": path.join(here, "seedBibleComponents.shim.js"),
  "seed-bible/i18n": path.join(here, "seedBibleI18n.shim.js"),
  "seed-bible": path.join(here, "seedBible.shim.js"),
};
