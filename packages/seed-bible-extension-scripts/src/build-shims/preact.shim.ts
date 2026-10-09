// Standalone-build alias target for the bare `"preact"` specifier. Re-exports
// the exact Preact instance already running on the host page instead of
// bundling a second copy — this codebase has already hit the "two Preact
// instances" bug once (breaks hooks with "Cannot read properties of
// undefined (reading '__H')"; see the main app's vite.config.ts `dedupe`
// comment). Covers Preact's small, very stable public API; not code-generated
// since it essentially never changes.
import { getSeedBibleExtensionRuntime } from "./runtimeAccess.js";

const ns = getSeedBibleExtensionRuntime().preact as typeof import("preact");

export const h = ns.h;
export const createElement = ns.h;
export const Fragment = ns.Fragment;
export const render = ns.render;
export const hydrate = ns.hydrate;
export const cloneElement = ns.cloneElement;
export const createContext = ns.createContext;
export const createRef = ns.createRef;
export const isValidElement = ns.isValidElement;
export const options = ns.options;
export const toChildArray = ns.toChildArray;
export default ns;
