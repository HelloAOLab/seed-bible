import { hydrate, render } from "preact";
import type { VNode } from "preact";

export type HydrateOutcome =
  | { outcome: "hydrated" }
  | { outcome: "fell-back"; hydrateError: unknown }
  | { outcome: "failed"; hydrateError: unknown; renderError: unknown };

/**
 * Hydrates `app` onto `container`. If hydration throws, falls back to a full
 * `render()` instead of leaving the page broken.
 *
 * Renders onto a brand-new element in `container`'s place rather than
 * retrying on `container` itself — a failed `hydrate()` can leave Preact's
 * internal bookkeeping on `container` (a private, mangled property — `__k`
 * in the published build) pointing at a half-built vnode tree from the diff
 * that was interrupted partway through. Diffing a fresh render against that
 * corrupted tree risks a second, harder-to-diagnose crash or corrupted DOM,
 * so the fallback renders into an element Preact has never touched instead —
 * the same safe "fresh mount" path this app's hydration-skipped branch
 * already relies on elsewhere.
 *
 * `document.body` is never replaced this way — that would remove everything
 * under `<body>`, not just the app (analytics snippets, the
 * currently-executing `<script>` tag itself, etc.) — so that case falls back
 * to rendering directly onto `container`, same as the hydration-skipped path.
 *
 * If the fallback render() *also* throws, there's nothing left to try: the
 * target is left with a plain text message instead of whatever broken state
 * the failed render left behind.
 *
 * Only catches a synchronous throw during hydration/render itself — a throw
 * from a `useEffect` or other post-mount work is not caught here, since
 * there is no error boundary in this app to catch those.
 */
export function hydrateWithFallback(
  app: VNode,
  container: Element
): HydrateOutcome {
  try {
    hydrate(app, container);
    return { outcome: "hydrated" };
  } catch (hydrateError) {
    const target =
      container === document.body
        ? container
        : replaceWithFreshElement(container);
    try {
      render(app, target);
      return { outcome: "fell-back", hydrateError };
    } catch (renderError) {
      target.textContent =
        "Something went wrong loading this page. Please refresh to try again.";
      return { outcome: "failed", hydrateError, renderError };
    }
  }
}

function replaceWithFreshElement(element: Element): Element {
  const fresh = document.createElement(element.tagName);
  for (const attribute of element.attributes) {
    fresh.setAttribute(attribute.name, attribute.value);
  }
  element.replaceWith(fresh);
  return fresh;
}
