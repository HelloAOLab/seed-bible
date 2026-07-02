interface SanitizerCapableElement {
  setHTML(input: string): void;
}

/** True when the browser supports the native HTML Sanitizer API. */
export function supportsSanitizerApi(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof (Element.prototype as Partial<SanitizerCapableElement>).setHTML ===
      "function"
  );
}

/**
 * Sanitizes an untrusted HTML string, stripping scripts, event handlers, and
 * other XSS vectors so the result is safe to render (e.g. via
 * `dangerouslySetInnerHTML`).
 *
 * Uses the native HTML Sanitizer API (`Element.setHTML`) when available; and
 * otherwise falls back to `dompurify`, which is imported lazily so it is only
 * fetched when the native API is missing.
 */
export async function sanitize(html: string): Promise<string> {
  if (supportsSanitizerApi()) {
    const el = document.createElement("div");
    (el as unknown as SanitizerCapableElement).setHTML(html);
    return el.innerHTML;
  }

  const { default: DOMPurify } = await import("dompurify");
  return DOMPurify.sanitize(html);
}

/**
 * Sets the inner HTML of an element to a sanitized version of the provided HTML string.
 *
 * Uses the native HTML Sanitizer API (`Element.setHTML`) when available; and
 * otherwise falls back to `dompurify`, which is imported lazily so it is only
 * fetched when the native API is missing.
 */
export async function setSafeHtml(
  html: string,
  element: HTMLElement
): Promise<void> {
  if (supportsSanitizerApi()) {
    (element as unknown as SanitizerCapableElement).setHTML(html);
    return;
  }

  const { default: DOMPurify } = await import("dompurify");
  element.innerHTML = DOMPurify.sanitize(html);
}
