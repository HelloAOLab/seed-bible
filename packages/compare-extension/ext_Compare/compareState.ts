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
  type Translation,
  type TranslationBookChapter,
} from "seed-bible/managers";

/** Key under which the comparison set is stored in the user's profile config. */
export const COMPARE_TRANSLATIONS_KEY = "compareTranslations";

/** Stable id for the Compare side pane. */
export const COMPARE_PANE_ID = "compare-pane";

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

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
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

/**
 * Curated defaults for languages whose catalog is too large for "every
 * sibling" to be a sane default, keyed by `Translation.language`. Matched by
 * `shortName` rather than `id`, since `id`'s format varies by source (see
 * script/lib/sitemap.ts) but `shortName` is the stable, recognizable
 * abbreviation. Add a language here if it ever needs the same treatment.
 */
const CURATED_DEFAULT_SHORT_NAMES: Record<string, string[]> = {
  eng: ["AAB", "BSB", "KJAV", "NASB95"],
};

/**
 * The default comparison set for someone who has never saved one of their
 * own: the curated list above where one exists, otherwise every other
 * translation sharing the language. Excludes the current translation itself
 * either way — it's always part of the comparison while being read (see
 * `resolveCompareOrder`), so saving it too would be redundant.
 */
export function defaultSelectionForLanguage(
  translations: Translation[],
  currentTranslationId: string | null
): string[] {
  const current = translations.find(
    (translation) => translation.id === currentTranslationId
  );
  if (!current) {
    return [];
  }

  const curatedShortNames = CURATED_DEFAULT_SHORT_NAMES[current.language];
  if (curatedShortNames) {
    return curatedShortNames
      .map((shortName) =>
        translations.find(
          (translation) =>
            translation.id !== current.id &&
            translation.language === current.language &&
            translation.shortName.toUpperCase() === shortName
        )
      )
      .filter(
        (translation): translation is Translation => translation !== undefined
      )
      .map((translation) => translation.id);
  }

  return translations
    .filter(
      (translation) =>
        translation.id !== current.id &&
        translation.language === current.language
    )
    .map((translation) => translation.id);
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
  /**
   * Clears the frozen snapshot and reading-state reference. Call this from
   * the pane's `onClose`, so the auto-loading effect stops reacting to the
   * reader's translation changes once the pane isn't visible.
   */
  reset: () => void;
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

  // Kept separate from the parsed value below so "never saved anything" can
  // be told apart from "explicitly saved an empty list" — the latter is still
  // a preference (the user cleared it on purpose) and must not be overwritten
  // by the first-run default (see the effect near the bottom of this
  // function).
  const rawSelectedTranslationIds = computed(
    () =>
      getProfileConfigValue(login.profile.value, COMPARE_TRANSLATIONS_KEY) ??
      login.localConfig.value[COMPARE_TRANSLATIONS_KEY]
  );

  // Toggling several translations in a row (add/remove in the picker) used to
  // fire one profile-save network request per click, which then stacked up
  // and made the whole burst slow to settle. This holds the not-yet-persisted
  // value so the UI (ticks, chips) updates instantly while the actual write
  // below is debounced into a single request for the whole burst.
  const pendingSelectedTranslationIds = signal<string[] | null>(null);

  const selectedTranslationIds = computed(
    () =>
      pendingSelectedTranslationIds.value ??
      parseCompareTranslationIds(rawSelectedTranslationIds.value)
  );

  const order = computed(() =>
    resolveCompareOrder(
      selectedTranslationIds.value,
      currentTranslationId.value
    )
  );

  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const flushSelectedTranslationIdsSave = () => {
    if (saveTimer === null) {
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = null;
    const ids = pendingSelectedTranslationIds.peek();
    if (ids === null) {
      return;
    }
    void saveProfileConfigValue(login, COMPARE_TRANSLATIONS_KEY, ids)
      .then(() => {
        // Only the write this call scheduled should clear the pending value —
        // a newer toggle may have already armed its own timer for a different
        // array by the time this one's request resolves.
        if (pendingSelectedTranslationIds.peek() !== ids) {
          return;
        }
        // `saveProfileConfigValue` resolves without writing when the profile
        // hasn't loaded, so the stored value is what confirms the write landed.
        // Clearing regardless would drop the user's toggles back to whatever
        // was stored before, and — with nothing stored — leave the first-run
        // default effect re-arming this timer for the rest of the session.
        if (
          sameIds(
            parseCompareTranslationIds(rawSelectedTranslationIds.peek()),
            ids
          )
        ) {
          pendingSelectedTranslationIds.value = null;
        }
      })
      .catch((error: unknown) => {
        console.error("Compare: failed to save the comparison set.", error);
      });
  };

  const setSelectedTranslationIds = (ids: string[]) => {
    pendingSelectedTranslationIds.value = ids;
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(flushSelectedTranslationIdsSave, 500);
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
              removeAfterMs: 3000,
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
  const disposeLoadChapters = effect(() => {
    loadChapters(snapshot.value, order.value);
  });

  // Populates the saved set the first time Compare is opened with no
  // preference of its own. Waits out a pending profile load rather than
  // deciding from a stale/loading read — deciding early and writing once the
  // real profile arrives could clobber a different list already saved on
  // another device (see `saveProfileConfigValues`'s own load guard). Once a
  // write lands, `rawSelectedTranslationIds` reflects it and this stops.
  const disposeDefaultSelection = effect(() => {
    if (!sourceReadingState.value) {
      return;
    }
    if (login.userId.value && login.isProfileLoading.value) {
      return;
    }
    if (
      pendingSelectedTranslationIds.value !== null ||
      rawSelectedTranslationIds.value !== undefined
    ) {
      return;
    }
    const defaults = defaultSelectionForLanguage(
      context.bibleData.availableTranslations.value,
      currentTranslationId.value
    );
    if (defaults.length > 0) {
      setSelectedTranslationIds(defaults);
    }
  });

  const reset = () => {
    snapshot.value = null;
    sourceReadingState.value = null;
  };

  const dispose = () => {
    disposeLoadChapters();
    disposeDefaultSelection();
    // A toggle right before the pane closes would otherwise lose its debounced
    // save entirely — it only exists as a timer callback that's about to be
    // cancelled with nothing else to run it.
    flushSelectedTranslationIdsSave();
  };

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
    reset,
    dispose,
  };
}
