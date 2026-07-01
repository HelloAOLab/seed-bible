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

  const syncCurrentUrl = () => {
    if (typeof window === "undefined") {
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

    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = ((
      data: unknown,
      unused: string,
      url?: string | URL | null
    ) => {
      originalPushState(data, unused, url);
      syncCurrentUrl();
    }) as History["pushState"];

    const originalReplaceState = window.history.replaceState.bind(
      window.history
    );
    window.history.replaceState = ((
      data: unknown,
      unused: string,
      url?: string | URL | null
    ) => {
      originalReplaceState(data, unused, url);
      syncCurrentUrl();
    }) as History["replaceState"];

    const isNavigationToSameOrigin = (url: string | null | undefined) => {
      if (!url) return true;
      return (
        new URL(url, window.location.href).origin === window.location.origin
      );
    };

    // The Navigation API is not available in all browsers (or in jsdom);
    // the popstate/pushState/replaceState hooks above cover those cases.
    if (typeof window.navigation !== "undefined") {
      window.navigation.addEventListener("navigate", (event: NavigateEvent) => {
        if (
          event.downloadRequest ||
          !isNavigationToSameOrigin(event.destination?.url)
        ) {
          return;
        }

        currentUrl.value = new URL(
          event.destination?.url ?? window.location.href
        );
        event.intercept();
      });
    }
  }

  const push = (url: string | URL) => {
    if (typeof window === "undefined") {
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
    if (typeof window === "undefined") {
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
    if (typeof window === "undefined") {
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

  const syncSignalsToUrl = (
    signals: Record<string, SimpleSignal<string | null>>
  ) => {
    const cleanup1 = effect(() => {
      for (const [key, signal] of Object.entries(signals)) {
        const requestedValue = signal.value;
        updateQueryParam(key, requestedValue);
      }
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
    go,
    replace,
    push,
    updateQueryParam,
    syncSignalsToUrl,
    linkToQuery,
  };
}

export type NavigationManager = ReturnType<typeof createNavigationManager>;
