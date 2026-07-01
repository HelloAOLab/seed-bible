import { z } from "zod";
import type { LoginManager } from "./LoginManager";
import { computed, effect, signal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";

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
    listPlaylists,
    userPlaylists,
    availablePlaylists,
  };
}
