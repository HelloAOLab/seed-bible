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

export function createNavigationManager() {
  const currentUrl = signal<URL>(new URL(window.location.href));

  const syncCurrentUrl = () => {
    if (typeof window === "undefined") {
      return;
    }

    // Skip redundant writes so effects that depend on currentUrl don't
    // re-run (or cycle) when the location hasn't actually changed.
    if (currentUrl.peek().href === window.location.href) {
      return;
    }

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

    // The Navigation API is not available in all browsers (or in jsdom);
    // the popstate/pushState/replaceState hooks above cover those cases.
    if (typeof window.navigation !== "undefined") {
      window.navigation.addEventListener("navigate", (event: NavigateEvent) => {
        if (event.downloadRequest || !event.destination?.sameDocument) {
          return;
        }

        currentUrl.value = new URL(
          event.destination.url ?? window.location.href
        );
        event.intercept();
      });
    }
  }

  const push = (url: string | URL) => {
    if (typeof window === "undefined") {
      return;
    }

    window.history.pushState(window.history.state, "", toAbsoluteUrl(url));
  };

  const replace = (url: string | URL) => {
    if (typeof window === "undefined") {
      return;
    }

    window.history.replaceState(window.history.state, "", toAbsoluteUrl(url));
  };

  const go = (destination: NavigationDestination) => {
    if (typeof window === "undefined") {
      return;
    }

    if (typeof destination === "number") {
      window.history.go(destination);
      return;
    }

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

  return {
    currentUrl: computed(() => currentUrl.value),
    go,
    replace,
    push,
    updateQueryParam,
    syncSignalsToUrl,
  };
}

export type NavigationManager = ReturnType<typeof createNavigationManager>;
