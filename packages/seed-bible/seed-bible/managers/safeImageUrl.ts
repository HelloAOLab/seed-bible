// Apart from `linkPreview.ts` because a shared component uses it, and
// importing that file brings zod into every extension bundle that does.

// Keeps an enormous image URL from bloating every saved playlist and reading
// plan that links to its page.
const MAX_URL_LENGTH = 2048;

/** The URL when it is an http(s) image URL that can safely go in `<img src>`. */
export function safeImageUrl(value: string | undefined): string | undefined {
  if (!value || value.length > MAX_URL_LENGTH) {
    return undefined;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
