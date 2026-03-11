import type {
  FreeUseBibleAPI,
  TranslationBook,
  TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import {
  computed,
  effect,
  Signal,
  useSignal,
  useSignalEffect,
  type ReadonlySignal,
} from "@preact/signals";
import { chunk } from "es-toolkit";

const { useEffect, useMemo, useRef } = os.appHooks;

export interface BibleSelectorState {
  isOpen: Signal<boolean>;
  search: Signal<string>;
  expandedBookId: Signal<string | null>;
  oldTestamentRows: TranslationBook[][];
  newTestamentRows: TranslationBook[][];
  selectedTranslationId: Signal<string | null>;
  currentReadingState: Signal<BibleReadingState | null>;
  open: (readingState: BibleReadingState) => void;
  close: () => void;
  //   setOpen: (open: boolean) => void;
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

export function useBibleSelector(api: FreeUseBibleAPI): BibleSelectorState {
  const isOpen = useSignal(false);

  const currentReadingState = useSignal<BibleReadingState | null>(null);
  const selectedTranslationId = useSignal<string | null>(null);
  const bookId = useSignal<string | null>(null);
  const translationBooks = useSignal<TranslationBooks | null>(null);

  useSignalEffect(() => {
    if (!selectedTranslationId.value && currentReadingState.value) {
      selectedTranslationId.value =
        currentReadingState.value.translationId.value;
    }
    if (!bookId.value && currentReadingState.value) {
      bookId.value = currentReadingState.value.bookId.value;
    }
  });

  useSignalEffect(() => {
    const translationId = selectedTranslationId.value;
    if (!translationId) {
      translationBooks.value = null;
    } else {
      api.getTranslationBooks(translationId).then((books) => {
        translationBooks.value = books;
      });
    }
  });

  const selectTranslation = async (translationId: string) => {
    selectedTranslationId.value = translationId;
  };

  const selectChapter = (bookId: string, chapterNumber: number) => {
    if (!currentReadingState.value) return;
    console.log("Selecting chapter", {
      bookId,
      chapterNumber,
      translationId: selectedTranslationId.value,
    });
    currentReadingState.value.selectChapter(
      bookId,
      chapterNumber,
      selectedTranslationId.value
    );
    isOpen.value = false;
  };

  const search = useSignal("");
  const expandedBookId = useSignal<string | null>(bookId.value);
  const viewportWidth = useSignal(
    typeof window === "undefined" ? 0 : window.innerWidth
  );
  const wasOpenRef = useRef(false);
  const isHandlingPopStateRef = useRef(false);

  const getHistoryState = () => {
    return history.state && typeof history.state === "object"
      ? (history.state as Record<string, unknown>)
      : {};
  };

  const isSelectorOpenInHistory = () => {
    const state = getHistoryState();
    return state.bibleSelectorOpen === true;
  };

  useSignalEffect(() => {
    if (isOpen.value) {
      expandedBookId.value = bookId.value;
    }
  });

  useEffect(() => {
    const onResize = () => {
      viewportWidth.value = window.innerWidth;
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useSignalEffect(() => {
    const onPopState = () => {
      const shouldBeOpen = isSelectorOpenInHistory();
      isHandlingPopStateRef.current = true;

      if (shouldBeOpen && !isOpen.value) {
        isOpen.value = true;
      } else if (!shouldBeOpen && isOpen.value) {
        isOpen.value = false;
      }

      setTimeout(() => {
        isHandlingPopStateRef.current = false;
      }, 0);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  });

  useSignalEffect(() => {
    const wasOpen = wasOpenRef.current;

    if (!wasOpen && isOpen.value && !isSelectorOpenInHistory()) {
      history.pushState({ ...getHistoryState(), bibleSelectorOpen: true }, "");
    }

    if (wasOpen && !isOpen.value) {
      const shouldNavigateBack =
        !isHandlingPopStateRef.current && isSelectorOpenInHistory();
      if (shouldNavigateBack) {
        history.back();
      }
    }

    wasOpenRef.current = isOpen.value;
  });

  const { oldTestament, newTestament } = useMemo(
    () => groupBooks(translationBooks.value, search.value),
    [translationBooks.value, search.value]
  );

  const { oldTestamentBooksPerRow, newTestamentBooksPerRow } = useMemo(() => {
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
  }, [viewportWidth.value]);

  const oldTestamentRows = useMemo(
    () => chunk(oldTestament, oldTestamentBooksPerRow),
    [oldTestament, oldTestamentBooksPerRow]
  );
  const newTestamentRows = useMemo(
    () => chunk(newTestament, newTestamentBooksPerRow),
    [newTestament, newTestamentBooksPerRow]
  );

  const setSearch = (value: string) => {
    search.value = value;
  };

  const setExpandedBook = (nextBookId: string) => {
    expandedBookId.value =
      expandedBookId.value === nextBookId ? null : nextBookId;
  };

  const handleChapterSelect = (selectedBookId: string, chapter: number) => {
    selectChapter(selectedBookId, chapter);
    isOpen.value = false;
  };

  return {
    isOpen,
    search,
    expandedBookId,
    selectedTranslationId,
    oldTestamentRows,
    newTestamentRows,
    open: (readingState: BibleReadingState) => {
      currentReadingState.value = readingState;
      isOpen.value = true;
    },
    close: () => {
      isOpen.value = false;
    },
    currentReadingState,
    setSearch,
    setExpandedBook,
    selectTranslation,
    selectChapter: handleChapterSelect,
  };
}
