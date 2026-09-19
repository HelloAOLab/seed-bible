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
