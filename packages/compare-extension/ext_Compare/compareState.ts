import {
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import {
  getProfileConfigValue,
  PROFILE_TRANSLATION_ID,
  saveProfileConfigValue,
  type BibleReadingState,
  type BibleSelectedVerse,
  type ChapterVerse,
  type LoginManager,
  type SeedBibleState,
  type TranslationBookChapter,
} from "seed-bible/managers";

/** Key under which the comparison set is stored in the user's profile config. */
export const COMPARE_TRANSLATIONS_KEY = "compareTranslations";

/** Stable id for the Compare side pane. */
export const COMPARE_PANE_ID = "compare-pane";

/**
 * How long the rest of the chapter stays faded after arriving from Compare.
 * Matches the reader's `diminish-in-out` animation, so the decoration is
 * removed exactly as the fade finishes rather than part-way through it.
 */
export const DIMINISH_DURATION_MS = 3000;

/** One contiguous chapter's worth of the verses the reader had selected. */
export interface CompareSnapshotGroup {
  bookId: string;
  chapterNumber: number;
  /** Selected verse numbers in that chapter, ascending. */
  verseNumbers: number[];
}

/** The verses Compare was opened on, frozen at press time. */
export interface CompareSnapshot {
  groups: CompareSnapshotGroup[];
}

/** Which sub-view of the pane is showing. */
export type CompareView = "compare" | "settings" | "add";

/** A translation's slot in the rendered list. */
export interface CompareOrderEntry {
  id: string;
  /**
   * True for the translation the reader is currently in. It is pinned first and
   * is not persisted, so it may or may not also be in the saved list.
   */
  isCurrent: boolean;
  /** Its index in the saved list, or -1 when it is only there as the current translation. */
  savedIndex: number;
}

/** A fetched chapter, or why it isn't here yet. */
export type CompareChapterState =
  | { status: "loading" }
  | { status: "loaded"; chapter: TranslationBookChapter }
  | { status: "error" };

/**
 * Groups a verse selection into one entry per distinct book + chapter.
 *
 * A selection is normally confined to one chapter, but the reading state stores
 * the book and chapter per verse, so this does not assume that.
 */
export function snapshotSelection(
  verses: BibleSelectedVerse[]
): CompareSnapshot {
  const groups: CompareSnapshotGroup[] = [];

  for (const verse of verses) {
    const existing = groups.find(
      (group) =>
        group.bookId === verse.bookId &&
        group.chapterNumber === verse.chapterNumber
    );
    if (existing) {
      if (!existing.verseNumbers.includes(verse.verse.number)) {
        existing.verseNumbers.push(verse.verse.number);
      }
      continue;
    }
    groups.push({
      bookId: verse.bookId,
      chapterNumber: verse.chapterNumber,
      verseNumbers: [verse.verse.number],
    });
  }

  for (const group of groups) {
    group.verseNumbers.sort((a, b) => a - b);
  }

  return { groups };
}

/**
 * Reads a stored comparison set. Tolerates a JSON string as well as an array,
 * since config values can arrive either way, and drops anything unusable rather
 * than throwing — a corrupt value should cost the user their list, not the pane.
 */
export function parseCompareTranslationIds(value: unknown): string[] {
  let parsed: unknown = value;
  if (typeof parsed === "string" && parsed.length > 0) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  const seen = new Set<string>();
  for (const entry of parsed) {
    if (typeof entry === "string" && entry.length > 0) {
      seen.add(entry);
    }
  }
  return [...seen];
}

/** Moves one entry to another position. No-ops on equal or out-of-range indices. */
export function reorderIds(ids: string[], from: number, to: number): string[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= ids.length ||
    to >= ids.length
  ) {
    return ids;
  }
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

/** Appends an id unless it is already present. */
export function addId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids : [...ids, id];
}

/** Removes an id if present. */
export function removeId(ids: string[], id: string): string[] {
  return ids.filter((entry) => entry !== id);
}

/**
 * The order translations are rendered in: the one being read is always first and
 * appears exactly once, followed by the saved list in the order the user set.
 *
 * Display-only. The current translation is ephemeral, so hoisting it out of the
 * middle of the saved list must never be written back — otherwise every
 * translation switch would quietly reshuffle a list the user arranged by hand.
 */
