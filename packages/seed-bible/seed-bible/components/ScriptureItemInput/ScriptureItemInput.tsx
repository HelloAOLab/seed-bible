import "./ScriptureItemInput.css";
import { useEffect, useImperativeHandle, useRef, useState } from "preact/hooks";
import { forwardRef, lazy, Suspense } from "preact/compat";
import type { Editor } from "@tiptap/core";
import { useI18n } from "../../i18n/I18nManager";
import type {
  PlaylistItemData,
  VerseRef,
} from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { computeSuggestions } from "./scriptureSuggestions";
import { sanitize } from "../../managers/Sanitization";
import { MaterialIcon } from "../icons";

const TipTapEditor = lazy(() => import("../TipTapEditor/TipTapEditor"));

interface ScriptureItemInputProps {
  books: TranslationBook[];
  onAdd: (item: PlaylistItemData) => void;
  /** Reference text the field starts with, e.g. when editing an item. */
  initialValue?: string;
  /** Note HTML the note editor starts with, e.g. when editing an item. */
  initialNote?: string;
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
}

/** Imperative handle so a parent can check for / commit an in-progress draft. */
export interface ScriptureItemInputHandle {
  /**
   * Whether the reference or note differs from what the fields started with:
   * an un-added draft when adding, unsaved changes when editing.
   */
  isDirty: () => boolean;
  /** Submits the current input, same as clicking "Add". Returns whether it
   * actually added an item (false if empty or the reference didn't resolve). */
  commit: () => Promise<boolean>;
}

