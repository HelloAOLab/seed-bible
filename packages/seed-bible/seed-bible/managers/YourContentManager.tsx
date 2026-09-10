import {
  computed,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { Annotation, AnnotationsManager } from "./AnnotationsManager";
import type { HighlightsManager, StoredHighlight } from "./HighlightsManager";
import type { BibleDataManager } from "./BibleDataManager";
import { extractContentText } from "./ChapterText";

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
  /**
   * Puts an annotation back, for when the server delete that
   * `removeAnnotation` ran ahead of turns out to have failed.
   */
  restoreAnnotation: (annotation: Annotation) => void;
  /** Drops a cleared highlight from the list without a server round-trip. */
  removeHighlight: (highlight: StoredHighlight) => void;
  /**
   * Puts a highlight back, for when the server call that `removeHighlight`
   * ran ahead of turns out to have failed. It goes on the end: highlights are
   * held in record order and carry no timestamp to restore a position from.
   */
  restoreHighlight: (highlight: StoredHighlight) => void;
  /**
   * The wording of each highlighted verse that has been read back, keyed the
   * same way {@link removeHighlight} identifies a highlight. Empty until
   * {@link readHighlightVerseText} has run; a highlight whose chapter could
   * not be read simply has no entry.
   */
  highlightVerseText: ReadonlySignal<ReadonlyMap<string, string>>;
  /**
   * Reads back the wording of every highlighted verse, so search can match
   * the words a highlight is *of* and not only its reference.
   *
   * Nothing stores that wording, so it comes from the chapters themselves —
   * one read per distinct chapter, deduplicated, and already-fetched chapters
   * are taken from cache without a request. Results land as each batch
   * arrives rather than all at the end, so a search sharpens as it goes.
   * Idempotent: a second call while the first is running joins it, and a
   * completed run is not repeated.
   */
  readHighlightVerseText: () => Promise<void>;
  /** True while {@link readHighlightVerseText} is still working. */
  isReadingHighlightVerseText: ReadonlySignal<boolean>;
  /** Clears the search box and returns the chips to "all". */
  resetFilters: () => void;
}

export interface CreateYourContentManagerOptions {
  annotations: AnnotationsManager;
  highlights: HighlightsManager;
  /**
   * Reads the chapters that highlighted verses live in. Only the two chapter
   * accessors are used, so tests can pass a narrower object.
   */
  bibleData: Pick<
    BibleDataManager,
    "getTranslationBookChapter" | "getCachedTranslationBookChapter"
  >;
}

/**
 * How many chapters to read at once. Enough to stay quick for someone with
 * highlights across a few dozen chapters, small enough that a heavy
 * highlighter does not open a hundred parallel requests at once.
 */
