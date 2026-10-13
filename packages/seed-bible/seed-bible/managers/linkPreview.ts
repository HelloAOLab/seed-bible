import { z } from "zod";
import type { PlaylistItemData } from "./PlaylistManager";

// Caps keep a page with an enormous og:description from bloating every saved
// playlist and reading plan that links to it.
const MAX_TEXT_LENGTH = 1000;
const MAX_URL_LENGTH = 2048;

/**
 * The parts of a page's link preview (its Open Graph tags) that are stored on
 * a link item, so the preview shows without being fetched again.
 */
export const LinkPreviewSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  // A plain string, not `z.url()`: this is page-supplied data, and one odd
  // value must not make the whole playlist fail to parse. Rendering checks it
  // with `safeImageUrl`.
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  siteName: z.string().optional(),
});

export type LinkPreview = z.infer<typeof LinkPreviewSchema>;

/** The subset of the CasualOS link preview response read here. */
export interface LinkPreviewResponse {
  title?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  siteName?: string;
}

function cleanText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, MAX_TEXT_LENGTH) : undefined;
}

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

/**
 * Trims a server link preview down to what gets stored. Returns null when the
 * page offered nothing worth showing (no title, description, or image).
 */
export function toLinkPreview(data: LinkPreviewResponse): LinkPreview | null {
  const preview: LinkPreview = {
    title: cleanText(data.title),
    description: cleanText(data.description),
    imageUrl: safeImageUrl(data.imageUrl),
    imageAlt: cleanText(data.imageAlt),
    siteName: cleanText(data.siteName),
  };
  if (!preview.title && !preview.description && !preview.imageUrl) {
    return null;
  }
  return Object.fromEntries(
    Object.entries(preview).filter(([, value]) => value !== undefined)
  ) as LinkPreview;
}

/**
 * Keeps a link item's stored preview when it is re-saved with the same URL.
 * The link editor builds a fresh item from its fields, which would otherwise
 * drop the preview on every edit of the title or embed toggle.
 */
export function carryOverLinkPreview(
  previous: PlaylistItemData | undefined,
  next: PlaylistItemData
): PlaylistItemData {
  if (
    next.type === "link" &&
    !next.preview &&
    previous?.type === "link" &&
    previous.preview &&
    previous.url === next.url
  ) {
    return { ...next, preview: previous.preview };
  }
  return next;
}

/** How long a save waits for in-flight previews before going ahead without them. */
const SETTLE_TIMEOUT_MS = 3000;

/**
 * Fetches previews for link items as they are saved into a draft, and lets the
 * draft's final save wait briefly for any still in flight — otherwise a link
 * added just before "Save" would be stored without its preview.
 *
 * Once a save has taken its copy of the draft, `cancel` drops whatever is
 * still in flight. A preview landing after that would change a draft the save
 * has already moved past, and the reading plan wizard autosaves on every
 * change, so it could write the old draft back over the finished plan.
 */
export function createLinkPreviewLoader(
  fetchPreview: (url: string) => Promise<LinkPreview | null>
) {
  const pending = new Set<Promise<void>>();
  // Bumped by `cancel`; a request only applies if it is still current.
  let generation = 0;

  return {
    /**
     * Starts fetching a preview for `item` when it is a link without one.
     * `apply` receives the item with its preview attached and is responsible
     * for swapping it into the draft (if the item is still there).
     */
    request(
      item: PlaylistItemData,
      apply: (original: PlaylistItemData, previewed: PlaylistItemData) => void
    ): void {
      if (item.type !== "link" || item.preview) {
        return;
      }
      const startedIn = generation;
      const task = (async () => {
        try {
          const preview = await fetchPreview(item.url);
          if (preview && startedIn === generation) {
            apply(item, { ...item, preview });
          }
        } catch (error) {
          console.warn("[linkPreview] Could not fetch link preview:", error);
        }
      })();
      pending.add(task);
      void task.finally(() => pending.delete(task));
    },

    /** Resolves once in-flight previews land, or after a short timeout. */
    async settle(timeoutMs: number = SETTLE_TIMEOUT_MS): Promise<void> {
      if (pending.size === 0) {
        return;
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        Promise.allSettled([...pending]),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, timeoutMs);
        }),
      ]);
      clearTimeout(timer);
    },

    /** Drops the results of every request still in flight. */
    cancel(): void {
      generation++;
      pending.clear();
    },
  };
}
