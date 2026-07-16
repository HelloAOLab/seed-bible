import { z } from "zod";
import type { LoginManager } from "./LoginManager";
import {
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
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
import type {
  BibleReadingExtensionManager,
  ReadingExtensionInstance,
} from "./BibleReadingExtensionManager";

export const VerseRefSchema = z.object({
  bookId: z.string(),
  chapter: z.number().positive(),
  endChapter: z.number().positive().optional(),
  verse: z.number().positive().optional(),
  endVerse: z.number().positive().optional(),
  /**
   * Internal marker set only on queue fragments synthesized by
   * `expandCrossChapterItem` (never written by the playlist editor, never
   * part of a saved item): highlight from `verse` through however many
   * verses this chapter actually has. Resolved lazily in
   * `navigateToCurrentItem` from the chapter data navigation already loads,
   * since the count isn't known synchronously at queue-build time.
   */
  toEndOfChapter: z.boolean().optional(),
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
 * The serializable playback state the playlist reading extension stores in its
 * per-enablement `data`. Kept as plain JSON so it can be mirrored across a
 * shared session (see `SessionsManager`). The live {@link PlayingState} (which
 * holds signals and effects) is built from this and never stored here.
 *
 * `queue` is a copy of the source playlists' items, so it can be reordered or
 * have items added/removed without mutating `playlists`; both are synced.
 */
export interface PlaylistReadingData {
  playlists: Playlist[];
  queue: PlaylistItemData[];
  step: number;
}

/**
 * The reading-extension instance the playlist extension returns from
 * `activate()`. It carries the live {@link PlayingState} so `PlaylistManager`
 * can read it off the enabled runtime instead of storing playback itself.
 */
export interface PlaylistReadingExtensionInstance extends ReadingExtensionInstance<PlaylistReadingData> {
  playingState: PlayingState;
}

/** Structural equality via JSON, used to guard the playback sync effects. */
function jsonEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** No book of the Bible (Psalms, the longest) has more than 150 chapters. */
const MAX_CHAPTER_NUMBER = 150;

/**
 * Expands a `bible-verse` item spanning multiple chapters into one item per
 * chapter in the range, so playback (queue stepping, highlighting) advances
 * chapter by chapter instead of only ever visiting the first chapter. Other
 * item types, and bible-verse items that don't cross a chapter boundary, pass
 * through unchanged.
 */
function expandCrossChapterItem(item: PlaylistItemData): PlaylistItemData[] {
  if (item.type !== "bible-verse") {
    return [item];
  }

  const { ref, translationId } = item;
  const endChapter = ref.endChapter;
  if (
    endChapter == null ||
    endChapter <= ref.chapter ||
    endChapter > MAX_CHAPTER_NUMBER
  ) {
    return [item];
  }

  const items: PlaylistItemData[] = [];

  for (let chapter = ref.chapter; chapter <= endChapter; chapter++) {
    if (chapter === ref.chapter) {
      items.push({
        type: "bible-verse",
        translationId,
        ref:
          ref.verse != null
            ? {
                bookId: ref.bookId,
                chapter,
                verse: ref.verse,
                toEndOfChapter: true,
              }
            : { bookId: ref.bookId, chapter },
      });
    } else if (chapter === endChapter) {
      items.push({
        type: "bible-verse",
        translationId,
        ref:
          ref.endVerse != null
            ? { bookId: ref.bookId, chapter, verse: 1, endVerse: ref.endVerse }
            : { bookId: ref.bookId, chapter },
      });
    } else {
      // Fully-included middle chapter: whole-chapter reference, no highlight.
      items.push({
        type: "bible-verse",
        translationId,
        ref: { bookId: ref.bookId, chapter },
      });
    }
  }

  return items;
}

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
    sourcePlaylists.flatMap((playlist) =>
      playlist.items.flatMap(expandCrossChapterItem)
    )
  );
  const currentIndex = signal<number>(queue.value.length > 0 ? 0 : -1);

  /** The item at `currentIndex`, or null when the queue is empty. */
  const currentItem = computed<PlaylistItemData | null>(
    () => queue.value[currentIndex.value] ?? null
  );
  const hasNext = computed(() => currentIndex.value < queue.value.length - 1);
  const hasPrevious = computed(() => currentIndex.value > 0);

  let decorationId: string | null = null;

  const disposeDecoration = () => {
    if (tab && decorationId) {
      tab.readingState.removeDecoration(decorationId);
      decorationId = null;
    }
  };

  const navigateToCurrentItem = async () => {
    const item = currentItem.value;
    if (!tab || item?.type !== "bible-verse") {
      return;
    }
    disposeDecoration();
    const { ref, translationId } = item;

    // `translationId` is optional on the item; fall back to the tab's current
    // translation. `.peek()` avoids re-navigating when the tab changes it.
    await tab.readingState.selectTranslationAndChapter(
      translationId ?? tab.readingState.translationId.peek(),
      ref.bookId,
      ref.chapter,
      { scrollToVerse: ref.verse }
    );

    if (ref.verse) {
      // `toEndOfChapter` fragments (from `expandCrossChapterItem`) don't know
      // the chapter's actual verse count until it's loaded; resolve it here,
      // guarding against stale chapter data left over from a failed fetch
      // (`selectTranslationAndChapter` doesn't clear `chapterData` on error).
      const loadedChapter = tab.readingState.chapterData.value;
      const chapterDataMatches =
        loadedChapter?.book.id === ref.bookId &&
        loadedChapter?.chapter.number === ref.chapter;
      const endVerse = ref.toEndOfChapter
        ? chapterDataMatches
          ? loadedChapter.numberOfVerses
          : undefined
        : ref.endVerse;
      decorationId = tab.readingState.decorateVerses(
        ref.bookId,
        ref.chapter,
        endVerse ? range(ref.verse, endVerse + 1) : [ref.verse],
        {
          className: "sb-verse-decoration-playlist-verse-highlight",
        }
      );
    }
  };

  /** Advances to the next step. No-op at the end of the queue. */
  const next = async (): Promise<void> => {
    if (hasNext.value) {
      currentIndex.value = currentIndex.value + 1;
      await navigateToCurrentItem();
    }
  };

  /** Goes back to the previous step. No-op at the start of the queue. */
  const previous = async (): Promise<void> => {
    if (hasPrevious.value) {
      currentIndex.value = currentIndex.value - 1;
      await navigateToCurrentItem();
    }
  };

  /** Jumps to the given index. No-op when the index is out of range. */
  const jumpTo = async (index: number): Promise<void> => {
    if (index >= 0 && index < queue.value.length) {
      currentIndex.value = index;
      await navigateToCurrentItem();
    }
  };

  /** Appends an item to the end of the queue. */
  const addToQueue = (item: PlaylistItemData): void => {
    queue.value = [...queue.value, ...expandCrossChapterItem(item)];
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
  const reset = async (): Promise<void> => {
    currentIndex.value = queue.value.length > 0 ? 0 : -1;
    await navigateToCurrentItem();
  };

  /**
   * Applies a full playback snapshot. Used by the playlist reading extension to
   * hydrate from and stay in sync with its serializable `data` (including a
   * queue changed by a session peer). Each field is written only when it
   * differs from the current value, so applying an inbound snapshot doesn't
   * re-trigger the outbound sync effect for unchanged fields.
   */
  const setState = async (state: PlaylistReadingData): Promise<void> => {
    if (!jsonEqual(playlists.peek(), state.playlists)) {
      playlists.value = state.playlists;
    }
    if (!jsonEqual(queue.peek(), state.queue)) {
      queue.value = state.queue;
    }
    const clampedStep =
      state.queue.length > 0
        ? Math.min(Math.max(Math.floor(state.step), 0), state.queue.length - 1)
        : -1;
    if (currentIndex.peek() !== clampedStep) {
      currentIndex.value = clampedStep;
      await navigateToCurrentItem();
    } else {
      // Check if navigation is needed to display the current reference
      const current = currentItem.peek();
      if (current?.type === "bible-verse" && tab?.readingState) {
        if (
          current.ref.bookId !== tab.readingState.bookId.peek() ||
          current.ref.chapter !== tab.readingState.chapterNumber.peek()
        ) {
          await navigateToCurrentItem();
        }
      }
    }
  };

  /** Tears down the navigation effect. Call when playback ends or is replaced. */
  const dispose = (): void => {
    disposeDecoration();
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
    setState,
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

  /**
   * The reading state playback is bound to: the shared-session tab if one
   * exists (so session participants converge on it), otherwise the selected
   * tab. Every playback operation and the URL sync target THIS tab only, so
   * playback on other tabs is never disturbed — switching tabs just changes
   * which reading state the UI reflects, it never stops or starts playback.
   */
  const activeTab = computed<ReaderTab | null>(
    () =>
      tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null
  );

  /**
   * The playback state shown in the UI, or null when the active tab isn't
   * playing. Derived (not stored): playback lives inside the active reading
   * state's playlist-extension enablement, so this reads the live
   * `PlayingState` off that runtime. Switching the selected tab recomputes
   * this — it does not tear anything down.
   */
  const playing = computed<PlayingState | null>(() => {
    const runtime = activeTab.value?.readingState.enabledExtensions.value.find(
      (r) => r.id === PLAYLIST_READING_EXTENSION_ID
    );
    return runtime
      ? (runtime.instance as PlaylistReadingExtensionInstance).playingState
      : null;
  });

  const actualView = computed(() => {
    if (view.value === "play_playlist" && !playing.value) {
      return "discover";
    }

    return view.value;
  });

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
   * Starts playing the given playlist(s) at `initialStep`, by enabling the
   * playlist reading extension on the target tab (a shared-session tab if there
   * is one, otherwise the selected tab) with the playback state as its data. A
   * fresh queue is built from a copy of the playlists' items so it can be
   * reordered/edited without mutating the playlists. The extension owns the live
   * playing state; this manager reads it back via the `playing` computed.
   *
   * Returns the live playing state, or null when there is no tab to play on.
   */
  const startPlaying = (
    playlist: Playlist | Playlist[],
    initialStep = 0
  ): PlayingState | null => {
    const playlists = Array.isArray(playlist) ? playlist : [playlist];
    // Play on the active tab only. Other tabs keep their own playback (if any)
    // untouched, so playback is isolated per reading state.
    const targetTab = activeTab.value;

    const queue = playlists.flatMap((p) =>
      p.items.flatMap(expandCrossChapterItem)
    );
    const step =
      queue.length > 0
        ? Math.min(Math.max(Math.floor(initialStep), 0), queue.length - 1)
        : -1;

    targetTab?.readingState.enableExtension(PLAYLIST_READING_EXTENSION_ID, {
      playlists,
      queue,
      step,
    } satisfies PlaylistReadingData);
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
      startPlaying(playlist, Math.floor(parseNumber(step, 0)));
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
   * Stops the active tab's playback and returns to the discover view. Only the
   * active reading state is disabled (disposing its live playing state, and in
   * a shared session propagating the stop to participants) — other tabs'
   * playback is left running.
   */
  const stopPlaying = (): void => {
    const tab = activeTab.peek();
    if (tab?.readingState.isExtensionEnabled(PLAYLIST_READING_EXTENSION_ID)) {
      tab.readingState.disableExtension(PLAYLIST_READING_EXTENSION_ID);
    }
    initialPlaylistLocator.value = null;
    initialPlaylistStep.value = null;
    modals.closeModal(PLAYLIST_ITEM_MODAL_ID);
    if (view.peek()) {
      view.value = "discover";
    }
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
  //
  // Each enablement owns its own live playing state, built here from the
  // serializable `data` the enablement was given. Because `SessionsManager`
  // mirrors that `data` across a shared session, playback (queue + position)
  // stays in sync between participants.
  readingExtensionManager.registerReadingExtension({
    id: PLAYLIST_READING_EXTENSION_ID,
    activate: (ctx): ReadingExtensionInstance => {
      const { readingState } = ctx;
      // The registry is non-generic (`TData = unknown`); this extension owns the
      // shape it stores, so narrow the data signal to it here.
      const data = ctx.data as Signal<PlaylistReadingData | undefined>;
      const initial: PlaylistReadingData = data.peek() ?? {
        playlists: [],
        queue: [],
        step: 0,
      };

      // The tab this reading state belongs to, so bible-verse items navigate it.
      const tab =
        tabs.tabs.value.find((t) => t.readingState === readingState) ?? null;

      const playingState = createPlayingState(initial.playlists, tab);
      // Apply the synced queue + position (a peer's queue may differ from the
      // raw playlist items after add/remove/reorder).
      playingState.setState(initial);

      // Outbound: mirror local playback changes (advance, queue edits) into the
      // serializable `data` so they propagate to session participants. Guarded
      // by a structural compare so it never fights the inbound effect.
      const disposeOut = effect(() => {
        const snapshot: PlaylistReadingData = {
          playlists: playingState.playlists.value,
          queue: playingState.queue.value,
          step: playingState.currentIndex.value,
        };
        if (!jsonEqual(data.peek(), snapshot)) {
          data.value = snapshot;
        }
      });

      // Inbound: apply remote `data` changes onto the live playing state.
      // `setState` no-ops per field when unchanged, so this settles without
      // ping-ponging with the outbound effect.
      const disposeIn = effect(() => {
        const next = data.value;
        if (next) {
          playingState.setState(next);
        }
      });

      const instance: PlaylistReadingExtensionInstance = {
        playingState,

        transformShortSubTitle: ({ data, label }) => {
          const current = data.value;
          const firstPlaylist = current?.playlists[0];
          return firstPlaylist?.title ?? label;
        },

        transformSubTitle: ({ data, label }) => {
          const current = data.value;
          const firstPlaylist = current?.playlists[0];
          return firstPlaylist?.title ?? label;
        },

        // Always active (independent of `isShared`): contributes the
        // `playlist`/`playlistStep` query params for this reading state's URL.
        // Falls back to the last-seen locator while nothing is playing so the
        // param doesn't flash-clear during an async deep-link load.
        transformQueryParams: ({ queryParams }) => {
          const current = data.value;
          const firstPlaylist = current?.playlists[0];
          // Emit `playlistStep` only when a playlist is actually loaded; an
          // enablement with no playlist reads as "nothing playing" (step
          // absent), with `playlist` falling back to the last-seen locator.
          return {
            ...queryParams,
            playlist: firstPlaylist
              ? getPlaylistLocator(firstPlaylist)
              : initialPlaylistLocator.value,
            playlistStep: firstPlaylist ? current!.step.toString() : null,
          };
        },
        // Navigation hooks are unconditional now that playback state is synced:
        // any participant can drive next/previous and it propagates via `data`.
        navigateNext: async () => {
          if (playingState.queue.value.length === 0) {
            return { type: "default" };
          }
          if (!playingState.hasNext.value) {
            return { type: "prevent" };
          }
          await playingState.next();
          return { type: "prevent" };
        },
        navigatePrevious: async () => {
          if (playingState.queue.value.length === 0) {
            return { type: "default" };
          }
          if (!playingState.hasPrevious.value) {
            return { type: "prevent" };
          }
          await playingState.previous();
          return { type: "prevent" };
        },
        dispose: () => {
          disposeOut();
          disposeIn();
          playingState.dispose();
        },
      };
      // The registry erases `TData` to `unknown`; the extra `playingState`
      // property and the data-typed hooks are safe here (the hooks read
      // playback from the closure, not `ctx.data`).
      return instance as unknown as ReadingExtensionInstance;
    },
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
    ).finally(() => {
      // The fallback locator only bridges this initial async load. Clear it
      // once settled so a later switch to a non-playing tab (whose URL has no
      // `playlist`) isn't misread as a stale request for it.
      initialPlaylistLocator.value = null;
      initialPlaylistStep.value = null;
    });
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
    actualView,
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
