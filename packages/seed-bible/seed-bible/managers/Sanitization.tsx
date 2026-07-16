type NameReference =
  | string
  | {
      name: string;
      namespace?: string;
    };

interface SanitizerConfig {
  elements: (
    | {
        name: string;
        namespace?: string;
        attributes?: NameReference[];
        removeAttributes?: NameReference[];
      }
    | string
  )[];

  attributes?: NameReference[];
}

interface SanitizerCapableElement {
  setHTML(input: string, options: { sanitizer: SanitizerConfig }): void;
}

/** True when the browser supports the native HTML Sanitizer API. */
export function supportsSanitizerApi(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof (Element.prototype as Partial<SanitizerCapableElement>).setHTML ===
      "function"
  );
}

const ALLOWED_TAGS = [
  "div",
  "b",
  "em",
  "i",
  "q",
  "s",
  "small",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "tr",
  "tfoot",
  "thead",
  "u",
  "ul",
  "ol",
  "li",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "br",
  "blockquote",
  "pre",
  "code",
];

const ALLOWED_ATTRIBUTES = [
  "class",
  "lang",
  "dir",
  "href",
  "hreflang",
  "title",
];

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
    (el as unknown as SanitizerCapableElement).setHTML(html, {
      sanitizer: {
        elements: ALLOWED_TAGS,
        attributes: ALLOWED_ATTRIBUTES,
      },
    });
    return el.innerHTML;
  }

  const { default: DOMPurify } = await import("dompurify");
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
  });
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
    (element as unknown as SanitizerCapableElement).setHTML(html, {
      sanitizer: {
        elements: ALLOWED_TAGS,
        attributes: ALLOWED_ATTRIBUTES,
      },
    });
    return;
  }

  const { default: DOMPurify } = await import("dompurify");
  element.innerHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
  });
}
