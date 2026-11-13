/**
 * Node 26 exposes `localStorage` as a global getter that returns `undefined`
 * unless `--localstorage-file` is set, and that getter also shadows jsdom's
 * `window.localStorage`. Tests that persist settings/themes then fail or skip
 * painting. Install an in-memory Storage on both globals when the real one is
 * missing so jsdom tests behave like a browser.
 */
function createMemoryLocalStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(String(key), String(value));
    },
  };
}

const needsPolyfill =
  typeof globalThis.localStorage === "undefined" ||
  typeof globalThis.localStorage?.getItem !== "function";

if (needsPolyfill) {
  const memory = createMemoryLocalStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: memory,
    configurable: true,
    writable: true,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      value: memory,
      configurable: true,
      writable: true,
    });
  }
}
