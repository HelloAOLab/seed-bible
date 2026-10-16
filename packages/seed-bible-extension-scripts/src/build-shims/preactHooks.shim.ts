// Standalone-build alias target for the bare `"preact/hooks"` specifier —
// see preact.shim.ts for why this proxies to the host's live instance.
import { getSeedBibleExtensionRuntime } from "./runtimeAccess.js";

const ns = getSeedBibleExtensionRuntime()
  .preactHooks as typeof import("preact/hooks");

export const useState = ns.useState;
export const useReducer = ns.useReducer;
export const useEffect = ns.useEffect;
export const useLayoutEffect = ns.useLayoutEffect;
export const useRef = ns.useRef;
export const useImperativeHandle = ns.useImperativeHandle;
export const useMemo = ns.useMemo;
export const useCallback = ns.useCallback;
export const useContext = ns.useContext;
export const useDebugValue = ns.useDebugValue;
export const useId = ns.useId;
export const useErrorBoundary = ns.useErrorBoundary;
