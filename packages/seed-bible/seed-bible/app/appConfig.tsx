import { createContext } from "preact";
import { useContext } from "preact/hooks";
/**
 * Runtime deployment configuration injected by the host server into the page
 * (as a `<script type="application/json" id="app-config">` element) and
 * passed directly to the app during SSR.
 *
 * This is how the app learns which path it is mounted under and where its
 * assets live — neither of which can be baked in at build time, because a
 * single build is served under many branch paths and from one shared asset
 * host.
 */
export interface BrandingConfig {
  appName: string;
  shortName: string;
  logo: string;
  icon: string;
  websiteUrl: string;
  disabledToolbarTools?: string[];
  defaultTranslationId?: string;
}

// Injected from Vite
declare const __BRANDING_CONFIG__: BrandingConfig | undefined;

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

  /** Whether the app was rendered as a mobile version on the server */
  renderedAsMobile: boolean;

  /**
   * Whether the requesting `User-Agent` is WebKit-based (Safari, or any iOS
   * browser — all of which use WebKit regardless of what they call
   * themselves). Computed once from the request header so the client doesn't
   * need its own `navigator.userAgent` check.
   */
  renderedAsWebKit: boolean;

  /** The list of languages included in the `Accept-Language` header */
  acceptedLanguages: string[];
  /** Client branding configuration. */
  branding?: BrandingConfig;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  basePath: "",
  assetHost: "",
  renderedAsMobile: false,
  renderedAsWebKit: false,
  acceptedLanguages: [],
  branding: import.meta.env.VITEST ? undefined : __BRANDING_CONFIG__,
};

/**
 * Reads the config the host server injected as a JSON `<script>` tag. Used
 * by the client entry at hydration time so the client mounts with the same
 * config the server rendered with (avoids hydration mismatches).
 */
export function readInjectedConfig(): AppConfig {
  if (typeof document === "undefined") {
    return DEFAULT_APP_CONFIG;
  }
  const el = document.getElementById("app-config");
  if (!el?.textContent) {
    return DEFAULT_APP_CONFIG;
  }
  try {
    const parsed = JSON.parse(el.textContent);
    return {
      ...DEFAULT_APP_CONFIG,
      ...parsed,
    };
  } catch (error) {
    console.error("CONFIG JSON PARSE FAILED:", error);
    return DEFAULT_APP_CONFIG;
  }
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
