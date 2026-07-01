import { z } from "zod";
import type { LoginManager } from "./LoginManager";
import { computed, effect, signal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import { v4 as uuid } from "uuid";

export const VerseRefSchema = z.object({
  bookId: z.string(),
  chapter: z.number().positive(),
  endChapter: z.number().positive().optional(),
  verse: z.number().positive(),
  endVerse: z.number().positive().optional(),
});

export const PlaylistItem = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("bible-verse"),
    ref: VerseRefSchema,
    translationId: z.string().optional(),
  }),
  z.object({
    type: z.literal("html"),
    html: z.string(),
  }),
  z.object({
    type: z.literal("link"),
    url: z.url(),
  }),
]);

export const PlaylistSchema = z.object({
  id: z.string(),
  recordName: z.string(),
  authorUserId: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  items: z.array(PlaylistItem),
  createdAtMs: z.number().positive(),
  updatedAtMs: z.number().positive(),
});

export type Playlist = z.infer<typeof PlaylistSchema>;

export type PlaylistManager = ReturnType<typeof createPlaylistManager>;

export function createPlaylistManager(
  os: CasualOSManager,
  login: LoginManager
) {
  const userPlaylists = signal<Playlist[]>([]);
  const view = signal<"discover" | "create_playlist">("discover");
  /** The playlist currently being edited/created in the pane, or null. */
  const editingPlaylist = signal<Playlist | null>(null);

  const availablePlaylists = computed(() => {
    return userPlaylists;
  });

  const savePlaylist = async (playlist: Playlist) => {
    await os.recordData(playlist.recordName, playlist.id, playlist, {
      marker: "publicRead:playlists",
    });
  };

  const listPlaylists = async (recordName: string) => {
    const records = await os.listDataByMarker(
      recordName,
      "publicRead:playlists"
    );
    if (records.success === false) {
      console.error(
        "Failed to list playlists:",
        records.errorCode,
        records.errorMessage
      );
      throw new Error("Failed to list playlists: " + records.errorMessage);
    }
    return records.items.map((record) => PlaylistSchema.parse(record.data));
  };

  /**
   * Starts creating a new playlist: opens the create view and sets
   * `editingPlaylist` to a fresh, empty (unsaved) playlist. Persisting happens
   * later via `saveEditingPlaylist`. No-op when not signed in.
   */
  const createNewPlaylist = async (): Promise<void> => {
    let userId = login.userId.value;
    if (!userId) {
      const userInfo = await login.login();
      if (!userInfo) {
        console.warn("Cannot create a playlist while signed out.");
        return;
      }
      userId = userInfo.id;
    }
    const now = Date.now();
    editingPlaylist.value = PlaylistSchema.parse({
      id: `playlist_${uuid()}`,
      recordName: userId,
      authorUserId: userId,
      title: null,
      description: null,
      items: [],
      createdAtMs: now,
      updatedAtMs: now,
    });
    view.value = "create_playlist";
  };

  /**
   * Opens an existing playlist for editing: sets `editingPlaylist` to a copy of
   * the given playlist and switches to the create/edit view. Persisting happens
   * later via `saveEditingPlaylist`.
   */
  const editPlaylist = (playlist: Playlist): void => {
    editingPlaylist.value = { ...playlist };
    view.value = "create_playlist";
  };

  /**
   * Persists the currently-edited playlist, upserts it into `userPlaylists`,
   * then clears the editor and returns to the discover view. No-op when there
   * is no playlist being edited.
   */
  const saveEditingPlaylist = async (): Promise<void> => {
    const current = editingPlaylist.value;
    if (!current) {
      return;
    }
    const playlist: Playlist = { ...current, updatedAtMs: Date.now() };
    await savePlaylist(playlist);
    const exists = userPlaylists.value.some((p) => p.id === playlist.id);
    userPlaylists.value = exists
      ? userPlaylists.value.map((p) => (p.id === playlist.id ? playlist : p))
      : [...userPlaylists.value, playlist];
    editingPlaylist.value = null;
    view.value = "discover";
  };

  /**
   * Removes the item at the given index from the currently-edited playlist.
   * No-op when there is no playlist being edited. Persisting happens later via
   * `saveEditingPlaylist`.
   */
  const removeEditingPlaylistItem = (index: number): void => {
    const current = editingPlaylist.value;
    if (!current) {
      return;
    }
    editingPlaylist.value = {
      ...current,
      items: current.items.filter((_, i) => i !== index),
    };
  };

  /** Discards the current edit and returns to the discover view. */
  const cancelEditingPlaylist = (): void => {
    editingPlaylist.value = null;
    view.value = "discover";
  };

  const syncPlaylists = async () => {
    if (!login.userId.value) {
      userPlaylists.value = [];
      return;
    }

    try {
      const playlists = await listPlaylists(login.userId.value);
      userPlaylists.value = playlists;
    } catch (error) {
      console.error("Failed to sync playlists:", error);
    }
  };

  effect(() => {
    void syncPlaylists();
  });

  return {
    savePlaylist,
    createNewPlaylist,
    editPlaylist,
    saveEditingPlaylist,
    removeEditingPlaylistItem,
    cancelEditingPlaylist,
    listPlaylists,
    userPlaylists,
    availablePlaylists,
    view,
    editingPlaylist,
  };
}
