// Standalone-build alias target for the bare `"preact/jsx-runtime"`
// specifier — see preact.shim.ts for why this proxies to the host's live
// instance. This is what the extension's own JSX compiles down to
// (`jsxImportSource: "preact"`), so it must be the host's real jsx-runtime,
// not a bundled second copy.
import { getSeedBibleExtensionRuntime } from "./runtimeAccess.js";

const ns = getSeedBibleExtensionRuntime()
  .preactJsxRuntime as typeof import("preact/jsx-runtime");

export const jsx = ns.jsx;
export const jsxs = ns.jsxs;
export const jsxDEV = ns.jsxDEV;
export const Fragment = ns.Fragment;
