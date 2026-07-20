import {
  computed,
  effect,
  signal,
  untracked,
  type Signal,
} from "@preact/signals";
import type { BibleDataManager } from "./BibleDataManager";
import type { BibleReadingSession } from "../managers/SessionsManager";
import { createChatsManager, type ChatSession } from "./ChatsManager";
import {
  DEFAULT_BOOK_ID,
  DEFAULT_CHAPTER_NUMBER,
  createBibleReadingState,
  getDefaultTranslationForLanguage,
  type BibleReadingState,
  type InitialBibleReadingOptions,
  type TranslationWithLanguage,
} from "../managers/BibleReadingManager";
import type { HighlightsManager } from "../managers/HighlightsManager";

export function formatVerseSelection(verseNumbers: number[]): string | null {
  const sorted = Array.from(new Set(verseNumbers))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return String(sorted[0]);
  const isConsecutive = sorted.every(
    (n, i) => i === 0 || n === sorted[i - 1]! + 1
  );
  if (isConsecutive) {
    return `${sorted[0]}-${sorted[sorted.length - 1]}`;
  }
  return sorted.join(",");
}

export function parseVerseSelection(verse: string): number[] {
  const parts = verse.split(",");
  const verseNumbers: number[] = [];
  for (const part of parts) {
    const rangeParts = part.split("-");
    if (rangeParts.length === 1) {
      const n = Number(rangeParts[0]);
      if (Number.isFinite(n) && n > 0) {
        verseNumbers.push(n);
      }
    } else if (rangeParts.length === 2) {
      const start = Number(rangeParts[0]);
      const end = Number(rangeParts[1]);
      if (
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start > 0 &&
        end >= start
      ) {
        for (let i = start; i <= end; i++) {
          verseNumbers.push(i);
        }
      }
    }
  }

  return verseNumbers;
}
import type { NavigationManager } from "./NavigationManager";
import type { I18nManager } from "../i18n";
import type { DiscoverManager } from "./DiscoverManager";
import type { BibleReadingExtensionManager } from "./BibleReadingExtensionManager";
import { difference } from "es-toolkit";

export interface ReaderTab {
  /** Unique tab identifier (for example: tab-1, tab-2). */
  id: string;
  /** Display title shown in the tabs UI. */
  title: string;
  /** Independent reading state instance owned by this tab. */
  readingState: BibleReadingState;
  /** Attached shared session, if this tab is backed by collaborative state. */
  sharedSession: BibleReadingSession | null;
  /** Attached shared chat for collaborative tabs. */
  sharedChat: ChatSession | null;
  /**
   * When true, this tab only exists to back a tab slot (e.g. a chapter opened
   * in a new panel) and is hidden from the tab strip. It is disposed
   * automatically once no slot references it. Slots are bound to tabs by id,
   * so such a slot still needs a real tab to own its independent reading
   * state.
   */
  slotOnly?: boolean;
}

function getInitialFirstTabBookId(url: URL): string {
  return url.searchParams.get("book") ?? DEFAULT_BOOK_ID;
}

function getInitialTranslationId(url: URL, language: string): string {
  return (
    url.searchParams.get("translationId") ??
    url.searchParams.get("translation") ??
    getDefaultTranslationForLanguage(language).id
  );
}

function getInitialFirstTabChapter(url: URL): number {
  const value = Number(url.searchParams.get("chapter"));
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : DEFAULT_CHAPTER_NUMBER;
}

function getInitialHighlightedVerses(url: URL): number[] {
  const value = url.searchParams.get("verse");
  return typeof value === "string"
    ? parseVerseSelection(value)
    : typeof value === "number"
      ? [value]
      : [];
}

export interface InitialTabsOptions {
  translationId: string;
  bookId: string;
  chapter: number;
  highlightedVerses?: number[];
}

