/**
 * Validates a source string is a valid URL.
 * @returns A URL object if valid, otherwise returns false.
 */
export function isValidUrl(src: string): URL | false {
  try {
    return new URL(src);
  } catch {
    return false;
  }
}

/**
 * Indicates whether or not a url follows http(s) protocol.
 * @returns True if http or https; false otherwise.
 */
export function isUrlHttp(url: URL): boolean {
  return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * Validates whether or not a source string is a valid script element src.
 * @returns True if a valid script source string is provided; false otherwise.
 */
export function isValidScriptSource(src: string) {
  const url = isValidUrl(src);
  return url && isUrlHttp(url);
}
