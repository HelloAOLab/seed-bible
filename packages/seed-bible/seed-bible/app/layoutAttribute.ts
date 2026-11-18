/**
 * The `data-sb-app-layout` attribute on `<html>`: `"mobile"` or `"desktop"`,
 * set from `isMobile`. Every phone-vs-desktop style rule reads it instead of
 * checking the window width itself, so the CSS and the JS can't disagree about
 * which layout is showing. It's on `<html>` rather than the app root because
 * dialogs, sheets and menus are portaled to `body`. The name is distinct from
 * the pane layouts' own `data-layout` (`single`, `split-2v`, …), so a
 * `[data-layout]` lookup never finds this one by mistake.
 *
 * Written by the server into its HTML (`standalone/entry-ssr.tsx`), by the
 * native build (`script/lib/nativeShell.ts`), by the app as `isMobile`
 * changes (`SeedBibleStateManager.tsx`), and into each sandboxed extension
 * frame (`extensions/index.tsx`). When none of those has filled it in, an
 * inline script in `index.html` sets it from the window width before the
 * first paint.
 */
export const LAYOUT_ATTRIBUTE = "data-sb-app-layout";

export type LayoutAttribute = "mobile" | "desktop";

export const layoutAttribute = (isMobile: boolean): LayoutAttribute =>
  isMobile ? "mobile" : "desktop";
