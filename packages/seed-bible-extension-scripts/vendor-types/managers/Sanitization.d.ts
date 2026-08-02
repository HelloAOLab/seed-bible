/** True when the browser supports the native HTML Sanitizer API. */
export declare function supportsSanitizerApi(): boolean;
/**
 * Sanitizes an untrusted HTML string, stripping scripts, event handlers, and
 * other XSS vectors so the result is safe to render (e.g. via
 * `dangerouslySetInnerHTML`).
 *
 * Uses the native HTML Sanitizer API (`Element.setHTML`) when available; and
 * otherwise falls back to `dompurify`, which is imported lazily so it is only
 * fetched when the native API is missing.
 */
export declare function sanitize(html: string): Promise<string>;
/**
 * Sets the inner HTML of an element to a sanitized version of the provided HTML string.
 *
 * Uses the native HTML Sanitizer API (`Element.setHTML`) when available; and
 * otherwise falls back to `dompurify`, which is imported lazily so it is only
 * fetched when the native API is missing.
 */
export declare function setSafeHtml(
  html: string,
  element: HTMLElement
): Promise<void>;
