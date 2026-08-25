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
import type { NavigationManager } from "./NavigationManager";
import { parseNumber } from "./Utils";
import type { ModalManager } from "./ModalManager";
import type { ChatsManager } from "./ChatsManager";
import { openPlaylistItemPreview } from "../components/playlistItemPreview";
import type { I18nManager } from "../i18n";
import type {
  BibleReadingExtensionManager,
  ReadingExtensionInstance,
} from "./BibleReadingExtensionManager";
import {
  AIPlaylistItemSchema,
  convertToAiPlaylistItem,
  convertToPlaylistItem,
  generateFunctionTool,
  type GeneratedPlaylist,
} from "./AIManager";
import type { DiscoverManager } from "./DiscoverManager";
import { emphasizeVerses } from "./BibleReadingManager";
import type { BookId } from "./BibleDataManager";
import { addCivilDays, civilDateInZone, civilDateToISO } from "./civilDate";

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

export const BibleVersePlaylistItem = z.object({
  type: z.literal("bible-verse"),
  ref: VerseRefSchema,
  translationId: z.string().optional(),
});

export const PlaylistItem = z.discriminatedUnion("type", [
  BibleVersePlaylistItem,
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
  recordName?: string;
  id: string;
}): string {
  return `${playlist.recordName ?? ""}.${playlist.id}`;
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
export type SimplePlaylist = Pick<
  Playlist,
  "id" | "items" | "title" | "description"
>;

/**
 * True when a playlist is backed by a record, so a play-history row can reload
 * it later by `{recordName, id}`. Ad-hoc queues (a reading plan's day, say)
 * carry no record name and so can't be resumed from history.
 */
function isRecordedPlaylist(
  playlist: SimplePlaylist
): playlist is SimplePlaylist & Pick<Playlist, "recordName"> {
  return typeof (playlist as Partial<Playlist>).recordName === "string";
}
export type PlaylistItemData = z.infer<typeof PlaylistItem>;
export type VerseRef = z.infer<typeof VerseRefSchema>;

/**
 * Latest play of a playlist, stored under the user's record so shared playlist
 * links can be reopened later from Discover without keeping the URL. One row
 * per playlist: playing again (resume or start over) overwrites that row
 * instead of appending a session log.
 */
export const PlaylistPlayHistorySchema = z.object({
  id: z.string(),
  recordName: z.string(),
  userId: z.string(),
  playlistId: z.string(),
  playlistRecordName: z.string(),
  playlistTitle: z.string().nullable(),
  playlistDescription: z.string().nullable().optional(),
  /**
   * Legacy chain to a prior play-session. Kept so stored records still parse;
   * new writes leave it unset. History is one row per playlist now.
   */
  previousHistoryId: z.string().nullable().optional(),
  totalSteps: z.number().int().nonnegative(),
  /** 0-based queue index at last update; `-1` when the queue was empty. */
  currentStep: z.number().int(),
  /** Snapshot of the queue item at `currentStep` for display without reloading. */
  lastItem: PlaylistItem.nullable(),
  startedAtMs: z.number().positive(),
  /** Set when playback stops; `null` while this session is still active. */
  endedAtMs: z.number().positive().nullable().optional(),
  /** Wall-clock ms from `startedAtMs` to the last save (or stop). */
  durationMs: z.number().nonnegative().default(0),
  createdAtMs: z.number().positive(),
  updatedAtMs: z.number().positive(),
});
export type PlaylistPlayHistory = z.infer<typeof PlaylistPlayHistorySchema>;

/**
 * Options for {@link createPlaylistManager}'s `startPlaying`. Pass
 * `history: false` to skip tracking (e.g. reading plans that reuse the
 * playlist player).
 */
export type StartPlayingOptions = {
  history?: false;
};

export type PlaylistManager = ReturnType<typeof createPlaylistManager>;
export type PlayingState = ReturnType<typeof createPlayingState>;

const PLAYLIST_PLAY_HISTORY_MARKER = "publicRead:playlistPlayHistory";

/**
 * Bound on how many playlists we keep in history. One row per playlist, so
 * this is a cap on distinct playlists, not on play sessions.
 */
export const MAX_PLAYLIST_PLAY_HISTORY = 200;

/** Identity of the playlist a history row refers to (record + id). */
export function playlistPlayHistoryKey(
  entry: Pick<PlaylistPlayHistory, "playlistRecordName" | "playlistId">
): string {
  return `${entry.playlistRecordName}.${entry.playlistId}`;
}

/**
 * Newest play per playlist, newest-first, capped at
 * {@link MAX_PLAYLIST_PLAY_HISTORY}. Used both when loading from the backend
 * and when pruning after a new play so Discover never shows a session log.
 */
export function retainPlaylistPlayHistory(
  entries: PlaylistPlayHistory[]
): PlaylistPlayHistory[] {
  const sorted = [...entries].sort((a, b) => b.startedAtMs - a.startedAtMs);
  const seen = new Set<string>();
  const retained: PlaylistPlayHistory[] = [];
  for (const entry of sorted) {
    const key = playlistPlayHistoryKey(entry);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    retained.push(entry);
    if (retained.length >= MAX_PLAYLIST_PLAY_HISTORY) {
      break;
    }
  }
  return retained;
}

export type PlaylistPlayHistoryDayGroup = {
  dayKey: string;
  entries: PlaylistPlayHistory[];
};

/**
 * Newest-first history rows grouped by calendar day in `timeZone` (the
 * machine zone when omitted). Day keys are `YYYY-MM-DD`.
 */
export function groupPlaylistPlayHistoryByDay(
  entries: PlaylistPlayHistory[],
  timeZone?: string | null
): PlaylistPlayHistoryDayGroup[] {
  const sorted = retainPlaylistPlayHistory(entries);
  const groups = new Map<string, PlaylistPlayHistory[]>();
  const order: string[] = [];
  for (const entry of sorted) {
    const dayKey = civilDateToISO(civilDateInZone(entry.startedAtMs, timeZone));
    const group = groups.get(dayKey);
    if (group) {
      group.push(entry);
      continue;
    }
    groups.set(dayKey, [entry]);
    order.push(dayKey);
  }
  return order.map((dayKey) => ({
    dayKey,
    entries: groups.get(dayKey) ?? [],
  }));
}

/** Which heading Discover should use for a history day group. */
export function playlistPlayHistoryDayKind(
  dayKey: string,
  nowMs: number = Date.now(),
  timeZone?: string | null
): "today" | "yesterday" | "date" {
  const today = civilDateToISO(civilDateInZone(nowMs, timeZone));
  if (dayKey === today) {
    return "today";
  }
  const yesterday = civilDateToISO(
    addCivilDays(civilDateInZone(nowMs, timeZone), -1)
  );
  if (dayKey === yesterday) {
    return "yesterday";
  }
  return "date";
}

/** Fraction of the queue reached (0–1), counting every item type. */
export function playlistPlayHistoryPercent(
  entry: Pick<PlaylistPlayHistory, "currentStep" | "totalSteps">
): number {
  if (entry.totalSteps <= 0 || entry.currentStep < 0) {
    return 0;
  }
  const reached = Math.min(entry.currentStep + 1, entry.totalSteps);
  return reached / entry.totalSteps;
}

/** True when the last update was on the final queue item. */
export function isPlaylistPlayHistoryComplete(
  entry: Pick<PlaylistPlayHistory, "currentStep" | "totalSteps">
): boolean {
  return entry.totalSteps > 0 && entry.currentStep >= entry.totalSteps - 1;
}

/**
 * Formats a wall-clock play duration for the history accordion. Kept here so
 * manager tests can assert the same string the UI shows.
 */
export function formatPlaylistPlayDurationMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Duration shown in Discover: finished sessions use the saved `durationMs`;
 * an still-active session (no `endedAtMs`) is measured live from `startedAtMs`
 * so the accordion stays honest without a backend write every few seconds.
 */
export function playlistPlayHistoryDisplayDurationMs(
  entry: Pick<PlaylistPlayHistory, "startedAtMs" | "endedAtMs" | "durationMs">,
  nowMs: number = Date.now()
): number {
  if (entry.endedAtMs == null) {
    return Math.max(0, nowMs - entry.startedAtMs);
  }
  return entry.durationMs;
}

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
  playlists: SimplePlaylist[];
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
 *
 * Exported because callers that pass a `startIndex` to `startPlaying` have to
 * count that index in the same expanded steps this produces — a list of
 * readings and the queue built from it are not the same length.
 */
export function expandCrossChapterItem(
  item: PlaylistItemData
): PlaylistItemData[] {
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
  sourcePlaylists: SimplePlaylist[],
  tab: ReaderTab | null = null
) {
  const playlists = signal<SimplePlaylist[]>(sourcePlaylists);
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

    const loadedChapter = tab.readingState.chapterData.value;
    const chapterDataMatches =
      loadedChapter?.book.id === ref.bookId &&
      loadedChapter?.chapter.number === ref.chapter;
    const endVerse = ref.toEndOfChapter
      ? chapterDataMatches
        ? loadedChapter.numberOfVerses
        : undefined
      : ref.endVerse;

    decorationId = emphasizeVerses(tab.readingState, {
      book: ref.bookId as BookId,
      chapter: ref.chapter,
      verse: ref.verse,
      endChapter: ref.endChapter,
      endVerse: endVerse,
    });
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

/** Id under which the playlist-editing tools are registered with `ChatsManager`. */
const PLAYLIST_EDITOR_CHAT_CONTEXT_ID = "playlist-editor";

export function createPlaylistManager(
  os: CasualOSManager,
  login: LoginManager,
  tabs: TabsManager,
  navigation: NavigationManager,
  isMobile: ReadonlySignal<boolean>,
  modals: ModalManager,
  i18n: I18nManager,
  readingExtensionManager: BibleReadingExtensionManager,
  discover: DiscoverManager,
  chats: ChatsManager
) {
  const initialPlaylistLocator = signal(
    navigation.currentUrl.value.searchParams.get("playlist")
  );
  const initialPlaylistStep = signal(
    navigation.currentUrl.value.searchParams.get("playlistStep")
  );
  const userPlaylists = signal<Playlist[]>([]);
  /** Latest play per playlist for the signed-in user, newest first. */
  const userPlaylistHistory = signal<PlaylistPlayHistory[]>([]);

  // view/isDiscoverOpen are owned by DiscoverManager now; these are local
  // aliases so the rest of this function keeps working unchanged.
  const view = discover.view;
  const isDiscoverOpen = discover.isDiscoverOpen;

  /** The playlist currently being edited/created in the pane, or null. */
  const editingPlaylist = signal<Playlist | null>(null);

  /**
   * Id of the history row being written for the active play session, or null
   * when nothing is being tracked (signed out, `history: false`, or idle).
   */
  const activePlayHistoryId = signal<string | null>(null);
  const activePlayHistoryStartedAtMs = signal<number | null>(null);

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

  const actualView = computed(() =>
    discover.resolveActualView(!!playing.value)
  );

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

    openPlaylistItemPreview(modals, item, PLAYLIST_ITEM_MODAL_ID, i18n.t);
  };

  const savePlaylist = async (playlist: Playlist) => {
    await os.recordData(playlist.recordName, playlist.id, playlist, {
      marker: "publicRead:playlists",
    });
  };

  const savePlayHistory = async (entry: PlaylistPlayHistory) => {
    const parsed = PlaylistPlayHistorySchema.parse(entry);
    await os.recordData(parsed.recordName, parsed.id, parsed, {
      marker: PLAYLIST_PLAY_HISTORY_MARKER,
    });
  };

  const erasePlayHistory = async (
    entry: PlaylistPlayHistory
  ): Promise<void> => {
    try {
      await os.eraseData(entry.recordName, entry.id);
    } catch (error) {
      console.error("Failed to erase playlist play history:", error);
    }
  };

  /**
   * Drops every history row that is not in `keep`, both in memory (caller
   * updates the signal) and best-effort on the backend. Used after load and
   * after starting a play so leftover sessions for the same playlist (and
   * overflow past the retention cap) never accumulate.
   */
  const prunePlayHistoryOutside = (
    all: PlaylistPlayHistory[],
    keep: PlaylistPlayHistory[]
  ): void => {
    const keepIds = new Set(keep.map((entry) => entry.id));
    for (const entry of all) {
      if (!keepIds.has(entry.id)) {
        void erasePlayHistory(entry);
      }
    }
  };

  const loadPlayHistory = async (
    recordName: string
  ): Promise<PlaylistPlayHistory[]> => {
    // Paginate through every page — a single `listDataByMarker` page is ordered
    // by record address (random UUID), not by recency, so recent plays would
    // silently disappear once history grew past one page.
    const records = await os.listAllDataByMarker(
      recordName,
      PLAYLIST_PLAY_HISTORY_MARKER
    );
    if (records.success === false) {
      throw new Error("Failed to list playlist play history");
    }
    const all = records.items
      .map((record) => PlaylistPlayHistorySchema.safeParse(record.data))
      .filter((r) => r.success)
      .map((r) => r.data);
    const retained = retainPlaylistPlayHistory(all);
    prunePlayHistoryOutside(all, retained);
    return retained;
  };

  const upsertLocalPlayHistory = (entry: PlaylistPlayHistory) => {
    // `.peek()` so callers inside playback effects don't subscribe to the list
    // they are writing (that would trip Preact's cycle detection).
    const key = playlistPlayHistoryKey(entry);
    const without = userPlaylistHistory
      .peek()
      .filter((e) => e.id !== entry.id && playlistPlayHistoryKey(e) !== key);
    userPlaylistHistory.value = retainPlaylistPlayHistory([entry, ...without]);
  };

  /**
   * Writes progress for a history row. Skips the backend write when only the
   * wall-clock duration moved (idle parked on one step) — those are refreshed
   * locally for the Discover accordion and flushed for real on stop / step
   * change. Persistence is otherwise best-effort.
   */
  const persistPlayHistoryPatch = async (
    id: string,
    startedAtMs: number,
    patch: {
      currentStep: number;
      totalSteps: number;
      lastItem: PlaylistItemData | null;
      endedAtMs?: number | null;
    }
  ): Promise<void> => {
    const existing = userPlaylistHistory.peek().find((e) => e.id === id);
    if (!existing) {
      return;
    }
    const now = Date.now();
    // Playing the same playlist again reopens this row before a just-queued
    // finalize write lands; skip that stale "ended" patch so it cannot close
    // the session we just started.
    if (patch.endedAtMs != null && activePlayHistoryId.peek() === id) {
      return;
    }
    const endedAtMs =
      patch.endedAtMs !== undefined ? patch.endedAtMs : existing.endedAtMs;
    const durationMs = Math.max(0, (endedAtMs ?? now) - startedAtMs);
    const next: PlaylistPlayHistory = {
      ...existing,
      currentStep: patch.currentStep,
      totalSteps: patch.totalSteps,
      lastItem: patch.lastItem,
      endedAtMs: endedAtMs ?? null,
      durationMs,
      updatedAtMs: now,
    };

    const stepUnchanged =
      existing.currentStep === patch.currentStep &&
      existing.totalSteps === patch.totalSteps &&
      jsonEqual(existing.lastItem, patch.lastItem);
    const ending =
      patch.endedAtMs !== undefined && patch.endedAtMs !== existing.endedAtMs;

    // Always keep the in-memory row fresh for the accordion; only hit the
    // network when the user actually advanced or the session ended.
    upsertLocalPlayHistory(next);
    if (!ending && stepUnchanged) {
      return;
    }
    try {
      await savePlayHistory(next);
    } catch (error) {
      console.error("Failed to save playlist play history:", error);
    }
  };

  const patchActivePlayHistory = async (patch: {
    currentStep: number;
    totalSteps: number;
    lastItem: PlaylistItemData | null;
    endedAtMs?: number | null;
  }): Promise<void> => {
    const id = activePlayHistoryId.peek();
    const startedAtMs = activePlayHistoryStartedAtMs.peek();
    if (!id || startedAtMs == null) {
      return;
    }
    await persistPlayHistoryPatch(id, startedAtMs, patch);
  };

  /**
   * Opens (or resets) the single history row for this playlist. Playing again
   * overwrites that row with the current session so Discover shows latest
   * progress, not a log of every play. Local list updates first so Discover
   * can show it immediately; the CasualOS write is best-effort. Leftover
   * rows for the same playlist and overflow past the retention cap are erased.
   */
  const beginPlayHistory = async (
    playlist: SimplePlaylist & Pick<Playlist, "recordName">,
    queue: PlaylistItemData[],
    step: number
  ): Promise<void> => {
    const userId = login.userId.peek();
    if (!userId) {
      return;
    }
    const now = Date.now();
    const previous = userPlaylistHistory.peek();
    const existing = previous.find(
      (entry) =>
        playlistPlayHistoryKey(entry) ===
        playlistPlayHistoryKey({
          playlistRecordName: playlist.recordName,
          playlistId: playlist.id,
        })
    );
    const entry = PlaylistPlayHistorySchema.parse({
      id: existing?.id ?? `playlist_history_${uuid()}`,
      recordName: userId,
      userId,
      playlistId: playlist.id,
      playlistRecordName: playlist.recordName,
      playlistTitle: playlist.title,
      playlistDescription: playlist.description,
      previousHistoryId: null,
      totalSteps: queue.length,
      currentStep: step,
      lastItem: queue[step] ?? null,
      startedAtMs: now,
      endedAtMs: null,
      durationMs: 0,
      createdAtMs: existing?.createdAtMs ?? now,
      updatedAtMs: now,
    });
    activePlayHistoryId.value = entry.id;
    activePlayHistoryStartedAtMs.value = now;

    const nextList = retainPlaylistPlayHistory([entry, ...previous]);
    userPlaylistHistory.value = nextList;
    prunePlayHistoryOutside([entry, ...previous], nextList);

    try {
      await savePlayHistory(entry);
    } catch (error) {
      console.error("Failed to save playlist play history:", error);
    }
  };

  /**
   * Snapshots the current active history session (if any), clears the active
   * pointers immediately, then persists the ended row. Clearing first avoids
   * racing a follow-up `beginPlayHistory` that would otherwise see the old id.
   */
  const finalizeActivePlayHistory = (): void => {
    const id = activePlayHistoryId.peek();
    const startedAtMs = activePlayHistoryStartedAtMs.peek();
    const playingState = playing.peek();
    activePlayHistoryId.value = null;
    activePlayHistoryStartedAtMs.value = null;
    if (!id || startedAtMs == null) {
      return;
    }
    const step = playingState?.currentIndex.peek() ?? -1;
    const queue = playingState?.queue.peek() ?? [];
    void persistPlayHistoryPatch(id, startedAtMs, {
      currentStep: step,
      totalSteps: queue.length,
      lastItem: queue[step] ?? null,
      endedAtMs: Date.now(),
    });
  };

  const isHistoryForPlaylist = (
    entry: PlaylistPlayHistory,
    playlist: Pick<Playlist, "id" | "recordName">
  ): boolean =>
    entry.playlistId === playlist.id &&
    entry.playlistRecordName === playlist.recordName;

  /**
   * Drops matching history rows from memory and the backend. Clears the
   * active session pointer first when it points at a dropped row so an
   * in-flight finalize cannot resurrect it.
   */
  const dropPlayHistoryForPlaylist = (
    playlist: Pick<Playlist, "id" | "recordName">
  ): void => {
    const matching = userPlaylistHistory
      .peek()
      .filter((entry) => isHistoryForPlaylist(entry, playlist));
    if (matching.some((entry) => entry.id === activePlayHistoryId.peek())) {
      activePlayHistoryId.value = null;
      activePlayHistoryStartedAtMs.value = null;
    }
    userPlaylistHistory.value = userPlaylistHistory
      .peek()
      .filter((entry) => !isHistoryForPlaylist(entry, playlist));
    for (const entry of matching) {
      void erasePlayHistory(entry);
    }
  };

  /**
   * Removes one play session from Discover history. Playback itself is left
   * running if this was the active row; only tracking stops.
   */
  const removePlayHistory = async (
    entry: PlaylistPlayHistory
  ): Promise<void> => {
    if (activePlayHistoryId.peek() === entry.id) {
      activePlayHistoryId.value = null;
      activePlayHistoryStartedAtMs.value = null;
    }
    userPlaylistHistory.value = userPlaylistHistory
      .peek()
      .filter((existing) => existing.id !== entry.id);
    await erasePlayHistory(entry);
  };

  /**
   * Reports a playlist analytics event for each given playlist, tagging
   * whether the current user authored it. Used to distinguish playback by the
   * creator from playback by someone the playlist was shared with. Accepts
   * `SimplePlaylist` (an unsaved playlist, e.g. an AI-generated one played
   * before it's ever recorded) as well as a full `Playlist` — an unsaved
   * playlist has no `authorUserId` on record, so it's attributed to the
   * current user, the only one who could have been playing it.
   * `extraProperties` are merged in on top of the common `playlistId`/
   * `playlistLocator`/`isCreator` fields, so every playlist event stays
   * queryable by the same base shape in PostHog.
   */
  const capturePlaylistEvent = (
    eventName: string,
    playlists: SimplePlaylist[],
    extraProperties: Record<string, unknown> = {}
  ): void => {
    if (typeof posthog === "undefined" || !posthog) {
      return;
    }
    const userId = login.userId.peek();
    for (const playlist of playlists) {
      const authorUserId = (playlist as Partial<Playlist>).authorUserId;
      posthog.capture(eventName, {
        playlistId: playlist.id,
        playlistLocator: getPlaylistLocator(playlist),
        isCreator: authorUserId == null || authorUserId === userId,
        ...extraProperties,
      });
    }
  };

  /**
   * Permanently deletes a playlist: erases its record, drops it from
   * `userPlaylists`, clears matching play-history rows, and clears any
   * edit/playback state that referenced it.
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
    const wasPlaying = !!playing
      .peek()
      ?.playlists.peek()
      .some((p) => p.id === playlist.id);
    // Drop history before stopPlaying so finalize cannot write the rows back.
    dropPlayHistoryForPlaylist(playlist);
    if (wasPlaying) {
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
   * `editingPlaylist` to a fresh, unsaved playlist, optionally pre-filled
   * with the given title/description/items (e.g. an AI-generated playlist).
   * Persisting happens later via `saveEditingPlaylist`. No-op when not
   * signed in.
   */
  const createNewPlaylist = async (
    initial?: Pick<Playlist, "title" | "description" | "items">
  ): Promise<Signal<Playlist | null> | null> => {
    let userId = login.userId.value;
    if (!userId) {
      const userInfo = await login.login();
      if (!userInfo) {
        console.warn("Cannot create a playlist while signed out.");
        return null;
      }
      userId = userInfo.id;
    }
    const now = Date.now();
    editingPlaylist.value = PlaylistSchema.parse({
      id: `playlist_${uuid()}`,
      recordName: userId,
      authorUserId: userId,
      title: initial?.title ?? null,
      description: initial?.description ?? null,
      items: initial?.items ?? [],
      createdAtMs: now,
      updatedAtMs: now,
    });
    view.value = "create_playlist";

    return editingPlaylist;
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
    capturePlaylistEvent(
      exists ? "playlist_updated" : "playlist_created",
      [playlist],
      { itemCount: playlist.items.length }
    );
    userPlaylists.value = exists
      ? userPlaylists.value.map((p) => (p.id === playlist.id ? playlist : p))
      : [...userPlaylists.value, playlist];
    editingPlaylist.value = null;
    view.value = "discover";
  };

  /**
   * Patches the currently-edited playlist's title and/or description. No-op
   * when there is no playlist being edited. Persisting happens later via
   * `saveEditingPlaylist`.
   */
  const updateEditingPlaylistMetadata = (
    updates: Partial<Pick<Playlist, "title" | "description">>
  ): string => {
    const current = editingPlaylist.value;
    if (!current) {
      return "error: no playlist is currently being edited";
    }
    editingPlaylist.value = { ...current, ...updates };
    return "success";
  };

  /**
   * Appends an item to the currently-edited playlist. No-op when there is no
   * playlist being edited. Persisting happens later via `saveEditingPlaylist`.
   */
  const addEditingPlaylistItem = (item: PlaylistItemData): string => {
    const current = editingPlaylist.value;
    if (!current) {
      return "error: no editing playlist";
    }
    editingPlaylist.value = {
      ...current,
      items: [...current.items, item],
    };
    return "success";
  };

  /**
   * Inserts an item at the given index in the currently-edited playlist. No-op when there is no
   * playlist being edited. Persisting happens later via `saveEditingPlaylist`.
   */
  const insertEditingPlaylistItem = (
    index: number,
    item: PlaylistItemData
  ): string => {
    const current = editingPlaylist.value;
    if (!current) {
      return "error: no editing playlist";
    }
    if (index < 0 || index > current.items.length) {
      return `error: index out of range (0-${current.items.length})`;
    }
    editingPlaylist.value = {
      ...current,
      items: [
        ...current.items.slice(0, index),
        item,
        ...current.items.slice(index),
      ],
    };
    return "success";
  };

  /**
   * Replaces the item at the given index in the currently-edited playlist.
   * No-op when there is no playlist being edited or the index is out of range.
   * Persisting happens later via `saveEditingPlaylist`.
   */
  const updateEditingPlaylistItem = (
    index: number,
    item: PlaylistItemData
  ): string => {
    const current = editingPlaylist.value;
    if (!current) {
      return "error: no editing playlist";
    }
    if (index < 0 || index >= current.items.length) {
      return `error: index out of range (0-${current.items.length - 1})`;
    }
    editingPlaylist.value = {
      ...current,
      items: current.items.map((existing, i) =>
        i === index ? item : existing
      ),
    };
    return "success";
  };

  /**
   * Removes the item at the given index from the currently-edited playlist.
   * No-op when there is no playlist being edited. Persisting happens later via
   * `saveEditingPlaylist`.
   */
  const removeEditingPlaylistItem = (index: number): string => {
    const current = editingPlaylist.value;
    if (!current) {
      return "error: no editing playlist";
    }
    editingPlaylist.value = {
      ...current,
      items: current.items.filter((_, i) => i !== index),
    };
    return "success";
  };

  /**
   * Moves an item within the currently-edited playlist from one index to
   * another. No-op when there is no playlist being edited, either index is
   * out of range, or the indices are equal. Mirrors `reorderQueue`'s splice
   * semantics; unlike `reorderQueue` there's no `currentIndex`-style value to
   * follow along here — the caller is responsible for keeping any "currently
   * being edited" index pointed at the same logical item.
   */
  const reorderEditingPlaylistItem = (from: number, to: number): string => {
    const current = editingPlaylist.value;
    if (!current) {
      return "error: no editing playlist";
    }
    const length = current.items.length;
    if (from < 0 || from >= length) {
      return `error: original index out of range (0-${length - 1}) or equal`;
    } else if (to < 0 || to >= length) {
      return `error: target index out of range (0-${length - 1}) or equal`;
    } else if (from === to) {
      return "success";
    }
    const nextItems = [...current.items];
    const [moved] = nextItems.splice(from, 1);
    if (!moved) {
      return "success";
    }
    nextItems.splice(to, 0, moved);
    editingPlaylist.value = { ...current, items: nextItems };
    return "success";
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
   * When the user is signed in and `options.history` is not `false`, the
   * single history row for the first recorded playlist is opened or reset.
   *
   * Returns the live playing state, or null when there is no tab to play on.
   */
  const startPlaying = (
    playlist: SimplePlaylist | SimplePlaylist[],
    initialStep = 0,
    options?: StartPlayingOptions
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

    // Ending an existing tracked session before opening the next one keeps
    // duration/endedAt accurate when the user starts another playlist without
    // an explicit stop.
    if (activePlayHistoryId.peek()) {
      finalizeActivePlayHistory();
    }
    capturePlaylistEvent("playlist_played", playlists);

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

    const trackHistory = options?.history !== false;
    const firstPlaylist = playlists[0];
    if (
      trackHistory &&
      firstPlaylist &&
      isRecordedPlaylist(firstPlaylist) &&
      login.userId.peek()
    ) {
      void beginPlayHistory(firstPlaylist, queue, step);
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
    finalizeActivePlayHistory();
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

  /**
   * Loads the playlist for a history row and starts playback at the saved step.
   * The playlist's history row is reset to this new session.
   */
  const continueFromHistory = async (
    entry: PlaylistPlayHistory
  ): Promise<void> => {
    const playlist = await loadPlaylist(
      entry.playlistRecordName,
      entry.playlistId
    );
    const step = Math.max(0, entry.currentStep);
    startPlaying(playlist, step);
  };

  /**
   * Loads the playlist for a history row and starts playback from the beginning.
   * The playlist's history row is reset to this new session.
   */
  const replayFromHistory = async (
    entry: PlaylistPlayHistory
  ): Promise<void> => {
    const playlist = await loadPlaylist(
      entry.playlistRecordName,
      entry.playlistId
    );
    startPlaying(playlist, 0);
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

  const syncPlayHistory = async () => {
    if (!login.userId.value) {
      userPlaylistHistory.value = [];
      activePlayHistoryId.value = null;
      activePlayHistoryStartedAtMs.value = null;
      return;
    }

    try {
      userPlaylistHistory.value = await loadPlayHistory(login.userId.value);
    } catch (error) {
      console.error("Failed to sync playlist play history:", error);
    }
  };

  effect(() => {
    void syncPlaylists();
  });

  effect(() => {
    void syncPlayHistory();
  });

  effect(() => {
    if (!playing.value) {
      return;
    }

    showItemInModal(playing.value.currentItem.value);
  });

  // Mirror queue position into the active history row whenever it changes.
  // Identical step patches are no-ops for the backend (see persistPlayHistoryPatch),
  // so the write that beginPlayHistory already did is not immediately repeated.
  effect(() => {
    const historyId = activePlayHistoryId.value;
    const playingState = playing.value;
    if (!historyId || !playingState) {
      return;
    }
    const step = playingState.currentIndex.value;
    const queue = playingState.queue.value;
    void patchActivePlayHistory({
      currentStep: step,
      totalSteps: queue.length,
      lastItem: queue[step] ?? null,
    });
  });

  // Duration for an active session is refreshed locally on step changes and
  // flushed to the backend on stop — no idle 5s recordData timer.

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

      // Reports a `playlist_finished` event the first time *this client's
      // own* forward navigation reaches the last item in the queue. Hooked
      // onto `next()` itself rather than a reactive effect on `currentIndex`,
      // because `next()` is only ever called by this client's own advance —
      // never by an inbound session sync (which moves the index via
      // `setState` instead, so every synced participant's index can shift
      // without each of them having "finished" anything) and never by a
      // queue edit (`removeFromQueue` clamping the index after the trailing
      // items are deleted doesn't call `next()` either). Comparing the index
      // before/after also rules out a single-item queue's starting position,
      // a deep link that opens directly on the last step, and a redundant
      // press of "next" while already on the last item — none of those are a
      // forward move. Guarded by `hasFiredFinished` so navigating back and
      // forth over the last item doesn't re-report it.
      let hasFiredFinished = false;
      const localNext = playingState.next;
      playingState.next = async (): Promise<void> => {
        const before = playingState.currentIndex.peek();
        await localNext();
        const after = playingState.currentIndex.peek();
        const queueLength = playingState.queue.peek().length;
        if (
          hasFiredFinished ||
          after <= before ||
          queueLength === 0 ||
          after !== queueLength - 1
        ) {
          return;
        }
        hasFiredFinished = true;
        capturePlaylistEvent(
          "playlist_finished",
          playingState.playlists.peek()
        );
      };

      // Playback governs stepping *within* the queue; at its edges the reader's
      // own chapter navigation takes over again. Before this, reaching the last
      // item left next/previous permanently dead — nothing stops playback from
      // the reading plans pane (its player lives in the discover pane, which
      // isn't even open), so the reader simply looked broken with no way out.
      const hasNext = computed(
        () =>
          playingState.hasNext.value ||
          !!readingState.chapterData.value?.nextChapterApiLink
      );
      const hasPrevious = computed(
        () =>
          playingState.hasPrevious.value ||
          !!readingState.chapterData.value?.previousChapterApiLink
      );

      const instance: PlaylistReadingExtensionInstance = {
        playingState,

        hasNext,
        hasPrevious,

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
        // These return synchronously when they decline to intervene. Chapter
        // navigation writes its new position before the first `await`, so an
        // `async` hook here would put a microtask in front of every press —
        // enough for two quick presses to compute the same target.
        // At the ends of the queue these fall through to `default` rather than
        // `prevent`, so the reader keeps navigating chapter by chapter once the
        // queue is exhausted instead of going dead (see `hasNext` above).
        navigateNext: () => {
          if (
            playingState.queue.value.length === 0 ||
            !playingState.hasNext.value
          ) {
            return { type: "default" };
          }
          return playingState.next().then(() => ({ type: "prevent" }) as const);
        },
        navigatePrevious: () => {
          if (
            playingState.queue.value.length === 0 ||
            !playingState.hasPrevious.value
          ) {
            return { type: "default" };
          }
          return playingState
            .previous()
            .then(() => ({ type: "prevent" }) as const);
        },
        // Keeps the mobile swipe preview honest: while playing, the next chapter
        // is the queue's next scripture step, not the chapter that happens to
        // follow this one. A plan session whose readings jump between books
        // (Genesis 1, then Exodus 2) used to animate in Genesis 2 and then land
        // on Exodus 2 — the swipe looked broken.
        getAdjacentChapter: ({ direction }) => {
          const queue = playingState.queue.value;
          if (queue.length === 0) {
            return undefined; // nothing playing — the reader's own neighbour
          }
          const stepIndex =
            playingState.currentIndex.value + (direction === "next" ? 1 : -1);
          const step = queue[stepIndex];
          if (!step) {
            // Past the queue's edge, navigation falls through to the reader's
            // own chapter stepping, so preview that instead.
            return undefined;
          }
          if (step.type !== "bible-verse") {
            // A text/link step doesn't move the reader (it opens a modal), so
            // the chapter on screen is what stays. Nothing to preview.
            return null;
          }
          return {
            translationId: step.translationId,
            bookId: step.ref.bookId,
            chapter: step.ref.chapter,
          };
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

  /**
   * Builds the AI tools that let a provider edit whatever playlist is
   * currently open in the editor (`editingPlaylist`): add/update/delete items
   * and update the playlist metadata. Each tool reads `editingPlaylist` live
   * at call time, so it always targets the playlist being edited at that
   * moment rather than a fixed snapshot.
   */
  const getEditPlaylistTools = () => {
    const insertPlaylistItemTool = generateFunctionTool({
      name: "insertPlaylistItem",
      description: "Inserts an item into the playlist.",
      parameters: AIPlaylistItemSchema.extend({
        index: z.number(),
      }),
      function: async (args) => {
        try {
          return insertEditingPlaylistItem(
            args.index,
            convertToPlaylistItem(args)
          );
        } catch (err) {
          return `error: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    });

    const updatePlaylistItemTool = generateFunctionTool({
      name: "updatePlaylistItem",
      description: "Updates an item in the playlist.",
      parameters: AIPlaylistItemSchema.extend({
        index: z.number(),
      }),
      function: async (args) => {
        try {
          return updateEditingPlaylistItem(
            args.index,
            convertToPlaylistItem(args)
          );
        } catch (err) {
          return `error: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    });

    const movePlaylistItemTool = generateFunctionTool({
      name: "movePlaylistItem",
      description: "Moves an item in the playlist.",
      parameters: z.object({
        originalIndex: z.number(),
        newIndex: z.number(),
      }),
      function: async (args) =>
        reorderEditingPlaylistItem(args.originalIndex, args.newIndex),
    });

    const deletePlaylistItemTool = generateFunctionTool({
      name: "deletePlaylistItem",
      description: "Deletes an item from the playlist.",
      parameters: z.object({
        index: z.number(),
      }),
      function: async (args) => removeEditingPlaylistItem(args.index),
    });

    const updatePlaylistTool = generateFunctionTool({
      name: "updatePlaylistMetadata",
      description: "Updates the playlist metadata (title, description)",
      parameters: z.object({
        title: z.string(),
        description: z.string().nullable(),
      }),
      function: async (args) => {
        const current = editingPlaylist.value;
        if (!current) {
          return "error: no playlist is currently being edited";
        }

        return updateEditingPlaylistMetadata({
          title: args.title,
          description: args.description ?? current.description ?? null,
        });
      },
    });

    const getPlaylistStateTool = generateFunctionTool({
      name: "getPlaylistState",
      description:
        "Returns the current, live contents of the playlist being edited (title, description, and items). Always call this to check the playlist's actual state instead of relying on anything said earlier in the conversation — earlier tool results may no longer be accurate (e.g. if the user undid or discarded a change).",
      parameters: z.object({}),
      function: async () => {
        const current = editingPlaylist.value;
        if (!current) {
          return "error: no playlist is currently being edited";
        }
        return JSON.stringify(buildGeneratedPlaylist(current));
      },
    });

    return [
      updatePlaylistTool.tool,
      insertPlaylistItemTool.tool,
      updatePlaylistItemTool.tool,
      deletePlaylistItemTool.tool,
      movePlaylistItemTool.tool,
      getPlaylistStateTool.tool,
    ];
  };

  /** Converts a `Playlist` into the AI-facing `GeneratedPlaylist` shape. */
  const buildGeneratedPlaylist = (playlist: Playlist): GeneratedPlaylist => ({
    title: playlist.title ?? null,
    description: playlist.description ?? null,
    items: playlist.items.map((i) => convertToAiPlaylistItem(i)),
  });

  // While a playlist is open in the editor, expose the playlist-editing tools
  // to every AI chat via `ChatsManager`, so an AI participant can add/update/
  // remove items and edit the title/description as the user asks. Withdrawn
  // as soon as the user leaves the editor (save or cancel), so the tools
  // aren't offered outside of an actual editing session.
  effect(() => {
    if (!editingPlaylist.value || !isDiscoverOpen.value) {
      chats.removeContext(PLAYLIST_EDITOR_CHAT_CONTEXT_ID);
      return;
    }

    const generatedPlaylist = buildGeneratedPlaylist(editingPlaylist.value);
    const playlistLabel = editingPlaylist.value.title
      ? `"${editingPlaylist.value.title}"`
      : "this untitled playlist";
    chats.addContext({
      id: PLAYLIST_EDITOR_CHAT_CONTEXT_ID,
      label: {
        key: "playlist-editor",
        defaultValue: "Playlist Editor",
      },
      instructions: `The user is currently creating or editing a Bible reading playlist (${playlistLabel}). Use the provided tools to add, update, or remove playlist items, and to update the playlist's title and description, as the user asks. These tools ONLY ever apply to this one open playlist — never use them to satisfy a request for a different or additional playlist; if the user asks to create or edit some other playlist while this one is still open, tell them to close this editor first instead of reusing these tools on the wrong playlist. The snapshot below reflects the playlist's live, current state as of this message, and supersedes anything said earlier in the conversation (e.g. an item that was removed and then restored by cancelling); call getPlaylistState first if you need to confirm the current contents before answering a question about them. Playlist: ${JSON.stringify(generatedPlaylist)}`,
      tools: getEditPlaylistTools(),
    });
  });

  return {
    savePlaylist,
    deletePlaylist,
    createNewPlaylist,
    editPlaylist,
    saveEditingPlaylist,
    updateEditingPlaylistMetadata,
    addEditingPlaylistItem,
    insertEditingPlaylistItem,
    updateEditingPlaylistItem,
    removeEditingPlaylistItem,
    reorderEditingPlaylistItem,
    cancelEditingPlaylist,
    listPlaylists,
    loadPlaylist,
    userPlaylists,
    userPlaylistHistory,
    availablePlaylists,
    view,
    actualView,
    editingPlaylist,
    playing,
    startPlaying,
    stopPlaying,
    continueFromHistory,
    replayFromHistory,
    removePlayHistory,
    getPlaylistUrl,
    isDiscoverOpen,
    goBackFromPlayingView,
    isMobile,
  };
}
