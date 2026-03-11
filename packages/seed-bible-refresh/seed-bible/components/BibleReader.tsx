import {
  type TranslationBookChapter,
  type ChapterVerse,
} from "seed-bible.managers.FreeUseBibleAPI";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import { BibleSelector } from "seed-bible.components.BibleSelector";
import { BibleReaderToolbar } from "seed-bible.components.BibleReaderToolbar";
import {
  useBibleSelector,
  type BibleSelectorState,
} from "seed-bible.managers.BibleSelectorManager";
import { computed, useSignal } from "@preact/signals";

function renderInlineContent(part: ChapterVerse["content"][0], index: number) {
  if (typeof part === "string") {
    return <span key={index}>{part}</span>;
  }

  if (!part || typeof part !== "object") {
    return null;
  }

  if ("text" in part && typeof part.text === "string") {
    return <span key={index}>{part.text}</span>;
  }

  if ("heading" in part && typeof part.heading === "string") {
    return <strong key={index}>{part.heading}</strong>;
  }

  if ("lineBreak" in part && part.lineBreak === true) {
    return <br key={index} />;
  }

  if ("noteId" in part && typeof part.noteId === "number") {
    return (
      <sup key={index} className="sb-note-marker">
        [{part.noteId}]
      </sup>
    );
  }

  return null;
}

function renderChapterContent(chapterData: TranslationBookChapter | null) {
  if (!chapterData) {
    return null;
  }

  const entries = chapterData.chapter.content;
  return entries.map((entry, entryIndex) => {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const value = entry;

    if (value.type === "heading" && Array.isArray(value.content)) {
      const heading = (value.content as unknown[])
        .filter((item) => typeof item === "string")
        .join(" ");
      return (
        <h3 key={`heading-${entryIndex}`} className="sb-chapter-heading">
          {heading}
        </h3>
      );
    }

    if (value.type === "line_break") {
      return <div key={`break-${entryIndex}`} className="sb-line-break" />;
    }

    if (value.type === "hebrew_subtitle" && Array.isArray(value.content)) {
      return (
        <p key={`subtitle-${entryIndex}`} className="sb-subtitle">
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
        <span key={`verse-${entryIndex}`} className="sb-verse">
          <sup className="sb-verse-number">{value.number}</sup>
          {value.content.map(renderInlineContent)}
        </span>
      );
    }

    return null;
  });
}

export function BibleReader(
  props: BibleReadingState & { selectorState: BibleSelectorState }
) {
  const {
    translationId,
    bookId,
    chapterNumber,
    availableTranslations,
    translationBooks,
    chapterData,
    loading,
    error,
    selectorState,
  } = props;

  const currentBook = computed(
    () =>
      translationBooks.value?.books.find((book) => book.id === bookId.value) ??
      null
  );

  const { open } = selectorState;

  // const selectorState = useBibleSelector({
  //   isOpen: isSelectorOpen,
  //   setOpen: (open: boolean) => (isSelectorOpen.value = open),
  //   readingState: props,
  // });

  console.log("Rendering BibleReader with state", {
    translationId: translationId.value,
    bookId: bookId.value,
    chapterNumber: chapterNumber.value,
    availableTranslations: availableTranslations.value,
    translationBooks: translationBooks.value,
    chapterData: chapterData.value,
    loading: loading.value,
    error: error.value,
  });

  return (
    <div className="sb-bible-reader">
      <h2 onClick={() => open(props)} className="sb-bible-reader-title">
        <span className="sb-bible-reader-book">
          {currentBook.value?.name ?? bookId.value ?? "Select a book"}
        </span>
        <span className="sb-bible-reader-chapter">{chapterNumber.value}</span>{" "}
        <span className="sb-bible-reader-translation">
          / {translationId.value ?? ""}
        </span>
      </h2>

      {/* <BibleSelector
        isOpen={isSelectorOpen.value}
        onClose={() => (isSelectorOpen.value = false)}
        readingState={props}
        selectorState={selectorState}
      /> */}

      {error.value && !loading.value && (
        <p className="sb-reader-error">{error.value}</p>
      )}

      {!error.value && chapterData.value && (
        <div className="sb-chapter-content">
          {renderChapterContent(chapterData.value)}
          {chapterData.value.chapter.footnotes.length > 0 && (
            <div className="sb-reader-footnotes">
              <h4 className="sb-reader-footnotes-title">Footnotes</h4>
              {chapterData.value.chapter.footnotes.map((note) => (
                <p key={note.noteId} className="sb-reader-footnote-item">
                  <strong>[{note.noteId}]</strong> {note.text}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {!error.value && !chapterData.value && <p>No chapter content found.</p>}

      {!availableTranslations.value && !error.value && (
        <p>No translations available.</p>
      )}

      <BibleReaderToolbar readingState={props} selectorState={selectorState} />
    </div>
  );
}
