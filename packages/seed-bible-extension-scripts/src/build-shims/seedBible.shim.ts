// Standalone-build alias target for the bare `"seed-bible"` specifier. No
// real "seed-bible" runtime package exists to depend on (and even if one
// did, bundling it would risk a second Preact/signals instance — see
// preact.shim.ts) — this proxies straight to the two functions the host
// exposes for exactly this purpose.
//
// Typed loosely (not against the exact `ExtensionRegistration`/
// `SeedBibleState` generic shape) since this package intentionally has no
// dependency on the real `seed-bible` package's types. An extension author
// building the standalone target still gets full `SeedBibleState` typing
// inside their own `init()` body via the vendored `types/` the scaffolder
// installs — this loosening only affects the registration call's own
// signature, not the context object it receives.
import { getSeedBibleExtensionRuntime } from "./runtimeAccess.js";

type CleanupFunction = () => void;

interface ExtensionRegistrationLike {
  id: string;
  dependencies?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  init: (context: any, dependencies: Record<string, object>) => any;
}

const runtime = getSeedBibleExtensionRuntime();

export const registerExtension = runtime.registerExtension as (
  registration: ExtensionRegistrationLike
) => CleanupFunction;

export const unregisterExtension = runtime.unregisterExtension as (
  id: string
) => boolean;
