import { computed, effect, signal } from "@preact/signals";

export type NavigationDestination = number | string | URL;

function toAbsoluteUrl(url: string | URL): string {
  if (typeof window === "undefined") {
    return String(url);
  }

  return new URL(String(url), window.location.href).toString();
}

export interface SimpleSignal<T> {
  get value(): T;
  set value(newValue: T);
}

export interface NavigationManagerOptions {
  /**
   * Full initial URL. Supplied during SSR (where `window` is unavailable) so
   * the manager can seed `currentUrl` from the request; on the client it
   * defaults to `window.location.href`.
   */
  initialHref?: string;
  /** Deployment path prefix (e.g. "/d/branch-develop"); empty for root. */
  basePath?: string;
}

export function createNavigationManager(
  options: NavigationManagerOptions = {}
) {
  // On the server there is no `window` — fall back to the supplied initial
  // href (or a neutral placeholder) so the manager can be constructed during
  // SSR. The placeholder origin is irrelevant: initial state is derived from
  // the URL's path/query, which we control.
  const initialHref =
    options.initialHref ??
    (typeof window !== "undefined"
      ? window.location.href
      : "http://localhost/");
  const currentUrl = signal<URL>(new URL(initialHref));

  // A frozen snapshot of the URL exactly as the page was first loaded, before
  // any in-app navigation — including the reader's own book/chapter -> URL
  // echo (see TabsManager) — has a chance to mutate `currentUrl`. Extensions
  // load asynchronously, well after that echo has already run, so anything
  // that needs to tell "the user linked here on purpose" apart from "the
  // reader wrote its default position into the URL" must check this instead
  // of the live `currentUrl`.
  const initialUrl = new URL(initialHref);

  const basePath = options.basePath ?? "";

  // Keep root-absolute navigations inside the deployment's path prefix.
  // Relative navigations already resolve against the current location (which
  // includes the prefix), so they are left untouched.
  const applyBasePath = (url: string | URL): string | URL => {
    if (!basePath || typeof url !== "string") return url;
    if (
      !url.startsWith("/") ||
      url.startsWith(basePath + "/") ||
      url === basePath
    ) {
      return url;
    }
    return `${basePath}${url}`;
  };

  // Set by `dispose()`. Everything this manager installs on `window` is global
  // and shared, so a disposed manager must go inert rather than keep reacting
  // to navigations that are no longer its business.
  let disposed = false;
  const teardowns: (() => void)[] = [];

  const syncCurrentUrl = () => {
    if (disposed || typeof window === "undefined") {
      return;
    }

    // Skip redundant writes so effects that depend on currentUrl don't
    // re-run (or cycle) when the location hasn't actually changed.
    if (currentUrl.peek().href === window.location.href) {
      return;
    }

    console.log("Sync URL:", window.location.href);
    currentUrl.value = new URL(window.location.href);
  };

  if (typeof window !== "undefined") {
    const onLocationChange = () => {
      syncCurrentUrl();
    };

    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("hashchange", onLocationChange);
    teardowns.push(() => {
      window.removeEventListener("popstate", onLocationChange);
      window.removeEventListener("hashchange", onLocationChange);
    });

    // Keep the untouched references as well as bound copies to call through:
    // restoring must put back the exact function that was there, or repeated
    // create/dispose cycles leave a new bound layer behind every time.
    const previousPushState = window.history.pushState;
    const originalPushState = previousPushState.bind(window.history);
    const patchedPushState = ((
      data: unknown,
      unused: string,
      url?: string | URL | null
    ) => {
      originalPushState(data, unused, url);
      syncCurrentUrl();
    }) as History["pushState"];
    window.history.pushState = patchedPushState;

    const previousReplaceState = window.history.replaceState;
    const originalReplaceState = previousReplaceState.bind(window.history);
    const patchedReplaceState = ((
      data: unknown,
      unused: string,
      url?: string | URL | null
    ) => {
      originalReplaceState(data, unused, url);
      syncCurrentUrl();
    }) as History["replaceState"];
    window.history.replaceState = patchedReplaceState;

    teardowns.push(() => {
      // Only unwind our own patch. If something else has since wrapped these
      // methods, ours is no longer the outermost layer and restoring the
      // original would silently throw that wrapper away — leave it in place
      // and rely on the `disposed` guard in `syncCurrentUrl` to make it inert.
      if (window.history.pushState === patchedPushState) {
        window.history.pushState = previousPushState;
      }
      if (window.history.replaceState === patchedReplaceState) {
        window.history.replaceState = previousReplaceState;
      }
    });

    const isNavigationToSameOrigin = (url: string | null | undefined) => {
      if (!url) return true;
      return (
        new URL(url, window.location.href).origin === window.location.origin
      );
    };

    // The Navigation API is not available in all browsers (or in jsdom);
    // the popstate/pushState/replaceState hooks above cover those cases.
    if (typeof window.navigation !== "undefined") {
      const onNavigate = (event: NavigateEvent) => {
        if (
          disposed ||
          event.downloadRequest ||
          !isNavigationToSameOrigin(event.destination?.url)
        ) {
          return;
        }

        currentUrl.value = new URL(
          event.destination?.url ?? window.location.href
        );
        event.intercept();
      };
      window.navigation.addEventListener("navigate", onNavigate);
      teardowns.push(() => {
        window.navigation?.removeEventListener("navigate", onNavigate);
      });
    }
  }

  /**
   * Detaches this manager from the shared `window`, in both directions: it
   * stops listening for history changes, unwinds its `pushState`/
   * `replaceState` wrappers, and stops writing — `push`/`replace`/`go` become
   * no-ops. Both halves are needed. Effects elsewhere in the app hold onto
   * this manager and keep calling `push` long after the state that owns it is
   * finished, so removing the listeners alone would still leave it writing.
   *
   * The app builds one state for the life of the page and never needs this.
   * Tests build many, and without a teardown every past manager keeps fighting
   * the current one over the single `window.location` they all share.
   */
  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    for (const teardown of teardowns.splice(0)) {
      teardown();
    }
  };

  const push = (url: string | URL) => {
    if (disposed || typeof window === "undefined") {
      return;
    }

    console.log("Push URL:", url);
    window.history.pushState(
      window.history.state,
      "",
      toAbsoluteUrl(applyBasePath(url))
    );
  };

  const replace = (url: string | URL) => {
    if (disposed || typeof window === "undefined") {
      return;
    }

    console.log("Replace URL:", url);
    window.history.replaceState(
      window.history.state,
      "",
      toAbsoluteUrl(applyBasePath(url))
    );
  };

  const go = (destination: NavigationDestination) => {
    if (disposed || typeof window === "undefined") {
      return;
    }

    if (typeof destination === "number") {
      console.log("Go history by:", destination);
      window.history.go(destination);
      return;
    }

    console.log("Go to destination:", destination);
    push(destination);
  };

  const updateQueryParam = (key: string, value: string | null) => {
    // peek() so effects that call updateQueryParam don't subscribe to
    // currentUrl — they would re-run on the very write they cause.
    const current = currentUrl.peek();
    if (current.searchParams.get(key) === value) {
      return;
    }

    const next = new URL(current);
    if (!value) {
      next.searchParams.delete(key);
    } else {
      next.searchParams.set(key, value);
    }
    console.log(`Updating URL query param: ${key} =`, value);
    push(next);
  };

  /**
   * Updates the given query parameters in the URL and pushes a new history entry.
   * @param update The update object containing query parameters to be updated.
   * @param replaceState Whether to replace the current history entry instead of pushing a new one. Defaults to false.
   * @returns
   */
  const updateQueryParams = (
    update: Record<string, string | null>,
    replaceState: boolean = false
  ) => {
    // peek() so effects that call updateQueryParam don't subscribe to
    // currentUrl — they would re-run on the very write they cause.
    const current = currentUrl.peek();
    const next = new URL(current);
    let hasChanges = false;
    for (const [key, value] of Object.entries(update)) {
      if (current.searchParams.get(key) === value) {
        continue;
      }
      hasChanges = true;

      if (!value) {
        next.searchParams.delete(key);
      } else {
        next.searchParams.set(key, value);
      }
      console.log(`Updating URL query param: ${key} =`, value);
    }

    if (!hasChanges) {
      return;
    }

    if (replaceState) {
      replace(next);
    } else {
      push(next);
    }
  };

  /**
   * Sets the pathname and updates the given query parameters in one history
   * operation. `pathname` should be root-absolute and WITHOUT the deployment
   * prefix — it is prefixed with `basePath` here, mirroring how `currentUrl`
   * always includes that prefix.
   */
  const updatePathAndQueryParams = (
    pathname: string,
    update: Record<string, string | null>,
    replaceState: boolean = false
  ) => {
    const current = currentUrl.peek();
    const nextPathname = `${basePath}${pathname}`;
    let hasChanges = current.pathname !== nextPathname;

    const next = new URL(current);
    next.pathname = nextPathname;

    for (const [key, value] of Object.entries(update)) {
      if (current.searchParams.get(key) === value) {
        continue;
      }
      hasChanges = true;

      if (!value) {
        next.searchParams.delete(key);
      } else {
        next.searchParams.set(key, value);
      }
    }

    if (!hasChanges) {
      return;
    }

    if (replaceState) {
      replace(next);
    } else {
      push(next);
    }
  };

  const syncSignalsToUrl = (
    signals: Record<string, SimpleSignal<string | null>>
  ) => {
    if (import.meta.env.SSR) {
      // Don't allow syncing signals to the URL during SSR, as it would be meaningless
      // and could cause errors between different requests.
      return () => {};
    }

    const cleanup1 = effect(() => {
      const update: Record<string, string | null> = {};
      for (const [key, signal] of Object.entries(signals)) {
        const requestedValue = signal.value;
        update[key] = requestedValue;
      }
      updateQueryParams(update);
    });

    const cleanup2 = effect(() => {
      console.log("[syncSignalsToUrl] URL changed:", currentUrl.value.href);
      const url = currentUrl.value;

      for (const [key, signal] of Object.entries(signals)) {
        const newRequestedValue = url.searchParams.get(key);
        if (newRequestedValue !== signal.value) {
          signal.value = newRequestedValue;
        }
      }
    });

    return () => {
      cleanup1();
      cleanup2();
    };
  };

  const linkToQuery = (query: Record<string, string | null>) => {
    const url = new URL(currentUrl.value);
    for (const [key, value] of Object.entries(query)) {
      if (value === null) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  };

  return {
    currentUrl: computed(() => currentUrl.value),
    initialUrl,
    basePath,
    go,
    replace,
    push,
    updateQueryParam,
    updateQueryParams,
    updatePathAndQueryParams,
    syncSignalsToUrl,
    linkToQuery,
    dispose,
  };
}

export type NavigationManager = ReturnType<typeof createNavigationManager>;
