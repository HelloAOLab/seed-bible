import "./PassagePicker.css";
import { useEffect, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type { VerseRef } from "../../managers/PlaylistManager";
import { resolveTypedReference } from "../ScriptureItemInput/scriptureSuggestions";
import { verseRefLabel } from "../playlistItemLabel";
import { passageVerses, type PassageVerse } from "../scripturePassage";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";

/**
 * Picks a passage: a reference typed as "Gen 22:11-18", or a book and
 * chapter chosen from menus with the verses dragged across (or clicked,
 * first then last) in the chapter's text beneath. The three stay in step:
 * typing a reference moves the menus and the selection; choosing verses
 * writes the reference.
 */
export function PassagePicker(props: {
  books: TranslationBook[];
  loadChapter?: ScriptureChapterLoader;
  value: VerseRef | null;
  onChange: (ref: VerseRef | null) => void;
}) {
  const { books, loadChapter, value, onChange } = props;
  const { t } = useI18n();
  const resolveBookName = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };
  const [text, setText] = useState(
    value ? verseRefLabel(value, resolveBookName) : ""
  );
  const [verses, setVerses] = useState<PassageVerse[]>([]);
  const [dragAnchor, setDragAnchor] = useState<number | null>(null);

  const book = value
    ? (books.find((b) => b.id === value.bookId) ?? null)
    : null;
  const chapter = value?.chapter ?? null;

  // The chapter's verses, for choosing among them.
  useEffect(() => {
    if (!value || !loadChapter) {
      setVerses([]);
      return;
    }
    let cancelled = false;
    loadChapter(undefined, value.bookId, value.chapter).then(
      (loaded) => {
        if (!cancelled) {
          setVerses(
            passageVerses(loaded, {
              bookId: value.bookId,
              chapter: value.chapter,
            })
          );
        }
      },
      () => {
        if (!cancelled) setVerses([]);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [value?.bookId, value?.chapter, loadChapter]);

  /** Sets the passage and writes it back into the reference field. */
  const choose = (ref: VerseRef | null) => {
    onChange(ref);
    setText(ref ? verseRefLabel(ref, resolveBookName) : "");
  };

  const selectVerse = (number: number, extend: boolean) => {
    if (!value) {
      return;
    }
    const start = value.verse;
    const end = value.endVerse ?? value.verse;
    if (
      extend &&
      start != null &&
      end != null &&
      !value.toEndOfChapter &&
      value.endChapter == null
    ) {
      choose({
        bookId: value.bookId,
        chapter: value.chapter,
        verse: Math.min(start, number),
        endVerse: Math.max(end, number),
      });
      return;
    }
    choose({ bookId: value.bookId, chapter: value.chapter, verse: number });
  };

  const isSelected = (number: number) =>
    !!value &&
    value.verse != null &&
    number >= value.verse &&
    number <=
      (value.toEndOfChapter ? Infinity : (value.endVerse ?? value.verse));

  const chapters = book
    ? Array.from(
        { length: book.numberOfChapters - (book.firstChapterNumber ?? 1) + 1 },
        (_, i) => (book.firstChapterNumber ?? 1) + i
      )
    : [];

  return (
    <div className="sb-passage-picker">
      <div className="sb-passage-picker-row">
        <div className="sb-passage-picker-search">
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <input
            className="sb-passage-picker-input"
            type="text"
            value={text}
            dir="auto"
            placeholder={t("playlist-add-scripture-placeholder", {
              defaultValue: "e.g. John 3 or John 3:16",
            })}
            aria-label={t("playlist-passage-reference", {
              defaultValue: "Passage",
            })}
            onInput={(event: Event) => {
              const typed = (event.currentTarget as HTMLInputElement).value;
              setText(typed);
              onChange(resolveTypedReference(typed, books));
            }}
          />
        </div>
        <select
          className="sb-passage-picker-select"
          aria-label={t("book", { defaultValue: "Book" })}
          value={book?.id ?? ""}
          onChange={(event: Event) => {
            const bookId = (event.currentTarget as HTMLSelectElement).value;
            const chosen = books.find((b) => b.id === bookId);
            choose(
              chosen
                ? { bookId, chapter: chosen.firstChapterNumber ?? 1 }
                : null
            );
          }}
        >
          <option value="">{t("book", { defaultValue: "Book" })}</option>
          {books.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.commonName || candidate.name}
            </option>
          ))}
        </select>
        <select
          className="sb-passage-picker-select sb-passage-picker-select--chapter"
          aria-label={t("chapter", { defaultValue: "Chapter" })}
          value={chapter ?? ""}
          disabled={!book}
          onChange={(event: Event) => {
            const number = Number(
              (event.currentTarget as HTMLSelectElement).value
            );
            if (book && Number.isInteger(number)) {
              choose({ bookId: book.id, chapter: number });
            }
          }}
        >
          {chapters.map((number) => (
            <option key={number} value={number}>
              {number}
            </option>
          ))}
        </select>
      </div>
      <p className="sb-passage-picker-hint">
        {t("playlist-passage-picker-hint", {
          defaultValue: "Type a reference, or drag across verses to select.",
        })}
      </p>
      {value ? (
        <div
          className="sb-passage-picker-verses"
          role="listbox"
          aria-multiselectable="true"
          aria-label={verseRefLabel(
            { bookId: value.bookId, chapter: value.chapter },
            resolveBookName
          )}
          onMouseUp={() => setDragAnchor(null)}
          onMouseLeave={() => setDragAnchor(null)}
        >
          {verses.length === 0 ? (
            <p className="sb-passage-picker-empty">
              {loadChapter
                ? t("loading", { defaultValue: "Loading…" })
                : t("playlist-passage-no-text", {
                    defaultValue: "The chapter's text isn't available here.",
                  })}
            </p>
          ) : (
            verses.map((verse) => (
              <button
                key={verse.number}
                type="button"
                role="option"
                aria-selected={isSelected(verse.number)}
                className={`sb-passage-picker-verse${
                  isSelected(verse.number)
                    ? " sb-passage-picker-verse--selected"
                    : ""
                }`}
                onMouseDown={(event: MouseEvent) => {
                  event.preventDefault();
                  setDragAnchor(verse.number);
                  selectVerse(verse.number, event.shiftKey);
                }}
                onMouseEnter={() => {
                  if (dragAnchor !== null && value) {
                    choose({
                      bookId: value.bookId,
                      chapter: value.chapter,
                      verse: Math.min(dragAnchor, verse.number),
                      endVerse: Math.max(dragAnchor, verse.number),
                    });
                  }
                }}
                onKeyDown={(event: KeyboardEvent) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectVerse(verse.number, event.shiftKey);
                  }
                }}
              >
                <span className="sb-passage-picker-verse-number">
                  {verse.number}
                </span>
                <span className="sb-passage-picker-verse-text" dir="auto">
                  {verse.text}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
