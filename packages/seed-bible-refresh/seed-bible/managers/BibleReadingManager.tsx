import {
  FreeUseBibleAPI,
  type AvailableTranslations,
  type TranslationBookChapter,
  type TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";

const { useEffect, useMemo, useState } = os.appHooks;

export interface BibleReadingState {
  translationId: string | null;
  bookId: string | null;
  chapterNumber: number;
  availableTranslations: AvailableTranslations | null;
  translationBooks: TranslationBooks | null;
  chapterData: TranslationBookChapter | null;
  loading: boolean;
  error: string | null;
  loadPreviousChapter: () => Promise<void>;
  loadNextChapter: () => Promise<void>;
}

export function BibleReadingManager(): BibleReadingState {
  const api = useMemo(() => new FreeUseBibleAPI(), []);

  const [translationId, setTranslationId] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [chapterNumber, setChapterNumber] = useState<number>(1);

  const [availableTranslations, setAvailableTranslations] =
    useState<AvailableTranslations | null>(null);
  const [translationBooks, setTranslationBooks] =
    useState<TranslationBooks | null>(null);
  const [chapterData, setChapterData] = useState<TranslationBookChapter | null>(
    null
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      setLoading(true);
      setError(null);

      try {
        const translations = await api.getAvailableTranslations();
        if (!mounted) {
          return;
        }

        setAvailableTranslations(translations);
        const firstTranslation = translations.translations[0];
        if (!firstTranslation) {
          throw new Error("No translations available.");
        }

        const nextTranslationId = firstTranslation.id;
        setTranslationId(nextTranslationId);

        const books = await api.getTranslationBooks(nextTranslationId);
        if (!mounted) {
          return;
        }

        setTranslationBooks(books);
        const firstBook = books.books[0];
        if (!firstBook) {
          throw new Error("No books available for selected translation.");
        }

        const nextBookId = firstBook.id;
        const firstChapterNumber = firstBook.firstChapterNumber ?? 1;

        setBookId(nextBookId);
        setChapterNumber(firstChapterNumber);

        const chapter = await api.getTranslationBookChapter(
          nextTranslationId,
          nextBookId,
          firstChapterNumber
        );
        if (!mounted) {
          return;
        }

        setChapterData(chapter);
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to load Bible data."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, [api]);

  const syncStateFromChapter = async (chapter: TranslationBookChapter) => {
    const nextTranslationId = chapter.translation.id;
    const nextBookId = chapter.book.id;
    const nextChapterNumber = chapter.chapter.number;

    setTranslationId(nextTranslationId);
    setBookId(nextBookId);
    setChapterNumber(nextChapterNumber);
    setChapterData(chapter);

    if (translationBooks?.translation.id !== nextTranslationId) {
      const books = await api.getTranslationBooks(nextTranslationId);
      setTranslationBooks(books);
    }
  };

  const loadPreviousChapter = async () => {
    if (!chapterData) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const chapter = await api.getPreviousChapter(chapterData);
      if (!chapter) {
        return;
      }
      await syncStateFromChapter(chapter);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load previous chapter."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadNextChapter = async () => {
    if (!chapterData) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const chapter = await api.getNextChapter(chapterData);
      if (!chapter) {
        return;
      }
      await syncStateFromChapter(chapter);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load next chapter."
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    translationId,
    bookId,
    chapterNumber,
    availableTranslations,
    translationBooks,
    chapterData,
    loading,
    error,
    loadPreviousChapter,
    loadNextChapter,
  };
}
