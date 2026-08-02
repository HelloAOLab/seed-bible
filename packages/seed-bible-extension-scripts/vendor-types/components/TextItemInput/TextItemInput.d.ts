import "./TextItemInput.css";
import type { PlaylistItemData } from "../../managers/PlaylistManager";
interface TextItemInputProps {
  onAdd: (item: PlaylistItemData) => void;
  /** HTML and title the fields start with, e.g. when editing an item. */
  initialItem?: {
    html: string;
    title?: string;
  };
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
}
/** Imperative handle so a parent can check for / commit an in-progress draft. */
export interface TextItemInputHandle {
  /** Whether the user has typed text/a title that hasn't been added yet. */
  isDirty: () => boolean;
  /** Submits the current input, same as clicking "Add". Returns whether it
   * actually added an item (false if the editor is empty). */
  commit: () => Promise<boolean>;
}
/**
 * Adds free rich text (html item) to the playlist. Owns the TipTap editor
 * instance and its empty state; the HTML is serialized only on submit.
 */
export declare const TextItemInput: import("preact").FunctionalComponent<
  import("preact/compat").PropsWithoutRef<TextItemInputProps> & {
    ref?: import("preact").Ref<TextItemInputHandle> | undefined;
  }
>;
export {};
