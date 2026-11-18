/**
 * The `data-layout` attribute on `<html>`: `"mobile"` or `"desktop"`, set from
 * `isMobile`. Every phone-vs-desktop style rule reads it instead of checking
 * the window width itself, so the CSS and the JS can't disagree about which
 * layout is showing. It's on `<html>` rather than the app root because
 * dialogs, sheets and menus are portaled to `body`.
 *
 * Written by the server into its HTML (`standalone/entry-ssr.tsx`), by the
 * native build (`script/lib/nativeShell.ts`), by the app as `isMobile`
 * changes (`SeedBibleStateManager.tsx`), and into each sandboxed extension
 * frame (`extensions/index.tsx`).
 */
export type LayoutAttribute = "mobile" | "desktop";

export const layoutAttribute = (isMobile: boolean): LayoutAttribute =>
  isMobile ? "mobile" : "desktop";
