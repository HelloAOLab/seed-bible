import "./PlaylistItemInput.css";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
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
/** Imperative handle so a parent can check for / commit an in-progress draft. */
export interface PlaylistItemInputHandle {
  /** Whether the currently-mounted mode has an in-progress, un-added draft. */
  isDirty: () => boolean;
  /** Submits the currently-mounted mode's input, same as clicking "Add".
   * Returns whether it actually added an item. */
  commit: () => boolean | Promise<boolean>;
}
/**
 * Input section for adding an item to the currently-edited playlist, or editing
 * an existing one when `editItem` is set. Owns only the selected mode; each mode
 * is a self-contained component that tracks its own input state (see
 * `ScriptureItemInput`, `TextItemInput`, `LinkItemInput`). Switching modes
 * unmounts the previous one, so its state resets naturally. When editing, the
 * parent should remount this via `key` so the sub-input seeds fresh values.
 */
export declare const PlaylistItemInput: import("preact").FunctionalComponent<
  import("preact/compat").PropsWithoutRef<PlaylistItemInputProps> & {
    ref?: import("preact").Ref<PlaylistItemInputHandle> | undefined;
  }
>;
export {};
