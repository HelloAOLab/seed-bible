/**
 * Partner-site embed mode, driven by `?embed=` on the page URL.
 *
 * `minimal` and `true` are the same compact reading chrome; any other value
 * (including a bare `?embed`) leaves the full app as it is.
 */

const MINIMAL_EMBED_VALUES = new Set(["minimal", "true"]);

/** Whether a raw `?embed=` value should turn on the compact embed chrome. */
export function isMinimalEmbedQueryValue(value: string | null): boolean {
  return value !== null && MINIMAL_EMBED_VALUES.has(value.toLowerCase());
}

/** Whether `url` is a compact embed (`?embed=minimal` or `?embed=true`). */
export function isMinimalEmbedUrl(url: URL): boolean {
  return isMinimalEmbedQueryValue(url.searchParams.get("embed"));
}

/**
 * The same URL with `embed` stripped, so "Open in New Tab" can hand the
 * visitor the full app at the chapter they were already reading.
 */
export function urlWithoutEmbedParam(url: URL): URL {
  const next = new URL(url.href);
  next.searchParams.delete("embed");
  return next;
}

/** Query value that opens the compact embed chrome. */
export const EMBED_MINIMAL_VALUE = "minimal";

/**
 * Deep-link key `SettingsManager` reads as the starting theme for a session.
 * `system` follows the visitor's device.
 */
export const EMBED_THEME_QUERY_PARAM = "app.themeId";

/** Share-link key for a customization (`recordName.id`). */
export const EMBED_CUSTOMIZATION_QUERY_PARAM = "customization";

export interface EmbedThemeChoice {
  id: string;
  name: string;
}

export interface EmbedLinkOptions {
  /** Preset id written to `app.themeId`. `system` follows the device. */
  themeId: string;
  /** Active customization locator, kept so the iframe opens in that look. */
  customizationLocator?: string | null;
}

/**
 * The passage link plus the compact-embed flag, the chosen theme, and the
 * customization the viewer is in (when there is one).
 */
export function buildEmbedUrl(shareUrl: URL, options: EmbedLinkOptions): URL {
  const url = new URL(shareUrl.href);
  url.searchParams.set("embed", EMBED_MINIMAL_VALUE);
  url.searchParams.set(EMBED_THEME_QUERY_PARAM, options.themeId);
  if (options.customizationLocator) {
    url.searchParams.set(
      EMBED_CUSTOMIZATION_QUERY_PARAM,
      options.customizationLocator
    );
  } else {
    url.searchParams.delete(EMBED_CUSTOMIZATION_QUERY_PARAM);
  }
  return url;
}

/** HTML a site owner pastes to embed `embedUrl`. Attribute values are escaped. */
export function buildEmbedIframeHtml(embedUrl: URL, title: string): string {
  return `<iframe src="${escapeHtmlAttribute(embedUrl.href)}" title="${escapeHtmlAttribute(title)}" width="560" height="400" style="border:0" allowfullscreen></iframe>`;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
