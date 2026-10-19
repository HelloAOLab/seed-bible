import "./ScriptureItemInput.css";
import { useEffect, useImperativeHandle, useRef, useState } from "preact/hooks";
import { forwardRef, lazy, Suspense } from "preact/compat";
import type { Editor } from "@tiptap/core";
import { useI18n } from "../../i18n/I18nManager";
import type {
  PhraseHighlight,
  PlaylistItemData,
  VerseRef,
} from "../../managers/PlaylistManager";
import {
  ScripturePreview,
  type ScriptureChapterLoader,
} from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import {
  computeSuggestions,
  resolveTypedReference,
} from "./scriptureSuggestions";
import { sanitize } from "../../managers/Sanitization";
import { MaterialIcon } from "../icons";
import { verseRefLabel } from "../playlistItemLabel";
import type {
  StepLinkTarget,
  VerseLinkTarget,
} from "../TipTapEditor/TipTapEditor";
import { passageVerses } from "../scripturePassage";

// Loaded only when a note is opened, like the text item's editor; the SSR
// guard keeps TipTap out of the single-file SSR bundle.
const TipTapEditor = lazy(() =>
  import.meta.env.SSR
    ? Promise.reject(new Error("TipTap is not available in the SSR bundle"))
    : import("../TipTapEditor/TipTapEditor")
);

interface ScriptureItemInputProps {
  books: TranslationBook[];
  onAdd: (item: PlaylistItemData) => void;
  /** Reference text the field starts with, e.g. when editing an item. */
  initialValue?: string;
  /** Note HTML the note editor starts with, e.g. when editing an item. */
  initialNote?: string;
  /** Note title the note's title field starts with. */
  initialNoteTitle?: string;
  /** Further passages the step starts with, after the main one. */
  initialExtraRefs?: VerseRef[];
  /** Phrases the step starts with picked out. */
  initialHighlights?: PhraseHighlight[];
  /**
   * Loads chapters for the passage shown beneath the fields, which is where
   * phrases get picked out. Without it no passage shows.
   */
  loadChapter?: ScriptureChapterLoader;
  /**
   * Starts with the note open and empty, for a "Note + Scripture" step the
   * author chose up front. A note that starts filled in is open regardless.
   */
  withNote?: boolean;
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
  /** The playlist's steps, so the note can link to one. */
  steps?: StepLinkTarget[];
  /** A question readers answer after the passage, the step starts with. */
  initialQuestion?: { prompt: string; shareable?: boolean };
  /**
   * "screen" is the fullscreen editor's look: the passage as a card with a
   * Change button, the note's own toolbar with Link to verse, + Question and
   * + Cross-reference, and the question as a card of its own.
   */
  layout?: "pane" | "screen";
  /** The translation the passage will be read in, for the passage card. */
  translationName?: string;
}