const CHAPTER_READ_BATCH = 6;

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
  const {
    annotations: annotationsManager,
    highlights: highlightsManager,
    bibleData,
  } = options;

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

  const restoreAnnotation = (annotation: Annotation) => {
    if (annotations.value.some((existing) => existing.id === annotation.id)) {
      return;
    }
    annotations.value = sortAnnotationsByRecency([
      ...annotations.value,
      annotation,
    ]);
  };

  const verseText = signal<ReadonlyMap<string, string>>(new Map());
  const isReadingVerseText = signal(false);
  let verseTextRun: Promise<void> | null = null;
  let verseTextDone = false;

  /**
   * The verse numbers a highlight covers. A range is stored as its ends, and
   * every verse between them is part of the highlight, so all of them count
   * as its words.
   */
  const highlightVerseNumbers = (stored: StoredHighlight): number[] => {
    const { verse } = stored.highlight;
    if (typeof verse === "number") {
      return [verse];
    }
    const [start, end] = verse;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const readChapterVerseText = async (
    group: readonly StoredHighlight[]
  ): Promise<Map<string, string>> => {
    const first = group[0]!;
    const chapter =
      bibleData.getCachedTranslationBookChapter(
        first.translationId,
        first.bookId,
        first.chapterNumber
      ) ??
      (await bibleData.getTranslationBookChapter(
        first.translationId,
        first.bookId,
        first.chapterNumber
      ));

    const byVerse = new Map<number, string>();
    for (const item of chapter.chapter.content) {
      if (item.type === "verse" && typeof item.number === "number") {
        byVerse.set(item.number, extractContentText(item.content));
      }
    }

    const texts = new Map<string, string>();
    for (const stored of group) {
      const text = highlightVerseNumbers(stored)
        .map((number) => byVerse.get(number) ?? "")
        .filter(Boolean)
        .join(" ")
        .trim();
      if (text) {
        texts.set(highlightKey(stored), text);
      }
    }
    return texts;
  };

  const runVerseTextRead = async (): Promise<void> => {
    // One entry per distinct chapter: several highlights in one chapter cost
    // one read between them.
    const groups = new Map<string, StoredHighlight[]>();
    for (const stored of highlights.value) {
      const key = `${stored.translationId}/${stored.bookId}/${stored.chapterNumber}`;
      const group = groups.get(key);
      if (group) {
        group.push(stored);
      } else {
        groups.set(key, [stored]);
      }
    }

    const pending = [...groups.values()];
    for (let i = 0; i < pending.length; i += CHAPTER_READ_BATCH) {
      const batch = pending.slice(i, i + CHAPTER_READ_BATCH);
      const results = await Promise.all(
        batch.map((group) =>
          readChapterVerseText(group).catch((error) => {
            // A chapter that will not load leaves its highlights searchable
            // by reference alone, which is what they were before this.
            console.error("Could not read a highlighted chapter:", error);
            return new Map<string, string>();
          })
        )
      );
      const merged = new Map(verseText.value);
      for (const result of results) {
        for (const [key, text] of result) {
          merged.set(key, text);
        }
      }
      // Published per batch, so a long read sharpens the search as it goes
      // instead of doing nothing until the very end.
      verseText.value = merged;
    }
  };

  const readHighlightVerseText = (): Promise<void> => {
    if (verseTextDone) {
      return Promise.resolve();
    }
    if (verseTextRun) {
      return verseTextRun;
    }
    isReadingVerseText.value = true;
    verseTextRun = runVerseTextRead()
      .then(() => {
        verseTextDone = true;
      })
      .finally(() => {
        verseTextRun = null;
        isReadingVerseText.value = false;
      });
    return verseTextRun;
  };

  const removeHighlight = (highlight: StoredHighlight) => {
    const key = highlightKey(highlight);
    highlights.value = highlights.value.filter(
      (existing) => highlightKey(existing) !== key
    );
  };

  const restoreHighlight = (highlight: StoredHighlight) => {
    const key = highlightKey(highlight);
    if (highlights.value.some((existing) => highlightKey(existing) === key)) {
      return;
    }
    highlights.value = [...highlights.value, highlight];
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
    restoreAnnotation,
    removeHighlight,
    restoreHighlight,
    highlightVerseText: computed(() => verseText.value),
    readHighlightVerseText,
    isReadingHighlightVerseText: computed(() => isReadingVerseText.value),
    resetFilters,
  };
}

/**
 * Identifies a highlight for list edits. Highlights carry no id of their own —
 * where the highlight is *is* its identity — so this is the translation, book,
 * chapter and verse target together. A range and a single verse serialize
 * differently, so a verse and a range starting at it are not confused.
 */
export function highlightKey(stored: StoredHighlight): string {
  const { verse } = stored.highlight;
  const target = Array.isArray(verse) ? `${verse[0]}-${verse[1]}` : `${verse}`;
  return [
    stored.translationId,
    stored.bookId,
    stored.chapterNumber,
    target,
  ].join("/");
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
  return (
    annotation.data.html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Last, so text that escaped an entity — "&amp;lt;" — comes out as
      // "&lt;" instead of being decoded a second time into "<".
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
  );
}
