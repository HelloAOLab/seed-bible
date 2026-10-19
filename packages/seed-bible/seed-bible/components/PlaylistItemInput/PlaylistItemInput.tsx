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
  PlaylistItemInlinePreview,
  type ScriptureChapterLoader,
} from "../PlaylistItemInlinePreview/PlaylistItemInlinePreview";

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
}

type AddMode = "scripture" | "text" | "link";

const MODES: { mode: AddMode; labelKey: string; defaultLabel: string }[] = [
  {
    mode: "scripture",
    labelKey: "playlist-add-mode-scripture",
    defaultLabel: "Scripture",
  },
  { mode: "text", labelKey: "playlist-add-mode-text", defaultLabel: "Text" },
  { mode: "link", labelKey: "playlist-add-mode-link", defaultLabel: "Link" },
];

const MODE_BY_TYPE: Record<PlaylistItemData["type"], AddMode> = {
  "bible-verse": "scripture",
  html: "text",
  link: "link",
};

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
  | LinkItemInputHandle;

/**
 * Input section for adding an item to the currently-edited playlist or plan,
 * or editing an existing one when `editItem` is set. Owns only the selected
 * mode; each mode is a self-contained component that tracks its own input
 * state (see `ScriptureItemInput`, `TextItemInput`, `LinkItemInput`).
 * Switching modes unmounts the previous one, so its state resets naturally.
 *
 * Adding renders as its own "Add item" section with a type picker. Editing
 * renders inline, meant to sit inside the item's own row: the fields plus, for
 * scripture, the passage itself, so the editor doubles as the item's preview.
 * When editing, the parent should remount this via `key` so the sub-input
 * seeds fresh values.
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
  } = props;
  const { t } = useI18n();
  const isEditing = !!editItem;
  // When editing, the mode is fixed to the item's type; otherwise the user
  // picks it. `editItem` never changes for a given mount (see the key note).
  const [mode, setMode] = useState<AddMode>(
    editItem ? MODE_BY_TYPE[editItem.type] : "scripture"
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

  const input =
    mode === "scripture" ? (
      <ScriptureItemInput
        ref={assignLeafRef}
        books={books}
        onAdd={submit}
        initialValue={editScriptureText}
        submitLabel={submitLabel}
      />
    ) : mode === "text" ? (
      <TextItemInput
        ref={assignLeafRef}
        onAdd={submit}
        initialItem={editItem?.type === "html" ? editItem : undefined}
        submitLabel={submitLabel}
      />
    ) : (
      <LinkItemInput
        ref={assignLeafRef}
        onAdd={submit}
        initialItem={editItem?.type === "link" ? editItem : undefined}
        submitLabel={submitLabel}
      />
    );

  if (editItem) {
    return (
      <div id={id} className="sb-playlist-item-editor">
        {input}
        {editItem.type === "bible-verse" ? (
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
      <select
        className="sb-playlist-add-mode-select"
        value={mode}
        aria-label={t("playlist-add-mode-label", { defaultValue: "Item type" })}
        onChange={(event: Event) => {
          const target = event.currentTarget as HTMLSelectElement;
          setMode(target.value as AddMode);
        }}
      >
        {MODES.map((option) => (
          <option key={option.mode} value={option.mode}>
            {t(option.labelKey, { defaultValue: option.defaultLabel })}
          </option>
        ))}
      </select>
      {input}
    </DiscoverSection>
  );
});
