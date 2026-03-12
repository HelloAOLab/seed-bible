import {
  FreeUseBibleAPI,
  type AvailableTranslations,
  type ChapterVerse,
  type TranslationBookChapter,
  type TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";
import { signal, type Signal } from "@preact/signals";
import { sortBy } from "es-toolkit";

export interface BibleSelectedVerse {
  bookId: string;
  chapterNumber: number;
  verse: ChapterVerse;
  translationId: string | null;
}

export interface BibleReadingState {
  translationId: Signal<string | null>;
  bookId: Signal<string | null>;
  chapterNumber: Signal<number>;
  availableTranslations: Signal<AvailableTranslations | null>;
  translationBooks: Signal<TranslationBooks | null>;
  chapterData: Signal<TranslationBookChapter | null>;
  selectedVerses: Signal<BibleSelectedVerse[]>;
  loading: Signal<boolean>;
  error: Signal<string | null>;
  selectVerse: (verse: BibleSelectedVerse) => void;
  clearSelectedVerses: () => void;
  selectTranslation: (translation: string) => Promise<void>;
  selectBook: (book: string) => Promise<void>;
  selectChapter: (book: string, chapter: number) => Promise<void>;
  loadPreviousChapter: () => Promise<void>;
  loadNextChapter: () => Promise<void>;
}

export const DEFAULT_TRANSLATION_ID = "BSB";
export const DEFAULT_BOOK_ID = "GEN";
export const DEFAULT_CHAPTER_NUMBER = 1;

interface InitialBibleReadingOptions {
  initialTranslationId?: string | null;
  initialBookId?: string | null;
  initialChapterNumber?: number | null;
}

const AVAILABLE_TRANSLATIONS_PATH = "/api/available_translations.json";

function extractEndpointFromAvailableTranslationsUrl(
  value?: string | null
): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const normalizedPathname = url.pathname.replace(/\/+$/, "");
    if (!normalizedPathname.endsWith(AVAILABLE_TRANSLATIONS_PATH)) {
      return null;
    }

    const endpointPath = normalizedPathname.slice(
      0,
      -AVAILABLE_TRANSLATIONS_PATH.length
    );
    const normalizedEndpointPath = endpointPath.replace(/\/+$/, "");
    return `${url.protocol}//${url.host}${normalizedEndpointPath}`;
  } catch {
    return null;
  }
}

