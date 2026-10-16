// Standalone-build alias target for the bare `"@preact/signals"` specifier —
// see preact.shim.ts for why this proxies to the host's live instance. Using
// a second signals instance wouldn't just look wrong: a signal created by one
// instance never notifies effects/computeds registered by another, so
// reactivity across the extension/host boundary would silently stop working.
import { getSeedBibleExtensionRuntime } from "./runtimeAccess.js";

const ns = getSeedBibleExtensionRuntime()
  .preactSignals as typeof import("@preact/signals");

export const signal = ns.signal;
export const computed = ns.computed;
export const effect = ns.effect;
export const batch = ns.batch;
export const untracked = ns.untracked;
export const Signal = ns.Signal;
export const useSignal = ns.useSignal;
export const useComputed = ns.useComputed;
export const useSignalEffect = ns.useSignalEffect;
