/**
 * The chunk URL named in a failed dynamic import's error. Chrome ("Failed to
 * fetch dynamically imported module: <url>") and Firefox ("error loading
 * dynamically imported module: <url>") include it; Safari doesn't.
 */
export function failedChunkUrl(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  return message.match(/https?:\/\/[^\s'"]+/)?.[0] ?? null;
}

// Load errors are recorded as they happen: afterwards a failed `<link>` can't
// be told apart from a loaded one (Chromium gives it an empty `sheet`). The
// listener captures because resource error events don't bubble.
const failedStylesheets = new Set<HTMLLinkElement>();
if (typeof document !== "undefined") {
  document.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (target instanceof HTMLLinkElement && target.rel === "stylesheet") {
        failedStylesheets.add(target);
      }
    },
    true
  );
}

/**
 * Re-requests stylesheets whose load failed. Vite's preload helper adds a
 * chunk's CSS `<link>` once and remembers it, so after an offline failure it
 * never asks for that CSS again; a fresh element with the same href does.
 */
export function reloadFailedStylesheets(): void {
  for (const link of failedStylesheets) {
    failedStylesheets.delete(link);
    if (link.isConnected) {
      link.replaceWith(link.cloneNode());
    }
  }
}

/**
 * Retries a lazily-loaded chunk after an earlier failure. Browsers remember a
 * failed module fetch for the life of the page, so importing the same URL
 * again fails instantly without touching the network (seen in Chromium 141).
 * When `load()` fails like that, import the chunk again under a cache-busting
 * query, which is a new module URL as far as the browser is concerned.
 */
export async function retryChunkImport<T>(
  load: () => Promise<T>,
  importUrl: (url: string) => Promise<T> = (url) =>
    import(/* @vite-ignore */ url) as Promise<T>
): Promise<T> {
  reloadFailedStylesheets();
  try {
    return await load();
  } catch (err) {
    const url = failedChunkUrl(err);
    if (!url) {
      throw err;
    }
    const busted = new URL(url);
    busted.searchParams.set("retry", String(Date.now()));
    return importUrl(busted.href);
  }
}
