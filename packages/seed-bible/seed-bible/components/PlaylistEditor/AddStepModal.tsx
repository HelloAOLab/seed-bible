import "./AddStepModal.css";
import { useRef, useState } from "preact/hooks";
import { lazy, Suspense } from "preact/compat";
import type { Editor } from "@tiptap/core";
import { useI18n } from "../../i18n/I18nManager";
import type { ModalManager } from "../../managers/ModalManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import type {
  PlaylistItemData,
  VerseRef,
} from "../../managers/PlaylistManager";
import { sanitize } from "../../managers/Sanitization";
import { MaterialIcon } from "../icons";
import {
  ADD_MODES,
  type AddMode,
} from "../PlaylistItemInput/PlaylistItemInput";
import {
  TextItemInput,
  type TextItemInputHandle,
} from "../TextItemInput/TextItemInput";
import { LinkItemInput, type LinkItemInputHandle } from "../LinkItemInput";
import {
  QuestionItemInput,
  type QuestionItemInputHandle,
} from "../QuestionItemInput/QuestionItemInput";
import {
  CompareItemInput,
  type CompareItemInputHandle,
} from "../CompareItemInput/CompareItemInput";
import { PassagePicker } from "../PassagePicker/PassagePicker";
import type { ScriptureChapterLoader } from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import type { StepLinkTarget } from "../TipTapEditor/TipTapEditor";
import { verseRefLabel } from "../playlistItemLabel";
import { minutesLabel, playlistItemMinutes } from "../playlistItemSubtitle";

const TipTapEditor = lazy(() =>
  import.meta.env.SSR
    ? Promise.reject(new Error("TipTap is not available in the SSR bundle"))
    : import("../TipTapEditor/TipTapEditor")
);

export const ADD_STEP_MODAL_ID = "playlist-add-step";

/** The kinds the modal offers, in the design's order. */
const MODAL_MODES: AddMode[] = [
  "text",
  "scripture",
  "note-scripture",
  "compare",
  "video",
  "question",
];

export interface AddStepModalOptions {
  books: TranslationBook[];
  loadChapter?: ScriptureChapterLoader;
  steps?: StepLinkTarget[];
  /** The kind the modal opens on. */
  initialMode?: AddMode;
  /** "After step 4 · Scene 2 · Abraham", under the title. */
  position?: string;
  /** The modal's title when it replaces a step's kind rather than adding one. */
  title?: string;
  onAdd: (item: PlaylistItemData) => void;
}

/**
 * "Add a step": the kinds of step down the left, the chosen kind's fields on
 * the right (a passage picker for scripture, with a title and note for
 * Note + Scripture), and at the foot what the step will be and Add step.
 */
export function openAddStepModal(
  modals: ModalManager,
  t: ReturnType<typeof useI18n>["t"],
  options: AddStepModalOptions
) {
  modals.openModal({
    id: ADD_STEP_MODAL_ID,
    title:
      options.title ??
      t("playlist-add-step-title", { defaultValue: "Add a step" }),
    content: () => (
      <AddStepModalContent
        {...options}
        onAdd={(item) => {
          options.onAdd(item);
          modals.closeModal(ADD_STEP_MODAL_ID);
        }}
        onCancel={() => modals.closeModal(ADD_STEP_MODAL_ID)}
      />
    ),
  });
}

