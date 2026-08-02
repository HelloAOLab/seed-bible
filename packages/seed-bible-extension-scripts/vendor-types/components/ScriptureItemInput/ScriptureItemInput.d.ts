import "./ScriptureItemInput.css";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
interface ScriptureItemInputProps {
  books: TranslationBook[];
  onAdd: (item: PlaylistItemData) => void;
  /** Reference text the field starts with, e.g. when editing an item. */
  initialValue?: string;
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
}
/** Imperative handle so a parent can check for / commit an in-progress draft. */
export interface ScriptureItemInputHandle {
  /** Whether the user has typed a reference that hasn't been added yet. */
  isDirty: () => boolean;
  /** Submits the current input, same as clicking "Add". Returns whether it
   * actually added an item (false if empty or the reference didn't resolve). */
  commit: () => boolean;
}
/**
 * Adds a scripture reference (bible-verse item) to the playlist. As the user
 * types, a dropdown offers matching books (by name or id prefix) with their
 * chapters/verses as buttons. Up/Down arrows move between books, Left/Right
 * move between chapters within a book, clicking adds an option, and Enter adds
 * the highlighted one.
 */
export declare const ScriptureItemInput: import("preact").FunctionalComponent<
  import("preact/compat").PropsWithoutRef<ScriptureItemInputProps> & {
    ref?: import("preact").Ref<ScriptureItemInputHandle> | undefined;
  }
>;
export {};
