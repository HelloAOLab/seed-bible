import type {
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

  const activeBookId = computed(
    () => activeReadingState.value?.bookId.value ?? null
  );
  const activeTranslationBooks = computed(
    () => activeReadingState.value?.translationBooks.value ?? null
  );

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
      expandedBookId.value = activeBookId.value;
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
    groupBooks(activeTranslationBooks.value, search.value)
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

    if (activePane.value?.tab) {
      await activePane.value.tab.readingState.selectChapter(
        selectedBookId,
        chapter
      );
      setOpen(false);
      return;
    }

    if (!activePane.value) {
      return;
    }

    // Ensure selected-tab synchronization targets this pane, not a stale selection.
    panesManager.selectPane(activePane.value.id);

    const newTab = tabsManager.addTab();
    panesManager.setPaneTab(activePane.value.id, newTab.id);
    // tabsManager.selectTab(newTab.id);

    const selectedTranslationId = activeReadingState.value.translationId.value;
    if (
      selectedTranslationId &&
      newTab.readingState.translationId.value !== selectedTranslationId
    ) {
      await newTab.readingState.selectTranslation(selectedTranslationId);
    }

    await newTab.readingState.selectChapter(selectedBookId, chapter);
    transientReadingState.value = null;
    setOpen(false);
  };

  const handleTranslationSelect = async (translationId: string) => {
    if (!activeReadingState.value) {
      return;
    }

    await activeReadingState.value.selectTranslation(translationId);
  };

  return {
    isOpen,
    pane,
    readingState: activeReadingState,
    search,
    expandedBookId,
    oldTestamentRows,
    newTestamentRows,
    setOpen,
    setSearch,
    setExpandedBook,
    selectTranslation: handleTranslationSelect,
    selectChapter: handleChapterSelect,
  };
}