export function AddStepModalContent(
  props: AddStepModalOptions & { onCancel: () => void }
) {
  const { books, loadChapter, steps, initialMode, position, onAdd, onCancel } =
    props;
  const { t } = useI18n();
  const [mode, setMode] = useState<AddMode>(initialMode ?? "scripture");
  const [ref, setRef] = useState<VerseRef | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const noteEditorRef = useRef<Editor | null>(null);
  const leafRef = useRef<
    | TextItemInputHandle
    | LinkItemInputHandle
    | QuestionItemInputHandle
    | CompareItemInputHandle
    | null
  >(null);
  const resolveBookName = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    return book?.name ?? book?.commonName ?? bookId;
  };

  const scripture = mode === "scripture" || mode === "note-scripture";
  const draft: PlaylistItemData | null =
    scripture && ref
      ? {
          type: "bible-verse",
          ref,
          ...(mode === "note-scripture" && noteTitle.trim()
            ? { noteTitle: noteTitle.trim() }
            : {}),
        }
      : null;
  const verseCount =
    ref && ref.verse != null && !ref.toEndOfChapter
      ? (ref.endVerse ?? ref.verse) - ref.verse + 1
      : null;

  const add = async () => {
    if (scripture) {
      if (!ref) {
        setError(
          t("playlist-add-scripture-error", {
            defaultValue: "Couldn't find that reference",
          })
        );
        return;
      }
      const editor = noteEditorRef.current;
      const html =
        mode === "note-scripture" && editor && !editor.isEmpty
          ? await sanitize(editor.getHTML())
          : null;
      const title = mode === "note-scripture" ? noteTitle.trim() : "";
      onAdd({
        type: "bible-verse",
        ref,
        ...(html ? { note: html } : {}),
        ...(title ? { noteTitle: title } : {}),
      });
      return;
    }
    await leafRef.current?.commit();
  };

  const kindLabel = (candidate: AddMode) => {
    const option = ADD_MODES.find((o) => o.mode === candidate)!;
    return t(option.labelKey, { defaultValue: option.defaultLabel });
  };

  return (
    <div className="sb-add-step">
      {position ? <p className="sb-add-step-position">{position}</p> : null}
      <div className="sb-add-step-columns">
        <div className="sb-add-step-types" role="radiogroup">
          <p className="sb-add-step-column-head">
            {t("playlist-add-step-type", { defaultValue: "1 · Step type" })}
          </p>
          {MODAL_MODES.map((candidate) => {
            const option = ADD_MODES.find((o) => o.mode === candidate)!;
            return (
              <button
                key={candidate}
                type="button"
                role="radio"
                aria-checked={mode === candidate}
                className={`sb-add-step-type${
                  mode === candidate ? " sb-add-step-type--on" : ""
                }`}
                onClick={() => {
                  setMode(candidate);
                  setError(null);
                }}
              >
                <span className="sb-add-step-type-label">
                  {t(option.labelKey, { defaultValue: option.defaultLabel })}
                </span>
                <span className="sb-add-step-type-description">
                  {t(option.descriptionKey, {
                    defaultValue: option.defaultDescription,
                  })}
                </span>
              </button>
            );
          })}
        </div>
        <div className="sb-add-step-fields">
          <p className="sb-add-step-column-head">
            {scripture
              ? t("playlist-add-step-passage", { defaultValue: "2 · Passage" })
              : t("playlist-add-step-details", { defaultValue: "2 · Details" })}
          </p>
          {scripture ? (
            <>
              {mode === "note-scripture" ? (
                <input
                  className="sb-settings-text-input sb-playlist-input sb-add-step-title"
                  type="text"
                  value={noteTitle}
                  dir="auto"
                  placeholder={t("playlist-step-title-placeholder", {
                    defaultValue: "Step title",
                  })}
                  aria-label={t("playlist-scripture-note-title-label", {
                    defaultValue: "Note title",
                  })}
                  onInput={(event: Event) =>
                    setNoteTitle(
                      (event.currentTarget as HTMLInputElement).value
                    )
                  }
                />
              ) : null}
              <PassagePicker
                books={books}
                loadChapter={loadChapter}
                value={ref}
                onChange={(next) => {
                  setRef(next);
                  setError(null);
                }}
              />
              {mode === "note-scripture" ? (
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
                    books={books}
                    steps={steps}
                    variant="step"
                    onEditor={(editor) => {
                      noteEditorRef.current = editor;
                    }}
                    onEmptyChange={() => {}}
                  />
                </Suspense>
              ) : null}
            </>
          ) : mode === "text" ? (
            <TextItemInput
              ref={(instance: TextItemInputHandle | null) => {
                leafRef.current = instance;
              }}
              onAdd={onAdd}
              books={books}
              steps={steps}
            />
          ) : mode === "video" || mode === "link" ? (
            <LinkItemInput
              ref={(instance: LinkItemInputHandle | null) => {
                leafRef.current = instance;
              }}
              onAdd={onAdd}
              initialItem={
                mode === "video" ? { url: "", embed: true } : undefined
              }
            />
          ) : mode === "question" ? (
            <QuestionItemInput
              ref={(instance: QuestionItemInputHandle | null) => {
                leafRef.current = instance;
              }}
              onAdd={onAdd}
            />
          ) : (
            <CompareItemInput
              ref={(instance: CompareItemInputHandle | null) => {
                leafRef.current = instance;
              }}
              books={books}
              onAdd={onAdd}
            />
          )}
          {error ? (
            <p className="sb-playlist-add-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <div className="sb-add-step-foot">
        <p className="sb-add-step-summary" dir="auto">
          <span className="sb-add-step-summary-kind">{kindLabel(mode)}</span>
          {draft ? (
            <span className="sb-add-step-summary-text">
              {[
                verseRefLabel(draft.ref, resolveBookName),
                verseCount
                  ? t("playlist-verse-count", {
                      defaultValue: "{{count}} verses",
                      count: verseCount,
                    })
                  : null,
                `~${minutesLabel(playlistItemMinutes(draft), t)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : scripture ? (
            <span className="sb-add-step-summary-text">
              {t("playlist-passage-none", { defaultValue: "No passage yet" })}
            </span>
          ) : null}
        </p>
        <div className="sb-add-step-actions">
          <button
            type="button"
            className="sb-reading-plans-back"
            onClick={onCancel}
          >
            {t("cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            type="button"
            className="sb-settings-save-button"
            onClick={() => void add()}
          >
            {t("playlist-add-step", { defaultValue: "Add step" })}
            <MaterialIcon>add</MaterialIcon>
          </button>
        </div>
      </div>
    </div>
  );
}
