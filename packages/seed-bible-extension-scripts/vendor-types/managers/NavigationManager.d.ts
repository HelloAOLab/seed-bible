export type NavigationDestination = number | string | URL;
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
export declare function createNavigationManager(
  options?: NavigationManagerOptions
): {
  currentUrl: import("@preact/signals").ReadonlySignal<URL>;
  initialUrl: URL;
  go: (destination: NavigationDestination) => void;
  replace: (url: string | URL) => void;
  push: (url: string | URL) => void;
  updateQueryParam: (key: string, value: string | null) => void;
  updateQueryParams: (
    update: Record<string, string | null>,
    replaceState?: boolean
  ) => void;
  syncSignalsToUrl: (
    signals: Record<string, SimpleSignal<string | null>>
  ) => () => void;
  linkToQuery: (query: Record<string, string | null>) => string;
};
export type NavigationManager = ReturnType<typeof createNavigationManager>;
