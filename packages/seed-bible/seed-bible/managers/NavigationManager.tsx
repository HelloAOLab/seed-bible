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

    currentUrl.value = new URL(window.location.href);
  };

  if (typeof window !== "undefined") {
    const onLocationChange = () => {
      syncCurrentUrl();
    };

    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("hashchange", onLocationChange);

    const originalPushState = history.pushState.bind(history);
    history.pushState = ((
      data: unknown,
      unused: string,
      url?: string | URL | null
    ) => {
      originalPushState(data, unused, url);
      syncCurrentUrl();
    }) as History["pushState"];

    const originalReplaceState = history.replaceState.bind(history);
    history.replaceState = ((
      data: unknown,
      unused: string,
      url?: string | URL | null
    ) => {
      originalReplaceState(data, unused, url);
      syncCurrentUrl();
    }) as History["replaceState"];

    navigation.addEventListener("navigate", (event: NavigateEvent) => {
      if (event.downloadRequest || !event.destination?.sameDocument) {
        return;
      }

      currentUrl.value = new URL(event.destination.url ?? window.location.href);
      event.intercept();
    });
  }

  const push = (url: string | URL) => {
    if (typeof window === "undefined") {
      return;
    }

    history.pushState(history.state, "", toAbsoluteUrl(url));
  };

  const replace = (url: string | URL) => {
    if (typeof window === "undefined") {
      return;
    }

    history.replaceState(history.state, "", toAbsoluteUrl(url));
  };

  const go = (destination: NavigationDestination) => {
    if (typeof window === "undefined") {
      return;
    }

    if (typeof destination === "number") {
      history.go(destination);
      return;
    }

    push(destination);
  };

  const updateQueryParam = (key: string, value: string | null) => {
    if (currentUrl.value.searchParams.get(key) === value) {
      return;
    }

    if (!value) {
      const next = new URL(currentUrl.value);
      next.searchParams.delete(key);
      push(next);
    } else {
      const next = new URL(currentUrl.value);
      next.searchParams.set(key, value);
      push(next);
    }
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
