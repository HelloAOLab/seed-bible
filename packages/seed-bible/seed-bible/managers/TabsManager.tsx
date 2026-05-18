import { computed, effect, signal, type Signal } from "@preact/signals";
import type { BibleDataManager } from "./BibleDataManager";
import type { BibleReadingSession } from "../managers/SessionsManager";
import {
  DEFAULT_BOOK_ID,
  DEFAULT_CHAPTER_NUMBER,
  DEFAULT_TRANSLATION_ID,
  createBibleReadingState,
  type BibleReadingState,
} from "../managers/BibleReadingManager";
import type { HighlightsManager } from "../managers/HighlightsManager";
import type { NavigationManager } from "./NavigationManager";

export interface ReaderTab {
  /** Unique tab identifier (for example: tab-1, tab-2). */
  id: string;
  /** Display title shown in the tabs UI. */
  title: string;
  /** Independent reading state instance owned by this tab. */
  readingState: BibleReadingState;
  /** Attached shared session, if this tab is backed by collaborative state. */
  sharedSession: BibleReadingSession | null;
}

function getInitialFirstTabBookId(): string {
  const url = new URL(window.location.href);
  return url.searchParams.get("book") ?? DEFAULT_BOOK_ID;
}

function getInitialTranslationId(): string {
  const url = new URL(window.location.href);
  return (
    url.searchParams.get("translationId") ??
    url.searchParams.get("translation") ??
    DEFAULT_TRANSLATION_ID
  );
}

function getInitialFirstTabChapter(): number {
  const url = new URL(window.location.href);
  const value = Number(url.searchParams.get("chapter"));
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : DEFAULT_CHAPTER_NUMBER;
}

function createInitialTabs(
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager
): ReaderTab[] {
  return [
    {
      id: "tab-1",
      title: "Tab 1",
      readingState: createBibleReadingState(dataManager, highlightsManager, {
        initialTranslationId: getInitialTranslationId(),
        initialBookId: getInitialFirstTabBookId(),
        initialChapterNumber: getInitialFirstTabChapter(),
      }),
      sharedSession: null,
    },
  ];
}

type NewTabSource = BibleReadingState | BibleReadingSession;

function isBibleReadingSession(
  value: NewTabSource | undefined
): value is BibleReadingSession {
  return !!value && "document" in value && "readingState" in value;
}

/**
 * API surface for creating, selecting, and removing reader tabs.
 *
 * Each tab owns a `BibleReadingState` instance. Tabs can also be backed by a
 * shared reading session, in which case `sharedSession` is set and disposed
 * automatically when the tab is removed.
 */
export interface TabsManager {
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
   * @returns The newly created tab.
   */
  addTab: (source?: NewTabSource) => ReaderTab;

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
  highlightsManager: HighlightsManager
): TabsManager {
  const tabs = signal<ReaderTab[]>(
    createInitialTabs(dataManager, highlightsManager)
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

    const requestedTranslation = getInitialTranslationId();
    const requestedBookId = getInitialFirstTabBookId();
    const requestedChapter = getInitialFirstTabChapter();
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
    const selectedBookId = selectedTab.value?.readingState.bookId.value;
    const selectedChapter = selectedTab.value?.readingState.chapterNumber.value;
    const selectedTranslation =
      selectedTab.value?.readingState.translationId.value;
    console.log("selected tab changed:", {
      selectedTranslation,
      selectedBookId,
      selectedChapter,
    });

    // TODO: Update the URL here
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
        // configBot.tags.translationId = translationId;
      } else if (
        url.searchParams.has("translation") ||
        translationId !== DEFAULT_TRANSLATION_ID
      ) {
        navigation.updateQueryParam("translation", translationId);
      }
    }
  });

  effect(() => {
    void navigation.currentUrl.value;
    syncSelectedTabFromUrl();
  });

  const addTab = (source?: NewTabSource) => {
    const currentTabs = tabs.value;
    const nextNumber = currentTabs.length + 1;
    const sharedSession = isBibleReadingSession(source) ? source : null;
    const readingState = !isBibleReadingSession(source) ? source : null;
    const nextTab: ReaderTab = {
      id: `tab-${nextNumber}`,
      title: `Tab ${nextNumber}`,
      readingState:
        sharedSession?.readingState ??
        readingState ??
        createBibleReadingState(dataManager, highlightsManager),
      sharedSession,
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
    tabs,
    selectedTabId,
    addTab,
    removeTab,
    selectTab,
  };
}
