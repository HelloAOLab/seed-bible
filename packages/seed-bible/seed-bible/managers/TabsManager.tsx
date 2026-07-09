import { computed, effect, signal, type Signal } from "@preact/signals";
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
  discoverManager?: DiscoverManager
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
      discoverManager
    ),
    sharedSession: null,
    sharedChat: null,
  };

  if (highlightedVerses.length > 0) {
    tab.readingState.decorateVerses(bookId, chapter, highlightedVerses, {
      className: "sb-verse-decoration-initial-verse-highlight",
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
  discoverManager?: DiscoverManager
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
      discoverManager
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
    await readingState.selectTranslationAndChapter(
      requestedTranslation,
      requestedBookId,
      nextChapter
    );
  };

  effect(() => {
    const readingState = selectedTab.value?.readingState;
    const selectedBookId = readingState?.bookId.value;
    const selectedChapter = readingState?.chapterNumber.value;
    const selectedTranslation = readingState?.translationId.value;

    const url = new URL(navigation.currentUrl.peek());
    navigation.updateQueryParam("book", selectedBookId ?? null);
    navigation.updateQueryParam(
      "chapter",
      selectedChapter ? String(selectedChapter) : null
    );

    if (selectedTranslation) {
      const translationId = dataManager.buildTranslationId(selectedTranslation);

      if (url.searchParams.has("translationId")) {
        navigation.updateQueryParam("translationId", translationId);
      } else if (
        url.searchParams.has("translation") ||
        translationId !== defaultTranslation.id
      ) {
        navigation.updateQueryParam("translation", translationId);
      }
    }

    const verseNumbers = readingState?.selectedVerses.value
      .filter(
        (verse) =>
          verse.bookId === selectedBookId &&
          verse.chapterNumber === selectedChapter
      )
      .map((verse) => verse.verse.number);

    const formatted = verseNumbers ? formatVerseSelection(verseNumbers) : null;
    navigation.updateQueryParam("verse", formatted);
  });

  effect(() => {
    void navigation.currentUrl.value;
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
          discoverManager
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
    if (tab?.sharedSession) {
      tab.sharedSession.dispose();
    }

    const nextTabs = tabs.value.filter((tab) => tab.id !== tabId);
    tabs.value = nextTabs;

    if (selectedTabId.value === tabId) {
      selectedTabId.value = nextTabs[0]?.id ?? "";
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
