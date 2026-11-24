import { z } from "zod";
import { createEditorDraftStore } from "./EditorDrafts";
import { PlaylistSchema } from "./PlaylistManager";

/** Unsaved playlist edits, kept in this browser (see `EditorDrafts`). */
const store = createEditorDraftStore(
  "sb-playlist-draft:v1:",
  // Built on first use: PlaylistManager imports this module, so its schema
  // isn't defined yet while this one first loads.
  () =>
    z.object({
      /** The playlist as edited. */
      draft: PlaylistSchema,
      /** The playlist as it was when editing began, to tell what changed. */
      baseline: PlaylistSchema,
      /** Whether the playlist had been saved before, so it has a page. */
      saved: z.boolean(),
      /** When it was last edited, to say how old it is. */
      editedAtMs: z.number().optional(),
    })
);

export const readPlaylistDraft = store.read;
export const writePlaylistDraft = store.write;
export const clearPlaylistDraft = store.clear;