/** Imperative handle so a parent can check for / commit an in-progress draft. */
export interface ScriptureItemInputHandle {
  /**
   * Whether the reference, the further passages, or the note (body or title)
   * differ from what the fields started with: an un-added draft when adding,
   * unsaved changes when editing.
   */
  isDirty: () => boolean;
  /** Submits the current input, same as clicking "Add". Returns whether it
   * actually added an item (false if empty or a reference didn't resolve). */
  commit: () => boolean | Promise<boolean>;
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
 * A step can read more than one passage: "Add another passage" adds a plain
 * reference field for each further one, read the way the typeahead reads the
 * main field on Enter. An optional note — a formatted body, a plain-text
 * title, or both — can be attached, making the step a "Note + Scripture"
 * step: the note shows beside the passage while it plays. The body is
 * serialized only on submit.
 */
export const ScriptureItemInput = forwardRef<
  ScriptureItemInputHandle,
  ScriptureItemInputProps
>(function ScriptureItemInput(props, ref) {
  const {
    books,
    onAdd,
    initialValue,
    initialNote,
    initialNoteTitle,
    initialExtraRefs,
    withNote,
    submitLabel,
    steps,
    initialHighlights,
    loadChapter,
    initialQuestion,
    layout = "pane",
    translationName,
  } = props;
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

  const resolveBookName = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };
  const initialExtraTexts = (initialExtraRefs ?? []).map((extra) =>
    verseRefLabel(extra, resolveBookName)
  );
  const [extraTexts, setExtraTexts] = useState<string[]>(initialExtraTexts);
  const [highlights, setHighlights] = useState<PhraseHighlight[]>(
    initialHighlights ?? []
  );
  // Words selected in the passage, offered as the next highlight.
  const [pendingPhrase, setPendingPhrase] = useState<PhraseHighlight | null>(
    null
  );

  const [question, setQuestion] = useState<{
    prompt: string;
    shareable: boolean;
  } | null>(
    initialQuestion
      ? {
          prompt: initialQuestion.prompt,
          shareable: initialQuestion.shareable ?? true,
        }
      : null
  );
  // Whether the passage card has been opened to change the reference. A new
  // step starts open, since it has no passage yet.
  const [changing, setChanging] = useState(!initialValue);
  // The passage's verses, for the note's "Link to verse".
  const [verseTargets, setVerseTargets] = useState<VerseLinkTarget[]>([]);

  const noteEditorRef = useRef<Editor | null>(null);
  const [noteOpen, setNoteOpen] = useState(
    !!withNote || !!initialNote || !!initialNoteTitle
  );
  const [noteTitle, setNoteTitle] = useState(initialNoteTitle ?? "");
  // The note body as the editor serializes it when seeded, so an untouched
  // note compares equal even where the editor normalizes the stored HTML.
  const noteBaselineRef = useRef<string | null>(null);
  // Set while a note is being sanitized before its item is added, so a second
  // submit in that moment (a double-click, Enter twice) doesn't add it again.
  const addingRef = useRef(false);

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

  /** The note body to save: the editor's HTML, or null when there is none. */
  const noteHtml = (): string | null => {
    if (!noteOpen) {
      return null;
    }
    const editor = noteEditorRef.current;
    // An editor still loading can't have been typed into yet, so the note is
    // the one it was going to start with.
    if (!editor) {
      return initialNote ?? null;
    }
    return editor.isEmpty ? null : editor.getHTML();
  };

  /** Whether the note that would be saved differs from the starting one. */
  const noteChanged = (): boolean => {
    const title = noteOpen ? noteTitle.trim() : "";
    if (title !== (initialNoteTitle ?? "").trim()) {
      return true;
    }
    const current = noteHtml();
    const initial = initialNote
      ? (noteBaselineRef.current ?? initialNote)
      : null;
    return current !== initial;
  };

  /** Whether the further passages differ from the ones the step started with. */
  const extrasChanged = (): boolean => {
    const typed = extraTexts.map((text) => text.trim()).filter(Boolean);
    return (
      typed.length !== initialExtraTexts.length ||
      typed.some((text, index) => text !== initialExtraTexts[index])
    );
  };

  /** Whether the picked-out phrases differ from the ones the step started with. */
  const highlightsChanged = (): boolean =>
    JSON.stringify(highlights) !== JSON.stringify(initialHighlights ?? []);

  /** The question as it would be saved: trimmed, and absent when blank. */
  const questionToSave = () =>
    question && question.prompt.trim()
      ? { prompt: question.prompt.trim(), shareable: question.shareable }
      : null;

  /** Whether the question differs from the one the step started with. */
  const questionChanged = (): boolean =>
    JSON.stringify(questionToSave()) !==
    JSON.stringify(
      initialQuestion
        ? {
            prompt: initialQuestion.prompt,
            shareable: initialQuestion.shareable ?? true,
          }
        : null
    );

  /**
   * The selection the reader just made in the passage, when it sits within
   * one verse: offered as a phrase to highlight. Cleared otherwise.
   */
  const capturePhrase = () => {
    const selection = document.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!selection || selection.isCollapsed || !text) {
      setPendingPhrase(null);
      return;
    }
    const verseOf = (node: Node | null) =>
      (node instanceof Element
        ? node
        : node?.parentElement
      )?.closest<HTMLElement>("[data-verse-number]") ?? null;
    const start = verseOf(selection.anchorNode);
    const end = verseOf(selection.focusNode);
    if (!start || start !== end) {
      setPendingPhrase(null);
      return;
    }
    setPendingPhrase({
      bookId: start.dataset.bookId ?? "",
      chapter: Number(start.dataset.chapter),
      verse: Number(start.dataset.verseNumber),
      text,
    });
  };

