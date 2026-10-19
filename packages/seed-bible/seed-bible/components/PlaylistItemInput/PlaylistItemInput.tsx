import "./PlaylistItemInput.css";
import { useImperativeHandle, useRef, useState } from "preact/hooks";
import { forwardRef } from "preact/compat";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { DiscoverSection } from "../DiscoverPane/DiscoverSection";
import {
  ScriptureItemInput,
  type ScriptureItemInputHandle,
} from "../ScriptureItemInput/ScriptureItemInput";
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
import {
  SceneItemInput,
  type SceneItemInputHandle,
} from "../SceneItemInput/SceneItemInput";
import {
  PlaylistItemInlinePreview,
  type ScriptureChapterLoader,
} from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";
import { MaterialIcon } from "../icons";
import type { StepLinkTarget } from "../TipTapEditor/TipTapEditor";

interface PlaylistItemInputProps {
  books: TranslationBook[];
  /** Called with the playlist item the user assembled and chose to add. */
  onAdd: (item: PlaylistItemData) => void;
  /**
   * When set, the section edits this existing item instead of adding a new one:
   * it renders inline (no section chrome or type picker, since the type is the
   * item's), its fields are pre-filled, and the submit button saves the change
   * via `onUpdate`.
   */
  editItem?: PlaylistItemData;
  /** Reference text to seed the scripture field when editing a verse item. */
  editScriptureText?: string;
  /**
   * Loads chapters for the passage shown beneath the reference field while
   * editing a scripture item. Without it the passage says it couldn't load.
   */
  loadChapter?: ScriptureChapterLoader;
  /** Called with the edited item when the user saves an in-progress edit. */
  onUpdate?: (item: PlaylistItemData) => void;
  /** Called when the user cancels an in-progress edit. */
  onCancelEdit?: () => void;
  /** Id for the inline editor's root, so a row can point at it with `aria-controls`. */
  id?: string;
  /** The kind of step the add box starts on. Defaults to scripture. */
  initialMode?: AddMode;
  /** The playlist's steps, so text and notes can link to one. */
  steps?: StepLinkTarget[];
}

/**
 * The kinds of step an author can add. Most map onto one item type; a few are
 * the same type with something set: "note-scripture" is scripture with a note,
 * "video" is a link that embeds.
 */
export type AddMode =
  | "scripture"
  | "note-scripture"
  | "text"
  | "link"
  | "video"
  | "compare"
  | "question"
  | "scene";

interface ModeOption {
  mode: AddMode;
  labelKey: string;
  defaultLabel: string;
  descriptionKey: string;
  defaultDescription: string;
  icon: string;
}

/** The kinds offered by the add box, in the order the design lists them. */
export const ADD_MODES: ModeOption[] = [
  {
    mode: "text",
    labelKey: "playlist-add-mode-text",
    defaultLabel: "Text",
    descriptionKey: "playlist-add-mode-text-description",
    defaultDescription: "Your own writing, no passage",
    icon: "notes",
  },
  {
    mode: "scripture",
    labelKey: "playlist-add-mode-scripture",
    defaultLabel: "Scripture",
    descriptionKey: "playlist-add-mode-scripture-description",
    defaultDescription: "A passage, read in the Bible reader",
    icon: "menu_book",
  },
  {
    mode: "note-scripture",
    labelKey: "playlist-add-mode-note-scripture",
    defaultLabel: "Note + Scripture",
    descriptionKey: "playlist-add-mode-note-scripture-description",
    defaultDescription: "A passage with your note beside it",
    icon: "add_notes",
  },
  {
    mode: "compare",
    labelKey: "playlist-add-mode-compare",
    defaultLabel: "Compare",
    descriptionKey: "playlist-add-mode-compare-description",
    defaultDescription: "Two passages side by side",
    icon: "compare_arrows",
  },
  {
    mode: "video",
    labelKey: "playlist-add-mode-video",
    defaultLabel: "Video",
    descriptionKey: "playlist-add-mode-video-description",
    defaultDescription: "Link a video to watch",
    icon: "play_circle",
  },
  {
    mode: "question",
    labelKey: "playlist-add-mode-question",
    defaultLabel: "Question",
    descriptionKey: "playlist-add-mode-question-description",
    defaultDescription: "Ask readers to respond",
    icon: "quiz",
  },
  {
    mode: "link",
    labelKey: "playlist-add-mode-link",
    defaultLabel: "Link",
    descriptionKey: "playlist-add-mode-link-description",
    defaultDescription: "A web page to open",
    icon: "link",
  },
];

/** The kind of step an existing item is, for editing it in the matching mode. */
export function modeForItem(item: PlaylistItemData): AddMode {
  switch (item.type) {
    case "bible-verse":
      return item.note || item.noteTitle ? "note-scripture" : "scripture";
    case "html":
      return "text";
    case "link":
      return item.embed ? "video" : "link";
    case "question":
    case "compare":
    case "scene":
      return item.type;
  }
}

/** Imperative handle so a parent can check for / commit an in-progress draft. */
export interface PlaylistItemInputHandle {
  /**
   * Whether the currently-mounted mode has unsaved input: an un-added draft
   * when adding, or changes to the item when editing one.
   */
  isDirty: () => boolean;
  /** Submits the currently-mounted mode's input, same as clicking "Add" or
   * "Save changes". Returns whether it actually added or saved an item. */
  commit: () => boolean | Promise<boolean>;
}

type LeafHandle =
  | ScriptureItemInputHandle
  | TextItemInputHandle
  | LinkItemInputHandle
  | QuestionItemInputHandle
  | CompareItemInputHandle
  | SceneItemInputHandle;