/** Position of the highlighted option within the suggestions list. */
interface Highlight {
  book: number;
  option: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Adds a scripture reference (bible-verse item) to the playlist. As the user
 * types, a dropdown offers matching books (by name or id prefix) with their
 * chapters/verses as buttons. Up/Down arrows move between books, Left/Right
 * move between chapters within a book, clicking adds an option, and Enter adds
 * the highlighted one.
 *
 * An optional formatted note can be attached; it plays beside the passage. The
 * note is serialized only on submit, like `TextItemInput`'s text.
 */
export const ScriptureItemInput = forwardRef<
  ScriptureItemInputHandle,
  ScriptureItemInputProps
>(function ScriptureItemInput(props, ref) {
  const { books, onAdd, initialValue, initialNote, submitLabel } = props;
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [highlight, setHighlight] = useState<Highlight>({ book: 0, option: 0 });
  // The input uses dir="auto", so its writing direction follows the typed text.
  // We track the resolved direction to keep the chapter strip and the arrow-key
  // handoff consistent with how the caret actually moves.
  const [inputDir, setInputDir] = useState<"ltr" | "rtl">("ltr");
  const listRef = useRef<HTMLUListElement | null>(null);
  const noteEditorRef = useRef<Editor | null>(null);
  const [noteOpen, setNoteOpen] = useState(!!initialNote);
  const [noteEmpty, setNoteEmpty] = useState(!initialNote);
  // What the note editor seeds from when it mounts. Dropped once the note is
  // removed, so adding a note again starts blank rather than restoring it.
  const [noteSeed, setNoteSeed] = useState(initialNote);
  // The seeded note as the editor serializes it, so an untouched note compares
  // equal even where the editor normalizes the stored HTML.
  const noteBaselineRef = useRef<string | null>(null);

  /** Whether the note that would be saved differs from the starting one. */
  const noteChanged = (): boolean => {
    const editor = noteEditorRef.current;
    // Open but still loading: nothing can have been typed into it yet.
    if (noteOpen && !editor) {
      return false;
    }
    const current =
      noteOpen && editor && !editor.isEmpty ? editor.getHTML() : null;
    const initial = initialNote
      ? (noteBaselineRef.current ?? initialNote)
      : null;
    return current !== initial;
  };

  const syncInputDir = (input: HTMLInputElement) => {
    setInputDir(getComputedStyle(input).direction === "rtl" ? "rtl" : "ltr");
  };

  const suggestions = computeSuggestions(value, books);
  const showSuggestions = isFocused && suggestions.length > 0;

  // Clamp the stored highlight to the current suggestions so it always points
  // at a real option even right after the list changes.
  const highlightBook = clamp(
    highlight.book,
    0,
    Math.max(0, suggestions.length - 1)
  );
  const highlightOption = clamp(
    highlight.option,
    0,
    Math.max(0, (suggestions[highlightBook]?.options.length ?? 1) - 1)
  );
  const highlightedOption =
    suggestions[highlightBook]?.options[highlightOption] ?? null;

  // Keep the highlighted option scrolled into view (vertically across books,
  // horizontally across a book's chapter strip).
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(".sb-scripture-chapter-button--highlighted")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [highlightBook, highlightOption]);

  const moveBook = (delta: number) => {
    setHighlight((h) => ({
      book: clamp(h.book + delta, 0, suggestions.length - 1),
      // Land on the first chapter/verse of the newly selected book.
      option: 0,
    }));
  };

  const moveOption = (delta: number) => {
    setHighlight((h) => {
      const book = clamp(h.book, 0, suggestions.length - 1);
      const optionCount = suggestions[book]?.options.length ?? 1;
      return { book, option: clamp(h.option + delta, 0, optionCount - 1) };
    });
  };

  const finishAdd = (verseRef: VerseRef, note: string | null) => {
    onAdd({ type: "bible-verse", ref: verseRef, ...(note ? { note } : {}) });
    setValue("");
    setError(null);
    setHighlight({ book: 0, option: 0 });
    noteEditorRef.current?.commands.clearContent();
    setNoteOpen(false);
    setNoteEmpty(true);
    setNoteSeed(undefined);
  };

  /**
   * Adds the item, with the note when one was written. Without a note the item
   * is added synchronously; with one it waits for the note to be sanitized.
   */
  const addRef = (verseRef: VerseRef): true | Promise<true> => {
    const editor = noteEditorRef.current;
    if (!noteOpen || !editor || editor.isEmpty) {
      finishAdd(verseRef, null);
      return true;
    }
    return sanitize(editor.getHTML()).then((note) => {
      finishAdd(verseRef, note);
      return true as const;
    });
  };

  /** Submits the current input. Returns whether it actually added an item. */
  const handleSubmit = (): boolean | Promise<boolean> => {
    if (!value.trim()) {
      return false;
    }
    if (!highlightedOption) {
      setError(
        t("playlist-add-scripture-error", {
          defaultValue: "Couldn't find that reference",
        })
      );
      return false;
    }
    return addRef(highlightedOption.ref);
  };

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () =>
        value.trim() !== (initialValue ?? "").trim() || noteChanged(),
      commit: async () => handleSubmit(),
    }),
    [value, highlightedOption, noteOpen, noteEmpty]
  );

  return (
    <>
      <div className="sb-scripture-input">
        <div className="sb-playlist-add-row">
          <input
            className="sb-settings-text-input sb-playlist-input"
            type="text"
            value={value}
            dir="auto"
            placeholder={t("playlist-add-scripture-placeholder", {
              defaultValue: "e.g. John 3 or John 3:16",
            })}
            onInput={(event: Event) => {
              const input = event.currentTarget as HTMLInputElement;
              setValue(input.value);
              setError(null);
              setHighlight({ book: 0, option: 0 });
              syncInputDir(input);
            }}
            onFocus={(event: FocusEvent) => {
              setIsFocused(true);
              syncInputDir(event.currentTarget as HTMLInputElement);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmit();
                return;
              }
              if (event.key === "Escape") {
                setIsFocused(false);
                return;
              }
              if (!showSuggestions) {
                return;
              }
              // While the dropdown is open, arrows drive the highlight. Up/Down
              // always change book. The horizontal arrows hand off between the
              // text cursor and the chapter selection: the text sits "before"
              // the chapters, so the forward arrow advances the cursor until it
              // reaches the end of the text and only then steps through
              // chapters, while the backward arrow steps back through chapters
              // and only returns to the cursor once it's on the first one.
              //
              // Which physical key is "forward" depends on the resolved writing
              // direction — the caret moves visually, so in RTL text the roles
              // of ArrowLeft/ArrowRight swap.
              const input = event.currentTarget as HTMLInputElement;
              const rtl = getComputedStyle(input).direction === "rtl";
              const forwardKey = rtl ? "ArrowLeft" : "ArrowRight";
              const backwardKey = rtl ? "ArrowRight" : "ArrowLeft";

              if (event.key === "ArrowDown") {
                event.preventDefault();
                moveBook(1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                moveBook(-1);
              } else if (event.key === forwardKey) {
                const cursorAtEnd =
                  input.selectionStart === input.value.length &&
                  input.selectionEnd === input.value.length;
                if (cursorAtEnd) {
                  event.preventDefault();
                  moveOption(1);
                }
              } else if (event.key === backwardKey) {
                if (highlightOption > 0) {
                  event.preventDefault();
                  moveOption(-1);
                }
              }
            }}
          />
          <button
            type="button"
            className="sb-settings-save-button"
            onClick={() => void handleSubmit()}
            disabled={!value.trim()}
          >
            {submitLabel ??
              t("playlist-add-button", { defaultValue: "Add item" })}
          </button>
        </div>

        {showSuggestions ? (
          <ul className="sb-scripture-suggestions" role="listbox" ref={listRef}>
            {suggestions.map((suggestion, bookIndex) => (
              <li key={suggestion.book.id} className="sb-scripture-suggestion">
                <span className="sb-scripture-suggestion-book" dir="auto">
                  {suggestion.book.commonName || suggestion.book.name}
                </span>
                <div className="sb-scripture-chapter-list" dir={inputDir}>
                  {suggestion.options.map((option, optionIndex) => {
                    const isHighlighted =
                      bookIndex === highlightBook &&
                      optionIndex === highlightOption;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        role="option"
                        aria-selected={isHighlighted}
                        className={`sb-scripture-chapter-button${
                          isHighlighted
                            ? " sb-scripture-chapter-button--highlighted"
                            : ""
                        }`}
                        onMouseEnter={() =>
                          setHighlight({ book: bookIndex, option: optionIndex })
                        }
                        // mousedown (not click) so the option is added before the
                        // input's blur can hide the list out from under the tap.
                        onMouseDown={(event: MouseEvent) => {
                          event.preventDefault();
                          void addRef(option.ref);
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {error ? <div className="sb-playlist-add-error">{error}</div> : null}
      {noteOpen ? (
        <div className="sb-scripture-note-field">
          <div className="sb-scripture-note-header">
            <span className="sb-scripture-note-label">
              {t("playlist-scripture-note-label", { defaultValue: "Note" })}
            </span>
            <button
              type="button"
              className="sb-scripture-note-toggle"
              onClick={() => {
                setNoteOpen(false);
                setNoteEmpty(true);
                setNoteSeed(undefined);
              }}
            >
              {t("playlist-scripture-note-remove", {
                defaultValue: "Remove note",
              })}
            </button>
          </div>
          <Suspense
            fallback={
              <div
                className="sb-settings-text-input sb-playlist-input sb-playlist-add-editor sb-playlist-add-editor--loading"
                aria-busy="true"
              />
            }
          >
            <TipTapEditor
              className="sb-settings-text-input sb-playlist-input sb-playlist-add-editor"
              initialContent={noteSeed}
              autofocus={noteSeed ? false : "end"}
              onEditor={(editor) => {
                noteEditorRef.current = editor;
                if (editor && noteSeed && noteBaselineRef.current === null) {
                  noteBaselineRef.current = editor.getHTML();
                }
              }}
              onEmptyChange={setNoteEmpty}
            />
          </Suspense>
        </div>
      ) : (
        <button
          type="button"
          className="sb-scripture-note-toggle sb-scripture-note-add"
          onClick={() => setNoteOpen(true)}
        >
          <MaterialIcon>add_notes</MaterialIcon>
          {t("playlist-scripture-note-add", { defaultValue: "Add a note" })}
        </button>
      )}
    </>
  );
});