export function createInitialTabs(
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager,
  i18nManager: I18nManager,
  options: InitialTabsOptions,
  discoverManager?: DiscoverManager,
  readingExtensionManager?: BibleReadingExtensionManager
): ReaderTab[] {
  const { translationId, bookId, chapter, highlightedVerses = [] } = options;

  const tab: ReaderTab = {
    id: "tab-1",
    title: "Tab 1",
    readingState: createBibleReadingState(
      dataManager,
      highlightsManager,
      i18nManager,
      {
        initialTranslationId: translationId,
        initialBookId: bookId,
        initialChapterNumber: chapter,
        scrollToVerse: highlightedVerses[0] ?? undefined,
      },
      discoverManager,
      readingExtensionManager
    ),
    sharedSession: null,
    sharedChat: null,
  };

  if (highlightedVerses.length > 0) {
    tab.readingState.decorateVerses(bookId, chapter, highlightedVerses, {
      className: "sb-verse-decoration-diminish",
      containerClassName: "sb-chapter-decoration-diminish",
      removeAfterMs: 5000,
    });
  }

  return [tab];
}

type NewTabSource = BibleReadingState | BibleReadingSession;

function isBibleReadingSession(
  value: NewTabSource | undefined
): value is BibleReadingSession {
  return !!value && "document" in value && "readingState" in value;
}

function createSharedChatOrNull(
  chatsManager: ReturnType<typeof createChatsManager>,
  session: BibleReadingSession | null
): ChatSession | null {
  if (!session || typeof session.document?.getArray !== "function") {
    return null;
  }

  try {
    return chatsManager.createSharedSession(session);
  } catch {
    return null;
  }
}

/**
 * API surface for creating, selecting, and removing reader tabs.
 *
 * Each tab owns a `BibleReadingState` instance. Tabs can also be backed by a
 * shared reading session, in which case `sharedSession` is set and disposed
 * automatically when the tab is removed.
 */
export interface TabsManager {
  defaultTranslation: TranslationWithLanguage;

  /** Ordered tab list used by the tabs UI. */
  tabs: Signal<ReaderTab[]>;

  /** ID of the currently selected tab. */
  selectedTabId: Signal<string>;

  /**
   * Adds a new tab and selects it.
   *
   * @param source Optional source used to initialize the tab:
   * - `BibleReadingState`: uses an existing reading state instance.
   * - `BibleReadingSession`: uses the session reading state and stores session metadata.
   * - `undefined`: creates a brand new reading state.
   * @param initialReadingOptions Initial translation/book/chapter for the new
   * reading state. Only used when `source` is undefined; ignored when the tab
   * adopts an existing state. Passing this avoids a race where the new tab's
   * `loadInitialData()` defaults to GEN 1 while the caller's follow-up
   * `selectTranslationAndChapter()` is still in flight.
   * @param tabOptions Extra tab metadata. `slotOnly` marks the tab as hidden
   * from the tab strip; it only backs a tab slot and is disposed when
   * unreferenced.
   * @returns The newly created tab.
   */
  addTab: (
    source?: NewTabSource,
    initialReadingOptions?: InitialBibleReadingOptions,
    tabOptions?: { slotOnly?: boolean }
  ) => ReaderTab;

  /**
   * Removes a tab by ID.
   *
   * If the tab is associated with a shared session, the session is disposed.
   * If the removed tab was selected, selection falls back to the first tab.
   */
  removeTab: (tabId: string) => void;

  /** Selects a tab by ID. */
  selectTab: (tabId: string) => void;
}

/**
 * Creates the tabs manager and wires configBot synchronization for reading tags.
 *
 * Behavior:
 * - Initializes with a single tab seeded from config tags.
 * - Keeps `configBot` reading tags (`translation`, `book`, `chapter`) in sync
 *   with the selected tab's reading state.
 * - Listens for external `configBot` tag changes and updates selected tab
 *   reading state accordingly.
 */