export function resolveCompareOrder(
  savedIds: string[],
  currentTranslationId: string | null
): CompareOrderEntry[] {
  const saved = savedIds.map((id, savedIndex) => ({
    id,
    isCurrent: false,
    savedIndex,
  }));

  if (!currentTranslationId) {
    return saved;
  }

  return [
    {
      id: currentTranslationId,
      isCurrent: true,
      savedIndex: savedIds.indexOf(currentTranslationId),
    },
    ...saved.filter((entry) => entry.id !== currentTranslationId),
  ];
}

/** Collapses ascending verse numbers into ranges, e.g. `[1,2,3,7]` -> `"1-3, 7"`. */
export function formatVerseNumberRanges(verseNumbers: number[]): string {
  const ranges: string[] = [];
  let start: number | null = null;
  let previous: number | null = null;

  const flush = () => {
    if (start === null || previous === null) {
      return;
    }
    ranges.push(start === previous ? `${start}` : `${start}-${previous}`);
  };

  for (const number of verseNumbers) {
    if (previous !== null && number === previous + 1) {
      previous = number;
      continue;
    }
    flush();
    start = number;
    previous = number;
  }
  flush();

  return ranges.join(", ");
}

/** Human-readable reference for a snapshot, e.g. `"John 1:1-3"`. */
export function formatSnapshotReference(
  snapshot: CompareSnapshot | null,
  resolveBookName: (bookId: string) => string
): string {
  if (!snapshot) {
    return "";
  }
  return snapshot.groups
    .map(
      (group) =>
        `${resolveBookName(group.bookId)} ${group.chapterNumber}:${formatVerseNumberRanges(group.verseNumbers)}`
    )
    .join("; ");
}

/**
 * Builds the selection to restore after switching translations: the compared
 * verses, as they exist in the new translation.
 *
 * Verse numbers absent from the new translation are dropped rather than faked,
 * so a versification difference narrows the selection instead of breaking it.
 * `selectedAt` and the anchor coordinates match what `selectVerse` records, so
 * the verse toolbar positions itself the same way it would after a real tap.
 */
export function selectedVersesForChapter(options: {
  chapter: TranslationBookChapter;
  group: CompareSnapshotGroup;
  translationId: string;
  anchor?: { x: number; y: number } | null;
  now?: number;
}): BibleSelectedVerse[] {
  const {
    chapter,
    group,
    translationId,
    anchor = null,
    now = Date.now(),
  } = options;

  return versesFromChapter(chapter, group.verseNumbers).map((verse) => ({
    bookId: group.bookId,
    chapterNumber: group.chapterNumber,
    verse,
    translationId,
    selectedAt: now,
    ...(anchor ? { selectionX: anchor.x, selectionY: anchor.y } : {}),
  }));
}

/** Cache key for one translation's copy of one chapter. */
export function chapterCacheKey(
  translationId: string,
  bookId: string,
  chapterNumber: number
): string {
  return `${translationId}|${bookId}|${chapterNumber}`;
}

/** Pulls the selected verses out of a fetched chapter, skipping any it doesn't have. */
export function versesFromChapter(
  chapter: TranslationBookChapter,
  verseNumbers: number[]
): ChapterVerse[] {
  const byNumber = new Map<number, ChapterVerse>();
  for (const content of chapter.chapter.content) {
    if (content.type === "verse") {
      byNumber.set(content.number, content);
    }
  }
  return verseNumbers
    .map((number) => byNumber.get(number))
    .filter((verse): verse is ChapterVerse => !!verse);
}

/**
 * Where the verse toolbar should anchor itself for a selection the reader did
 * not click: the middle of the viewport, which is where `scrollToVerse` puts
 * the first selected verse. Null outside a browser.
 */
