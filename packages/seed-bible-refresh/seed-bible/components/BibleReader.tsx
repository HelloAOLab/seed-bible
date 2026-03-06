import {
  FreeUseBibleAPI,
  type AvailableTranslations,
  type TranslationBookChapter,
  type TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";

const { useEffect, useMemo, useState } = os.appHooks;

function renderInlineContent(part: unknown, index: number) {
  if (typeof part === "string") {
    return <span key={index}>{part}</span>;
  }

  if (!part || typeof part !== "object") {
    return null;
  }

  const value = part as Record<string, unknown>;

  if (typeof value.text === "string") {
    return <span key={index}>{value.text}</span>;
  }

  if (typeof value.heading === "string") {
    return <strong key={index}>{value.heading}</strong>;
  }

  if (value.lineBreak === true) {
    return <br key={index} />;
  }

  if (typeof value.noteId === "number") {
    return (
      <sup key={index} style={{ marginLeft: "2px" }}>
        [{value.noteId}]
      </sup>
    );
  }

  return null;
}

function renderChapterContent(chapterData: TranslationBookChapter | null) {
  if (!chapterData) {
    return null;
  }

  const entries = chapterData.chapter.content as unknown[];
  return entries.map((entry, entryIndex) => {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const value = entry as Record<string, unknown>;

    if (value.type === "heading" && Array.isArray(value.content)) {
      const heading = (value.content as unknown[])
        .filter((item) => typeof item === "string")
        .join(" ");
      return (
        <h3 key={`heading-${entryIndex}`} style={{ marginTop: "18px" }}>
          {heading}
        </h3>
      );
    }

    if (value.type === "line_break") {
      return <div key={`break-${entryIndex}`} style={{ height: "10px" }} />;
    }

    if (value.type === "hebrew_subtitle" && Array.isArray(value.content)) {
      return (
        <p key={`subtitle-${entryIndex}`} style={{ fontStyle: "italic" }}>
          {value.content.map(renderInlineContent)}
        </p>
      );
    }

    if (
      value.type === "verse" &&
      typeof value.number === "number" &&
      Array.isArray(value.content)
    ) {
      return (
        <p key={`verse-${entryIndex}`} style={{ margin: "8px 0" }}>
          <sup style={{ marginRight: "8px", fontWeight: 700 }}>
            {value.number}
          </sup>
          {value.content.map(renderInlineContent)}
        </p>
      );
    }

    return null;
  });
}

export function BibleReader() {
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

  const currentBook =
    translationBooks?.books.find((book) => book.id === bookId) ?? null;

  return (
    <div style={{ padding: "16px", maxWidth: "860px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "6px" }}>Bible Reader</h2>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        {translationId ?? "-"} • {currentBook?.name ?? bookId ?? "-"}{" "}
        {chapterNumber}
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        <button
          disabled={!chapterData?.previousChapterApiLink || loading}
          onClick={loadPreviousChapter}
        >
          Previous Chapter
        </button>
        <button
          disabled={!chapterData?.nextChapterApiLink || loading}
          onClick={loadNextChapter}
        >
          Next Chapter
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && !loading && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && chapterData && (
        <div>
          {renderChapterContent(chapterData)}
          {chapterData.chapter.footnotes.length > 0 && (
            <div
              style={{
                marginTop: "20px",
                paddingTop: "10px",
                borderTop: "1px solid #ccc",
              }}
            >
              <h4>Footnotes</h4>
              {chapterData.chapter.footnotes.map((note) => (
                <p key={note.noteId} style={{ margin: "6px 0" }}>
                  <strong>[{note.noteId}]</strong> {note.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !error && !chapterData && <p>No chapter content found.</p>}

      {!availableTranslations && !loading && !error && (
        <p>No translations available.</p>
      )}
    </div>
  );
}