  const addPendingPhrase = () => {
    if (!pendingPhrase) {
      return;
    }
    setHighlights((current) =>
      current.some(
        (highlight) =>
          highlight.bookId === pendingPhrase.bookId &&
          highlight.chapter === pendingPhrase.chapter &&
          highlight.verse === pendingPhrase.verse &&
          highlight.text === pendingPhrase.text
      )
        ? current
        : [...current, pendingPhrase]
    );
    setPendingPhrase(null);
    document.getSelection()?.removeAllRanges();
  };

  /**
   * The further passages as references, in order. Null when one of the
   * fields holds text that names no passage; blank fields are skipped.
   */
  const resolveExtraRefs = (): VerseRef[] | null => {
    const refs: VerseRef[] = [];
    for (const text of extraTexts) {
      if (!text.trim()) {
        continue;
      }
      const resolved = resolveTypedReference(text, books);
      if (!resolved) {
        return null;
      }
      refs.push(resolved);
    }
    return refs;
  };

  const finishAdd = (
    verseRef: VerseRef,
    extraRefs: VerseRef[],
    note: string | null
  ) => {
    const title = noteOpen ? noteTitle.trim() : "";
    const savedQuestion = questionToSave();
    onAdd({
      type: "bible-verse",
      ref: verseRef,
      ...(extraRefs.length ? { refs: extraRefs } : {}),
      ...(highlights.length ? { highlights } : {}),
      ...(note ? { note } : {}),
      ...(title ? { noteTitle: title } : {}),
      ...(savedQuestion ? { question: savedQuestion } : {}),
    });
    if (layout === "screen" && initialValue) {
      // Editing in place: the step keeps what was just saved on screen.
      setChanging(false);
      return;
    }
    setValue("");
    setExtraTexts([]);
    setHighlights([]);
    setPendingPhrase(null);
    setError(null);
    setHighlight({ book: 0, option: 0 });
    noteEditorRef.current?.commands.clearContent();
    setNoteTitle("");
    setNoteOpen(!!withNote);
    setQuestion(null);
    setChanging(true);
  };

  /**
   * Adds the item, with the note when one was written. Without a note body the
   * item is added synchronously; with one it waits for the body to be
   * sanitized. Returns whether it added the item: not while an earlier add is
   * still waiting, and not when a further passage can't be read.
   */
  const addRef = (verseRef: VerseRef): boolean | Promise<boolean> => {
    if (addingRef.current) {
      return false;
    }
    const extraRefs = resolveExtraRefs();
    if (!extraRefs) {
      setError(
        t("playlist-add-scripture-error", {
          defaultValue: "Couldn't find that reference",
        })
      );
      return false;
    }
    const html = noteHtml();
    if (!html) {
      finishAdd(verseRef, extraRefs, null);
      return true;
    }
    addingRef.current = true;
    return sanitize(html)
      .then((note) => {
        finishAdd(verseRef, extraRefs, note);
        return true;
      })
      .finally(() => {
        addingRef.current = false;
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
        value.trim() !== (initialValue ?? "").trim() ||
        extrasChanged() ||
        highlightsChanged() ||
        noteChanged() ||
        questionChanged(),
      commit: handleSubmit,
    }),
    [
      value,
      highlightedOption,
      initialValue,
      extraTexts,
      highlights,
      noteOpen,
      noteTitle,
      initialNote,
      question,
      initialQuestion,
    ]
  );