export function createTabs(
  navigation: NavigationManager,
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager,
  chatsManager: ReturnType<typeof createChatsManager>,
  i18nManager: I18nManager,
  discoverManager?: DiscoverManager,
  readingExtensionManager?: BibleReadingExtensionManager
): TabsManager {
  const defaultTranslation = getDefaultTranslationForLanguage(
    i18nManager.defaultLanguage
  );
  const initialTranslationId = getInitialTranslationId(
    navigation.currentUrl.value,
    i18nManager.defaultLanguage
  );
  const initialBookId = getInitialFirstTabBookId(navigation.currentUrl.value);
  const initialChapter = getInitialFirstTabChapter(navigation.currentUrl.value);

  console.log("Creating TabsManager with initial URL parameters:", {
    initialTranslationId,
    initialBookId,
    initialChapter,
  });

  const tabs = signal<ReaderTab[]>(
    createInitialTabs(
      dataManager,
      highlightsManager,
      i18nManager,
      {
        translationId: initialTranslationId,
        bookId: initialBookId,
        chapter: initialChapter,
        highlightedVerses: getInitialHighlightedVerses(
          navigation.currentUrl.value
        ),
      },
      discoverManager,
      readingExtensionManager
    )
  );
  const selectedTabId = signal<string>(tabs.value[0]?.id ?? "");
  const selectedTab = computed(
    () => tabs.value.find((tab) => tab.id === selectedTabId.value) ?? null
  );

  const syncSelectedTabFromUrl = async () => {
    const selectedTab =
      tabs.value.find((tab) => tab.id === selectedTabId.value) ?? null;

    if (!selectedTab) {
      return;
    }

    const requestedTranslation = getInitialTranslationId(
      navigation.currentUrl.value,
      i18nManager.defaultLanguage
    );
    const requestedBookId = getInitialFirstTabBookId(
      navigation.currentUrl.value
    );
    const requestedChapter = getInitialFirstTabChapter(
      navigation.currentUrl.value
    );
    const readingState = selectedTab.readingState;

    const books = readingState.translationBooks.value?.books ?? [];
    const selectedBook =
      books.find((book) => book.id === requestedBookId) ?? null;
    if (!selectedBook) {
      return;
    }

    const firstChapterNumber =
      selectedBook.firstChapterNumber ?? DEFAULT_CHAPTER_NUMBER;
    const maxChapterNumber =
      firstChapterNumber + selectedBook.numberOfChapters - 1;
    const nextChapter =
      requestedChapter >= firstChapterNumber &&
      requestedChapter <= maxChapterNumber
        ? requestedChapter
        : firstChapterNumber;

    if (
      readingState.translationId.value === requestedTranslation &&
      readingState.bookId.value === requestedBookId &&
      readingState.chapterNumber.value === nextChapter
    ) {
      return;
    }

    console.log("Syncing selected tab reading state to match URL parameters:", {
      requestedTranslation,
      requestedBookId,
      requestedChapter,
    });
    // This navigation originates from the URL, so pass `updateUrl: false` to
    // keep the reading state from pushing the URL we just read back onto the
    // history stack.
    await readingState.selectTranslationAndChapter(
      requestedTranslation,
      requestedBookId,
      nextChapter,
      { updateUrl: false }
    );
  };

  let oldQueryParams: Record<string, string | null> = {};

  // The href of the last URL we wrote ourselves. Writing the URL re-runs the
  // URL->state reader effect below (asynchronously), but the state already
  // matches what we wrote, so the reader skips that href once and clears this.
  // External URL changes (back/forward, deep links) never match, so they still
  // drive the reader.
  let lastSelfWrittenHref: string | null = null;

  const writeUrl = (
    update: Record<string, string | null>,
    replace?: boolean
  ) => {
    navigation.updateQueryParams(update, replace);
    lastSelfWrittenHref = navigation.currentUrl.peek().href;
  };

  /**
   * Prescriptively writes the selected tab's reading position to the URL, as a
   * single history operation. Called deliberately from navigation events (push)
   * and on tab switch / mount (replace) — never reactively off the underlying
   * position signals, so one navigation produces exactly one history entry.
   */
  const commitSelectedTabToUrl = (options: { replace?: boolean } = {}) => {
    // Read all signals untracked: `getUrlQueryParams` touches bookId/chapter/
    // translation/extension signals, and this runs inside a signals effect. If
    // those reads were tracked, the effect would re-run on every position
    // change and re-commit, defeating the prescriptive (one-write-per-nav)
    // design.
    untracked(() => {
      const readingState = selectedTab.peek()?.readingState;
      const nextQueryParams =
        readingState?.getUrlQueryParams(navigation.currentUrl.peek()) ?? {};

      const oldKeys = Object.keys(oldQueryParams);
      const newKeys = Object.keys(nextQueryParams);

      oldQueryParams = nextQueryParams;
      const queryUpdate: Record<string, string | null> = {
        ...nextQueryParams,
      };
      const removedKeys = difference(oldKeys, newKeys);
      for (const key of removedKeys) {
        queryUpdate[key] = null;
      }

      writeUrl(queryUpdate, options.replace);
    });
  };

  // Subscribe to navigation events for whichever tab is currently selected.
  // Re-runs on tab switch (subscribing to `selectedTab` only, never the raw
  // position signals): tears down the previous tab's subscription, and commits
  // a `replace` so the URL reflects the newly-focused tab without adding a
  // history entry. Real navigations within the tab arrive via `onNavigate` and
  // push a single entry each.
  effect(() => {
    const readingState = selectedTab.value?.readingState;
    if (!readingState) {
      return undefined;
    }

    const dispose = readingState.onNavigate((options) =>
      commitSelectedTabToUrl(options)
    );
    commitSelectedTabToUrl({ replace: true });
    return dispose;
  });

  effect(() => {
    const params: Record<string, string | null> = {
      verse: null,
    };

    const readingState = selectedTab.value?.readingState;
    if (readingState) {
      const formatted = formatVerseSelection(
        readingState.selectedVerses.value.map((v) => v.verse.number)
      );
      params.verse = formatted;
    }

    writeUrl(params, true);
  });

  effect(() => {
    const href = navigation.currentUrl.value.href;
    // Skip the URL change we caused ourselves — the reading state already
    // matches it — and clear the marker so a later, genuine navigation back to
    // the same href is not also skipped. Only external changes (back/forward,
    // deep links) drive the reader.
    if (href === lastSelfWrittenHref) {
      lastSelfWrittenHref = null;
      return;
    }
    syncSelectedTabFromUrl();
  });

  const addTab = (
    source?: NewTabSource,
    initialReadingOptions?: InitialBibleReadingOptions,
    tabOptions?: { slotOnly?: boolean }
  ) => {
    const currentTabs = tabs.value;
    const nextNumber = currentTabs.length + 1;
    const sharedSession = isBibleReadingSession(source) ? source : null;
    const sharedChat = createSharedChatOrNull(chatsManager, sharedSession);
    const readingState = !isBibleReadingSession(source) ? source : null;
    const nextTab: ReaderTab = {
      id: `tab-${nextNumber}`,
      title: `Tab ${nextNumber}`,
      readingState:
        sharedSession?.readingState ??
        readingState ??
        createBibleReadingState(
          dataManager,
          highlightsManager,
          i18nManager,
          initialReadingOptions,
          discoverManager,
          readingExtensionManager
        ),
      sharedSession,
      sharedChat,
      slotOnly: tabOptions?.slotOnly ?? false,
    };
    tabs.value = [...currentTabs, nextTab];
    selectedTabId.value = nextTab.id;
    return nextTab;
  };

  const removeTab = (tabId: string) => {
    const tab = tabs.value.find((t) => t.id === tabId);

    const currentTabIndex = tabs.value.findIndex((t) => t.id === tabId);

    if (tab?.sharedSession) {
      tab.sharedSession.dispose();
    }
    // Release the tab's reading state (disables its extensions, clears timers
    // and internal effects). Safe to call even for session-backed tabs.
    tab?.readingState.dispose();

    const nextTabs = tabs.value.filter((tab) => tab.id !== tabId);

    tabs.value = nextTabs;

    if (selectedTabId.value === tabId) {
      selectedTabId.value =
        nextTabs[currentTabIndex - 1]?.id ?? nextTabs[0]?.id ?? "";
    }
  };

  const selectTab = (tabId: string) => {
    selectedTabId.value = tabId;
  };

  return {
    defaultTranslation,
    tabs,
    selectedTabId,
    addTab,
    removeTab,
    selectTab,
  };
}