/**
 * Input section for adding an item to the currently-edited playlist or plan,
 * or editing an existing one when `editItem` is set. Owns only the selected
 * mode; each mode is a self-contained component that tracks its own input
 * state (see `ScriptureItemInput`, `TextItemInput`, `LinkItemInput`,
 * `QuestionItemInput`, `CompareItemInput`, `SceneItemInput`). Switching modes
 * unmounts the previous one, so its state resets naturally.
 *
 * Adding renders as its own "Add item" section with a picker of step kinds.
 * Editing renders inline, meant to sit inside the item's own row: the fields
 * plus, for scripture, the passage itself, so the editor doubles as the item's
 * preview. When editing, the parent should remount this via `key` so the
 * sub-input seeds fresh values.
 */
export const PlaylistItemInput = forwardRef<
  PlaylistItemInputHandle,
  PlaylistItemInputProps
>(function PlaylistItemInput(props, ref) {
  const {
    books,
    onAdd,
    editItem,
    editScriptureText,
    loadChapter,
    onUpdate,
    onCancelEdit,
    id,
    initialMode,
    steps,
  } = props;
  const { t } = useI18n();
  const isEditing = !!editItem;
  // When editing, the mode is fixed to the item's kind; otherwise the user
  // picks it. `editItem` never changes for a given mount (see the key note).
  const [mode, setMode] = useState<AddMode>(
    editItem ? modeForItem(editItem) : (initialMode ?? "scripture")
  );
  // Only one mode is ever mounted at a time, so a single ref always points at
  // whichever leaf input is currently rendered. A callback ref (rather than
  // passing the ref object directly) sidesteps each leaf's stricter,
  // component-specific `Ref<...Handle>` prop type.
  const leafRef = useRef<LeafHandle | null>(null);
  const assignLeafRef = (instance: LeafHandle | null) => {
    leafRef.current = instance;
  };

  useImperativeHandle(ref, () => ({
    isDirty: () => leafRef.current?.isDirty() ?? false,
    commit: () => leafRef.current?.commit() ?? false,
  }));

  const submit = isEditing && onUpdate ? onUpdate : onAdd;
  const submitLabel = isEditing
    ? t("playlist-save-item", { defaultValue: "Save changes" })
    : undefined;

  const scripture = editItem?.type === "bible-verse" ? editItem : undefined;
  const input =
    mode === "scripture" || mode === "note-scripture" ? (
      <ScriptureItemInput
        ref={assignLeafRef}
        books={books}
        onAdd={submit}
        initialValue={editScriptureText}
        initialNote={scripture?.note}
        initialNoteTitle={scripture?.noteTitle}
        initialExtraRefs={scripture?.refs}
        initialHighlights={scripture?.highlights}
        loadChapter={loadChapter}
        withNote={mode === "note-scripture"}
        submitLabel={submitLabel}
        steps={steps}
      />
    ) : mode === "text" ? (
      <TextItemInput
        ref={assignLeafRef}
        onAdd={submit}
        initialItem={editItem?.type === "html" ? editItem : undefined}
        submitLabel={submitLabel}
        books={books}
        steps={steps}
      />
    ) : mode === "link" || mode === "video" ? (
      <LinkItemInput
        ref={assignLeafRef}
        onAdd={submit}
        initialItem={
          editItem?.type === "link"
            ? editItem
            : mode === "video"
              ? { url: "", embed: true }
              : undefined
        }
        submitLabel={submitLabel}
      />
    ) : mode === "question" ? (
      <QuestionItemInput
        ref={assignLeafRef}
        onAdd={submit}
        initialItem={editItem?.type === "question" ? editItem : undefined}
        submitLabel={submitLabel}
      />
    ) : mode === "compare" ? (
      <CompareItemInput
        ref={assignLeafRef}
        books={books}
        onAdd={submit}
        initialItem={editItem?.type === "compare" ? editItem : undefined}
        submitLabel={submitLabel}
      />
    ) : (
      <SceneItemInput
        ref={assignLeafRef}
        onAdd={submit}
        initialItem={editItem?.type === "scene" ? editItem : undefined}
        submitLabel={submitLabel}
      />
    );

  if (editItem) {
    return (
      <div id={id} className="sb-playlist-item-editor">
        {input}
        {editItem.type === "compare" ? (
          <PlaylistItemInlinePreview
            item={editItem}
            loadChapter={loadChapter}
          />
        ) : null}
        <button
          type="button"
          className="sb-reading-plans-back sb-playlist-cancel-edit"
          onClick={() => onCancelEdit?.()}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
      </div>
    );
  }

  return (
    <DiscoverSection
      className="sb-playlist-item-input"
      title={t("playlist-add-item", { defaultValue: "Add item" })}
    >
      <div
        className="sb-playlist-type-picker"
        role="radiogroup"
        aria-label={t("playlist-add-mode-label", { defaultValue: "Item type" })}
      >
        {ADD_MODES.map((option) => (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={mode === option.mode}
            className={`sb-playlist-type-option${
              mode === option.mode ? " sb-playlist-type-option--selected" : ""
            }`}
            onClick={() => setMode(option.mode)}
          >
            <MaterialIcon className="sb-playlist-type-option-icon">
              {option.icon}
            </MaterialIcon>
            <span className="sb-playlist-type-option-text">
              <span className="sb-playlist-type-option-label">
                {t(option.labelKey, { defaultValue: option.defaultLabel })}
              </span>
              <span className="sb-playlist-type-option-description">
                {t(option.descriptionKey, {
                  defaultValue: option.defaultDescription,
                })}
              </span>
            </span>
          </button>
        ))}
      </div>
      {input}
    </DiscoverSection>
  );
});
