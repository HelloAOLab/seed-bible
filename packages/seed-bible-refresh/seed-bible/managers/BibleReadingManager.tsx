import {
  FreeUseBibleAPI,
  type AvailableTranslations,
  type TranslationBookChapter,
  type TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";
import { signal, type Signal } from "https://esm.sh/@preact/signals?external=preact";

export interface BibleReadingState {
  translationId: string | null;
  bookId: string | null;
  chapterNumber: number;
  availableTranslations: AvailableTranslations | null;
  translationBooks: TranslationBooks | null;
  chapterData: TranslationBookChapter | null;
  loading: boolean;
  error: string | null;
  selectTranslation: (translation: string) => Promise<void>;
  selectBook: (book: string) => Promise<void>;
  selectChapter: (book: string, chapter: number) => Promise<void>;
  loadPreviousChapter: () => Promise<void>;
  loadNextChapter: () => Promise<void>;
}

interface BibleReadingStore {
  translationId: Signal<string | null>;
  bookId: Signal<string | null>;
  chapterNumber: Signal<number>;
  availableTranslations: Signal<AvailableTranslations | null>;
  translationBooks: Signal<TranslationBooks | null>;
  chapterData: Signal<TranslationBookChapter | null>;
  loading: Signal<boolean>;
  error: Signal<string | null>;
  selectTranslation: (translation: string) => Promise<void>;
  selectBook: (book: string) => Promise<void>;
  selectChapter: (book: string, chapter: number) => Promise<void>;
  loadPreviousChapter: () => Promise<void>;
  loadNextChapter: () => Promise<void>;
}

const _stores = new Map<string, BibleReadingStore>();

function _createStore(): BibleReadingStore {
  const api = new FreeUseBibleAPI();

  const translationId = signal<string | null>("BSB");
  const bookId = signal<string | null>(null);
  const chapterNumber = signal<number>(1);
  const availableTranslations = signal<AvailableTranslations | null>(null);
  const translationBooks = signal<TranslationBooks | null>(null);
  const chapterData = signal<TranslationBookChapter | null>(null);
  const loading = signal<boolean>(true);
  const error = signal<string | null>(null);

  const syncStateFromChapter = async (chapter: TranslationBookChapter) => {
    const nextTranslationId = chapter.translation.id;
    const nextBookId = chapter.book.id;
    const nextChapterNumber = chapter.chapter.number;

    translationId.value = nextTranslationId;
    bookId.value = nextBookId;
    chapterNumber.value = nextChapterNumber;
    chapterData.value = chapter;

    if (translationBooks.value?.translation.id !== nextTranslationId) {
      const books = await api.getTranslationBooks(nextTranslationId);
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
      const chapter = await api.getPreviousChapter(chapterData.value);
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
      const books = await api.getTranslationBooks(translation);
      const firstBook = books.books[0];
      if (!firstBook) {
        throw new Error("No books available for selected translation.");
      }

      const firstChapterNumber = firstBook.firstChapterNumber ?? 1;
      const chapter = await api.getTranslationBookChapter(
        translation,
        firstBook.id,
        firstChapterNumber
      );

      translationBooks.value = books;
      translationId.value = translation;
      bookId.value = firstBook.id;
      chapterNumber.value = firstChapterNumber;
      chapterData.value = chapter;
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
        nextChapterNumber
      );

      bookId.value = book;
      chapterNumber.value = nextChapterNumber;
      chapterData.value = chapter;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to select book.";
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
        chapter
      );

      bookId.value = book;
      chapterNumber.value = chapter;
      chapterData.value = nextChapterData;
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
      const chapter = await api.getNextChapter(chapterData.value);
      if (!chapter) {
        return;
      }
      await syncStateFromChapter(chapter);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load next chapter.";
    } finally {
      loading.value = false;
    }
  };

  const loadInitialData = async () => {
    loading.value = true;
    error.value = null;

    try {
      const translations = await api.getAvailableTranslations();
      availableTranslations.value = translations;

      const currentTranslation = translations.translations.find(
        (t) => t.id === translationId.value
      );
      if (!currentTranslation) {
        throw new Error(
          `Translation with ID "${translationId.value}" not available.`
        );
      }

      const nextTranslationId = currentTranslation.id;
      translationId.value = nextTranslationId;

      const books = await api.getTranslationBooks(nextTranslationId);
      translationBooks.value = books;
      const firstBook = books.books[0];
      if (!firstBook) {
        throw new Error("No books available for selected translation.");
      }

      const nextBookId = firstBook.id;
      const firstChapterNumber = firstBook.firstChapterNumber ?? 1;

      bookId.value = nextBookId;
      chapterNumber.value = firstChapterNumber;

      const chapter = await api.getTranslationBookChapter(
        nextTranslationId,
        nextBookId,
        firstChapterNumber
      );

      chapterData.value = chapter;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load Bible data.";
    } finally {
      loading.value = false;
    }
  };

  void loadInitialData();

  return {
    translationId,
    bookId,
    chapterNumber,
    availableTranslations,
    translationBooks,
    chapterData,
    loading,
    error,
    selectTranslation,
    selectBook,
    selectChapter,
    loadPreviousChapter,
    loadNextChapter,
  };
}

function _getStore(tabId: string): BibleReadingStore {
  let store = _stores.get(tabId);
  if (!store) {
    store = _createStore();
    _stores.set(tabId, store);
  }
  return store;
}

export function BibleReadingManager(tabId: string): BibleReadingState {
  const store = _getStore(tabId);

  return {
    translationId: store.translationId.value,
    bookId: store.bookId.value,
    chapterNumber: store.chapterNumber.value,
    availableTranslations: store.availableTranslations.value,
    translationBooks: store.translationBooks.value,
    chapterData: store.chapterData.value,
    loading: store.loading.value,
    error: store.error.value,
    selectTranslation: store.selectTranslation,
    selectBook: store.selectBook,
    selectChapter: store.selectChapter,
    loadPreviousChapter: store.loadPreviousChapter,
    loadNextChapter: store.loadNextChapter,
  };
}
