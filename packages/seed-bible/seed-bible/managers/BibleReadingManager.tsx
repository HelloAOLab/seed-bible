import {
  type AvailableTranslations,
  type ChapterFootnote,
  type ChapterVerse,
  type Translation,
  type TranslationBookChapter,
  type TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";
import { type BibleDataManager } from "seed-bible.managers.BibleDataManager";
import {
  batch,
  computed,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { JSX } from "preact";
import { sortBy } from "es-toolkit";
import type {
  ChapterHighlight,
  ChapterHighlights,
  HighlightsManager,
} from "seed-bible.managers.HighlightsManager";

export interface BibleSelectedVerse {
  bookId: string;
  chapterNumber: number;
  verse: ChapterVerse;
  translationId: string | null;
  selectionX?: number;
  selectionY?: number;
  selectedAt?: number;
}

export interface SelectedFootnote {
  note: ChapterFootnote;
  verse: ChapterVerse | null;
  chapter: TranslationBookChapter;
}

export interface VerseDecoration {
  id: string;
  translationId: string | null;
  bookId: string;
  chapterNumber: number;
  verses: number[];
  targetContent?: string;
  className?: string;
  style?: JSX.CSSProperties;

  /**
   * Whether to preserve the decoration when the chapter changes.
   */
  preserveOnChapterChange?: boolean;
}

export interface VerseDecorationInput {
  targetContent?: string;
  className?: string;
  style?: JSX.CSSProperties;

  /**
   * Whether to preserve the decoration when the chapter changes.
   * By default, decorations are cleared when the chapter changes.
   * Setting this to true will keep the decoration until it is explicitly removed.
   */
  preserveOnChapterChange?: boolean;
}

export interface BibleReadingState {
  translationId: Signal<string | null>;
  translation: Signal<Translation | null>;
  bookId: Signal<string | null>;
  chapterNumber: Signal<number>;
  availableTranslations: Signal<AvailableTranslations | null>;
  translationBooks: Signal<TranslationBooks | null>;
  chapterData: Signal<TranslationBookChapter | null>;
  highlights: ReadonlySignal<ChapterHighlights>;
  decorations: ReadonlySignal<VerseDecoration[]>;
  selectedVerses: Signal<BibleSelectedVerse[]>;
  selectedFootnote: ReadonlySignal<SelectedFootnote | null>;
  loading: Signal<boolean>;
  error: Signal<string | null>;
  scrollPosition: Signal<number>;
  selectVerse: (
    verse: BibleSelectedVerse,
    selectionX: number,
    selectionY: number
  ) => void;
  selectFootnote: (noteId: number | null) => void;
  highlightSelectedVerses: (
    highlightDetails: Omit<ChapterHighlight, "verse">
  ) => Promise<void>;
  unhighlightSelectedVerses: () => Promise<void>;
  decorateVerses: (
    translationId: string | null,
    bookId: string,
    chapterNumber: number,
    verses: number | number[],
    decoration: VerseDecorationInput
  ) => string;
  removeDecoration: (decorationId: string) => void;
  clearSelectedVerses: () => void;
  selectTranslation: (translation: string) => Promise<void>;
  selectTranslationAndChapter: (
    translationId: string,
    bookId: string,
    chapterNumber: number
  ) => Promise<void>;
  selectBook: (book: string) => Promise<void>;
  selectChapter: (book: string, chapter: number) => Promise<void>;
  loadPreviousChapter: () => Promise<void>;
  loadNextChapter: () => Promise<void>;
}

export const DEFAULT_TRANSLATION_ID = "AAB";
export const DEFAULT_BOOK_ID = "GEN";
export const DEFAULT_CHAPTER_NUMBER = 1;

interface InitialBibleReadingOptions {
  initialTranslationId?: string | null;
  initialBookId?: string | null;
  initialChapterNumber?: number | null;
}

function normalizeDecorationVerses(verses: number | number[]): number[] {
  const verseNumbers = Array.isArray(verses) ? verses : [verses];
  const normalized = Array.from(
    new Set(
      verseNumbers.filter(
        (verseNumber) => Number.isInteger(verseNumber) && verseNumber > 0
      )
    )
  ).sort((left, right) => left - right);

  if (normalized.length === 0) {
    throw new Error("At least one valid verse number is required.");
  }

  return normalized;
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
    // const normalizedEndpointPath = endpointPath.replace(/\/+$/, "");
    return `${url.protocol}//${url.host}${endpointPath}/`;
  } catch {
    return null;
  }
}

export function createBibleReadingState(
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager,
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
      : (options.initialTranslationId ?? DEFAULT_TRANSLATION_ID)
  );
  const endpointOverride = signal<string | null>(initialEndpointOverride);
  const bookId = signal<string | null>(options.initialBookId ?? null);
  const chapterNumber = signal<number>(normalizedInitialChapterNumber);
  const availableTranslations = signal<AvailableTranslations | null>(null);
  const translationBooks = signal<TranslationBooks | null>(null);
  const chapterData = signal<TranslationBookChapter | null>(null);
  const selectedVerses = signal<BibleSelectedVerse[]>([]);
  const selectedFootnoteId = signal<number | null>(null);
  const activeChapterHighlights = signal<Signal<ChapterHighlights>>(
    signal<ChapterHighlights>({
      highlights: [],
    })
  );
  const highlights = computed<ChapterHighlights>(
    () => activeChapterHighlights.value.value
  );
  const decorations = signal<VerseDecoration[]>([]);
  const loading = signal<boolean>(true);
  const error = signal<string | null>(null);
  const scrollPosition = signal<number>(0);

  const translation = computed(
    () => translationBooks.value?.translation ?? null
  );

  const selectedFootnote = computed<SelectedFootnote | null>(() => {
    const chapter = chapterData.value;
    if (!chapter || selectedFootnoteId.value === null) {
      return null;
    }

    const note =
      chapter.chapter.footnotes.find(
        (note) => note.noteId === selectedFootnoteId.value
      ) ?? null;

    if (!note) {
      return null;
    }

    return {
      note,
      chapter,
      verse:
        chapter.chapter.content.find(
          (item): item is ChapterVerse =>
            item.type === "verse" &&
            item.content.some(
              (contentPart) =>
                typeof contentPart === "object" &&
                "noteId" in contentPart &&
                contentPart.noteId === selectedFootnoteId.value
            )
        ) ?? null,
    };
  });

  const selectVerse = (
    verse: BibleSelectedVerse,
    selectionX: number,
    selectionY: number
  ) => {
    const isSelected = selectedVerses.value.some((item) =>
      isSameSelectedVerse(item, verse)
    );

    if (isSelected) {
      selectedVerses.value = selectedVerses.value.filter(
        (item) => !isSameSelectedVerse(item, verse)
      );
      return;
    }

    const selectedVerse: BibleSelectedVerse = {
      ...verse,
      selectionX,
      selectionY,
      selectedAt: Date.now(),
    };

    selectedVerses.value = sortBy(
      [...selectedVerses.value, selectedVerse],
      [(v: BibleSelectedVerse) => v.verse.number]
    );
  };

  const clearSelectedVerses = () => {
    selectedVerses.value = [];
  };

  const getActiveEndpoint = () => endpointOverride.value ?? undefined;

  const toAvailableTranslations = (
    translationsList: BibleDataManager["availableTranslations"]["value"]
  ): AvailableTranslations => {
    return {
      translations: translationsList,
    };
  };

  const syncStateFromChapter = async (chapter: TranslationBookChapter) => {
    const nextTranslationId = chapter.translation.id;
    const nextBookId = chapter.book.id;
    const nextChapterNumber = chapter.chapter.number;

    batch(() => {
      const didChapterChange =
        bookId.value !== nextBookId ||
        chapterNumber.value !== nextChapterNumber;
      if (didChapterChange) {
        scrollPosition.value = 0;
      }

      translationId.value = nextTranslationId;
      bookId.value = nextBookId;
      chapterNumber.value = nextChapterNumber;
      chapterData.value = chapter;
      selectedFootnoteId.value = null;
      decorations.value = decorations.value.filter(
        (decoration) => decoration.preserveOnChapterChange
      );
      clearSelectedVerses();
    });

    if (translationBooks.value?.translation.id !== nextTranslationId) {
      const books = await dataManager.getTranslationBooks(nextTranslationId);
      translationBooks.value = books;
      availableTranslations.value = toAvailableTranslations(
        dataManager.availableTranslations.value
      );
    }

    activeChapterHighlights.value = highlightsManager.getChapterHighlights(
      nextTranslationId,
      nextBookId,
      nextChapterNumber
    );
  };

  const highlightSelectedVerses = async (
    highlightDetails: Omit<ChapterHighlight, "verse">
  ): Promise<void> => {
    const activeTranslationId = translationId.value;
    const activeBookId = bookId.value;
    const activeChapterNumber = chapterNumber.value;

    if (!activeTranslationId || !activeBookId) {
      return;
    }

    const verseNumbers = Array.from(
      new Set(
        selectedVerses.value
          .filter(
            (verse) =>
              verse.translationId === activeTranslationId &&
              verse.bookId === activeBookId &&
              verse.chapterNumber === activeChapterNumber
          )
          .map((verse) => verse.verse.number)
      )
    );

    if (verseNumbers.length === 0) {
      return;
    }

    await highlightsManager.highlightVerses(
      activeTranslationId,
      activeBookId,
      activeChapterNumber,
      verseNumbers,
      highlightDetails
    );
  };

  const unhighlightSelectedVerses = async (): Promise<void> => {
    const activeTranslationId = translationId.value;
    const activeBookId = bookId.value;
    const activeChapterNumber = chapterNumber.value;

    if (!activeTranslationId || !activeBookId) {
      return;
    }

    const verseNumbers = Array.from(
      new Set(
        selectedVerses.value
          .filter(
            (verse) =>
              verse.translationId === activeTranslationId &&
              verse.bookId === activeBookId &&
              verse.chapterNumber === activeChapterNumber
          )
          .map((verse) => verse.verse.number)
      )
    );

    if (verseNumbers.length === 0) {
      return;
    }

    await highlightsManager.unhighlightVerses(
      activeTranslationId,
      activeBookId,
      activeChapterNumber,
      verseNumbers
    );
  };

  const decorateVerses = (
    translationId: string | null,
    bookId: string,
    chapterNumber: number,
    verses: number | number[],
    decoration: VerseDecorationInput,
    id: string = `decoration-${uuid()}`
  ): string => {
    const nextDecoration: VerseDecoration = {
      id,
      translationId: translationId ?? translation.value?.id ?? null,
      bookId,
      chapterNumber,
      verses: normalizeDecorationVerses(verses),
      ...decoration,
    };

    decorations.value = [...decorations.value, nextDecoration];
    return nextDecoration.id;
  };

  const removeDecoration = (decorationId: string) => {
    decorations.value = decorations.value.filter(
      (decoration) => decoration.id !== decorationId
    );
  };

  const loadPreviousChapter = async () => {
    if (!chapterData.value) {
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const chapter = await dataManager.getPreviousChapter(chapterData.value);
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
      const availableTranslationsEndpoint =
        extractEndpointFromAvailableTranslationsUrl(translation);

      let nextTranslationId = translation;

      if (availableTranslationsEndpoint) {
        endpointOverride.value = availableTranslationsEndpoint;

        const endpointTranslations = await dataManager.getTranslations(
          availableTranslationsEndpoint
        );
        availableTranslations.value = toAvailableTranslations(
          dataManager.availableTranslations.value
        );

        const firstTranslation = endpointTranslations[0];
        if (!firstTranslation) {
          throw new Error("No available translations found for endpoint.");
        }

        nextTranslationId = firstTranslation.id;
      }

      const books = await dataManager.getTranslationBooks(nextTranslationId);
      const firstBook = books.books[0];
      if (!firstBook) {
        throw new Error("No books available for selected translation.");
      }

      const firstChapterNumber = firstBook.firstChapterNumber ?? 1;
      const chapter = await dataManager.getTranslationBookChapter(
        nextTranslationId,
        firstBook.id,
        firstChapterNumber
      );

      await batch(async () => {
        availableTranslations.value = toAvailableTranslations(
          dataManager.availableTranslations.value
        );
        await syncStateFromChapter(chapter);
      });
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
      const chapter = await dataManager.getTranslationBookChapter(
        translationId.value,
        book,
        nextChapterNumber
      );

      await syncStateFromChapter(chapter);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to select book.";
    } finally {
      loading.value = false;
    }
  };

  const selectTranslationAndChapter = async (
    nextTranslationIdOrUrl: string,
    nextBookId: string,
    nextChapterNumber: number
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const availableTranslationsEndpoint =
        extractEndpointFromAvailableTranslationsUrl(nextTranslationIdOrUrl);

      let nextTranslationId = nextTranslationIdOrUrl;

      if (availableTranslationsEndpoint) {
        endpointOverride.value = availableTranslationsEndpoint;

        const endpointTranslations = await dataManager.getTranslations(
          availableTranslationsEndpoint
        );
        availableTranslations.value = toAvailableTranslations(
          dataManager.availableTranslations.value
        );

        const firstTranslation = endpointTranslations[0];
        if (!firstTranslation) {
          throw new Error("No available translations found for endpoint.");
        }

        nextTranslationId = firstTranslation.id;
      }

      const books = await dataManager.getTranslationBooks(nextTranslationId);
      const selectedBook = books.books.find((book) => book.id === nextBookId);
      if (!selectedBook) {
        throw new Error(
          `Book with ID "${nextBookId}" not available for translation "${nextTranslationId}".`
        );
      }

      const firstChapterNumber = selectedBook.firstChapterNumber ?? 1;
      const maxChapterNumber =
        firstChapterNumber + selectedBook.numberOfChapters - 1;
      const clampedChapterNumber =
        nextChapterNumber >= firstChapterNumber &&
        nextChapterNumber <= maxChapterNumber
          ? nextChapterNumber
          : firstChapterNumber;

      const chapter = await dataManager.getTranslationBookChapter(
        nextTranslationId,
        selectedBook.id,
        clampedChapterNumber
      );

      await batch(async () => {
        availableTranslations.value = toAvailableTranslations(
          dataManager.availableTranslations.value
        );
        await syncStateFromChapter(chapter);
      });
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "Failed to select translation and chapter.";
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
      const nextChapterData = await dataManager.getTranslationBookChapter(
        translationId.value,
        book,
        chapter
      );

      await syncStateFromChapter(nextChapterData);
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
      const chapter = await dataManager.getNextChapter(chapterData.value);
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
      const loadedTranslations =
        await dataManager.getTranslations(getActiveEndpoint());
      availableTranslations.value = toAvailableTranslations(
        dataManager.availableTranslations.value
      );

      console.log("loaded", availableTranslations.value);
      const currentTranslation = shouldUseFirstAvailableTranslation
        ? loadedTranslations[0]
        : availableTranslations.value.translations.find(
            (t) => t.id === translationId.value
          );
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

      const books = await dataManager.getTranslationBooks(nextTranslationId);
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

      const chapter = await dataManager.getTranslationBookChapter(
        nextTranslationId,
        nextBookId,
        nextChapterNumber
      );

      await syncStateFromChapter(chapter);
      console.log("Initial chapter loaded:", chapter);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to load Bible data.";
    } finally {
      loading.value = false;
    }
  };

  const selectFootnote = (noteId: number | null) => {
    selectedFootnoteId.value = noteId;
  };

  loadInitialData();

  return {
    translationId,
    translation,
    bookId,
    chapterNumber,
    availableTranslations,
    translationBooks,
    chapterData,
    highlights,
    decorations,
    selectedVerses,
    selectedFootnote,
    loading,
    error,
    scrollPosition,
    selectVerse,
    selectFootnote,
    highlightSelectedVerses,
    unhighlightSelectedVerses,
    decorateVerses,
    removeDecoration,
    clearSelectedVerses,
    selectTranslation,
    selectTranslationAndChapter,
    selectBook,
    selectChapter,
    loadPreviousChapter,
    loadNextChapter,
  };
}
