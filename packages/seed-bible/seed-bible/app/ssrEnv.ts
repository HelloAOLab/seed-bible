/**
 * Small helpers for reading browser globals that may be absent during SSR.
 *
 * The app is rendered on the server (Node) before being hydrated on the
 * client. Any code that reads `location`/`navigator`/`document` at module load
 * or during render must tolerate their absence — use these instead of touching
 * the globals directly.
 */

/** Preferred browser languages, or an empty list on the server. */
export function navigatorLanguages(): readonly string[] {
  return typeof navigator !== "undefined" ? (navigator.languages ?? []) : [];
}

/**
 * Whether a `User-Agent` string is WebKit-based (Safari, or any iOS browser —
 * all of which use WebKit regardless of what they call themselves).
 *
 * Kept in sync by hand with the equivalent check in `server/index.ts`
 * (`isWebKitUserAgent`), which can't import from `packages/` — the server
 * bundle stays dependency-free of the app's browser-oriented code.
 */
export function isWebKitUserAgent(userAgent: string): boolean {
  return (
    (/AppleWebKit/.test(userAgent) && !/Chrome/.test(userAgent)) ||
    /\b(iPad|iPhone|iPod)\b/.test(userAgent)
  );
}

/**
 * Whether the current browser is WebKit-based. On the server, falls back to
 * `ssrRenderedAsWebKit` — the same check already run once against the
 * request's `User-Agent` header (see `AppConfig.renderedAsWebKit`) — since
 * there is no real browser `navigator` to read.
 *
 * Guards on `document` rather than `navigator`: this app's server runs on
 * Bun, and Bun ships a global `navigator` object of its own (`{ userAgent:
 * "Bun/x.y.z", ... }`) on every request, so a `typeof navigator ===
 * "undefined"` check is always false there — it would silently evaluate
 * `isWebKitUserAgent("Bun/x.y.z")` (always false) instead of falling back to
 * the per-request value this function was given. `document` has no such
 * impostor: Bun (and Node) never define it, and every real browser (and
 * jsdom, which the test suite runs under) always does.
 */
export function isWebKit(ssrRenderedAsWebKit: boolean): boolean {
  return typeof document === "undefined"
    ? ssrRenderedAsWebKit
    : isWebKitUserAgent(navigator.userAgent);
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

/**
 * SSR-safe `sessionStorage`, with the same read-null/write-no-op contract as
 * `safeLocalStorage`. Used for state that should reset when the tab closes —
 * e.g. a prompt that may only appear once per session.
 */
export const safeSessionStorage = {
  getItem(key: string): string | null {
    return typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(key)
      : null;
  },
  setItem(key: string, value: string): void {
    if (typeof sessionStorage !== "undefined")
      sessionStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(key);
  },
};
