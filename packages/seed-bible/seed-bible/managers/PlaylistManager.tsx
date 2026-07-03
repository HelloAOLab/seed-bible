import { z } from "zod";
import type { LoginManager } from "./LoginManager";
import { batch, computed, effect, signal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { ReaderTab, TabsManager } from "./TabsManager";
import { v4 as uuid } from "uuid";
import { range } from "es-toolkit";

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
export type PlaylistItemData = z.infer<typeof PlaylistItem>;
export type VerseRef = z.infer<typeof VerseRefSchema>;

export type PlaylistManager = ReturnType<typeof createPlaylistManager>;
export type PlayingState = ReturnType<typeof createPlayingState>;

/**
 * Creates an in-memory playing state for stepping through one or more
 * playlists. The queue is a copy of the source playlists' items, so
 * manipulating it never mutates the underlying playlists.
 *
 * When a `tab` is provided, advancing to a `bible-verse` item navigates that
 * tab's reader to the verse. The tab is the one saved when playback started, so
 * navigation keeps targeting it even if the user later switches tabs.
 */
export function createPlayingState(
  sourcePlaylists: Playlist[],
  tab: ReaderTab | null = null
) {
  const playlists = signal<Playlist[]>(sourcePlaylists);
  const queue = signal<PlaylistItemData[]>(
    sourcePlaylists.flatMap((playlist) => [...playlist.items])
  );
  const currentIndex = signal<number>(queue.value.length > 0 ? 0 : -1);

  /** The item at `currentIndex`, or null when the queue is empty. */
  const currentItem = computed<PlaylistItemData | null>(
    () => queue.value[currentIndex.value] ?? null
  );
  const hasNext = computed(() => currentIndex.value < queue.value.length - 1);
  const hasPrevious = computed(() => currentIndex.value > 0);

  /** Advances to the next step. No-op at the end of the queue. */
  const next = (): void => {
    if (hasNext.value) {
      currentIndex.value = currentIndex.value + 1;
    }
  };

  /** Goes back to the previous step. No-op at the start of the queue. */
  const previous = (): void => {
    if (hasPrevious.value) {
      currentIndex.value = currentIndex.value - 1;
    }
  };

  /** Jumps to the given index. No-op when the index is out of range. */
  const jumpTo = (index: number): void => {
    if (index >= 0 && index < queue.value.length) {
      currentIndex.value = index;
    }
  };

  /** Appends an item to the end of the queue. */
  const addToQueue = (item: PlaylistItemData): void => {
    queue.value = [...queue.value, item];
    if (currentIndex.value < 0) {
      currentIndex.value = 0;
    }
  };

  /**
   * Removes the item at the given index from the queue, keeping
   * `currentIndex` pointed at a sensible item. No-op when out of range.
   */
  const removeFromQueue = (index: number): void => {
    if (index < 0 || index >= queue.value.length) {
      return;
    }
    const nextQueue = queue.value.filter((_, i) => i !== index);
    queue.value = nextQueue;
    if (nextQueue.length === 0) {
      currentIndex.value = -1;
      return;
    }
    let nextIndex = currentIndex.value;
    if (index < nextIndex) {
      // A step before the current one was removed; shift to compensate.
      nextIndex -= 1;
    }
    currentIndex.value = Math.max(0, Math.min(nextIndex, nextQueue.length - 1));
  };

  /**
   * Moves an item within the queue, adjusting `currentIndex` so the
   * currently-playing item stays selected. No-op when either index is out of
   * range.
   */
  const reorderQueue = (from: number, to: number): void => {
    const length = queue.value.length;
    if (from < 0 || from >= length || to < 0 || to >= length || from === to) {
      return;
    }
    const nextQueue = [...queue.value];
    const [moved] = nextQueue.splice(from, 1);
    if (!moved) {
      return;
    }
    nextQueue.splice(to, 0, moved);
    queue.value = nextQueue;

    const current = currentIndex.value;
    if (current === from) {
      currentIndex.value = to;
    } else if (from < current && to >= current) {
      currentIndex.value = current - 1;
    } else if (from > current && to <= current) {
      currentIndex.value = current + 1;
    }
  };

  /** Restarts playback from the first item. */
  const reset = (): void => {
    currentIndex.value = queue.value.length > 0 ? 0 : -1;
  };

  // Navigate the saved tab to the current item when it is a bible verse. Runs
  // immediately, so playback jumps to the first item's verse right away.
  const disposeNavigation = effect(() => {
    const item = currentItem.value;
    if (!tab || item?.type !== "bible-verse") {
      return;
    }
    const { ref, translationId } = item;

    batch(() => {
      // `translationId` is optional on the item; fall back to the tab's current
      // translation. `.peek()` avoids re-navigating when the tab changes it.
      void tab.readingState.selectTranslationAndChapter(
        translationId ?? tab.readingState.translationId.peek(),
        ref.bookId,
        ref.chapter,
        { scrollToVerse: ref.verse }
      );

      if (ref.verse) {
        void tab.readingState.decorateVerses(
          ref.bookId,
          ref.chapter,
          ref.endVerse ? range(ref.verse, ref.endVerse) : [ref.verse],
          {
            className: "sb-verse-decoration-playlist-verse-highlight",
            removeAfterMs: 3000,
          }
        );
      }
    });
  });

  /** Tears down the navigation effect. Call when playback ends or is replaced. */
  const dispose = (): void => {
    disposeNavigation();
  };

  return {
    playlists,
    queue,
    currentIndex,
    currentItem,
    hasNext,
    hasPrevious,
    tab,
    next,
    previous,
    jumpTo,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    reset,
    dispose,
  };
}

export function createPlaylistManager(
  os: CasualOSManager,
  login: LoginManager,
  tabs: TabsManager
) {
  const userPlaylists = signal<Playlist[]>([]);
  const view = signal<"discover" | "create_playlist" | "play_playlist">(
    "discover"
  );
  /** The playlist currently being edited/created in the pane, or null. */
  const editingPlaylist = signal<Playlist | null>(null);
  /** The active playback state, or null when nothing is playing. */
  const playing = signal<PlayingState | null>(null);

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
   * Appends an item to the currently-edited playlist. No-op when there is no
   * playlist being edited. Persisting happens later via `saveEditingPlaylist`.
   */
  const addEditingPlaylistItem = (item: PlaylistItemData): void => {
    const current = editingPlaylist.value;
    if (!current) {
      return;
    }
    editingPlaylist.value = {
      ...current,
      items: [...current.items, item],
    };
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

  /**
   * Starts playing the given playlist(s), replacing any current playback with a
   * fresh queue built from a copy of their items. The currently selected reader
   * tab is saved into the playing state so bible-verse items navigate it.
   */
  const startPlaying = (playlist: Playlist | Playlist[]): void => {
    playing.value?.dispose();
    const playlists = Array.isArray(playlist) ? playlist : [playlist];
    const sharedTab = tabs.tabs.value.find((tab) => tab.sharedSession) ?? null;
    const targetTab =
      sharedTab ??
      tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ??
      null;
    playing.value = createPlayingState(playlists, targetTab);
    view.value = "play_playlist";
  };

  /**
   * Stops playback, clears the playing state, and returns to the discover view.
   */
  const stopPlaying = (): void => {
    playing.value?.dispose();
    playing.value = null;
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
    addEditingPlaylistItem,
    removeEditingPlaylistItem,
    cancelEditingPlaylist,
    listPlaylists,
    userPlaylists,
    availablePlaylists,
    view,
    editingPlaylist,
    playing,
    startPlaying,
    stopPlaying,
  };
}