  // The passage as it will play: the main reference as typed (read the way
  // Enter would read it) plus the further ones that can be read.
  const mainRef = resolveTypedReference(value, books);
  const previewRefs = mainRef ? [mainRef, ...(resolveExtraRefs() ?? [])] : [];
  const mainRefKey = mainRef ? JSON.stringify(mainRef) : "";

  // The passage's verses, so the note can link to one of them.
  useEffect(() => {
    if (!mainRef || !loadChapter || layout !== "screen") {
      setVerseTargets([]);
      return;
    }
    let cancelled = false;
    loadChapter(undefined, mainRef.bookId, mainRef.chapter).then(
      (chapter) => {
        if (!cancelled) {
          setVerseTargets(passageVerses(chapter, mainRef));
        }
      },
      () => {
        if (!cancelled) setVerseTargets([]);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [mainRefKey, loadChapter, layout]);

  const referenceRow = (
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
              void handleSubmit();
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
  );

  const highlightChips =
    highlights.length > 0 ? (
      <ul
        className="sb-scripture-highlights"
        aria-label={t("playlist-highlights-label", {
          defaultValue: "Highlighted phrases",
        })}
      >
        {highlights.map((highlight, index) => (
          <li key={index} className="sb-scripture-highlight">
            <span className="sb-scripture-highlight-verse">
              {resolveBookName(highlight.bookId)} {highlight.chapter}:
              {highlight.verse}
            </span>
            <span className="sb-scripture-highlight-text" dir="auto">
              “{highlight.text}”
            </span>
            <button
              type="button"
              className="sb-scripture-highlight-remove"
              aria-label={t("playlist-highlight-remove", {
                defaultValue: "Remove highlight",
              })}
              onClick={() =>
                setHighlights((current) =>
                  current.filter((_, i) => i !== index)
                )
              }
            >
              <MaterialIcon>close</MaterialIcon>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  const passageBlock =
    loadChapter && previewRefs.length > 0 ? (
      <div className="sb-scripture-passage">
        <div
          className="sb-item-inline-preview"
          dir="auto"
          onMouseUp={capturePhrase}
          onKeyUp={capturePhrase}
        >
          {previewRefs.map((previewRef, index) => (
            <ScripturePreview
              key={`${index}-${JSON.stringify(previewRef)}`}
              item={{ type: "bible-verse", ref: previewRef }}
              loadChapter={loadChapter}
              highlights={highlights}
            />
          ))}
        </div>
        {pendingPhrase ? (
          <button
            type="button"
            className="sb-scripture-note-toggle sb-scripture-highlight-add"
            onMouseDown={(event: MouseEvent) => event.preventDefault()}
            onClick={addPendingPhrase}
          >
            <MaterialIcon>ink_highlighter</MaterialIcon>
            {t("playlist-highlight-selection", {
              defaultValue: "Highlight “{{text}}”",
              text: pendingPhrase.text,
            })}
          </button>
        ) : (
          <p className="sb-scripture-passage-hint">
            {t("playlist-highlight-hint", {
              defaultValue:
                "Select words in the passage to pick them out while the step plays.",
            })}
          </p>
        )}
        {highlightChips}
      </div>
    ) : null;

  const extrasBlock = (
    <>
      {extraTexts.length > 0 ? (
        <div className="sb-scripture-extra-passages">
          {extraTexts.map((text, index) => (
            <div key={index} className="sb-scripture-extra-passage">
              <input
                className="sb-settings-text-input sb-playlist-input"
                type="text"
                value={text}
                dir="auto"
                placeholder={t("playlist-add-scripture-placeholder", {
                  defaultValue: "e.g. John 3 or John 3:16",
                })}
                aria-label={t("playlist-scripture-passage-label", {
                  defaultValue: "Passage {{number}}",
                  number: index + 2,
                })}
                onInput={(event: Event) => {
                  const next = (event.currentTarget as HTMLInputElement).value;
                  setExtraTexts((current) =>
                    current.map((existing, i) =>
                      i === index ? next : existing
                    )
                  );
                  setError(null);
                }}
              />
              <button
                type="button"
                className="sb-scripture-extra-remove"
                aria-label={t("playlist-scripture-remove-passage", {
                  defaultValue: "Remove passage",
                })}
                onClick={() =>
                  setExtraTexts((current) =>
                    current.filter((_, i) => i !== index)
                  )
                }
              >
                <MaterialIcon>close</MaterialIcon>
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="sb-scripture-extras-actions">
        <button
          type="button"
          className="sb-scripture-note-toggle"
          onClick={() => setExtraTexts((current) => [...current, ""])}
        >
          <MaterialIcon>add</MaterialIcon>
          {t("playlist-scripture-add-passage", {
            defaultValue: "Add another passage",
          })}
        </button>
        {!noteOpen ? (
          <button
            type="button"
            className="sb-scripture-note-toggle sb-scripture-note-add"
            onClick={() => setNoteOpen(true)}
          >
            <MaterialIcon>add_notes</MaterialIcon>
            {t("playlist-scripture-note-add", { defaultValue: "Add a note" })}
          </button>
        ) : null}
      </div>
    </>
  );

  const noteEditor = (
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
        initialContent={initialNote}
        books={books}
        steps={steps}
        variant={layout === "screen" ? "step" : "full"}
        verses={layout === "screen" ? verseTargets : undefined}
        onAddQuestion={
          layout === "screen"
            ? () =>
                setQuestion(
                  (current) => current ?? { prompt: "", shareable: true }
                )
            : undefined
        }
        onEditor={(editor) => {
          noteEditorRef.current = editor;
          if (editor && initialNote && noteBaselineRef.current === null) {
            noteBaselineRef.current = editor.getHTML();
          }
        }}
        onEmptyChange={() => {}}
      />
    </Suspense>
  );

  const questionCard = question ? (
    <div className="sb-step-editor-question">
      <div className="sb-step-editor-question-head">
        <span className="sb-step-editor-question-eyebrow">
          {t("playlist-question-for-readers", {
            defaultValue: "Question for readers",
          })}
        </span>
        <button
          type="button"
          className="sb-step-editor-question-remove"
          aria-label={t("playlist-question-remove", {
            defaultValue: "Remove question",
          })}
          onClick={() => setQuestion(null)}
        >
          <MaterialIcon>close</MaterialIcon>
        </button>
      </div>
      <textarea
        className="sb-step-editor-question-prompt"
        rows={2}
        value={question.prompt}
        dir="auto"
        placeholder={t("playlist-question-prompt-placeholder", {
          defaultValue: "What do you want readers to think about?",
        })}
        aria-label={t("playlist-question-for-readers", {
          defaultValue: "Question for readers",
        })}
        onInput={(event: Event) => {
          const prompt = (event.currentTarget as HTMLTextAreaElement).value;
          setQuestion((current) =>
            current ? { ...current, prompt } : { prompt, shareable: true }
          );
        }}
      />
      <label className="sb-playlist-editor-check">
        <input
          type="checkbox"
          checked={question.shareable}
          onChange={(event: Event) => {
            const shareable = (event.currentTarget as HTMLInputElement).checked;
            setQuestion((current) =>
              current ? { ...current, shareable } : current
            );
          }}
        />
        {t("playlist-question-shareable", {
          defaultValue: "Readers can share answers in group sessions",
        })}
      </label>
    </div>
  ) : null;

  if (layout === "screen") {
    const verseCount = mainRef
      ? mainRef.verse != null && !mainRef.toEndOfChapter
        ? (mainRef.endVerse ?? mainRef.verse) - mainRef.verse + 1
        : verseTargets.length || null
      : null;
    const meta = [
      verseCount
        ? t("playlist-verse-count", {
            defaultValue: "{{count}} verses",
            count: verseCount,
          })
        : null,
      translationName ?? null,
      t("playlist-passage-shown-highlighted", {
        defaultValue: "shown highlighted in the reader",
      }),
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <div className="sb-step-editor">
        {noteOpen ? (
          <input
            className="sb-step-editor-title"
            type="text"
            value={noteTitle}
            dir="auto"
            placeholder={t("playlist-step-title-placeholder", {
              defaultValue: "Step title",
            })}
            aria-label={t("playlist-scripture-note-title-label", {
              defaultValue: "Note title",
            })}
            onInput={(event: Event) => {
              setNoteTitle((event.currentTarget as HTMLInputElement).value);
            }}
          />
        ) : null}
        <div className="sb-step-editor-passage">
          <MaterialIcon className="sb-step-editor-passage-icon">
            menu_book
          </MaterialIcon>
          <div className="sb-step-editor-passage-text">
            <span className="sb-step-editor-passage-ref" dir="auto">
              {mainRef
                ? [mainRef, ...(resolveExtraRefs() ?? [])]
                    .map((ref) => verseRefLabel(ref, resolveBookName))
                    .join(" · ")
                : t("playlist-passage-none", {
                    defaultValue: "No passage yet",
                  })}
            </span>
            <span className="sb-step-editor-passage-meta">
              {mainRef
                ? meta
                : t("playlist-passage-pick-hint", {
                    defaultValue: "Type a reference below",
                  })}
            </span>
          </div>
          <button
            type="button"
            className="sb-step-editor-change"
            aria-expanded={changing}
            onClick={() => setChanging((open) => !open)}
          >
            {changing
              ? t("done", { defaultValue: "Done" })
              : t("playlist-passage-change", { defaultValue: "Change" })}
          </button>
        </div>
        {changing ? (
          <div className="sb-step-editor-passage-picker">
            {referenceRow}
            {error ? (
              <div className="sb-playlist-add-error">{error}</div>
            ) : null}
            {passageBlock}
            {extrasBlock}
          </div>
        ) : (
          <>
            {error ? (
              <div className="sb-playlist-add-error">{error}</div>
            ) : null}
            {highlightChips}
            {!noteOpen ? (
              <div className="sb-scripture-extras-actions">
                <button
                  type="button"
                  className="sb-scripture-note-toggle sb-scripture-note-add"
                  onClick={() => setNoteOpen(true)}
                >
                  <MaterialIcon>add_notes</MaterialIcon>
                  {t("playlist-scripture-note-add", {
                    defaultValue: "Add a note",
                  })}
                </button>
              </div>
            ) : null}
          </>
        )}
        {noteOpen ? (
          <div className="sb-step-editor-note">
            {noteEditor}
            <button
              type="button"
              className="sb-scripture-note-toggle sb-step-editor-note-remove"
              onClick={() => {
                setNoteOpen(false);
                setNoteTitle("");
                noteEditorRef.current = null;
              }}
            >
              {t("playlist-scripture-note-remove", {
                defaultValue: "Remove note",
              })}
            </button>
          </div>
        ) : null}
        {questionCard}
      </div>
    );
  }

  return (
    <>
      {referenceRow}
      {error ? <div className="sb-playlist-add-error">{error}</div> : null}
      {passageBlock}
      {extrasBlock}
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
                setNoteTitle("");
                noteEditorRef.current = null;
              }}
            >
              {t("playlist-scripture-note-remove", {
                defaultValue: "Remove note",
              })}
            </button>
          </div>
          <input
            className="sb-settings-text-input sb-playlist-input sb-scripture-note-title-input"
            type="text"
            value={noteTitle}
            dir="auto"
            placeholder={t("playlist-scripture-note-title-placeholder", {
              defaultValue: "Note title (optional)",
            })}
            aria-label={t("playlist-scripture-note-title-label", {
              defaultValue: "Note title",
            })}
            onInput={(event: Event) => {
              setNoteTitle((event.currentTarget as HTMLInputElement).value);
            }}
          />
          {noteEditor}
        </div>
      ) : null}
      {questionCard}
    </>
  );
});
