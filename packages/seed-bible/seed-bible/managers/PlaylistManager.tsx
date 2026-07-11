import { z } from "zod";
import type { LoginManager } from "./LoginManager";
import {
  batch,
  computed,
  effect,
  signal,
  type ReadonlySignal,
} from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { ReaderTab, TabsManager } from "./TabsManager";
import { v4 as uuid } from "uuid";
import { range } from "es-toolkit";
import type { NavigationManager } from "./NavigationManager";
import { parseNumber } from "./Utils";
import type { ModalManager } from "./ModalManager";
import { PlaylistHtmlContent } from "../components/PlaylistHtmlContent/PlaylistHtmlContent";
import { PlaylistLinkContent } from "../components/PlaylistLinkContent/PlaylistLinkContent";
import type { I18nManager } from "../i18n";
import type { BibleReadingExtensionManager } from "./BibleReadingExtensionManager";

export const VerseRefSchema = z.object({
  bookId: z.string(),
  chapter: z.number().positive(),
  endChapter: z.number().positive().optional(),
  verse: z.number().positive().optional(),
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
    title: z.string().optional(),
    html: z.string(),
  }),
  z.object({
    type: z.literal("link"),
    title: z.string().optional(),
    url: z.url(),
    /**
     * When true, the play view embeds the URL in an iframe instead of showing
     * an "Open" link. Video URL detection still takes precedence (see
     * {@link resolveLinkMedia}).
     */
    embed: z.boolean().optional(),
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

function getPlaylistLocator(playlist: {
  recordName: string;
  id: string;
}): string {
  return `${playlist.recordName}.${playlist.id}`;
}

function parsePlaylistLocator(
  locator: string | null | undefined
): { recordName: string; id: string } | null {
  if (!locator) {
    return null;
  }
  const lastDot = locator.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === locator.length - 1) {
    console.error("Invalid playlist locator:", locator);
    return null;
  }
  const recordName = locator.slice(0, lastDot);
  const id = locator.slice(lastDot + 1);
  return { recordName, id };
}

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

  let decorationId: string | null = null;

  const disposeDecoration = () => {
    if (tab && decorationId) {
      tab.readingState.removeDecoration(decorationId);
      decorationId = null;
    }
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
        decorationId = tab.readingState.decorateVerses(
          ref.bookId,
          ref.chapter,
          ref.endVerse ? range(ref.verse, ref.endVerse) : [ref.verse],
          {
            className: "sb-verse-decoration-playlist-verse-highlight",
          }
        );
      }
    });

    return () => disposeDecoration();
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

/** Stable id so navigating between non-verse items updates the same modal instead of closing/reopening it. */
const PLAYLIST_ITEM_MODAL_ID = "playlist-item-content";

/**
 * Id of the reading extension that lets a reading state's own next/previous-
 * chapter controls (keyboard, swipe, toolbar) advance playlist playback
 * instead, and lets its URL query params include `playlist`/`playlistStep`.
 */
const PLAYLIST_READING_EXTENSION_ID = "playlist";

