import { z } from "zod";
import { PlaylistSchema } from "./PlaylistManager";

/**
 * Unsaved playlist edits, kept in this browser's localStorage so a refresh
 * (or closing the tab) doesn't lose them. One per playlist, keyed by its
 * `{recordName}.{id}` locator.
 */
const DRAFT_KEY_PREFIX = "sb-playlist-draft:v1:";

// Built on first use: PlaylistManager imports this module, so its schema
// isn't defined yet while this one first loads.
const storedPlaylistDraftSchema = () =>
  z.object({
    /** The playlist as edited. */
    draft: PlaylistSchema,
    /** The playlist as it was when editing began, to tell what changed. */
    baseline: PlaylistSchema,
    /** Whether the playlist had been saved before, so it has a page. */
    saved: z.boolean(),
    /** When it was last edited, to say how old it is. */
    editedAtMs: z.number().optional(),
  });

export type StoredPlaylistDraft = z.infer<
  ReturnType<typeof storedPlaylistDraftSchema>
>;

/** The draft kept for `locator`, or null when there's none (or it's unreadable). */
export function readPlaylistDraft(locator: string): StoredPlaylistDraft | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY_PREFIX + locator);
    if (!raw) {
      return null;
    }
    const parsed = storedPlaylistDraftSchema().safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    // Unavailable storage or a malformed entry: as if there were none.
    return null;
  }
}

/** Keeps `draft` for `locator`. Best-effort: storage can be full or blocked. */
export function writePlaylistDraft(
  locator: string,
  draft: StoredPlaylistDraft
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      DRAFT_KEY_PREFIX + locator,
      JSON.stringify(draft)
    );
  } catch {
    // Losing it only means losing unsaved edits on a refresh, as before.
  }
}

/** Forgets the draft kept for `locator`, if any. */
export function clearPlaylistDraft(locator: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(DRAFT_KEY_PREFIX + locator);
  } catch {
    // Nothing to do: an unreadable entry is ignored on read anyway.
  }
}