export function useBibleReadingState(
  api: FreeUseBibleAPI,
  options: InitialBibleReadingOptions = {}
): BibleReadingState {
  const isSameSelectedVerse = (
    left: BibleSelectedVerse,
    right: BibleSelectedVerse
  ) => {
    return (
      left.bookId === right.bookId &&
      left.chapterNumber === right.chapterNumber &&
      left.verse.number === right.verse.number
    );
  };

  const initialEndpointOverride = extractEndpointFromAvailableTranslationsUrl(
    options.initialTranslationId
  );
  const shouldUseFirstAvailableTranslation = !!initialEndpointOverride;

  const normalizedInitialChapterNumber =
    typeof options.initialChapterNumber === "number" &&
    Number.isFinite(options.initialChapterNumber) &&
    options.initialChapterNumber > 0
      ? Math.floor(options.initialChapterNumber)
      : 1;

  const translationId = signal<string | null>(
    shouldUseFirstAvailableTranslation
      ? null
      : (options.initialTranslationId ?? "BSB")
  );
  const endpointOverride = signal<string | null>(initialEndpointOverride);
  const bookId = signal<string | null>(options.initialBookId ?? null);
  const chapterNumber = signal<number>(normalizedInitialChapterNumber);
  const availableTranslations = signal<AvailableTranslations | null>(null);
  const translationBooks = signal<TranslationBooks | null>(null);
  const chapterData = signal<TranslationBookChapter | null>(null);
  const selectedVerses = signal<BibleSelectedVerse[]>([]);
  const loading = signal<boolean>(true);
  const error = signal<string | null>(null);

  const selectVerse = (verse: BibleSelectedVerse) => {
    const isSelected = selectedVerses.value.some((item) =>
      isSameSelectedVerse(item, verse)
    );

    if (isSelected) {
      selectedVerses.value = selectedVerses.value.filter(
        (item) => !isSameSelectedVerse(item, verse)
      );
      return;
    }

    selectedVerses.value = sortBy(
      [...selectedVerses.value, verse],
      [(v: BibleSelectedVerse) => v.verse.number]
    );
  };

  const clearSelectedVerses = () => {
    selectedVerses.value = [];
  };

  const getActiveEndpoint = () => endpointOverride.value ?? undefined;

  const syncStateFromChapter = async (chapter: TranslationBookChapter) => {
    const nextTranslationId = chapter.translation.id;
    const nextBookId = chapter.book.id;
    const nextChapterNumber = chapter.chapter.number;

    translationId.value = nextTranslationId;
    bookId.value = nextBookId;
    chapterNumber.value = nextChapterNumber;
    chapterData.value = chapter;
    clearSelectedVerses();

    if (translationBooks.value?.translation.id !== nextTranslationId) {
      const books = await api.getTranslationBooks(
        nextTranslationId,
        getActiveEndpoint()
      );
      translationBooks.value = books;
    }
  };

  const loadPreviousChapter = async () => {
    if (!chapterData.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const chapter = await api.getPreviousChapter(
        chapterData.value,
        getActiveEndpoint()
      );
      if (!chapter) {
        return;
      }
      await syncStateFromChapter(chapter);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load previous chapter.";
    } finally {
      loading.value = false;
    }
  };

  const selectTranslation = async (translation: string) => {
    loading.value = true;
    error.value = null;

    try {
      const books = await api.getTranslationBooks(
        translation,
        getActiveEndpoint()
      );
      const firstBook = books.books[0];
      if (!firstBook) {
        throw new Error("No books available for selected translation.");
      }

      const firstChapterNumber = firstBook.firstChapterNumber ?? 1;
      const chapter = await api.getTranslationBookChapter(
        translation,
        firstBook.id,
        firstChapterNumber,
        getActiveEndpoint()
      );

      translationBooks.value = books;
      translationId.value = translation;
      bookId.value = firstBook.id;
      chapterNumber.value = firstChapterNumber;
      chapterData.value = chapter;
      clearSelectedVerses();
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to select translation.";
    } finally {
      loading.value = false;
    }
  };

  const selectBook = async (book: string) => {
    if (!translationId.value || !translationBooks.value) {
      return;
    }

    const selectedBook = translationBooks.value.books.find(
      (entry) => entry.id === book
    );
    if (!selectedBook) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const nextChapterNumber = selectedBook.firstChapterNumber ?? 1;
      const chapter = await api.getTranslationBookChapter(
        translationId.value,
        book,
        nextChapterNumber,
        getActiveEndpoint()
      );

      bookId.value = book;
      chapterNumber.value = nextChapterNumber;
      chapterData.value = chapter;
      clearSelectedVerses();
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to select book.";
    } finally {
      loading.value = false;
    }
  };

  const selectChapter = async (book: string, chapter: number) => {
    if (!translationId.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const nextChapterData = await api.getTranslationBookChapter(
        translationId.value,
        book,
        chapter,
        getActiveEndpoint()
      );

      bookId.value = book;
      chapterNumber.value = chapter;
      chapterData.value = nextChapterData;
      clearSelectedVerses();
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to select chapter.";
    } finally {
      loading.value = false;
    }
  };

  const loadNextChapter = async () => {
    if (!chapterData.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const chapter = await api.getNextChapter(
        chapterData.value,
        getActiveEndpoint()
      );
      if (!chapter) {
        return;
      }
      await syncStateFromChapter(chapter);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load next chapter.";
    } finally {
      loading.value = false;
    }
  };

  const loadInitialData = async () => {
    loading.value = true;
    error.value = null;

    try {
      console.log("Loading available translations...");
      const translations =
        await api.getAvailableTranslations(getActiveEndpoint());
      availableTranslations.value = translations;

      console.log("loaded", translations);
      const currentTranslation = shouldUseFirstAvailableTranslation
        ? translations.translations[0]
        : translations.translations.find((t) => t.id === translationId.value);
      if (!currentTranslation) {
        if (shouldUseFirstAvailableTranslation) {
          throw new Error("No available translations found for endpoint.");
        }
        throw new Error(
          `Translation with ID "${translationId.value}" not available.`
        );
      }

      const nextTranslationId = currentTranslation.id;
      translationId.value = nextTranslationId;

      const books = await api.getTranslationBooks(
        nextTranslationId,
        getActiveEndpoint()
      );
      translationBooks.value = books;
      const firstBook = books.books[0];
      if (!firstBook) {
        throw new Error("No books available for selected translation.");
      }

      const requestedBookId = bookId.value;
      const selectedBook = requestedBookId
        ? (books.books.find((book) => book.id === requestedBookId) ?? firstBook)
        : firstBook;

      const nextBookId = selectedBook.id;
      const firstChapterNumber = selectedBook.firstChapterNumber ?? 1;
      const maxChapterNumber =
        firstChapterNumber + selectedBook.numberOfChapters - 1;
      const requestedChapterNumber = chapterNumber.value;
      const nextChapterNumber =
        requestedChapterNumber >= firstChapterNumber &&
        requestedChapterNumber <= maxChapterNumber
          ? requestedChapterNumber
          : firstChapterNumber;

      bookId.value = nextBookId;
      chapterNumber.value = nextChapterNumber;

      const chapter = await api.getTranslationBookChapter(
        nextTranslationId,
        nextBookId,
        nextChapterNumber,
        getActiveEndpoint()
      );

      chapterData.value = chapter;
      console.log("Initial chapter loaded:", chapter);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load Bible data.";
    } finally {
      loading.value = false;
    }
  };

  loadInitialData();

  return {
    translationId,
    bookId,
    chapterNumber,
    availableTranslations,
    translationBooks,
    chapterData,
    selectedVerses,
    loading,
    error,
    selectVerse,
    clearSelectedVerses,
    selectTranslation,
    selectBook,
    selectChapter,
    loadPreviousChapter,
    loadNextChapter,
  };
}