function viewportCentre(): { x: number; y: number } | null {
  if (typeof window === "undefined") {
    return null;
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export interface CompareState {
  /** Which sub-view the pane is showing. */
  view: Signal<CompareView>;
  /** Where the back arrow returns to from the "add" view. */
  addReturnTo: Signal<Exclude<CompareView, "add">>;
  /** The verses Compare was opened on. */
  snapshot: Signal<CompareSnapshot | null>;
  /** The reader Compare was opened from, so the pinned translation tracks it. */
  sourceReadingState: Signal<BibleReadingState | null>;
  /** The translation currently being read, pinned first and never persisted. */
  currentTranslationId: ReadonlySignal<string | null>;
  /** The user's saved comparison set, derived from profile/local config. */
  selectedTranslationIds: ReadonlySignal<string[]>;
  /** What actually renders: current translation first, then the saved list. */
  order: ReadonlySignal<CompareOrderEntry[]>;
  /** Fetched chapters, keyed by `chapterCacheKey`. */
  chapters: Signal<Map<string, CompareChapterState>>;
  /** Persists a new saved set (profile when logged in, device-local otherwise). */
  setSelectedTranslationIds: (ids: string[]) => void;
  /** Fetches every chapter the given (or current) snapshot and order need. */
  loadChapters: (
    currentSnapshot?: CompareSnapshot | null,
    currentOrder?: CompareOrderEntry[]
  ) => void;
  /** Re-fetches one translation's chapter after a failure. */
  retryTranslation: (translationId: string) => void;
  /**
   * Switches the reader to a translation and closes the pane. No-ops for the
   * translation already being read.
   */
  readTranslation: (translationId: string) => void;
  /** Tears down the auto-loading effect. */
  dispose: () => void;
}

/**
 * Creates the extension's runtime state.
 *
 * The saved set is derived from config rather than mirrored into a second
 * signal: `saveProfileConfigValue` updates `login.profile` (or `localConfig`)
 * synchronously, so a write is visible to `selectedTranslationIds` in the same
 * tick, and a set saved on another device shows up when `login.profile`
 * resolves — no extra sync code, same precedence `SettingsManager` uses.
 */
export function createCompareState(context: SeedBibleState): CompareState {
  const login: LoginManager = context.login;

  const view = signal<CompareView>("compare");
  const addReturnTo = signal<Exclude<CompareView, "add">>("compare");
  const snapshot = signal<CompareSnapshot | null>(null);
  const sourceReadingState = signal<BibleReadingState | null>(null);
  const chapters = signal<Map<string, CompareChapterState>>(new Map());

  // Read through the reading state's own signal rather than copying the id into
  // the snapshot, so switching the reader's translation re-pins the list live.
  const currentTranslationId = computed(
    () => sourceReadingState.value?.translationId.value ?? null
  );

  const selectedTranslationIds = computed(() =>
    parseCompareTranslationIds(
      getProfileConfigValue(login.profile.value, COMPARE_TRANSLATIONS_KEY) ??
        login.localConfig.value[COMPARE_TRANSLATIONS_KEY]
    )
  );

  const order = computed(() =>
    resolveCompareOrder(
      selectedTranslationIds.value,
      currentTranslationId.value
    )
  );

  const setSelectedTranslationIds = (ids: string[]) => {
    void saveProfileConfigValue(login, COMPARE_TRANSLATIONS_KEY, ids);
  };

  const setChapterState = (key: string, state: CompareChapterState) => {
    const next = new Map(chapters.peek());
    next.set(key, state);
    chapters.value = next;
  };

  const fetchChapter = (translationId: string, group: CompareSnapshotGroup) => {
    const key = chapterCacheKey(
      translationId,
      group.bookId,
      group.chapterNumber
    );
    setChapterState(key, { status: "loading" });

    void context.bibleData
      .getTranslationBookChapter(
        translationId,
        group.bookId,
        group.chapterNumber
      )
      .then((chapter) => {
        setChapterState(key, { status: "loaded", chapter });
      })
      .catch((error: unknown) => {
        console.error(
          `Compare: failed to load ${group.bookId} ${group.chapterNumber} in '${translationId}'.`,
          error
        );
        setChapterState(key, { status: "error" });
      });
  };

  const loadChapters = (
    currentSnapshot = snapshot.peek(),
    currentOrder = order.peek()
  ) => {
    if (!currentSnapshot) {
      return;
    }

    const cache = chapters.peek();
    for (const entry of currentOrder) {
      for (const group of currentSnapshot.groups) {
        const key = chapterCacheKey(
          entry.id,
          group.bookId,
          group.chapterNumber
        );
        // Already loaded, loading, or failed — a failure is retried explicitly
        // rather than on every re-render.
        if (cache.has(key)) {
          continue;
        }
        fetchChapter(entry.id, group);
      }
    }
  };

  const retryTranslation = (translationId: string) => {
    const currentSnapshot = snapshot.peek();
    if (!currentSnapshot) {
      return;
    }
    for (const group of currentSnapshot.groups) {
      fetchChapter(translationId, group);
    }
  };

  /**
   * Move the reader onto one of the compared translations.
   *
   * Uses `selectTranslationAndChapter` rather than `selectTranslation` so the
   * reader keeps its place — the plain version jumps to the translation's first
   * book. Persists the pick the same way the reader's own translation list does,
   * so it survives a reload instead of snapping back on the next visit.
   */
  const readTranslation = (translationId: string) => {
    const readingState = sourceReadingState.peek();
    if (!readingState || translationId === readingState.translationId.peek()) {
      return;
    }

    // Go to the verses the pane is showing, not wherever the reader has since
    // wandered — the header being clicked belongs to a block of specific
    // verses, so "read this translation" means read *these* verses in it.
    const group = snapshot.peek()?.groups[0];
    const bookId = group?.bookId ?? readingState.bookId.peek();
    if (!bookId) {
      return;
    }
    const chapterNumber =
      group?.chapterNumber ?? readingState.chapterNumber.peek() ?? 1;
    const firstVerse = group?.verseNumbers[0];

    // `scrollToVerse` is the reader's own deep-link mechanism; TabsLayout
    // centres the verse in the viewport once the chapter renders.
    void readingState
      .selectTranslationAndChapter(translationId, bookId, chapterNumber, {
        ...(firstVerse !== undefined ? { scrollToVerse: firstVerse } : {}),
      })
      .then(() => {
        if (!group) {
          return;
        }
        // Loading a chapter clears the selection, so this has to run after the
        // load settles rather than alongside it.
        const chapter = readingState.chapterData.peek();
        if (!chapter || chapter.translation.id !== translationId) {
          return;
        }
        const selected = selectedVersesForChapter({
          chapter,
          group,
          translationId,
          anchor: viewportCentre(),
        });
        readingState.selectedVerses.value = selected;

        // Briefly fade the rest of the chapter so the verses that were being
        // compared stand out on arrival — the same decoration search results,
        // playlists and `?verse=` links use. Decorated verses are the ones
        // excluded from the fade, so this targets the arrivals, not the rest.
        if (selected.length > 0) {
          readingState.decorateVerses(
            group.bookId,
            group.chapterNumber,
            selected.map((entry) => entry.verse.number),
            {
              className: "sb-verse-decoration-diminish",
              containerClassName: "sb-chapter-decoration-diminish",
              removeAfterMs: DIMINISH_DURATION_MS,
            }
          );
        }
      })
      .catch((error: unknown) => {
        console.error(
          `Compare: failed to switch the reader to '${translationId}'.`,
          error
        );
      });

    void saveProfileConfigValue(login, PROFILE_TRANSLATION_ID, translationId);
    context.panes.closePane(COMPARE_PANE_ID);
  };

  // Fetch whatever the current snapshot and order need, whenever either
  // changes — opening the pane on new verses, or adding a translation. Reads
  // `chapters` only through `peek()` (inside `loadChapters`), so writing the
  // cache here cannot re-enter this effect.
  const dispose = effect(() => {
    loadChapters(snapshot.value, order.value);
  });

  return {
    view,
    addReturnTo,
    snapshot,
    sourceReadingState,
    currentTranslationId,
    selectedTranslationIds,
    order,
    chapters,
    setSelectedTranslationIds,
    loadChapters,
    retryTranslation,
    readTranslation,
    dispose,
  };
}
