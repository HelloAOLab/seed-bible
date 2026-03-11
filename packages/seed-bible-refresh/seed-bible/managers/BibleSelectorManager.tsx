import type {
  TranslationBook,
  TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import { Signal, useSignal } from "@preact/signals";
import { chunk } from "es-toolkit";

const { useEffect, useMemo, useRef } = os.appHooks;

export interface BibleSelectorOptions {
  isOpen: Signal<boolean>;
  setOpen: (open: boolean) => void;
  readingState: BibleReadingState;
}

export interface BibleSelectorState {
  isOpen: Signal<boolean>;
  search: Signal<string>;
  expandedBookId: Signal<string | null>;
  oldTestamentRows: TranslationBook[][];
  newTestamentRows: TranslationBook[][];
  setOpen: (open: boolean) => void;
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

export function useBibleSelector(
  options: BibleSelectorOptions
): BibleSelectorState {
  const { isOpen, setOpen, readingState } = options;
  const { bookId, translationBooks, selectTranslation, selectChapter } =
    readingState;

  const search = useSignal("");
  const expandedBookId = useSignal<string | null>(bookId.value);
  const viewportWidth = useSignal(
    typeof window === "undefined" ? 0 : window.innerWidth
  );
  const wasOpenRef = useRef(isOpen);
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

  useEffect(() => {
    if (isOpen) {
      expandedBookId.value = bookId.value;
    }
  }, [bookId.value, isOpen]);

  useEffect(() => {
    const onResize = () => {
      viewportWidth.value = window.innerWidth;
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const shouldBeOpen = isSelectorOpenInHistory();
      isHandlingPopStateRef.current = true;

      if (shouldBeOpen && !isOpen) {
        setOpen(true);
      } else if (!shouldBeOpen && isOpen) {
        setOpen(false);
      }

      setTimeout(() => {
        isHandlingPopStateRef.current = false;
      }, 0);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [isOpen, setOpen]);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;

    if (!wasOpen && isOpen && !isSelectorOpenInHistory()) {
      history.pushState({ ...getHistoryState(), bibleSelectorOpen: true }, "");
    }

    if (wasOpen && !isOpen) {
      const shouldNavigateBack =
        !isHandlingPopStateRef.current && isSelectorOpenInHistory();
      if (shouldNavigateBack) {
        history.back();
      }
    }

    wasOpenRef.current = isOpen;
  }, [isOpen]);

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

  const handleChapterSelect = async (
    selectedBookId: string,
    chapter: number
  ) => {
    await selectChapter(selectedBookId, chapter);
    setOpen(false);
  };

  return {
    isOpen,
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
