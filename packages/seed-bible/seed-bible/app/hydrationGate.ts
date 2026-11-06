import type { AppConfig } from "./appConfig";
import { stripBasePath } from "../managers/ReadingUrlPath";
import type { NavigationManager } from "../managers/NavigationManager";

export interface HydrationGateContext {
  config: AppConfig;
  /**
   * Pathname of the address the page arrived at (`navigation.initialUrl`),
   * read before startup rewrites the address bar to the canonical reading
   * path. The server rendered for the arrival address, so the live
   * `location` would wrongly differ for `/` and the PWA start URL. Callers
   * at startup should use `decideStartupHydration`.
   */
  pathname: string;
  /** Search string of the arrival address; see `pathname`. */
  search: string;
  /**
   * The UI language the client will render its first paint in. Optional:
   * omitted means skip the language check.
   */
  clientLanguage?: string;
  /** The element `hydrate()`/`render()` will target (e.g. `#app`). */
  container: Element;
  /**
   * This client bundle's own build identity — `__GIT_COMMIT__`. Compared
   * against `config.renderedByCommit` to detect a page whose DOM was
   * produced by a different branch's (or commit's) SSR bundle.
   */
  clientCommit: string;
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
  | "url-mismatch"
  | "language-mismatch"
  | "build-mismatch";

export type HydrationDecision =
  | { hydrate: true }
  | {
      hydrate: false;
      reason: HydrationDeclineReason;
    };

/**
 * Whether the server-rendered page came from this same client bundle's commit
 * (see AppConfig.renderedByCommit). It doesn't when, e.g., the host server
 * rendered a request for an unlisted branch through `DEFAULT_SSR_BRANCH`
 * instead, so anything that render produced (its DOM, or data it embedded
 * after parsing with its own, possibly older, code) may not match what this
 * client would have produced. An absent `renderedByCommit` (a server old
 * enough to predate this field) also counts as a different build rather than
 * being given the benefit of the doubt: an unidentified build is exactly the
 * case this check exists to catch.
 */
export function isRenderedByThisBuild(
  config: AppConfig,
  clientCommit: string
): boolean {
  return config.renderedByCommit === clientCommit;
}

/**
 * Decides whether the client should `hydrate()` onto the existing SSR DOM or
 * fall back to a clean `render()`. Preact's `hydrate()` does not diff
 * attributes on existing DOM, so a mismatch here would silently stay wrong
 * rather than self-correct — every check below is a case where that would
 * otherwise happen.
 */
export function decideHydration(ctx: HydrationGateContext): HydrationDecision {
  const { config, pathname, search, container, clientCommit, clientLanguage } =
    ctx;

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

  // Preact's hydrate() only diffs the tree shape, not component code
  // identity, so it would happily patch onto markup a different version of
  // the app produced.
  if (!isRenderedByThisBuild(config, clientCommit)) {
    return { hydrate: false, reason: "build-mismatch" };
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

  // The language never appears in the URL on a bare `/`, so a server/client
  // disagreement there would otherwise hydrate silently into wrong-language
  // markup. A page without the marker can't be checked.
  if (
    config.renderedLanguage !== undefined &&
    clientLanguage !== undefined &&
    config.renderedLanguage !== clientLanguage
  ) {
    return { hydrate: false, reason: "language-mismatch" };
  }

  return { hydrate: true };
}

/**
 * The startup call to `decideHydration`. Reads the arrival URL from
 * `navigation.initialUrl` (not `location`, which creating the app state has
 * already rewritten) and the language the client settled on.
 */
export function decideStartupHydration(ctx: {
  config: AppConfig;
  navigation: Pick<NavigationManager, "initialUrl">;
  container: Element;
  clientCommit: string;
  clientLanguage?: string;
}): HydrationDecision {
  const { navigation, ...rest } = ctx;
  return decideHydration({
    ...rest,
    pathname: navigation.initialUrl.pathname,
    search: navigation.initialUrl.search,
  });
}
