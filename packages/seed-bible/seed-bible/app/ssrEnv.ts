/**
 * Small helpers for reading browser globals that may be absent during SSR.
 *
 * The app is rendered on the server (Node) before being hydrated on the
 * client. Any code that reads `location`/`navigator`/`document` at module load
 * or during render must tolerate their absence — use these instead of touching
 * the globals directly.
 */

/** Current page href, or a neutral placeholder on the server. */
export function currentHref(): string {
  return typeof location !== "undefined" ? location.href : "http://localhost/";
}

/** Search params of the current URL (empty on the server). */
export function currentSearchParams(): URLSearchParams {
  return new URL(currentHref()).searchParams;
}

/** Preferred browser languages, or an empty list on the server. */
export function navigatorLanguages(): readonly string[] {
  return typeof navigator !== "undefined" ? (navigator.languages ?? []) : [];
}

/**
 * SSR-safe `localStorage`. On the server (and in any environment where
 * `localStorage` is unavailable) reads return null and writes are no-ops, so
 * persistence logic can run unconditionally during render.
 */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    return typeof localStorage !== "undefined"
      ? localStorage.getItem(key)
      : null;
  },
  setItem(key: string, value: string): void {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  },
};