export function createPlaylistManager(
  os: CasualOSManager,
  login: LoginManager,
  tabs: TabsManager,
  navigation: NavigationManager,
  isMobile: ReadonlySignal<boolean>,
  modals: ModalManager,
  i18n: I18nManager,
  readingExtensionManager: BibleReadingExtensionManager
) {
  const initialPlaylistLocator = signal(
    navigation.currentUrl.value.searchParams.get("playlist")
  );
  const initialPlaylistStep = signal(
    navigation.currentUrl.value.searchParams.get("playlistStep")
  );
  const userPlaylists = signal<Playlist[]>([]);
  const view = signal<null | "discover" | "create_playlist" | "play_playlist">(
    null
  );

  const isDiscoverOpen = computed(() => !!view.value);

  /** The playlist currently being edited/created in the pane, or null. */
  const editingPlaylist = signal<Playlist | null>(null);
  /** The active playback state, or null when nothing is playing. */
  const playing = signal<PlayingState | null>(null);

  const availablePlaylists = computed(() => {
    return userPlaylists;
  });

  // Opens the content modal for a non-verse item (video/link/text), or closes it
  // for verse items which are shown in the reader instead. Called both when the
  // current item changes and when the user taps a queue item directly.
  const showItemInModal = (item: PlaylistItemData | null) => {
    if (!item || item.type === "bible-verse") {
      modals.closeModal(PLAYLIST_ITEM_MODAL_ID);
      return;
    }

    const { t } = i18n;

    modals.openModal({
      id: PLAYLIST_ITEM_MODAL_ID,
      title: item.title?.trim() || t("content", { defaultValue: "Content" }),
      content: () =>
        item.type === "html" ? (
          <PlaylistHtmlContent html={item.html} />
        ) : (
          <PlaylistLinkContent
            url={item.url}
            title={item.title}
            embed={item.embed}
          />
        ),
    });
  };

  const savePlaylist = async (playlist: Playlist) => {
    await os.recordData(playlist.recordName, playlist.id, playlist, {
      marker: "publicRead:playlists",
    });
  };

  /**
   * Permanently deletes a playlist: erases its record, drops it from
   * `userPlaylists`, and clears any edit/playback state that referenced it.
   */
  const deletePlaylist = async (playlist: Playlist): Promise<void> => {
    const result = await os.eraseData(playlist.recordName, playlist.id);
    if (!result.success) {
      console.error("Failed to delete playlist:", result);
      throw new Error(`Failed to delete playlist: ${result.errorCode}`);
    }
    userPlaylists.value = userPlaylists.value.filter(
      (p) => p.id !== playlist.id
    );
    if (editingPlaylist.peek()?.id === playlist.id) {
      cancelEditingPlaylist();
    }
    if (
      playing
        .peek()
        ?.playlists.peek()
        .some((p) => p.id === playlist.id)
    ) {
      stopPlaying();
    }
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
   * Loads a single playlist by its `{recordName, id}` locator. Used to open a
   * playlist that isn't the current user's own — e.g. from a shared `?playlist=`
   * link. Playlists are stored with the `publicRead:playlists` marker, so this
   * succeeds without being signed in.
   */
  const loadPlaylist = async (
    recordName: string,
    id: string
  ): Promise<Playlist> => {
    const result = await os.getData(recordName, id);
    if (!result.success) {
      throw new Error(`Failed to load playlist: ${result.errorCode}`);
    }
    return PlaylistSchema.parse(result.data);
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
   * Replaces the item at the given index in the currently-edited playlist.
   * No-op when there is no playlist being edited or the index is out of range.
   * Persisting happens later via `saveEditingPlaylist`.
   */
  const updateEditingPlaylistItem = (
    index: number,
    item: PlaylistItemData
  ): void => {
    const current = editingPlaylist.value;
    if (!current || index < 0 || index >= current.items.length) {
      return;
    }
    editingPlaylist.value = {
      ...current,
      items: current.items.map((existing, i) =>
        i === index ? item : existing
      ),
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
  const startPlaying = (playlist: Playlist | Playlist[]): PlayingState => {
    const previousTab = playing.value?.tab ?? null;
    playing.value?.dispose();
    previousTab?.readingState.disableExtension(PLAYLIST_READING_EXTENSION_ID);

    const playlists = Array.isArray(playlist) ? playlist : [playlist];
    const sharedTab = tabs.tabs.value.find((tab) => tab.sharedSession) ?? null;
    const targetTab =
      sharedTab ??
      tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ??
      null;
    playing.value = createPlayingState(playlists, targetTab);
    targetTab?.readingState.enableExtension(PLAYLIST_READING_EXTENSION_ID);
    view.value = "play_playlist";

    if (isMobile.value) {
      // on mobile, close the discover pane so the reader is visible while playing
      view.value = null;
    }

    return playing.value;
  };

  const startPlayingLocator = async (
    locator: string,
    step: string | null
  ): Promise<void> => {
    const parsed = parsePlaylistLocator(locator);
    if (!parsed) {
      console.error("Invalid playlist locator in URL:", locator);
      return;
    }
    const { recordName, id } = parsed;
    try {
      const playlist = await loadPlaylist(recordName, id);
      const state = startPlaying(playlist);

      const stepIndex = Math.floor(parseNumber(step, 0));
      state.jumpTo(stepIndex);
    } catch (err) {
      console.error("Failed to load playlist for playback:", err);
    }
  };

  /**
   * Gets a shareable URL for the given playlist, which opens the app with that
   */
  const getPlaylistUrl = (playlist: Playlist): string => {
    const shareUrl = new URL(navigation.currentUrl.value);
    shareUrl.search = "";
    shareUrl.searchParams.set("playlist", getPlaylistLocator(playlist));
    return shareUrl.toString();
  };

  const goBackFromPlayingView = () => {
    if (isMobile.value) {
      view.value = null;
    } else {
      stopPlaying();
    }
  };

  /**
   * Stops playback, clears the playing state, and returns to the discover view.
   */
  const stopPlaying = (): void => {
    const previousTab = playing.value?.tab ?? null;
    playing.value?.dispose();
    playing.value = null;
    previousTab?.readingState.disableExtension(PLAYLIST_READING_EXTENSION_ID);
    initialPlaylistLocator.value = null;
    initialPlaylistStep.value = null;
    modals.closeModal(PLAYLIST_ITEM_MODAL_ID);
    if (view.peek()) {
      view.value = "discover";
    }
  };

  /**
   * The `playlist` URL query param value for the current state: the playing
   * queue's first playlist, or (while nothing is playing) whatever locator was
   * last seen in the URL — preserved so the param doesn't flash-clear while an
   * async `startPlayingLocator` load is in flight.
   */
  const currentPlaylistLocator = (): string | null => {
    const playingState = playing.value;
    if (!playingState) {
      return initialPlaylistLocator.value;
    }
    const firstPlaylist = playingState.playlists.value[0];
    if (!firstPlaylist) {
      return null;
    }
    return getPlaylistLocator(firstPlaylist);
  };

  /**
   * The `playlistStep` URL query param value for the current state. Unlike
   * `currentPlaylistLocator`, this has no fallback while nothing is playing —
   * it is simply absent.
   */
  const currentPlaylistStep = (): string | null => {
    const playingState = playing.value;
    if (!playingState) {
      return null;
    }
    return playingState.currentIndex.value.toString();
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

  effect(() => {
    if (!playing.value) {
      return;
    }

    showItemInModal(playing.value.currentItem.value);
  });

  // Registered before the deep-link autoplay check below, since that check can
  // synchronously reach `startPlaying` -> `enableExtension`.
  readingExtensionManager.registerReadingExtension({
    id: PLAYLIST_READING_EXTENSION_ID,
    activate: ({ isShared }) => ({
      // Always active, regardless of `isShared`: lets `getUrlQueryParams()`
      // include `playlist`/`playlistStep` for a shared reading state too (the
      // shareable-URL behavior is purely per-browser and doesn't care whether
      // the tab happens to be shared).
      transformQueryParams: ({ queryParams }) => ({
        ...queryParams,
        playlist: currentPlaylistLocator(),
        playlistStep: currentPlaylistStep(),
      }),
      // Navigation interception is per-browser only. A shared reading state's
      // enabled-extension set is mirrored across session participants
      // (SessionsManager), so if these hooks existed unconditionally, one
      // participant stopping playback would disable them out from under
      // another participant still playing on the same shared tab.
      ...(!isShared.value && {
        navigateNext: () => {
          const state = playing.value;
          if (!state) {
            return { type: "default" as const };
          }
          if (!state.hasNext.value) {
            return { type: "prevent" as const };
          }
          state.next();
          return { type: "handled" as const };
        },
        navigatePrevious: () => {
          const state = playing.value;
          if (!state) {
            return { type: "default" as const };
          }
          if (!state.hasPrevious.value) {
            return { type: "prevent" as const };
          }
          state.previous();
          return { type: "handled" as const };
        },
      }),
    }),
  });

  // Inbound (URL -> state) half of the `playlist`/`playlistStep` sync. Reads
  // both params together so pasting a link with a nonzero step while
  // something else is playing resolves to the right playlist *and* step in
  // one coordinated call, rather than racing an async playlist load against a
  // synchronous jump on the (still old) previous playing state.
  //
  // Every playback-state read below uses `.peek()` deliberately: this must be
  // an effect over `navigation.currentUrl` alone. If it also tracked `playing`
  // (etc.), it would re-run every time playback state changes for any reason
  // (e.g. `startPlaying` itself) and, seeing the URL hasn't caught up yet
  // (that happens separately, via `transformQueryParams`/`TabsManager`), would
  // wrongly treat the still-stale URL as an external "stop playback" request.
  const syncPlayingFromUrl = () => {
    const url = navigation.currentUrl.value;
    const requestedLocator = url.searchParams.get("playlist");
    const requestedStep = url.searchParams.get("playlistStep");

    const playingState = playing.peek();
    const firstPlaylist = playingState?.playlists.peek()[0];
    const locator = playingState
      ? firstPlaylist
        ? getPlaylistLocator(firstPlaylist)
        : null
      : initialPlaylistLocator.peek();

    if (requestedLocator === locator) {
      if (playingState && requestedStep !== null) {
        const step = playingState.currentIndex.peek().toString();
        if (requestedStep !== step) {
          playingState.jumpTo(Math.floor(parseNumber(requestedStep, 0)));
        }
      }
      return;
    }

    if (!requestedLocator) {
      stopPlaying();
      return;
    }

    void startPlayingLocator(requestedLocator, requestedStep);
  };

  effect(() => {
    void navigation.currentUrl.value;
    syncPlayingFromUrl();
  });

  if (initialPlaylistLocator.value) {
    void startPlayingLocator(
      initialPlaylistLocator.value,
      initialPlaylistStep.value
    );
  }

  return {
    savePlaylist,
    deletePlaylist,
    createNewPlaylist,
    editPlaylist,
    saveEditingPlaylist,
    addEditingPlaylistItem,
    updateEditingPlaylistItem,
    removeEditingPlaylistItem,
    cancelEditingPlaylist,
    listPlaylists,
    loadPlaylist,
    userPlaylists,
    availablePlaylists,
    view,
    editingPlaylist,
    playing,
    startPlaying,
    stopPlaying,
    getPlaylistUrl,
    isDiscoverOpen,
    goBackFromPlayingView,
    isMobile,
  };
}
