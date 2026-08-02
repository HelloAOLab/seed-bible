// Standalone-build alias target for the bare `"seed-bible/components"`
// specifier. Unlike the other shims in this directory, this one can't
// re-export named bindings the normal way: the host only exposes components
// through `loadComponents()` — a lazy, async accessor (see
// `ExtensionManager.tsx`'s runtime-exposure comment: importing the whole
// real `seed-bible/components` barrel eagerly would bloat the *host's* own
// boot bundle, since it's effectively the entire app's UI surface) — and a
// static ESM `export` can't be backed by a promise.
//
// Practical effect: extensions built with `--standalone` call
// `const { MaterialIcon } = await loadSeedBibleComponents();` instead of a
// normal `import { MaterialIcon } from "seed-bible/components"`. This is
// called out explicitly in the standalone build's generated README — it's
// the one real ergonomic difference between the monorepo-bundled and
// standalone distribution paths.
import { getSeedBibleExtensionRuntime } from "./runtimeAccess.js";

export function loadSeedBibleComponents(): Promise<unknown> {
  return getSeedBibleExtensionRuntime().loadComponents();
}
