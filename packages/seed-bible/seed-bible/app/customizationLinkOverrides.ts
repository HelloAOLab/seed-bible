import { useSignalEffect } from "@preact/signals";
import type { SeedBibleState } from "../managers/SeedBibleStateManager";

/** `rel` of the browser tab's favicon `<link>`. */
export const FAVICON_LINK_REL = "icon";
/** `rel` of the "Add to Home Screen" icon `<link>`. */
export const APPLE_TOUCH_ICON_LINK_REL = "apple-touch-icon";

/**
 * Each `rel`'s original default `href`, captured the first time
 * `applyCustomizationLinkOverride` runs for it — always index.html's real
 * default at that point, since nothing else in the app ever touches these
 * two elements. Remembered so clearing an active customization can restore
 * it without hardcoding index.html's asset paths here too.
 */
const defaultHrefByRel = new Map<string, string>();

/**
 * Points the page's one `<link rel="{rel}">` at `url`, or restores its
 * original default when `url` is null. Selects by `rel`, not by an id or
 * element reference, and mutates that single element's `href` in place
 * rather than adding a second `<link>` of the same `rel` — mirrors
 * `entry-ssr.tsx`'s `stripDefaultFaviconLinks`/`stripDefaultOgImageMeta`
 * "replace, don't append" fix: browsers do not reliably prefer the *last*
 * declared icon link when there are two of the same `rel` (some use
 * whichever they fetch or parse first), so there must only ever be one to
 * begin with. SSR's own override — same `rel`, no default left in the
 * document to conflict with it (see `stripDefaultFaviconLinks`) — is exactly
 * that one element, so hydrating onto it just updates it in place too.
 */
export function applyCustomizationLinkOverride(
  rel: string,
  url: string | null
): void {
  const link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    return;
  }
  if (!defaultHrefByRel.has(rel)) {
    defaultHrefByRel.set(rel, link.getAttribute("href") ?? "");
  }
  link.href = url ?? defaultHrefByRel.get(rel)!;
}

/**
 * Keeps the browser tab's favicon and apple-touch-icon in sync with the
 * active customization's logo on the client. `entry-ssr.tsx`'s meta block
 * only covers the initial SSR response — without this, the tab icon would
 * stay stuck on whatever that first response had (or the site default)
 * through any later change: previewing a logo in the customization editor,
 * or a `?customization=` link whose SSR load timed out and only resolved
 * after the client made its own attempt.
 *
 * A no-op during SSR (`preact-render-to-string` never runs effects, so this
 * never touches a nonexistent `document` there), which is also why
 * entry-ssr.tsx still needs its own separate meta-block override for the
 * initial response.
 */
export function useCustomizationLinkOverrides(state: SeedBibleState): void {
  useSignalEffect(() => {
    const url = state.app.customizationLogoUrl.value;
    applyCustomizationLinkOverride(FAVICON_LINK_REL, url);
    applyCustomizationLinkOverride(APPLE_TOUCH_ICON_LINK_REL, url);
  });
}
