import type { AppConfig } from "./appConfig";
import { stripBasePath } from "../managers/ReadingUrlPath";

export interface HydrationGateContext {
  config: AppConfig;
  /** `location.pathname` from the live document. */
  pathname: string;
  /** `location.search` from the live document. */
  search: string;
  /** The element `hydrate()`/`render()` will target (e.g. `#app`). */
  container: Element;
}

/**
 * Why the client isn't hydrating. All but `chapter-load-timed-out` are
 * decided by `decideHydration` below; that one is decided by the caller
 * (`app/init.tsx`), which owns the wait for the initial chapter loads.
 */
export type HydrationDeclineReason =
  | "no-ssr-content"
  | "chapter-load-incomplete"
  | "chapter-load-timed-out"
  | "url-mismatch";

export type HydrationDecision =
  | { hydrate: true }
  | {
      hydrate: false;
      reason: HydrationDeclineReason;
    };

/**
 * Decides whether the client should `hydrate()` onto the existing SSR DOM or
 * fall back to a clean `render()`. Preact's `hydrate()` does not diff
 * attributes on existing DOM, so a mismatch here would silently stay wrong
 * rather than self-correct — every check below is a case where that would
 * otherwise happen.
 */
export function decideHydration(ctx: HydrationGateContext): HydrationDecision {
  const { config, pathname, search, container } = ctx;

  // A shell that was never actually filled in (a non-whitelisted branch's
  // stale fallback with a swallowed substitution, or a render() error path)
  // leaves nothing but a comment node under the container.
  if (!container.firstElementChild) {
    return { hydrate: false, reason: "no-ssr-content" };
  }

  // No `renderedForPath` means this config never came from a real render()
  // call at all (see AppConfig.renderedForPath) — nothing to verify a URL
  // match against.
  if (!config.renderedForPath) {
    return { hydrate: false, reason: "no-ssr-content" };
  }

  if (!config.ssrChapterContentSettled) {
    return { hydrate: false, reason: "chapter-load-incomplete" };
  }

  const ssrUrl = new URL(
    config.renderedForPath,
    "http://hydration-check.local"
  );
  const ssrAppPath = `${stripBasePath(ssrUrl.pathname, config.basePath)}${ssrUrl.search}`;
  const liveAppPath = `${stripBasePath(pathname, config.basePath)}${search}`;
  if (ssrAppPath !== liveAppPath) {
    return { hydrate: false, reason: "url-mismatch" };
  }

  return { hydrate: true };
}
