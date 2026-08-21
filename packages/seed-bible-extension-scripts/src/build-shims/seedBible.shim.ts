// Standalone-build alias target for the bare `"seed-bible"` specifier.
// Bundling the real "seed-bible" package here would risk a second
// Preact/signals instance (see preact.shim.ts) and would register into a
// disconnected copy of the extension registry, since a standalone bundle
// gets its own module graph, separate from the host page's — so this proxies
// straight to the two functions the host exposes for exactly this purpose.
//
// Typed against the real `seed-bible` package (a type-only import, erased at
// this package's own build time — no runtime dependency on it) so this
// shim's signature can't silently drift from what `registerExtension`/
// `unregisterExtension` actually look like.
import { getSeedBibleExtensionRuntime } from "./runtimeAccess.js";
import type { ExtensionRegistration, CleanupFunction } from "seed-bible";

const runtime = getSeedBibleExtensionRuntime();

export const registerExtension = runtime.registerExtension as (
  registration: ExtensionRegistration
) => CleanupFunction;

export const unregisterExtension = runtime.unregisterExtension as (
  id: string
) => boolean;
