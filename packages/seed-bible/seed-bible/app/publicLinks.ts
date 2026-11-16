import { readInjectedConfig, type AppConfig } from "./appConfig";

/**
 * The same page under a different origin. Built from the path rather than by
 * setting `protocol`/`host`, because the URL standard refuses to switch a
 * custom scheme like iOS's `capacitor:` to `https:` (the setter silently does
 * nothing).
 */
function withOrigin(url: URL, origin: string): URL {
  return new URL(`${url.pathname}${url.search}${url.hash}`, origin);
}

/**
 * Rewrites a link built from the page's own address so that it works for
 * whoever receives it. On the website this returns the URL unchanged; in the
 * native apps it moves the URL onto the public site (`AppConfig.publicOrigin`),
 * keeping the path, query and hash.
 */
export function toShareableUrl(
  url: string | URL,
  config: Pick<AppConfig, "publicOrigin"> = readInjectedConfig()
): URL {
  const parsed = new URL(url);
  return config.publicOrigin ? withOrigin(parsed, config.publicOrigin) : parsed;
}

/**
 * The reverse of {@link toShareableUrl}: the same page in the app (`appUrl` is
 * any address on it, e.g. `location.href`) for a link to the public site, or
 * `null` when `url` points anywhere else.
 */
export function toInAppUrl(
  url: string | URL,
  publicOrigin: string,
  appUrl: string
): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.origin !== new URL(publicOrigin).origin) {
    return null;
  }
  return withOrigin(parsed, appUrl);
}
