import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Bare specifiers the standalone build (`build --standalone`) must not let
 * Rollup resolve normally: bundling the real package for any of them would
 * mean a *second*, disconnected copy at runtime — `seed-bible` would
 * register into an extension registry the host page never sees, and
 * `preact`/`@preact/signals` would break hooks with a second instance
 * (see `preact.shim.ts`) — because a standalone bundle gets its own module
 * graph, separate from the host page's. Each maps to a small shim in
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
