import type {
  AvailableTranslations,
  TranslationBook,
  TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";
import type { BibleDataManager } from "./BibleDataManager";
import {
  type BibleReadingState,
  createBibleReadingState,
} from "seed-bible.managers.BibleReadingManager";
import type { Pane, PanesManager } from "seed-bible.managers.PanesManager";
import type { TabsManager } from "seed-bible.managers.TabsManager";
import {
  computed,
  effect,
  signal,
  Signal,
  type ReadonlySignal,
} from "@preact/signals";
import { chunk } from "es-toolkit";

export interface BibleSelectorOptions {
  pane?: Pane;
}

export interface BibleSelectorState {
  isOpen: Signal<boolean>;
  pane: Signal<Pane | null>;
  readingState: ReadonlySignal<BibleReadingState | null>;
  translationId: Signal<string | null>;
  bookId: Signal<string | null>;
  chapterNumber: Signal<number>;
  availableTranslations: Signal<AvailableTranslations | null>;
  translationBooks: Signal<TranslationBooks | null>;
  loading: Signal<boolean>;
  error: Signal<string | null>;
  search: Signal<string>;
  expandedBookId: Signal<string | null>;
  oldTestamentRows: ReadonlySignal<TranslationBook[][]>;
  newTestamentRows: ReadonlySignal<TranslationBook[][]>;
  setOpen: (open: boolean, pane?: Pane) => void;
  setSearch: (value: string) => void;
  setExpandedBook: (bookId: string) => void;
  selectTranslation: (translationId: string) => Promise<void>;
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

export function createBibleSelectorState(
  dataManager: BibleDataManager,
  tabsManager: TabsManager,
  panesManager: PanesManager
): BibleSelectorState {
  const isOpen = signal(false);
  const pane = signal<Pane | null>(null);
  const readingState = signal<BibleReadingState | null>(null);
  const transientReadingState = signal<BibleReadingState | null>(null);
  const translationId = signal<string | null>(null);
  const bookId = signal<string | null>(null);
  const chapterNumber = signal<number>(1);
  const availableTranslations = signal<AvailableTranslations | null>(null);
  const translationBooks = signal<TranslationBooks | null>(null);
  const loading = signal(false);
  const error = signal<string | null>(null);

  const search = signal("");
  const expandedBookId = signal<string | null>(null);
  const viewportWidth = signal(
    typeof window === "undefined" ? 0 : window.innerWidth
  );
  let wasOpen = isOpen.value;
  let isHandlingPopState = false;

  const activePaneId = computed(() => pane.value?.id ?? null);
  const activePane = computed(() =>
    activePaneId.value
      ? (panesManager.panes.value.find(
          (entry) => entry.id === activePaneId.value
        ) ?? null)
      : null
  );
  const activeReadingState = computed(
    () => activePane.value?.tab?.readingState ?? transientReadingState.value
  );

  effect(() => {
    if (readingState.value !== activeReadingState.value) {
      readingState.value = activeReadingState.value;
    }
  });

  const syncSelectorStateFromActiveReadingState = async () => {
    if (!activeReadingState.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      if (dataManager.availableTranslations.value.length === 0) {
        await dataManager.getTranslations();
      }

      availableTranslations.value = {
        translations: dataManager.availableTranslations.value,
      };

      const nextTranslationId =
        activeReadingState.value.translationId.value ??
        dataManager.availableTranslations.value[0]?.id ??
        null;
      if (!nextTranslationId) {
        throw new Error("No available translations found.");
      }

      const books = await dataManager.getTranslationBooks(nextTranslationId);
      const fallbackBookId = books.books[0]?.id ?? null;
      const requestedBookId = activeReadingState.value.bookId.value;
      const nextBookId =
        (requestedBookId &&
        books.books.some((entry) => entry.id === requestedBookId)
          ? requestedBookId
          : fallbackBookId) ?? null;

      translationId.value = nextTranslationId;
      translationBooks.value = books;
      bookId.value = nextBookId;
      chapterNumber.value = activeReadingState.value.chapterNumber.value;
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "Failed to load selector translation data.";
    } finally {
      loading.value = false;
    }
  };

  const setOpen = (open: boolean, nextPane?: Pane) => {
    if (open) {
      if (nextPane) {
        pane.value = nextPane;
      }

      const effectivePane = nextPane ?? activePane.value;
      if (!effectivePane) {
        return;
      }

      pane.value = effectivePane;

      if (effectivePane.tab) {
        transientReadingState.value = null;
        readingState.value = effectivePane.tab.readingState;
      } else {
        if (!transientReadingState.value) {
          transientReadingState.value = createBibleReadingState(dataManager);
        }
        readingState.value = transientReadingState.value;
      }

      if (!readingState.value) {
        return;
      }

      void syncSelectorStateFromActiveReadingState();
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
      expandedBookId.value = bookId.value;
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
    groupBooks(translationBooks.value, search.value)
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
    if (!activeReadingState.value) {
      return;
    }

    if (!activePane.value) {
      return;
    }

    const selectedTranslationId =
      translationId.value ?? activeReadingState.value.translationId.value;
    if (!selectedTranslationId) {
      return;
    }

    // Ensure selected-tab synchronization targets this pane, not a stale selection.
    panesManager.selectPane(activePane.value.id);

    if (activePane.value.tab) {
      if (
        activePane.value.tab.readingState.translationId.value !==
        selectedTranslationId
      ) {
        await activePane.value.tab.readingState.selectTranslation(
          selectedTranslationId
        );
      }
      await activePane.value.tab.readingState.selectChapter(
        selectedBookId,
        chapter
      );
      bookId.value = selectedBookId;
      chapterNumber.value = chapter;
      setOpen(false);
      return;
    }

    const newTab = tabsManager.addTab();
    panesManager.setPaneTab(activePane.value.id, newTab.id);

    if (newTab.readingState.translationId.value !== selectedTranslationId) {
      await newTab.readingState.selectTranslation(selectedTranslationId);
    }

    await newTab.readingState.selectChapter(selectedBookId, chapter);
    bookId.value = selectedBookId;
    chapterNumber.value = chapter;
    transientReadingState.value = null;
    setOpen(false);
  };

  const handleTranslationSelect = async (nextTranslationId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const books = await dataManager.getTranslationBooks(nextTranslationId);
      const firstBook = books.books[0] ?? null;

      availableTranslations.value = {
        translations: dataManager.availableTranslations.value,
      };
      translationBooks.value = books;
      // Only update selector-internal state. Reading state updates on chapter selection.
      const nextBookId = firstBook?.id ?? null;
      const firstChapter = firstBook?.firstChapterNumber ?? 1;

      if (nextBookId && !expandedBookId.value) {
        expandedBookId.value = nextBookId;
      }

      translationId.value = nextTranslationId;
      bookId.value = nextBookId;
      chapterNumber.value = firstChapter;
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
    readingState: activeReadingState,
    translationId,
    bookId,
    chapterNumber,
    availableTranslations,
    translationBooks,
    loading,
    error,
    search,
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
