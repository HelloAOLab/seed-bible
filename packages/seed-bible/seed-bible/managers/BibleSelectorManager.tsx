import type {
  Translation,
  TranslationBook,
  TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";
import type { BibleDataManager } from "seed-bible.managers.BibleDataManager";
import {
  type BibleReadingState,
  DEFAULT_TRANSLATION_ID,
} from "seed-bible.managers.BibleReadingManager";
import type { Pane, PanesManager } from "seed-bible.managers.PanesManager";
import type { TabsManager } from "seed-bible.managers.TabsManager";
import type {
  BookOrientation,
  SettingsManager,
} from "seed-bible.managers.SettingsManager";
import {
  computed,
  effect,
  signal,
  Signal,
  type ReadonlySignal,
} from "@preact/signals";
import { chunk } from "es-toolkit";

/** Optional options used when opening the selector. */
export interface BibleSelectorOptions {
  /** Pane context to bind selector actions to. */
  pane?: Pane;
}

/**
 * Reactive state + actions for the Bible selector overlay.
 *
 * The selector is pane-aware: chapter selections are applied to the bound pane
 * (or a new tab may be created if the pane has no tab content yet).
 */
export interface BibleSelectorState {
  /** Whether the selector overlay is currently open. */
  isOpen: Signal<boolean>;
  /** Pane currently targeted by selector actions. */
  pane: Signal<Pane | null>;
  /** Reading state for the active pane (null when pane has no tab). */
  readingState: ReadonlySignal<BibleReadingState | null>;
  /** Active pane translation ID snapshot. */
  currentTranslationId: ReadonlySignal<string | null>;
  /** Active pane book ID snapshot. */
  currentBookId: ReadonlySignal<string | null>;
  /** Active pane chapter number snapshot. */
  currentChapterNumber: ReadonlySignal<number | null>;

  /** Current book-arrangement orientation (used for section labelling). */
  orientation: ReadonlySignal<BookOrientation>;

  /** Available translations loaded by the data manager. */
  availableTranslations: ReadonlySignal<Translation[]>;

  /** True while selector is loading translation/book data. */
  loading: Signal<boolean>;
  /** Last selector error message, if any. */
  error: Signal<string | null>;
  /** Current book search text for filtering selector lists. */
  search: Signal<string>;

  /** Translation currently selected in the selector UI. */
  selectedTranslationId: Signal<string | null>;
  /** Translation metadata for `selectedTranslationId`. */
  selectedTranslation: Signal<Translation | null>;
  /** Expanded book ID in selector accordions/lists. */
  expandedBookId: Signal<string | null>;
  /** Loaded book metadata for selected translation. */
  selectedTranslationBooks: Signal<TranslationBooks | null>;

  /** Filtered/grouped Old Testament books, chunked into responsive rows. */
  oldTestamentRows: ReadonlySignal<TranslationBook[][]>;
  /** Filtered/grouped New Testament books, chunked into responsive rows. */
  newTestamentRows: ReadonlySignal<TranslationBook[][]>;

  /**
   * Opens/closes selector.
   * When opening, optionally rebinds selector to a pane and synchronizes data.
   */
  setOpen: (open: boolean, pane?: Pane) => Promise<void>;

  /** Sets the current selector search query. */
  setSearch: (value: string) => void;

  /** Toggles expanded state for a given book ID. */
  setExpandedBook: (bookId: string) => void;

  /** Loads books for a selected translation in selector UI. */
  selectTranslation: (translationId: string) => Promise<void>;

  /**
   * Applies chapter selection to the bound pane/tab and closes selector.
   * Creates a new tab if needed when the bound pane has no tab content.
   */
  selectChapter: (bookId: string, chapterNumber: number) => void;
}

function groupBooks(translationBooks: TranslationBooks | null, search: string) {
  if (!translationBooks) {
    return {
      oldTestament: [] as TranslationBook[],
      newTestament: [] as TranslationBook[],
    };
  }

  const loweredSearch = search.trim().toLowerCase();
  const filteredBooks = loweredSearch
    ? translationBooks.books.filter(
        (book) =>
          book.name.toLowerCase().includes(loweredSearch) ||
          book.commonName.toLowerCase().includes(loweredSearch)
      )
    : translationBooks.books;

  return {
    oldTestament: filteredBooks.filter((book) => book.order <= 39),
    newTestament: filteredBooks.filter((book) => book.order > 39),
  };
}

/**
 * Creates the Bible selector manager.
 *
 * Behavior summary:
 * - Maintains selector open/close state and pane binding.
 * - Synchronizes selector translation/book context from active pane reading state.
 * - Supports browser history integration (`bibleSelectorOpen`) for back-button UX.
 * - Computes responsive Old/New Testament rows based on viewport width.
 * - Routes chapter selection into the bound pane/tab reading state.
 */
export function createBibleSelectorState(
  dataManager: BibleDataManager,
  tabsManager: TabsManager,
  panesManager: PanesManager,
  settings?: SettingsManager
): BibleSelectorState {
  const isOpen = signal(false);
  const pane = signal<Pane | null>(null);
  const availableTranslations = computed(
    () => dataManager.availableTranslations.value
  );
  const readingState = computed(() => pane.value?.tab?.readingState ?? null);
  const currentTranslationId = computed(
    () => readingState.value?.translationId.value ?? null
  );
  const currentBookId = computed<string | null>(
    () => readingState.value?.bookId.value ?? null
  );
  const currentChapterNumber = computed<number | null>(
    () => readingState.value?.chapterNumber.value ?? null
  );

  const orientation = computed<BookOrientation>(
    () => settings?.settings.value.bookOrientation ?? "traditional"
  );

  const loading = signal(false);
  const error = signal<string | null>(null);

  const search = signal("");
  const selectedTranslationId = signal<string | null>(null);
  const selectedTranslationBooks = signal<TranslationBooks | null>(null);
  const selectedTranslation = computed(
    () => selectedTranslationBooks.value?.translation ?? null
  );
  const expandedBookId = signal<string | null>(null);
  const viewportWidth = signal(
    typeof window === "undefined" ? 0 : window.innerWidth
  );
  let wasOpen = isOpen.value;
  let isHandlingPopState = false;

  const syncStateFromPane = async () => {
    loading.value = true;
    error.value = null;

    try {
      if (dataManager.availableTranslations.value.length === 0) {
        await dataManager.getTranslations();
      }

      const nextTranslationId =
        readingState.value?.translationId.value ??
        // Find the first pane with a translation ID in its reading state
        panesManager.panes.value.find(
          (p) => p.tab?.readingState.translationId.value
        )?.tab?.readingState.translationId.value ??
        // Fall back to default translation or first available translation
        dataManager.availableTranslations.value.find(
          (t) => t.id === DEFAULT_TRANSLATION_ID
        )?.id ??
        dataManager.availableTranslations.value[0]?.id ??
        null;
      if (!nextTranslationId) {
        throw new Error("No available translations found.");
      }

      await selectTranslation(nextTranslationId);

      if (currentBookId.value) {
        expandedBookId.value = currentBookId.value;
      }
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "Failed to load selector translation data.";
    } finally {
      loading.value = false;
    }
  };

  const setOpen = async (open: boolean, nextPane?: Pane) => {
    if (open) {
      console.log("Opening Bible selector with pane:", nextPane);
      if (nextPane) {
        pane.value = nextPane;
      }

      const effectivePane = nextPane ?? pane.value;
      if (!effectivePane) {
        console.warn("No pane available to open Bible selector with.");
        return;
      }

      pane.value = effectivePane;

      await syncStateFromPane();
    }

    isOpen.value = open;
  };

  const getHistoryState = () => {
    return history.state && typeof history.state === "object"
      ? (history.state as Record<string, unknown>)
      : {};
  };

  const isSelectorOpenInHistory = () => {
    const state = getHistoryState();
    return state.bibleSelectorOpen === true;
  };

  effect(() => {
    if (isOpen.value) {
      expandedBookId.value = currentBookId.value;
    }
  });

  effect(() => {
    const onResize = () => {
      viewportWidth.value = window.innerWidth;
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  });

  effect(() => {
    const onPopState = () => {
      const shouldBeOpen = isSelectorOpenInHistory();
      isHandlingPopState = true;

      if (shouldBeOpen && !isOpen.value) {
        setOpen(true);
      } else if (!shouldBeOpen && isOpen.value) {
        setOpen(false);
      }

      setTimeout(() => {
        isHandlingPopState = false;
      }, 0);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  });

  effect(() => {
    const nextIsOpen = isOpen.value;

    if (!wasOpen && nextIsOpen && !isSelectorOpenInHistory()) {
      history.pushState({ ...getHistoryState(), bibleSelectorOpen: true }, "");
    }

    if (wasOpen && !nextIsOpen) {
      const shouldNavigateBack =
        !isHandlingPopState && isSelectorOpenInHistory();
      if (shouldNavigateBack) {
        history.back();
      }
    }

    wasOpen = nextIsOpen;
  });

  const groupedBooks = computed(() =>
    groupBooks(selectedTranslationBooks.value, search.value)
  );

  const booksPerRow = computed(() => {
    if (viewportWidth.value > 1200) {
      return {
        oldTestamentBooksPerRow: 3,
        newTestamentBooksPerRow: 2,
      };
    }

    if (viewportWidth.value > 768) {
      return {
        oldTestamentBooksPerRow: 2,
        newTestamentBooksPerRow: 1,
      };
    }

    return {
      oldTestamentBooksPerRow: 1,
      newTestamentBooksPerRow: 1,
    };
  });

  const oldTestamentRows = computed(() =>
    chunk(
      groupedBooks.value.oldTestament,
      booksPerRow.value.oldTestamentBooksPerRow
    )
  );
  const newTestamentRows = computed(() =>
    chunk(
      groupedBooks.value.newTestament,
      booksPerRow.value.newTestamentBooksPerRow
    )
  );

  const setSearch = (value: string) => {
    search.value = value;
  };

  const setExpandedBook = (nextBookId: string) => {
    expandedBookId.value =
      expandedBookId.value === nextBookId ? null : nextBookId;
  };

  const handleChapterSelect = async (
    selectedBookId: string,
    chapter: number
  ) => {
    if (!pane.value) {
      return;
    }

    // const selectedTranslationId =
    //   translationId.value ?? activeReadingState.value.translationId.value;
    if (!selectedTranslationId.value) {
      return;
    }

    // Ensure selected-tab synchronization targets this pane, not a stale selection.
    panesManager.selectPane(pane.value.id);

    if (pane.value.tab) {
      await pane.value.tab.readingState.selectTranslationAndChapter(
        selectedTranslationId.value,
        selectedBookId,
        chapter
      );
      setOpen(false);
      return;
    }

    const newTab = tabsManager.addTab();
    panesManager.openInPane(pane.value.id, {
      tabId: newTab.id,
    });

    await newTab.readingState.selectTranslationAndChapter(
      selectedTranslationId.value,
      selectedBookId,
      chapter
    );
    setOpen(false);
  };

  const handleTranslationSelect = async (nextTranslationId: string) => {
    if (nextTranslationId === selectedTranslationId.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const books = await dataManager.getTranslationBooks(nextTranslationId);
      const firstBook = books.books[0] ?? null;

      selectedTranslationBooks.value = books;

      if (expandedBookId.value) {
        const hasCurrentBook = books.books.some(
          (book) => book.id === expandedBookId.value
        );
        if (!hasCurrentBook) {
          expandedBookId.value = firstBook?.id ?? null;
        }
      } else if (firstBook) {
        expandedBookId.value = firstBook.id;
      }

      selectedTranslationId.value = nextTranslationId;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "Failed to load translation books.";
      return;
    } finally {
      loading.value = false;
    }
  };

  const selectTranslation = async (nextTranslationId: string) => {
    await handleTranslationSelect(nextTranslationId);
  };

  return {
    isOpen,
    pane,
    readingState,
    availableTranslations,
    currentTranslationId,
    currentBookId,
    currentChapterNumber,
    orientation,
    loading,
    error,
    search,
    selectedTranslationId,
    selectedTranslation,
    selectedTranslationBooks,
    expandedBookId,
    oldTestamentRows,
    newTestamentRows,
    setOpen,
    setSearch,
    setExpandedBook,
    selectTranslation,
    selectChapter: handleChapterSelect,
  };
}
