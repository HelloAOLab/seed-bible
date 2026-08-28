import {
  computed,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { Annotation, AnnotationsManager } from "./AnnotationsManager";
import type { HighlightsManager, StoredHighlight } from "./HighlightsManager";
import type { LoginManager } from "./LoginManager";

/**
 * Which kind of content the screen is showing. "all" is the default and shows
 * every section at a glance; the others narrow to one section in full.
 *
 * There is no "notes" member even though the Figma frame has a Notes chip:
 * in this app a note *is* an annotation (`data.type === "comment"`), so a
 * separate chip would filter to the same records under a second name.
 */
export type ContentFilter =
  | "all"
  | "annotations"
  | "highlights"
  | "bookmarks"
  | "playlists";

export const CONTENT_FILTERS: ContentFilter[] = [
  "all",
  "annotations",
  "highlights",
  "bookmarks",
  "playlists",
];

/** How far a load has got. `error` keeps a failure from looking like "empty". */
export type ContentLoadStatus = "idle" | "loading" | "ready" | "error";

export interface YourContentManager {
  /** Free-text filter typed into the search box. */
  query: Signal<string>;
  /** The selected chip. */
  filter: Signal<ContentFilter>;
  /** Every annotation the user has, newest first. */
  annotations: ReadonlySignal<Annotation[]>;
  /** Every highlight the user has, in record order. */
  highlights: ReadonlySignal<StoredHighlight[]>;
  status: ReadonlySignal<ContentLoadStatus>;
  /**
   * Loads annotations and highlights. Safe to call on every open: an
   * in-flight load is shared, and a completed one is reused unless `force`
   * asks for a refresh (after an edit or delete, say).
   */
  load: (options?: { force?: boolean }) => Promise<void>;
  /** Drops a deleted annotation from the list without a server round-trip. */
  removeAnnotation: (annotationId: string) => void;
  /** Clears the search box and returns the chips to "all". */
  resetFilters: () => void;
}

export interface CreateYourContentManagerOptions {
  annotations: AnnotationsManager;
  highlights: HighlightsManager;
  login: LoginManager;
}

/**
 * Backs the "Your content" screen (issue #1553): the user's annotations and
 * highlights gathered from across the whole Bible, plus the search and chip
 * state the screen filters with.
 *
 * Bookmarks and playlists are deliberately absent — their managers already
 * hold the full list reactively (`bookmarks.bookmarks`, `playlists
 * .userPlaylists`), so re-fetching them here would be a second, staler copy.
 */
export function createYourContentManager(
  options: CreateYourContentManagerOptions
): YourContentManager {
  const { annotations: annotationsManager, highlights: highlightsManager } =
    options;

  const query = signal("");
  const filter = signal<ContentFilter>("all");
  const annotations = signal<Annotation[]>([]);
  const highlights = signal<StoredHighlight[]>([]);
  const status = signal<ContentLoadStatus>("idle");

  let inFlight: Promise<void> | null = null;

  const runLoad = async (): Promise<void> => {
    status.value = "loading";
    try {
      // Both sweep the same record, so they're issued together rather than
      // one after the other — the screen is blank until the slower one lands.
      const [loadedAnnotations, loadedHighlights] = await Promise.all([
        annotationsManager.listAllAnnotations(),
        highlightsManager.listAllHighlights(),
      ]);

      annotations.value = sortAnnotationsByRecency(loadedAnnotations);
      highlights.value = loadedHighlights;
      status.value = "ready";
    } catch (error) {
      console.error("Error loading your content:", error);
      status.value = "error";
    }
  };

  const load = (loadOptions?: { force?: boolean }): Promise<void> => {
    if (inFlight) {
      return inFlight;
    }
    if (status.peek() === "ready" && !loadOptions?.force) {
      return Promise.resolve();
    }
    inFlight = runLoad().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  const removeAnnotation = (annotationId: string) => {
    annotations.value = annotations.value.filter(
      (annotation) => annotation.id !== annotationId
    );
  };

  const resetFilters = () => {
    query.value = "";
    filter.value = "all";
  };

  return {
    query,
    filter,
    annotations: computed(() => annotations.value),
    highlights: computed(() => highlights.value),
    status: computed(() => status.value),
    load,
    removeAnnotation,
    resetFilters,
  };
}

/**
 * Newest first. Annotations written before `createdAtMs` was recorded have no
 * timestamp at all, so they sort to the end rather than jumping to the top as
 * a missing value coerced to 0 would.
 */
export function sortAnnotationsByRecency(
  annotations: readonly Annotation[]
): Annotation[] {
  return [...annotations].sort((a, b) => {
    const aTime = a.data.createdAtMs ?? null;
    const bTime = b.data.createdAtMs ?? null;
    if (aTime == null && bTime == null) return a.id < b.id ? -1 : 1;
    if (aTime == null) return 1;
    if (bTime == null) return -1;
    return bTime - aTime;
  });
}

/** Plain text of an annotation's rich-text body, for searching and previews. */
export function annotationPlainText(annotation: Annotation): string {
  return annotation.data.html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
