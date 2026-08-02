import type { PlaylistItemData } from "../managers/PlaylistManager";
interface LinkItemInputProps {
  onAdd: (item: PlaylistItemData) => void;
  /** URL, title, and embed flag the fields start with, e.g. when editing an item. */
  initialItem?: {
    url: string;
    title?: string;
    embed?: boolean;
  };
  /** Overrides the submit button label (defaults to "Add item"). */
  submitLabel?: string;
}
/** Imperative handle so a parent can check for / commit an in-progress draft. */
export interface LinkItemInputHandle {
  /** Whether the user has typed a URL or title that hasn't been added yet. */
  isDirty: () => boolean;
  /** Submits the current input, same as clicking "Add". Returns whether it
   * actually added an item (false if empty or the URL didn't validate). */
  commit: () => boolean;
}
/**
 * Adds a URL (link item) to the playlist. Tracks the in-progress URL text and
 * any validation error.
 */
export declare const LinkItemInput: import("preact").FunctionalComponent<
  import("preact/compat").PropsWithoutRef<LinkItemInputProps> & {
    ref?: import("preact").Ref<LinkItemInputHandle> | undefined;
  }
>;
export {};
