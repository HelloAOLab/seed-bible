import { type TranslationBookChapter } from "seed-bible.managers.FreeUseBibleAPI";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import { BibleSelector } from "seed-bible.components.BibleSelector";

const { useState } = os.appHooks;

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

export function BibleReader(props: BibleReadingState) {
  const {
    translationId,
    bookId,
    chapterNumber,
    availableTranslations,
    translationBooks,
    chapterData,
    loading,
    error,
    selectTranslation,
    selectChapter,
    loadPreviousChapter,
    loadNextChapter,
  } = props;

  const currentBook =
    translationBooks.value?.books.find((book) => book.id === bookId.value) ??
    null;

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  return (
    <div
      style={{
        padding: "16px",
        paddingBottom: "96px",
        maxWidth: "860px",
        margin: "0 auto",
      }}
    >
      <h2 style={{ marginBottom: "6px" }}>Bible Reader</h2>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        {translationId.value ?? "-"} •{" "}
        <button
          onClick={() => setIsSelectorOpen(true)}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            color: "inherit",
            textDecoration: "underline",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          {currentBook?.name ?? bookId.value ?? "-"}
        </button>{" "}
        <button
          onClick={() => setIsSelectorOpen(true)}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            color: "inherit",
            textDecoration: "underline",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          {chapterNumber.value}
        </button>
      </p>

      <BibleSelector
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        translationId={translationId.value}
        bookId={bookId.value}
        chapterNumber={chapterNumber.value}
        availableTranslations={availableTranslations.value}
        translationBooks={translationBooks.value}
        loading={loading.value}
        onSelectTranslation={(translation) => {
          void selectTranslation(translation);
        }}
        onSelectChapter={(book, chapter) => {
          void selectChapter(book, chapter);
          setIsSelectorOpen(false);
        }}
      />

      {loading.value && <p>Loading...</p>}
      {error.value && !loading.value && (
        <p style={{ color: "red" }}>{error.value}</p>
      )}

      {!loading.value && !error.value && chapterData.value && (
        <div>
          {renderChapterContent(chapterData.value)}
          {chapterData.value.chapter.footnotes.length > 0 && (
            <div
              style={{
                marginTop: "20px",
                paddingTop: "10px",
                borderTop: "1px solid #ccc",
              }}
            >
              <h4>Footnotes</h4>
              {chapterData.value.chapter.footnotes.map((note) => (
                <p key={note.noteId} style={{ margin: "6px 0" }}>
                  <strong>[{note.noteId}]</strong> {note.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading.value && !error.value && !chapterData.value && (
        <p>No chapter content found.</p>
      )}

      {!availableTranslations.value && !loading.value && !error.value && (
        <p>No translations available.</p>
      )}

      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: "18px",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "8px",
          padding: "8px",
          borderRadius: "10px",
          background: "rgba(245, 245, 245, 0.96)",
          border: "1px solid #d8d8d8",
          boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
          zIndex: 900,
        }}
      >
        <button
          disabled={!chapterData.value?.previousChapterApiLink || loading.value}
          onClick={loadPreviousChapter}
        >
          Previous Chapter
        </button>
        <button
          onClick={() => setIsSelectorOpen(true)}
          disabled={loading.value}
        >
          Open Book Selector
        </button>
        <button
          disabled={!chapterData.value?.nextChapterApiLink || loading.value}
          onClick={loadNextChapter}
        >
          Next Chapter
        </button>
      </div>
    </div>
  );
}
