import {
  type TranslationBookChapter,
  type ChapterVerse,
  type ChapterFootnote,
} from "seed-bible.managers.FreeUseBibleAPI";
import { computed, useSignal } from "@preact/signals";
import type {
  BibleReadingState,
  BibleSelectedVerse,
} from "seed-bible.managers.BibleReadingManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { Pane } from "seed-bible.managers.PanesManager";

const { useEffect } = os.appHooks;

function renderInlineContent(
  part: ChapterVerse["content"][0],
  index: number,
  onOpenFootnote: (noteId: number) => void
) {
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
      <button
        key={index}
        className="sb-inline-footnote-button"
        aria-label={`Open footnote ${part.noteId}`}
        title={`Open footnote ${part.noteId}`}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          onOpenFootnote(part.noteId);
        }}
      >
        <span className="material-symbols-outlined">info</span>
      </button>
    );
  }

  return null;
}

function renderChapterContent(
  chapterData: TranslationBookChapter | null,
  onVerseClick: (verse: BibleSelectedVerse, event: MouseEvent) => void,
  selectedVerses: BibleSelectedVerse[],
  onOpenFootnote: (noteId: number) => void
) {
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
          {value.content.map((part, index) =>
            renderInlineContent(part, index, onOpenFootnote)
          )}
        </p>
      );
    }

    if (
      value.type === "verse" &&
      typeof value.number === "number" &&
      Array.isArray(value.content)
    ) {
      const verse: BibleSelectedVerse = {
        bookId: chapterData.book.id,
        chapterNumber: chapterData.chapter.number,
        verse: value,
        translationId: chapterData.translation.id,
      };
      const isSelected = selectedVerses.some(
        (v) =>
          v.verse.number === value.number &&
          v.bookId === chapterData.book.id &&
          v.chapterNumber === chapterData.chapter.number
      );

      return (
        <span
          key={`verse-${entryIndex}`}
          className={`sb-verse${isSelected ? " sb-verse-selected" : ""}`}
          onClick={(event: MouseEvent) => {
            onVerseClick(verse, event);
          }}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
        >
          <sup className="sb-verse-number">{value.number}</sup>
          {value.content.map((part, index) =>
            renderInlineContent(part, index, onOpenFootnote)
          )}
        </span>
      );
    }

    return null;
  });
}

interface BibleReaderProps {
  currentPane: Pane;
  readingState: BibleReadingState;
  selectorState: BibleSelectorState;
}

interface SelectedFootnote {
  note: ChapterFootnote;
  verse: ChapterVerse | null;
  chapter: TranslationBookChapter;
}

export function BibleReader(props: BibleReaderProps) {
  const { currentPane, readingState, selectorState } = props;
  const {
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
  } = readingState;
  const selectedFootnote = useSignal<SelectedFootnote | null>(null);

  const currentBook = computed(
    () =>
      translationBooks.value?.books.find((book) => book.id === bookId.value) ??
      null
  );

  return (
    <div className="sb-bible-reader">
      <h2
        onClick={() => selectorState.setOpen(true, currentPane)}
        className="sb-bible-reader-title"
      >
        <span className="sb-bible-reader-book">
          {currentBook.value?.name ?? bookId.value ?? "Select a book"}
        </span>
        <span className="sb-bible-reader-chapter">{chapterNumber.value}</span>{" "}
        <span className="sb-bible-reader-translation">
          / {translationId.value ?? ""}
        </span>
      </h2>

      {error.value && !loading.value && (
        <p className="sb-reader-error">{error.value}</p>
      )}

      {!error.value && chapterData.value && (
        <div className="sb-chapter-content">
          {renderChapterContent(
            chapterData.value,
            (verse, event) => {
              selectVerse(verse, event.clientX, event.clientY);
            },
            selectedVerses.value,
            (noteId) => {
              const footnote =
                chapterData.value?.chapter.footnotes.find(
                  (note) => note.noteId === noteId
                ) ?? null;
              if (footnote) {
                const verses = chapterData.value!.chapter.content.filter(
                  (c): c is ChapterVerse =>
                    typeof c === "object" && c.type === "verse"
                );
                selectedFootnote.value = {
                  note: footnote,
                  verse:
                    verses.find(
                      (c) => c.number === footnote.reference?.verse
                    ) ?? null,
                  chapter: chapterData.value!,
                };
              } else {
                selectedFootnote.value = null;
              }
            }
          )}
        </div>
      )}

      {!error.value && !chapterData.value && <p>No chapter content found.</p>}

      {!availableTranslations.value && !error.value && (
        <p>No translations available.</p>
      )}

      {selectedFootnote.value !== null && (
        <div
          className="sb-footnote-modal-overlay"
          onClick={() => {
            selectedFootnote.value = null;
          }}
        >
          <div
            className="sb-footnote-modal"
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
            }}
          >
            <div className="sb-footnote-modal-header">
              <h3 className="sb-footnote-modal-title">
                {selectedFootnote.value.chapter.book.name}{" "}
                {selectedFootnote.value.chapter.chapter.number}:
                {selectedFootnote.value.verse?.number ?? "?"}
              </h3>
              <button
                className="sb-footnote-modal-close"
                aria-label="Close footnote"
                onClick={() => {
                  selectedFootnote.value = null;
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="sb-footnote-modal-content">
              {selectedFootnote.value.note.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
