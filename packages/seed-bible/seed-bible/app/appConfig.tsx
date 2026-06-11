import { createContext } from "preact";
import { useContext } from "preact/hooks";

/**
 * Runtime deployment configuration injected by the host server into the page
 * (as `window.__APP_CONFIG__`) and passed directly to the app during SSR.
 *
 * This is how the app learns which path it is mounted under and where its
 * assets live — neither of which can be baked in at build time, because a
 * single build is served under many branch paths and from one shared asset
 * host.
 */
export interface AppConfig {
  /**
   * Path prefix this deployment is mounted under, e.g. "/d/branch-develop".
   * Empty string for root (production `main`). Never has a trailing slash.
   */
  basePath: string;
  /**
   * Absolute origin where hashed assets are served from, e.g.
   * "https://assets.seedbible.com". Empty string means same-origin.
   */
  assetHost: string;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  basePath: "",
  assetHost: "",
};

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

/**
 * Reads the config the host server injected as a global. Used by the client
 * entry at hydration time so the client mounts with the same config the
 * server rendered with (avoids hydration mismatches).
 */
export function readInjectedConfig(): AppConfig {
  if (typeof window === "undefined" || !window.__APP_CONFIG__) {
    return DEFAULT_APP_CONFIG;
  }
  return { ...DEFAULT_APP_CONFIG, ...window.__APP_CONFIG__ };
}

/** Prefixes a root-relative app path with the deployment base path. */
export function withBasePath(config: AppConfig, path: string): string {
  if (!config.basePath) return path;
  if (!path.startsWith("/")) return path;
  return `${config.basePath}${path}`;
}

const AppConfigContext = createContext<AppConfig>(DEFAULT_APP_CONFIG);

export const AppConfigProvider = AppConfigContext.Provider;

/** Reads the active deployment config from context (works on server + client). */
export function useAppConfig(): AppConfig {
  return useContext(AppConfigContext);
}
