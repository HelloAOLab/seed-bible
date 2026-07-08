import "./PlaylistItemInput.css";
import { useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import { DiscoverSection } from "../DiscoverPane/DiscoverSection";
import { ScriptureItemInput } from "../ScriptureItemInput";
import { TextItemInput } from "../TextItemInput";
import { LinkItemInput } from "../LinkItemInput";

interface PlaylistItemInputProps {
  books: TranslationBook[];
  /** Called with the playlist item the user assembled and chose to add. */
  onAdd: (item: PlaylistItemData) => void;
  /**
   * When set, the section edits this existing item instead of adding a new one:
   * the mode is locked to the item's type, its fields are pre-filled, and the
   * submit button saves the change via `onUpdate`.
   */
  editItem?: PlaylistItemData;
  /** Reference text to seed the scripture field when editing a verse item. */
  editScriptureText?: string;
  /** Called with the edited item when the user saves an in-progress edit. */
  onUpdate?: (item: PlaylistItemData) => void;
  /** Called when the user cancels an in-progress edit. */
  onCancelEdit?: () => void;
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

/**
 * Input section for adding an item to the currently-edited playlist, or editing
 * an existing one when `editItem` is set. Owns only the selected mode; each mode
 * is a self-contained component that tracks its own input state (see
 * `ScriptureItemInput`, `TextItemInput`, `LinkItemInput`). Switching modes
 * unmounts the previous one, so its state resets naturally. When editing, the
 * parent should remount this via `key` so the sub-input seeds fresh values.
 */
export function PlaylistItemInput(props: PlaylistItemInputProps) {
  const { books, onAdd, editItem, editScriptureText, onUpdate, onCancelEdit } =
    props;
  const { t } = useI18n();
  const isEditing = !!editItem;
  // When editing, the mode is fixed to the item's type; otherwise the user
  // picks it. `editItem` never changes for a given mount (see the key note).
  const [mode, setMode] = useState<AddMode>(
    editItem ? MODE_BY_TYPE[editItem.type] : "scripture"
  );

  const submit = isEditing && onUpdate ? onUpdate : onAdd;
  const submitLabel = isEditing
    ? t("playlist-save-item", { defaultValue: "Save changes" })
    : undefined;

  return (
    <DiscoverSection
      className="sb-playlist-item-input"
      title={
        isEditing
          ? t("playlist-edit-item", { defaultValue: "Edit item" })
          : t("playlist-add-item", { defaultValue: "Add item" })
      }
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

      {mode === "scripture" ? (
        <ScriptureItemInput
          books={books}
          onAdd={submit}
          initialValue={editScriptureText}
          submitLabel={submitLabel}
        />
      ) : mode === "text" ? (
        <TextItemInput
          onAdd={submit}
          initialItem={editItem?.type === "html" ? editItem : undefined}
          submitLabel={submitLabel}
        />
      ) : (
        <LinkItemInput
          onAdd={submit}
          initialItem={editItem?.type === "link" ? editItem : undefined}
          submitLabel={submitLabel}
        />
      )}

      {isEditing ? (
        <button
          type="button"
          className="sb-reading-plans-back sb-playlist-cancel-edit"
          onClick={() => onCancelEdit?.()}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
      ) : null}
    </DiscoverSection>
  );
}
