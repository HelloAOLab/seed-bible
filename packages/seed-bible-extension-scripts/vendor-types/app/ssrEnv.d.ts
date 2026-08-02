/**
 * Small helpers for reading browser globals that may be absent during SSR.
 *
 * The app is rendered on the server (Node) before being hydrated on the
 * client. Any code that reads `location`/`navigator`/`document` at module load
 * or during render must tolerate their absence — use these instead of touching
 * the globals directly.
 */
/** Preferred browser languages, or an empty list on the server. */
export declare function navigatorLanguages(): readonly string[];
/**
 * SSR-safe `localStorage`. On the server (and in any environment where
 * `localStorage` is unavailable) reads return null and writes are no-ops, so
 * persistence logic can run unconditionally during render.
 */
export declare const safeLocalStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};
