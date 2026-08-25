import { createI18nManager } from "@packages/seed-bible/seed-bible/i18n";
import {
  CasualOSManager,
  createModalManager,
  createNavigationManager,
} from "@packages/seed-bible/seed-bible/managers";
import {
  createBibleReadingExtensionManager,
  type ReadingExtensionRuntime,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingExtensionManager";
import {
  PlaylistItem,
  PlaylistSchema,
  PlaylistPlayHistorySchema,
  createPlaylistManager,
  createPlayingState,
  formatPlaylistPlayDurationMs,
  groupPlaylistPlayHistoryByDay,
  isPlaylistPlayHistoryComplete,
  playlistPlayHistoryDayKind,
  playlistPlayHistoryPercent,
  retainPlaylistPlayHistory,
  MAX_PLAYLIST_PLAY_HISTORY,
  type Playlist,
  type PlaylistItemData,
  type PlaylistPlayHistory,
  type PlaylistReadingData,
  type PlaylistReadingExtensionInstance,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { IdentifiedLocalChatContext } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { TranslationBookChapter } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { createDiscoverManager } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import { computed, signal } from "@preact/signals";
import type { Mock } from "vitest";

const START_MS = Date.UTC(2026, 5, 17, 13, 45, 0);
const MARKER = "publicRead:playlists";
const HISTORY_MARKER = "publicRead:playlistPlayHistory";

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return PlaylistSchema.parse({
    id: "playlist-1",
    recordName: "user-1",
    authorUserId: "user-1",
    title: "My Playlist",
    description: null,
    items: [],
    createdAtMs: START_MS,
    updatedAtMs: START_MS,
    ...overrides,
  });
}

function makeHistory(
  overrides: Partial<PlaylistPlayHistory> = {}
): PlaylistPlayHistory {
  return PlaylistPlayHistorySchema.parse({
    id: "playlist_history_1",
    recordName: "user-1",
    userId: "user-1",
    playlistId: "playlist-1",
    playlistRecordName: "user-1",
    playlistTitle: "My Playlist",
    playlistDescription: null,
    previousHistoryId: null,
    totalSteps: 2,
    currentStep: 0,
    lastItem: { type: "html", html: "<p>hi</p>" },
    startedAtMs: START_MS,
    endedAtMs: null,
    durationMs: 0,
    createdAtMs: START_MS,
    updatedAtMs: START_MS,
    ...overrides,
  });
}

describe("Playlist schemas", () => {
  it("parses each playlist item variant", () => {
    expect(() =>
      PlaylistItem.parse({
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 1, verse: 1 },
      })
    ).not.toThrow();
    expect(() =>
      PlaylistItem.parse({ type: "html", html: "<p>hi</p>" })
    ).not.toThrow();
    expect(() =>
      PlaylistItem.parse({ type: "link", url: "https://example.com" })
    ).not.toThrow();
  });

  it("rejects an unknown item type and a malformed link", () => {
    expect(() => PlaylistItem.parse({ type: "nope" })).toThrow();
    expect(() =>
      PlaylistItem.parse({ type: "link", url: "not-a-url" })
    ).toThrow();
  });

  it("parses a playlist carrying items of mixed types", () => {
    const playlist = makePlaylist({
      items: [
        { type: "bible-verse", ref: { bookId: "JHN", chapter: 3, verse: 16 } },
        { type: "link", url: "https://example.com" },
      ],
    });
    expect(playlist.items).toHaveLength(2);
  });
});

describe("playlist play history helpers", () => {
  it("computes percent complete from the current step", () => {
    expect(playlistPlayHistoryPercent({ currentStep: 0, totalSteps: 4 })).toBe(
      0.25
    );
    expect(playlistPlayHistoryPercent({ currentStep: 3, totalSteps: 4 })).toBe(
      1
    );
    expect(playlistPlayHistoryPercent({ currentStep: -1, totalSteps: 0 })).toBe(
      0
    );
  });

  it("treats the last queue index as complete", () => {
    expect(
      isPlaylistPlayHistoryComplete({ currentStep: 2, totalSteps: 3 })
    ).toBe(true);
    expect(
      isPlaylistPlayHistoryComplete({ currentStep: 1, totalSteps: 3 })
    ).toBe(false);
  });

  it("formats wall-clock durations", () => {
    expect(formatPlaylistPlayDurationMs(5_000)).toBe("5s");
    expect(formatPlaylistPlayDurationMs(65_000)).toBe("1m 5s");
    expect(formatPlaylistPlayDurationMs(3_661_000)).toBe("1h 1m");
  });

  it("keeps one newest session per playlist, capped", () => {
    const older = makeHistory({
      id: "h-old",
      playlistId: "p1",
      startedAtMs: START_MS,
    });
    const newer = makeHistory({
      id: "h-new",
      playlistId: "p1",
      startedAtMs: START_MS + 10_000,
    });
    const other = makeHistory({
      id: "h-other",
      playlistId: "p2",
      startedAtMs: START_MS + 5_000,
    });
    expect(
      retainPlaylistPlayHistory([older, newer, other]).map((e) => e.id)
    ).toEqual(["h-new", "h-other"]);

    const many = Array.from({ length: MAX_PLAYLIST_PLAY_HISTORY + 5 }, (_, i) =>
      makeHistory({
        id: `h-${i}`,
        playlistId: `playlist-${i}`,
        startedAtMs: START_MS + i,
      })
    );
    const retained = retainPlaylistPlayHistory(many);
    expect(retained).toHaveLength(MAX_PLAYLIST_PLAY_HISTORY);
    expect(retained[0]!.id).toBe(`h-${MAX_PLAYLIST_PLAY_HISTORY + 4}`);
    expect(retained.at(-1)!.id).toBe("h-5");
  });

  it("groups the latest play of each playlist by calendar day", () => {
    const today = makeHistory({
      id: "h-today",
      playlistId: "p-today",
      startedAtMs: Date.UTC(2026, 5, 17, 13, 45, 0),
    });
    const yesterday = makeHistory({
      id: "h-yesterday",
      playlistId: "p-yesterday",
      startedAtMs: Date.UTC(2026, 5, 16, 8, 0, 0),
    });
    const older = makeHistory({
      id: "h-older",
      playlistId: "p-older",
      startedAtMs: Date.UTC(2026, 5, 10, 12, 0, 0),
    });
    const groups = groupPlaylistPlayHistoryByDay(
      [older, today, yesterday],
      "UTC"
    );
    expect(groups.map((g) => g.dayKey)).toEqual([
      "2026-06-17",
      "2026-06-16",
      "2026-06-10",
    ]);
    expect(groups[0]!.entries.map((e) => e.id)).toEqual(["h-today"]);
    expect(
      playlistPlayHistoryDayKind(
        "2026-06-17",
        Date.UTC(2026, 5, 17, 18, 0, 0),
        "UTC"
      )
    ).toBe("today");
    expect(
      playlistPlayHistoryDayKind(
        "2026-06-16",
        Date.UTC(2026, 5, 17, 18, 0, 0),
        "UTC"
      )
    ).toBe("yesterday");
    expect(
      playlistPlayHistoryDayKind(
        "2026-06-10",
        Date.UTC(2026, 5, 17, 18, 0, 0),
        "UTC"
      )
    ).toBe("date");
  });
});

type LoginArg = Parameters<typeof createPlaylistManager>[1];
type TabsArg = Parameters<typeof createPlaylistManager>[2];
type ChatsArg = Parameters<typeof createPlaylistManager>[9];
type TabArg = Parameters<typeof createPlayingState>[1];

/** A minimal `ChatsManager` fake exposing just the context registration surface. */
function makeChats(): {
  chats: ChatsArg;
  addContext: Mock;
  removeContext: Mock;
} {
  const addContext = vi.fn();
  const removeContext = vi.fn();
  const chats = { addContext, removeContext } as unknown as ChatsArg;
  return { chats, addContext, removeContext };
}

/**
 * The reading-extension registry shared by the fake reading states and the
 * manager under test, so enabling the "playlist" extension on a tab resolves
 * the definition the manager registered. Set in the `createPlaylistManager`
 * `beforeEach`; unused by the standalone `createPlayingState` tests.
 */
let sharedReadingExtensionManager:
  | ReturnType<typeof createBibleReadingExtensionManager>
  | undefined;

/**
 * Builds a fake reading state that actually enables/disables reading
 * extensions (via {@link sharedReadingExtensionManager}), so `manager.playing`
 * — which now derives from the tab's enabled "playlist" runtime — resolves.
 * Also provides the stubs `createPlayingState`'s navigation effect touches.
 */
function makeReadingState(
  selectTranslationAndChapter: Mock,
  translationId = "BSB"
) {
  const runtimes = signal(new Map<string, ReadingExtensionRuntime>());
  const self: any = {
    selectTranslationAndChapter,
    translationId: signal(translationId),
    // `setState` compares the current item's ref against these to decide whether
    // a re-navigation is needed when the step is unchanged.
    bookId: signal<string | null>(null),
    chapterNumber: signal<number>(1),
    // `navigateToCurrentItem` reads this to resolve a `toEndOfChapter`
    // fragment's real end verse; defaults to null (unloaded), settable per
    // test via `tab.readingState.chapterData.value = {...}`.
    chapterData: signal<TranslationBookChapter | null>(null),
    decorateVerses: vi.fn(),
    removeDecoration: vi.fn(),
    enabledExtensions: computed(() => Array.from(runtimes.value.values())),
    isExtensionEnabled: (id: string) => runtimes.value.has(id),
    enableExtension: (id: string, data?: unknown) => {
      const existing = runtimes.value.get(id);
      if (existing) {
        if (data !== undefined) {
          existing.data.value = data;
        }
        return;
      }
      const definition = sharedReadingExtensionManager?.getReadingExtension(id);
      if (!definition) {
        return;
      }
      const dataSignal = signal<unknown>(data);
      const instance = definition.activate({
        readingState: self,
        data: dataSignal,
        isShared: signal(false),
      });
      const next = new Map(runtimes.value);
      next.set(id, { id, definition, instance, data: dataSignal });
      runtimes.value = next;
    },
    disableExtension: (id: string) => {
      const runtime = runtimes.value.get(id);
      if (!runtime) {
        return;
      }
      runtime.instance.dispose?.();
      const next = new Map(runtimes.value);
      next.delete(id);
      runtimes.value = next;
    },
  };
  return self;
}

/** Builds a mock reader tab whose reading state records navigation calls. */
function makeTab(
  id: string,
  selectTranslationAndChapter: Mock,
  translationId = "BSB"
): NonNullable<TabArg> {
  return {
    id,
    title: id,
    readingState: makeReadingState(selectTranslationAndChapter, translationId),
    sharedSession: null,
  } as unknown as NonNullable<TabArg>;
}

/** Builds a mock TabsManager with a single, selected tab. */
function makeTabs(tab: NonNullable<TabArg>): TabsArg {
  return {
    tabs: signal([tab]),
    selectedTabId: signal(tab.id),
  } as unknown as TabsArg;
}

/**
 * Builds a mock reader tab along with directly-referenceable
 * `enableExtension`/`disableExtension` mocks, for tests asserting on those
 * calls specifically (mirrors `makeTab`, which doesn't expose them directly).
 */
function makeTabWithExtensionMocks(
  id: string,
  selectTranslationAndChapter: Mock
): {
  tab: NonNullable<TabArg>;
  enableExtension: Mock;
  disableExtension: Mock;
} {
  const readingState = makeReadingState(selectTranslationAndChapter);
  // Wrap the real enable/disable so tests can assert on the calls while the
  // extension still actually activates (which is what `manager.playing` reads).
  const realEnable = readingState.enableExtension;
  const realDisable = readingState.disableExtension;
  const enableExtension = vi.fn((extId: string, data?: unknown) =>
    realEnable(extId, data)
  );
  const disableExtension = vi.fn((extId: string) => realDisable(extId));
  readingState.enableExtension = enableExtension;
  readingState.disableExtension = disableExtension;
  const tab = {
    id,
    title: id,
    readingState,
    sharedSession: null,
  } as unknown as NonNullable<TabArg>;
  return { tab, enableExtension, disableExtension };
}

describe("createPlaylistManager", () => {
  let recordDataMock: Mock;
  let listDataByMarkerMock: Mock;
  let listAllDataByMarkerMock: Mock;
  let getDataMock: Mock;
  let eraseDataMock: Mock;
  let loginMock: Mock;
  let selectTranslationAndChapterMock: Mock;
  let warnSpy: Mock;
  let errorSpy: Mock;
  let userId: ReturnType<typeof signal<string | null>>;

  const flush = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  /**
   * The `navigation`/`readingExtensionManager` instances used by the most
   * recent `makeManager()` call, for tests that need to reach into URL sync
   * or the registered extension without changing every existing call site.
   */
  let lastNavigation: ReturnType<typeof createNavigationManager>;
  let lastReadingExtensionManager: ReturnType<
    typeof createBibleReadingExtensionManager
  >;
  /** The fake `ChatsManager`'s `addContext`/`removeContext` spies from the most recent `makeManager()` call. */
  let lastChatsAddContext: Mock;
  let lastChatsRemoveContext: Mock;

  const makeManager = (
    id: string | null = "user-1",
    tabsManager?: TabsArg,
    initialHref?: string
  ) => {
    userId = signal<string | null>(id);
    const os = CasualOSManager();
    Object.assign(os, {
      recordData: recordDataMock,
      listDataByMarker: listDataByMarkerMock,
      listAllDataByMarker: listAllDataByMarkerMock,
      getData: getDataMock,
      eraseData: eraseDataMock,
    });
    const login = { userId, login: loginMock } as unknown as LoginArg;
    const tabs =
      tabsManager ??
      makeTabs(makeTab("tab-1", selectTranslationAndChapterMock));
    const navigation = createNavigationManager(
      initialHref ? { initialHref } : undefined
    );
    const isMobile = signal(false);
    const modals = createModalManager();
    const i18n = createI18nManager(navigation, ["en"]);
    // Reuse the registry the fake reading states share, so the extension the
    // manager registers is the one those tabs can enable.
    const readingExtensionManager = sharedReadingExtensionManager!;
    const { chats, addContext, removeContext } = makeChats();
    lastNavigation = navigation;
    lastReadingExtensionManager = readingExtensionManager;
    const discover = createDiscoverManager();
    lastChatsAddContext = addContext;
    lastChatsRemoveContext = removeContext;
    return createPlaylistManager(
      os,
      login,
      tabs,
      navigation,
      isMobile,
      modals,
      i18n,
      readingExtensionManager,
      discover,
      chats
    );
  };

  beforeEach(() => {
    recordDataMock = vi.fn().mockResolvedValue(undefined);
    listDataByMarkerMock = vi
      .fn()
      .mockResolvedValue({ success: true, items: [] });
    listAllDataByMarkerMock = vi
      .fn()
      .mockResolvedValue({ success: true, items: [] });
    getDataMock = vi.fn().mockResolvedValue({ success: true, data: null });
    eraseDataMock = vi.fn().mockResolvedValue({ success: true });
    loginMock = vi.fn().mockResolvedValue(null);
    selectTranslationAndChapterMock = vi.fn().mockResolvedValue(undefined);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    sharedReadingExtensionManager = createBibleReadingExtensionManager();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    // Clear any query params written by URL sync so they don't leak into the
    // next test's initial navigation state.
    window.history.replaceState(null, "", window.location.pathname);
  });

  it("syncs the user's playlists on creation", async () => {
    const playlist = makePlaylist();
    listDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [{ data: playlist }],
    });

    const manager = makeManager("user-1");
    await flush();

    expect(listDataByMarkerMock).toHaveBeenCalledWith("user-1", MARKER);
    expect(manager.userPlaylists.value).toEqual([playlist]);
  });

  it("does not list playlists when signed out", async () => {
    makeManager(null);
    await flush();
    expect(listDataByMarkerMock).not.toHaveBeenCalled();
  });

  it("clears playlists when the user logs out", async () => {
    listDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [{ data: makePlaylist() }],
    });
    const manager = makeManager("user-1");
    await flush();
    expect(manager.userPlaylists.value).toHaveLength(1);

    userId.value = null;
    await flush();

    expect(manager.userPlaylists.value).toEqual([]);
  });

  it("logs and keeps playlists empty when listing fails", async () => {
    listDataByMarkerMock.mockResolvedValue({
      success: false,
      errorCode: "not_authorized",
      errorMessage: "nope",
    });
    const manager = makeManager("user-1");
    await flush();

    expect(manager.userPlaylists.value).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("savePlaylist records the playlist under the playlists marker", async () => {
    const manager = makeManager("user-1");
    await flush();
    const playlist = makePlaylist({ id: "playlist-x" });

    await manager.savePlaylist(playlist);

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "playlist-x",
      playlist,
      { marker: MARKER }
    );
  });

  it("deletePlaylist erases the record, matching history, and drops it from userPlaylists", async () => {
    listDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [{ data: makePlaylist({ id: "playlist-a" }) }],
    });
    listAllDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [
        {
          data: makeHistory({
            id: "hist-playlist-a",
            playlistId: "playlist-a",
            playlistRecordName: "user-1",
          }),
        },
        {
          data: makeHistory({
            id: "hist-other",
            playlistId: "playlist-other",
            playlistRecordName: "user-1",
          }),
        },
      ],
    });
    const manager = makeManager("user-1");
    await flush();
    expect(manager.userPlaylists.value).toHaveLength(1);
    expect(manager.userPlaylistHistory.value).toHaveLength(2);

    await manager.deletePlaylist(
      makePlaylist({ id: "playlist-a", recordName: "user-1" })
    );
    await flush();

    expect(eraseDataMock).toHaveBeenCalledWith("user-1", "playlist-a");
    expect(eraseDataMock).toHaveBeenCalledWith("user-1", "hist-playlist-a");
    expect(eraseDataMock).not.toHaveBeenCalledWith("user-1", "hist-other");
    expect(manager.userPlaylists.value).toEqual([]);
    expect(manager.userPlaylistHistory.value.map((e) => e.id)).toEqual([
      "hist-other",
    ]);
  });

  it("deletePlaylist throws and keeps the playlist when erase fails", async () => {
    listDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [{ data: makePlaylist({ id: "playlist-a" }) }],
    });
    const manager = makeManager("user-1");
    await flush();
    eraseDataMock.mockResolvedValueOnce({
      success: false,
      errorCode: "not_authorized",
    });

    await expect(
      manager.deletePlaylist(makePlaylist({ id: "playlist-a" }))
    ).rejects.toThrow("Failed to delete playlist: not_authorized");
    expect(manager.userPlaylists.value).toHaveLength(1);
  });

  it("listPlaylists parses records on success and throws on failure", async () => {
    const manager = makeManager("user-1");
    await flush();
    const playlist = makePlaylist();

    listDataByMarkerMock.mockResolvedValueOnce({
      success: true,
      items: [{ data: playlist }],
    });
    await expect(manager.listPlaylists("user-1")).resolves.toEqual([playlist]);

    listDataByMarkerMock.mockResolvedValueOnce({
      success: false,
      errorCode: "err",
      errorMessage: "boom",
    });
    await expect(manager.listPlaylists("user-1")).rejects.toThrow(
      "Failed to list playlists: boom"
    );
  });

  it("loadPlaylist fetches by locator and parses the record on success", async () => {
    const manager = makeManager("user-1");
    await flush();
    const playlist = makePlaylist({ id: "playlist-9", recordName: "user-9" });
    getDataMock.mockResolvedValueOnce({ success: true, data: playlist });

    await expect(manager.loadPlaylist("user-9", "playlist-9")).resolves.toEqual(
      playlist
    );
    expect(getDataMock).toHaveBeenCalledWith("user-9", "playlist-9");
  });

  it("loadPlaylist throws when the record cannot be fetched", async () => {
    const manager = makeManager("user-1");
    await flush();
    getDataMock.mockResolvedValueOnce({
      success: false,
      errorCode: "not_found",
    });

    await expect(
      manager.loadPlaylist("user-9", "playlist-missing")
    ).rejects.toThrow("Failed to load playlist: not_found");
  });

  it("loadPlaylist throws when the record data is not a valid playlist", async () => {
    const manager = makeManager("user-1");
    await flush();
    getDataMock.mockResolvedValueOnce({
      success: true,
      data: { nope: true },
    });

    await expect(
      manager.loadPlaylist("user-9", "playlist-bad")
    ).rejects.toThrow();
  });

  it("createNewPlaylist opens the create view with a fresh empty playlist", async () => {
    const manager = makeManager("user-1");
    await flush();
    recordDataMock.mockClear();

    await manager.createNewPlaylist();

    const editing = manager.editingPlaylist.value!;
    expect(editing).not.toBeNull();
    expect(editing.id).toMatch(/^playlist_/);
    expect(editing.recordName).toBe("user-1");
    expect(editing.authorUserId).toBe("user-1");
    expect(editing.title).toBeNull();
    expect(editing.description).toBeNull();
    expect(editing.items).toEqual([]);
    expect(manager.view.value).toBe("create_playlist");
    // Creating a draft does not persist anything yet.
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("createNewPlaylist prompts a signed-out user to log in and uses the returned id", async () => {
    loginMock.mockResolvedValue({ id: "user-2" });
    const manager = makeManager(null);
    await flush();

    await manager.createNewPlaylist();

    expect(loginMock).toHaveBeenCalled();
    expect(manager.editingPlaylist.value!.recordName).toBe("user-2");
    expect(manager.editingPlaylist.value!.authorUserId).toBe("user-2");
    expect(manager.view.value).toBe("create_playlist");
  });

  it("createNewPlaylist is a no-op when login is cancelled", async () => {
    loginMock.mockResolvedValue(null);
    const manager = makeManager(null);
    await flush();

    await manager.createNewPlaylist();

    expect(manager.editingPlaylist.value).toBeNull();
    expect(manager.view.value).toBe(null);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("saveEditingPlaylist is a no-op when nothing is being edited", async () => {
    const manager = makeManager("user-1");
    await flush();
    recordDataMock.mockClear();

    await manager.saveEditingPlaylist();

    expect(recordDataMock).not.toHaveBeenCalled();
    expect(manager.view.value).toBe(null);
  });

  it("saveEditingPlaylist persists a new draft, appends it, and resets the editor", async () => {
    const manager = makeManager("user-1");
    await flush();
    await manager.createNewPlaylist();
    manager.editingPlaylist.value = {
      ...manager.editingPlaylist.value!,
      title: "Favorites",
    };
    const draftId = manager.editingPlaylist.value!.id;
    recordDataMock.mockClear();
    const NOW = START_MS + 60_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(NOW);

    await manager.saveEditingPlaylist();
    nowSpy.mockRestore();

    const call = recordDataMock.mock.calls.at(-1)!;
    expect(call[0]).toBe("user-1");
    expect(call[1]).toBe(draftId);
    expect(call[3]).toEqual({ marker: MARKER });
    expect((call[2] as Playlist).title).toBe("Favorites");
    expect((call[2] as Playlist).updatedAtMs).toBe(NOW);

    expect(manager.userPlaylists.value).toHaveLength(1);
    expect(manager.userPlaylists.value[0]!.id).toBe(draftId);
    expect(manager.editingPlaylist.value).toBeNull();
    expect(manager.view.value).toBe("discover");
  });

  it("saveEditingPlaylist updates an existing playlist in place", async () => {
    listDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [{ data: makePlaylist({ id: "playlist-1", title: "Old" }) }],
    });
    const manager = makeManager("user-1");
    await flush();
    expect(manager.userPlaylists.value).toHaveLength(1);

    manager.editingPlaylist.value = makePlaylist({
      id: "playlist-1",
      title: "New",
    });
    await manager.saveEditingPlaylist();

    expect(manager.userPlaylists.value).toHaveLength(1);
    expect(manager.userPlaylists.value[0]!.title).toBe("New");
  });

  it("updateEditingPlaylistMetadata patches the draft title and description", async () => {
    const manager = makeManager("user-1");
    await flush();
    await manager.createNewPlaylist();

    expect(manager.updateEditingPlaylistMetadata({ title: "Favorites" })).toBe(
      "success"
    );
    expect(
      manager.updateEditingPlaylistMetadata({
        description: "Verses I keep coming back to",
      })
    ).toBe("success");

    expect(manager.editingPlaylist.value!.title).toBe("Favorites");
    expect(manager.editingPlaylist.value!.description).toBe(
      "Verses I keep coming back to"
    );
    expect(manager.editingPlaylist.value!.items).toEqual([]);
  });

  it("updateEditingPlaylistMetadata reports an error when nothing is being edited", async () => {
    const manager = makeManager("user-1");
    await flush();

    expect(manager.updateEditingPlaylistMetadata({ title: "Too late" })).toBe(
      "error: no playlist is currently being edited"
    );
  });

  it("saveEditingPlaylist persists a description change", async () => {
    const manager = makeManager("user-1");
    await flush();
    await manager.createNewPlaylist();
    manager.updateEditingPlaylistMetadata({
      title: "Favorites",
      description: "Verses I keep coming back to",
    });
    recordDataMock.mockClear();

    await manager.saveEditingPlaylist();

    const saved = recordDataMock.mock.calls.at(-1)![2] as Playlist;
    expect(saved.description).toBe("Verses I keep coming back to");
    expect(manager.userPlaylists.value[0]!.description).toBe(
      "Verses I keep coming back to"
    );
  });

  it("addEditingPlaylistItem appends an item to the current draft", async () => {
    const manager = makeManager("user-1");
    await flush();
    await manager.createNewPlaylist();

    manager.addEditingPlaylistItem({
      type: "bible-verse",
      ref: { bookId: "JHN", chapter: 3, verse: 16 },
    });
    manager.addEditingPlaylistItem({
      type: "link",
      url: "https://example.com",
    });

    expect(manager.editingPlaylist.value!.items).toEqual([
      { type: "bible-verse", ref: { bookId: "JHN", chapter: 3, verse: 16 } },
      { type: "link", url: "https://example.com" },
    ]);
  });

  it("addEditingPlaylistItem is a no-op when nothing is being edited", async () => {
    const manager = makeManager("user-1");
    await flush();

    manager.addEditingPlaylistItem({ type: "html", html: "hi" });

    expect(manager.editingPlaylist.value).toBeNull();
  });

  it("reorderEditingPlaylistItem moves an item within the draft", async () => {
    const manager = makeManager("user-1");
    await flush();
    await manager.createNewPlaylist();

    manager.addEditingPlaylistItem({
      type: "bible-verse",
      ref: { bookId: "JHN", chapter: 3, verse: 16 },
    });
    manager.addEditingPlaylistItem({
      type: "link",
      url: "https://example.com",
    });
    manager.addEditingPlaylistItem({ type: "html", html: "<p>hi</p>" });

    manager.reorderEditingPlaylistItem(0, 2);

    expect(manager.editingPlaylist.value!.items).toEqual([
      { type: "link", url: "https://example.com" },
      { type: "html", html: "<p>hi</p>" },
      { type: "bible-verse", ref: { bookId: "JHN", chapter: 3, verse: 16 } },
    ]);
  });

  it("reorderEditingPlaylistItem ignores out-of-range or no-op reorders", async () => {
    const manager = makeManager("user-1");
    await flush();
    await manager.createNewPlaylist();

    manager.addEditingPlaylistItem({ type: "html", html: "<p>a</p>" });
    manager.addEditingPlaylistItem({ type: "html", html: "<p>b</p>" });
    const before = manager.editingPlaylist.value!.items;

    manager.reorderEditingPlaylistItem(0, 0);
    manager.reorderEditingPlaylistItem(5, 0);
    manager.reorderEditingPlaylistItem(0, 5);

    expect(manager.editingPlaylist.value!.items).toBe(before);
  });

  it("reorderEditingPlaylistItem is a no-op when nothing is being edited", async () => {
    const manager = makeManager("user-1");
    await flush();

    manager.reorderEditingPlaylistItem(0, 1);

    expect(manager.editingPlaylist.value).toBeNull();
  });

  it("cancelEditingPlaylist discards the draft and returns to discover", async () => {
    const manager = makeManager("user-1");
    await flush();
    await manager.createNewPlaylist();
    expect(manager.editingPlaylist.value).not.toBeNull();
    recordDataMock.mockClear();

    manager.cancelEditingPlaylist();

    expect(manager.editingPlaylist.value).toBeNull();
    expect(manager.view.value).toBe("discover");
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  describe("chat AI context", () => {
    /** Finds a registered tool by name from the most recent `addContext` call. */
    const getTool = (name: string) => {
      const call = lastChatsAddContext.mock.calls.at(
        -1
      )?.[0] as IdentifiedLocalChatContext;
      const tool = call.tools?.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Tool "${name}" was not registered`);
      }
      return tool;
    };

    it("registers the playlist-editing tools once the editor opens", async () => {
      const manager = makeManager("user-1");
      await flush();
      expect(lastChatsAddContext).not.toHaveBeenCalled();

      await manager.createNewPlaylist();

      expect(lastChatsAddContext).toHaveBeenCalledTimes(1);
      const context = lastChatsAddContext.mock.calls[0]![0];
      expect(context.id).toBe("playlist-editor");
      expect(context.tools.map((t: { name: string }) => t.name).sort()).toEqual(
        [
          "insertPlaylistItem",
          "movePlaylistItem",
          "deletePlaylistItem",
          "updatePlaylistItem",
          "updatePlaylistMetadata",
          "getPlaylistState",
        ].sort()
      );
    });

    it("withdraws the tools when the editor closes via cancel", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();
      // The registration effect also fires once at manager creation (while
      // nothing is being edited yet), so reset the spy to isolate the call
      // that matters: the one triggered by leaving the editor.
      lastChatsRemoveContext.mockClear();

      manager.cancelEditingPlaylist();

      expect(lastChatsRemoveContext).toHaveBeenCalledWith("playlist-editor");
    });

    it("withdraws the tools when the editor closes via save", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();

      await manager.saveEditingPlaylist();

      expect(lastChatsRemoveContext).toHaveBeenCalledWith("playlist-editor");
    });

    it("does not register tools when no playlist is being edited", async () => {
      const manager = makeManager("user-1");
      await flush();

      expect(manager.editingPlaylist.value).toBeNull();
      expect(lastChatsAddContext).not.toHaveBeenCalled();
    });

    it("the registered tools operate on whatever playlist is currently being edited", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();

      await getTool("insertPlaylistItem").function({
        index: 0,
        type: "link",
        bibleVerse: null,
        link: { title: null, url: "https://example.com" },
        html: null,
      });
      expect(manager.editingPlaylist.value!.items).toEqual([
        { type: "link", url: "https://example.com" },
      ]);

      await getTool("updatePlaylistMetadata").function({
        title: "My AI Playlist",
        description: "Made with AI",
      });
      expect(manager.editingPlaylist.value!.title).toBe("My AI Playlist");
      expect(manager.editingPlaylist.value!.description).toBe("Made with AI");

      await getTool("deletePlaylistItem").function({ index: 0 });
      expect(manager.editingPlaylist.value!.items).toEqual([]);
    });

    it("getPlaylistState reflects the current live contents of the playlist being edited", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();

      await getTool("insertPlaylistItem").function({
        index: 0,
        type: "link",
        bibleVerse: null,
        link: { title: null, url: "https://example.com" },
        html: null,
      });
      await getTool("updatePlaylistMetadata").function({
        title: "My AI Playlist",
        description: "Made with AI",
      });

      const state = JSON.parse(
        (await getTool("getPlaylistState").function({})) as string
      );
      expect(state).toEqual({
        title: "My AI Playlist",
        description: "Made with AI",
        items: [
          {
            type: "link",
            bibleVerse: null,
            link: { title: null, url: "https://example.com" },
            html: null,
          },
        ],
      });
    });

    it("getPlaylistState reports an error when nothing is being edited", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();
      const getPlaylistState = getTool("getPlaylistState");
      manager.cancelEditingPlaylist();

      await expect(getPlaylistState.function({})).resolves.toBe(
        "error: no playlist is currently being edited"
      );
    });

    it("insertPlaylistItem inserts each AI item type at the given index", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();
      const insertPlaylistItem = getTool("insertPlaylistItem");

      await insertPlaylistItem.function({
        index: 0,
        type: "bible-verse",
        bibleVerse: {
          ref: {
            bookId: "JHN",
            chapter: 3,
            verse: 16,
            endChapter: null,
            endVerse: null,
          },
        },
        link: null,
        html: null,
      });
      await insertPlaylistItem.function({
        index: 1,
        type: "html",
        bibleVerse: null,
        link: null,
        html: { title: "Note", html: "<p>hi</p>" },
      });
      // Inserting at 0 again pushes both earlier items back.
      await insertPlaylistItem.function({
        index: 0,
        type: "link",
        bibleVerse: null,
        link: { title: null, url: "https://example.com" },
        html: null,
      });

      expect(manager.editingPlaylist.value!.items).toEqual([
        { type: "link", url: "https://example.com" },
        { type: "bible-verse", ref: { bookId: "JHN", chapter: 3, verse: 16 } },
        { type: "html", title: "Note", html: "<p>hi</p>" },
      ]);
    });

    it("insertPlaylistItem reports an error for an out-of-range index", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();
      const insertPlaylistItem = getTool("insertPlaylistItem");

      await expect(
        insertPlaylistItem.function({
          index: 5,
          type: "html",
          bibleVerse: null,
          link: null,
          html: { title: null, html: "<p>hi</p>" },
        })
      ).resolves.toBe("error: index out of range (0-0)");
      expect(manager.editingPlaylist.value!.items).toEqual([]);
    });

    it("insertPlaylistItem reports an error instead of throwing when the type's matching field is missing", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();
      const insertPlaylistItem = getTool("insertPlaylistItem");

      await expect(
        insertPlaylistItem.function({
          index: 0,
          type: "bible-verse",
          bibleVerse: null,
          link: null,
          html: null,
        })
      ).resolves.toBe(
        'error: Item has type "bible-verse" but no bibleVerse was provided.'
      );
      expect(manager.editingPlaylist.value!.items).toEqual([]);
    });

    it("updatePlaylistItem reports an error instead of throwing when the type's matching field is missing", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();
      const insertPlaylistItem = getTool("insertPlaylistItem");
      await insertPlaylistItem.function({
        index: 0,
        type: "link",
        bibleVerse: null,
        link: { title: null, url: "https://example.com" },
        html: null,
      });
      const updatePlaylistItem = getTool("updatePlaylistItem");

      await expect(
        updatePlaylistItem.function({
          index: 0,
          type: "html",
          bibleVerse: null,
          link: null,
          html: null,
        })
      ).resolves.toBe('error: Item has type "html" but no html was provided.');
      expect(manager.editingPlaylist.value!.items).toEqual([
        { type: "link", url: "https://example.com" },
      ]);
    });

    it("insertPlaylistItem reports an error when nothing is being edited", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();
      const insertPlaylistItem = getTool("insertPlaylistItem");
      manager.cancelEditingPlaylist();

      await expect(
        insertPlaylistItem.function({
          index: 0,
          type: "html",
          bibleVerse: null,
          link: null,
          html: { title: null, html: "<p>hi</p>" },
        })
      ).resolves.toBe("error: no editing playlist");
    });

    it("movePlaylistItem reorders items in the currently-edited playlist", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();
      manager.addEditingPlaylistItem({ type: "html", html: "<p>a</p>" });
      manager.addEditingPlaylistItem({ type: "html", html: "<p>b</p>" });
      manager.addEditingPlaylistItem({ type: "html", html: "<p>c</p>" });
      const movePlaylistItem = getTool("movePlaylistItem");

      await expect(
        movePlaylistItem.function({ originalIndex: 0, newIndex: 2 })
      ).resolves.toBe("success");

      expect(manager.editingPlaylist.value!.items).toEqual([
        { type: "html", html: "<p>b</p>" },
        { type: "html", html: "<p>c</p>" },
        { type: "html", html: "<p>a</p>" },
      ]);
    });

    it("movePlaylistItem reports an error for an out-of-range index", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();
      manager.addEditingPlaylistItem({ type: "html", html: "<p>a</p>" });
      const movePlaylistItem = getTool("movePlaylistItem");

      await expect(
        movePlaylistItem.function({ originalIndex: 0, newIndex: 5 })
      ).resolves.toBe("error: target index out of range (0-0) or equal");
      expect(manager.editingPlaylist.value!.items).toEqual([
        { type: "html", html: "<p>a</p>" },
      ]);
    });

    it("movePlaylistItem reports an error when nothing is being edited", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();
      const movePlaylistItem = getTool("movePlaylistItem");
      manager.cancelEditingPlaylist();

      await expect(
        movePlaylistItem.function({ originalIndex: 0, newIndex: 1 })
      ).resolves.toBe("error: no editing playlist");
    });

    it("updatePlaylistMetadata reports an error when nothing is being edited", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();
      const updatePlaylistMetadata = getTool("updatePlaylistMetadata");
      manager.cancelEditingPlaylist();

      await expect(
        updatePlaylistMetadata.function({
          title: "Too late",
          description: null,
        })
      ).resolves.toBe("error: no playlist is currently being edited");
    });
  });

  it("startPlaying returns null when there is no active tab to play on", async () => {
    const tabs = {
      tabs: signal([]),
      selectedTabId: signal(""),
    } as unknown as TabsArg;
    const manager = makeManager("user-1", tabs);
    await flush();
    const playlist = makePlaylist({
      items: [{ type: "html", html: "<p>hi</p>" }],
    });

    const result = manager.startPlaying(playlist);

    expect(result).toBeNull();
    expect(manager.playing.value).toBeNull();
  });

  it("startPlaying prefers always uses the selected tab", async () => {
    const tabs = makeTabs(makeTab("tab-1", selectTranslationAndChapterMock));
    tabs.tabs.value = [
      ...tabs.tabs.value,
      {
        ...makeTab("tab-2", selectTranslationAndChapterMock),
        sharedSession: { id: "session-1" } as any,
      },
    ];
    tabs.selectedTabId.value = "tab-1";
    const manager = makeManager("user-1", tabs);

    await flush();
    const playlist = makePlaylist({
      items: [{ type: "html", html: "<p>hi</p>" }],
    });

    expect(manager.playing.value).toBeNull();

    manager.startPlaying(playlist);
    expect(manager.playing.value).not.toBeNull();
    expect(manager.playing.value?.queue.value).toEqual(playlist.items);
    expect(manager.playing.value?.playlists.value).toEqual([playlist]);
    expect(manager.view.value).toBe("play_playlist");
    // The currently selected tab is saved into the playing state.
    expect(manager.playing.value?.tab?.id).toBe("tab-1");

    manager.stopPlaying();
    expect(manager.playing.value).toBeNull();
    expect(manager.view.value).toBe("discover");
  });

  it("startPlaying builds a playing state and stopPlaying clears it", async () => {
    const manager = makeManager("user-1");
    await flush();
    const playlist = makePlaylist({
      items: [{ type: "html", html: "<p>hi</p>" }],
    });

    expect(manager.playing.value).toBeNull();

    manager.startPlaying(playlist);
    expect(manager.playing.value).not.toBeNull();
    expect(manager.playing.value?.queue.value).toEqual(playlist.items);
    expect(manager.playing.value?.playlists.value).toEqual([playlist]);
    expect(manager.view.value).toBe("play_playlist");
    // The currently selected tab is saved into the playing state.
    expect(manager.playing.value?.tab?.id).toBe("tab-1");

    manager.stopPlaying();
    expect(manager.playing.value).toBeNull();
    expect(manager.view.value).toBe("discover");
  });

  it("startPlaying expands a cross-chapter item into one queue item per chapter", async () => {
    const manager = makeManager("user-1");
    await flush();
    const playlist = makePlaylist({
      items: [
        {
          type: "bible-verse",
          ref: {
            bookId: "GEN",
            chapter: 1,
            verse: 2,
            endChapter: 3,
            endVerse: 4,
          },
        },
      ],
    });

    manager.startPlaying(playlist);

    expect(manager.playing.value?.queue.value).toEqual([
      {
        type: "bible-verse",
        translationId: undefined,
        ref: { bookId: "GEN", chapter: 1, verse: 2, toEndOfChapter: true },
      },
      {
        type: "bible-verse",
        translationId: undefined,
        ref: { bookId: "GEN", chapter: 2 },
      },
      {
        type: "bible-verse",
        translationId: undefined,
        ref: { bookId: "GEN", chapter: 3, verse: 1, endVerse: 4 },
      },
    ]);
    // The saved playlist itself is untouched by expansion.
    expect(manager.playing.value?.playlists.value).toEqual([playlist]);
  });

  it("startPlaying accepts multiple playlists", async () => {
    const manager = makeManager("user-1");
    await flush();
    const a = makePlaylist({ id: "a", items: [{ type: "html", html: "a" }] });
    const b = makePlaylist({ id: "b", items: [{ type: "html", html: "b" }] });

    manager.startPlaying([a, b]);

    expect(manager.playing.value?.queue.value).toEqual([
      ...a.items,
      ...b.items,
    ]);
  });

  it("enables the playlist reading extension on the target tab when playback starts, and disables it on stop", async () => {
    const { tab, enableExtension, disableExtension } =
      makeTabWithExtensionMocks("tab-1", selectTranslationAndChapterMock);
    const manager = makeManager("user-1", makeTabs(tab));
    await flush();
    const playlist = makePlaylist({
      items: [{ type: "html", html: "<p>hi</p>" }],
    });

    manager.startPlaying(playlist);
    expect(enableExtension).toHaveBeenCalledWith("playlist", {
      playlists: [playlist],
      queue: playlist.items,
      step: 0,
    });
    expect(disableExtension).not.toHaveBeenCalled();

    manager.stopPlaying();
    expect(disableExtension).toHaveBeenCalledWith("playlist");
  });

  it("keeps other tabs' playback when starting playback on a different tab (isolation)", async () => {
    const first = makeTabWithExtensionMocks(
      "tab-1",
      selectTranslationAndChapterMock
    );
    const second = makeTabWithExtensionMocks(
      "tab-2",
      selectTranslationAndChapterMock
    );
    const tabsManager = makeTabs(first.tab);
    tabsManager.tabs.value = [first.tab, second.tab];
    const manager = makeManager("user-1", tabsManager);
    await flush();

    tabsManager.selectedTabId.value = "tab-1";
    const a = makePlaylist({ id: "a", items: [{ type: "html", html: "a" }] });
    manager.startPlaying(a);
    expect(first.enableExtension).toHaveBeenCalledWith("playlist", {
      playlists: [a],
      queue: a.items,
      step: 0,
    });

    tabsManager.selectedTabId.value = "tab-2";
    const b = makePlaylist({ id: "b", items: [{ type: "html", html: "b" }] });
    manager.startPlaying(b);

    // Starting on tab-2 leaves tab-1's playback running: each reading state
    // owns its own playback.
    expect(first.disableExtension).not.toHaveBeenCalled();
    expect(second.enableExtension).toHaveBeenCalledWith("playlist", {
      playlists: [b],
      queue: b.items,
      step: 0,
    });
    expect(first.tab.readingState.isExtensionEnabled("playlist")).toBe(true);
    expect(second.tab.readingState.isExtensionEnabled("playlist")).toBe(true);
  });

  it("stopPlaying only stops the active tab, leaving other tabs playing", async () => {
    const first = makeTabWithExtensionMocks(
      "tab-1",
      selectTranslationAndChapterMock
    );
    const second = makeTabWithExtensionMocks(
      "tab-2",
      selectTranslationAndChapterMock
    );
    const tabsManager = makeTabs(first.tab);
    tabsManager.tabs.value = [first.tab, second.tab];
    const manager = makeManager("user-1", tabsManager);
    await flush();

    tabsManager.selectedTabId.value = "tab-1";
    manager.startPlaying(
      makePlaylist({ id: "a", items: [{ type: "html", html: "a" }] })
    );
    tabsManager.selectedTabId.value = "tab-2";
    manager.startPlaying(
      makePlaylist({ id: "b", items: [{ type: "html", html: "b" }] })
    );

    // Stop while tab-2 is active: only tab-2 stops.
    manager.stopPlaying();
    expect(second.disableExtension).toHaveBeenCalledWith("playlist");
    expect(first.disableExtension).not.toHaveBeenCalled();
    expect(first.tab.readingState.isExtensionEnabled("playlist")).toBe(true);
  });

  it("switching to a non-playing tab does not stop another tab's playback (just changes the UI)", async () => {
    const playingTab = makeTabWithExtensionMocks(
      "tab-1",
      selectTranslationAndChapterMock
    );
    const otherTab = makeTabWithExtensionMocks(
      "tab-2",
      selectTranslationAndChapterMock
    );
    const tabsManager = makeTabs(playingTab.tab);
    tabsManager.tabs.value = [playingTab.tab, otherTab.tab];
    const manager = makeManager("user-1", tabsManager);
    await flush();

    tabsManager.selectedTabId.value = "tab-1";
    manager.startPlaying(
      makePlaylist({ items: [{ type: "html", html: "a" }] })
    );
    expect(manager.playing.value).not.toBeNull();

    // Switch to the non-playing tab; the UI stops reflecting playback...
    tabsManager.selectedTabId.value = "tab-2";
    expect(manager.playing.value).toBeNull();

    // ...and even when the URL loses its `playlist` param (as TabsManager would
    // when flushing the non-playing tab), tab-1's playback is untouched.
    const url = new URL(lastNavigation.currentUrl.value);
    url.searchParams.set("book", "EXO"); // force a URL change so the sync runs
    url.searchParams.delete("playlist");
    url.searchParams.delete("playlistStep");
    lastNavigation.push(url.toString());
    await flush();

    expect(playingTab.tab.readingState.isExtensionEnabled("playlist")).toBe(
      true
    );
    expect(playingTab.disableExtension).not.toHaveBeenCalled();

    // Switching back reflects the still-running playback again.
    tabsManager.selectedTabId.value = "tab-1";
    expect(manager.playing.value).not.toBeNull();
  });

  describe("playlist play history", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(START_MS);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("creates a history entry when playback starts while signed in", async () => {
      const manager = makeManager("user-1");
      await flush();
      recordDataMock.mockClear();

      const playlist = makePlaylist({
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
        ],
      });
      manager.startPlaying(playlist);
      await flush();

      expect(manager.userPlaylistHistory.value).toHaveLength(1);
      const entry = manager.userPlaylistHistory.value[0]!;
      expect(entry.playlistId).toBe(playlist.id);
      expect(entry.currentStep).toBe(0);
      expect(entry.totalSteps).toBe(2);
      expect(entry.previousHistoryId).toBeNull();
      expect(recordDataMock).toHaveBeenCalledWith(
        "user-1",
        entry.id,
        expect.objectContaining({
          playlistId: playlist.id,
          totalSteps: 2,
        }),
        { marker: HISTORY_MARKER }
      );

      manager.stopPlaying();
      await flush();
    });

    it("does not create history when signed out", async () => {
      const manager = makeManager(null);
      await flush();
      recordDataMock.mockClear();

      manager.startPlaying(
        makePlaylist({ items: [{ type: "html", html: "a" }] })
      );
      await flush();

      expect(manager.userPlaylistHistory.value).toEqual([]);
      expect(
        recordDataMock.mock.calls.some(
          (call) => call[3]?.marker === HISTORY_MARKER
        )
      ).toBe(false);

      manager.stopPlaying();
    });

    it("skips history when startPlaying is called with history: false", async () => {
      const manager = makeManager("user-1");
      await flush();
      recordDataMock.mockClear();

      manager.startPlaying(
        makePlaylist({ items: [{ type: "html", html: "a" }] }),
        0,
        { history: false }
      );
      await flush();

      expect(manager.userPlaylistHistory.value).toEqual([]);
      manager.stopPlaying();
    });

    it("updates currentStep as playback advances and finalizes on stop", async () => {
      const manager = makeManager("user-1");
      await flush();

      const playlist = makePlaylist({
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
          { type: "link", url: "https://example.com" },
        ],
      });
      manager.startPlaying(playlist);
      await flush();

      await manager.playing.value!.next();
      await flush();

      expect(manager.userPlaylistHistory.value[0]!.currentStep).toBe(1);
      expect(manager.userPlaylistHistory.value[0]!.lastItem).toEqual({
        type: "html",
        html: "b",
      });

      vi.setSystemTime(START_MS + 12_000);
      manager.stopPlaying();
      await flush();

      const entry = manager.userPlaylistHistory.value[0]!;
      expect(entry.endedAtMs).toBe(START_MS + 12_000);
      expect(entry.durationMs).toBe(entry.endedAtMs! - entry.startedAtMs);
      expect(entry.currentStep).toBe(1);
    });

    it("continueFromHistory resumes at the saved step and resets the same playlist row", async () => {
      const prior = makeHistory({
        id: "hist-prior",
        currentStep: 1,
        totalSteps: 3,
        startedAtMs: START_MS - 60_000,
        endedAtMs: START_MS - 1_000,
        durationMs: 59_000,
        updatedAtMs: START_MS - 1_000,
      });
      listAllDataByMarkerMock.mockResolvedValue({
        success: true,
        items: [{ data: prior }],
      });
      const playlist = makePlaylist({
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
          { type: "html", html: "c" },
        ],
      });
      getDataMock.mockResolvedValue({ success: true, data: playlist });

      const manager = makeManager("user-1");
      await flush();
      expect(manager.userPlaylistHistory.value).toHaveLength(1);

      await manager.continueFromHistory(prior);
      await flush();

      expect(manager.playing.value?.currentIndex.value).toBe(1);
      expect(manager.userPlaylistHistory.value).toHaveLength(1);
      const resumed = manager.userPlaylistHistory.value[0]!;
      expect(resumed.id).toBe(prior.id);
      expect(resumed.currentStep).toBe(1);
      expect(resumed.endedAtMs).toBeNull();
      expect(resumed.durationMs).toBe(0);
      expect(resumed.startedAtMs).toBeGreaterThan(prior.startedAtMs);
      expect(eraseDataMock).not.toHaveBeenCalledWith("user-1", prior.id);

      manager.stopPlaying();
      await flush();
    });

    it("replayFromHistory starts at step 0 and resets the same playlist row", async () => {
      const prior = makeHistory({
        id: "hist-done",
        currentStep: 2,
        totalSteps: 3,
        endedAtMs: START_MS,
      });
      listAllDataByMarkerMock.mockResolvedValue({
        success: true,
        items: [{ data: prior }],
      });
      const playlist = makePlaylist({
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
          { type: "html", html: "c" },
        ],
      });
      getDataMock.mockResolvedValue({ success: true, data: playlist });

      const manager = makeManager("user-1");
      await flush();

      await manager.replayFromHistory(prior);
      await flush();

      expect(manager.playing.value?.currentIndex.value).toBe(0);
      expect(manager.userPlaylistHistory.value).toHaveLength(1);
      const reset = manager.userPlaylistHistory.value[0]!;
      expect(reset.id).toBe(prior.id);
      expect(reset.currentStep).toBe(0);
      expect(reset.endedAtMs).toBeNull();
      expect(reset.previousHistoryId).toBeNull();

      manager.stopPlaying();
      await flush();
    });

    it("syncs stored history on login and clears it on logout", async () => {
      const stored = makeHistory({ id: "hist-stored" });
      listAllDataByMarkerMock.mockResolvedValue({
        success: true,
        items: [{ data: stored }],
      });

      const manager = makeManager("user-1");
      await flush();
      expect(listAllDataByMarkerMock).toHaveBeenCalledWith(
        "user-1",
        HISTORY_MARKER
      );
      expect(manager.userPlaylistHistory.value).toEqual([stored]);

      userId.value = null;
      await flush();
      expect(manager.userPlaylistHistory.value).toEqual([]);
    });

    it("loads all pages and keeps one newest session per playlist", async () => {
      const older = makeHistory({
        id: "hist-old",
        playlistId: "playlist-1",
        startedAtMs: START_MS,
      });
      const newer = makeHistory({
        id: "hist-new",
        playlistId: "playlist-1",
        startedAtMs: START_MS + 60_000,
      });
      const other = makeHistory({
        id: "hist-other",
        playlistId: "playlist-2",
        playlistRecordName: "user-1",
        startedAtMs: START_MS + 30_000,
      });
      listAllDataByMarkerMock.mockResolvedValue({
        success: true,
        items: [{ data: older }, { data: newer }, { data: other }],
      });

      const manager = makeManager("user-1");
      await flush();

      expect(manager.userPlaylistHistory.value.map((e) => e.id)).toEqual([
        "hist-new",
        "hist-other",
      ]);
      expect(eraseDataMock).toHaveBeenCalledWith("user-1", older.id);
    });

    it("does not write history to the backend while idle on the same step", async () => {
      const manager = makeManager("user-1");
      await flush();

      const playlist = makePlaylist({
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
        ],
      });
      manager.startPlaying(playlist);
      await flush();

      const historyWrites = () =>
        recordDataMock.mock.calls.filter(
          (call) => call[3]?.marker === HISTORY_MARKER
        );
      const writesAfterStart = historyWrites().length;
      expect(writesAfterStart).toBeGreaterThanOrEqual(1);

      recordDataMock.mockClear();
      vi.setSystemTime(START_MS + 30_000);
      // Re-trigger the mirror effect with the same step (simulates idle ticks /
      // redundant effect runs). No step change → no backend write.
      await manager.playing.value!.jumpTo(0);
      await flush();
      expect(historyWrites()).toHaveLength(0);

      await manager.playing.value!.next();
      await flush();
      expect(historyWrites().length).toBeGreaterThanOrEqual(1);

      manager.stopPlaying();
      await flush();
    });

    it("starting a playlist again resets that playlist's history to the new session", async () => {
      const prior = makeHistory({
        id: "hist-prior",
        playlistId: "playlist-1",
        currentStep: 1,
        totalSteps: 2,
        startedAtMs: START_MS,
        endedAtMs: START_MS,
        durationMs: 5_000,
      });
      listAllDataByMarkerMock.mockResolvedValue({
        success: true,
        items: [{ data: prior }],
      });

      const manager = makeManager("user-1");
      await flush();
      eraseDataMock.mockClear();

      vi.setSystemTime(START_MS + 60_000);
      manager.startPlaying(
        makePlaylist({
          id: "playlist-1",
          items: [
            { type: "html", html: "a" },
            { type: "html", html: "b" },
          ],
        })
      );
      await flush();

      expect(manager.userPlaylistHistory.value).toHaveLength(1);
      const reset = manager.userPlaylistHistory.value[0]!;
      expect(reset.id).toBe(prior.id);
      expect(reset.currentStep).toBe(0);
      expect(reset.endedAtMs).toBeNull();
      expect(reset.durationMs).toBe(0);
      expect(reset.startedAtMs).toBe(START_MS + 60_000);
      expect(eraseDataMock).not.toHaveBeenCalledWith("user-1", prior.id);

      manager.stopPlaying();
      await flush();
    });

    it("playing a different playlist keeps the first playlist's history row", async () => {
      const prior = makeHistory({
        id: "hist-prior",
        playlistId: "playlist-1",
        startedAtMs: START_MS,
        endedAtMs: START_MS,
      });
      listAllDataByMarkerMock.mockResolvedValue({
        success: true,
        items: [{ data: prior }],
      });

      const manager = makeManager("user-1");
      await flush();

      manager.startPlaying(
        makePlaylist({
          id: "playlist-2",
          items: [{ type: "html", html: "a" }],
        })
      );
      await flush();

      expect(manager.userPlaylistHistory.value).toHaveLength(2);
      expect(
        manager.userPlaylistHistory.value.map((e) => e.playlistId)
      ).toEqual(["playlist-2", "playlist-1"]);
      expect(
        manager.userPlaylistHistory.value.some((e) => e.id === prior.id)
      ).toBe(true);

      manager.stopPlaying();
      await flush();
    });

    it("removePlayHistory drops the session from memory and the backend", async () => {
      const stored = makeHistory({ id: "hist-stored" });
      listAllDataByMarkerMock.mockResolvedValue({
        success: true,
        items: [{ data: stored }],
      });
      const manager = makeManager("user-1");
      await flush();
      eraseDataMock.mockClear();

      await manager.removePlayHistory(stored);
      await flush();

      expect(manager.userPlaylistHistory.value).toEqual([]);
      expect(eraseDataMock).toHaveBeenCalledWith("user-1", stored.id);
    });
  });

  describe("playlist reading extension", () => {
    /**
     * Activates the registered "playlist" reading extension in isolation, with
     * the given per-enablement `data`. The returned instance owns its own live
     * playing state, built from that data.
     *
     * A real-ish reading state is passed because the instance's
     * `hasNext`/`hasPrevious` consult its `chapterData` (the queue's edges fall
     * through to the reader's own chapter navigation). `chapterData` starts null
     * — no chapter loaded — so those read purely off the queue unless a test
     * sets it.
     */
    const activateExtension = (
      data?: PlaylistReadingData,
      isShared = false,
      readingState: any = makeReadingState(vi.fn())
    ): PlaylistReadingExtensionInstance => {
      const definition =
        lastReadingExtensionManager.getReadingExtension("playlist");
      if (!definition) {
        throw new Error('"playlist" reading extension was not registered');
      }
      return definition.activate({
        readingState,
        data: signal(data),
        isShared: signal(isShared),
      }) as unknown as PlaylistReadingExtensionInstance;
    };

    it("navigateNext/navigatePrevious default when nothing is playing", async () => {
      makeManager("user-1");
      await flush();
      const instance = activateExtension();

      // The hooks are async now (they await the playing state's navigation).
      expect(await instance.navigateNext!({} as any)).toEqual({
        type: "default",
      });
      expect(await instance.navigatePrevious!({} as any)).toEqual({
        type: "default",
      });
    });

    it("navigateNext/navigatePrevious advance the queue and hand back over at the bounds", async () => {
      makeManager("user-1");
      await flush();
      const playlist = makePlaylist({
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
        ],
      });
      const instance = activateExtension({
        playlists: [playlist],
        queue: playlist.items,
        step: 0,
      });

      // At the start of the queue there is nothing to step back to, so the
      // reader's own chapter navigation takes over ("default", not "prevent" —
      // preventing here left the reader with dead controls and no way out).
      expect(await instance.navigatePrevious!({} as any)).toEqual({
        type: "default",
      });
      // Advancing is handled by the playing state itself (which drives the
      // reader), so the hook returns "prevent" to stop the reader's own
      // chapter navigation rather than "handled".
      expect(await instance.navigateNext!({} as any)).toEqual({
        type: "prevent",
      });
      expect(instance.playingState.currentIndex.value).toBe(1);
      // Past the end of the queue, likewise back to normal navigation.
      expect(await instance.navigateNext!({} as any)).toEqual({
        type: "default",
      });
      expect(instance.playingState.currentIndex.value).toBe(1);
    });

    it("hasNext/hasPrevious fall back to the loaded chapter's own links at the queue's edges", async () => {
      makeManager("user-1");
      await flush();
      const readingState = makeReadingState(vi.fn());
      const playlist = makePlaylist({ items: [{ type: "html", html: "a" }] });
      const instance = activateExtension(
        { playlists: [playlist], queue: playlist.items, step: 0 },
        false,
        readingState
      );

      // A single-item queue: no step before or after it.
      expect(instance.hasNext!.value).toBe(false);
      expect(instance.hasPrevious!.value).toBe(false);

      // With a chapter loaded that has neighbours, the reader can still move —
      // which is what keeps next/previous alive after a plan session ends.
      readingState.chapterData.value = {
        nextChapterApiLink: "/api/next.json",
        previousChapterApiLink: "/api/previous.json",
      } as any;
      expect(instance.hasNext!.value).toBe(true);
      expect(instance.hasPrevious!.value).toBe(true);
    });

    it("keeps navigateNext/navigatePrevious (and transformQueryParams) even for a shared reading state", async () => {
      makeManager("user-1");
      await flush();
      // Navigation is now synced, so the hooks are active regardless of sharing.
      const instance = activateExtension(undefined, true);

      expect(typeof instance.navigateNext).toBe("function");
      expect(typeof instance.navigatePrevious).toBe("function");
      expect(typeof instance.transformQueryParams).toBe("function");
    });

    it("transformQueryParams falls back to the initial URL locator (no step fallback) while nothing is playing", async () => {
      makeManager(
        "user-1",
        undefined,
        "http://localhost:3000/?playlist=user-1.playlist-1"
      );
      // No flush(): the construction-time deep-link autoplay is still async
      // and hasn't resolved yet, so this enablement has no playlist data.
      const instance = activateExtension();

      const result = instance.transformQueryParams!({
        readingState: {} as any,
        data: signal(undefined) as any,
        queryParams: {},
      });

      expect(result.playlist).toBe("user-1.playlist-1");
      expect(result.playlistStep).toBeNull();
    });

    it("transformQueryParams reflects the currently playing playlist and step", async () => {
      makeManager("user-1");
      await flush();
      const playlist = makePlaylist({
        id: "playlist-9",
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
        ],
      });
      const instance = activateExtension({
        playlists: [playlist],
        queue: playlist.items,
        step: 1,
      });

      const result = instance.transformQueryParams!({
        readingState: {} as any,
        data: signal(undefined) as any,
        queryParams: { book: "GEN" },
      });

      expect(result).toEqual({
        book: "GEN",
        playlist: "user-1.playlist-9",
        playlistStep: "1",
      });
    });

    it("subTitle/shortSubTitle use the first playlist's title while playing", async () => {
      makeManager("user-1");
      await flush();
      const playlist = makePlaylist({
        id: "playlist-9",
        title: "Morning Devotional",
        items: [{ type: "html", html: "a" }],
      });
      const instance = activateExtension({
        playlists: [playlist],
        queue: playlist.items,
        step: 0,
      });

      const ctx = {
        readingState: {} as any,
        data: signal({
          playlists: [playlist],
          queue: playlist.items,
          step: 0,
        }) as any,
        label: "Genesis 1",
      };

      expect(instance.transformSubTitle!(ctx)).toBe("Morning Devotional");
      expect(instance.transformShortSubTitle!(ctx)).toBe("Morning Devotional");
    });

    it("subTitle/shortSubTitle fall back to the default label when nothing is playing", async () => {
      makeManager("user-1");
      await flush();
      const instance = activateExtension();

      const ctx = {
        readingState: {} as any,
        data: signal(undefined) as any,
        label: "Genesis 1",
      };

      expect(instance.transformSubTitle!(ctx)).toBe("Genesis 1");
      expect(instance.transformShortSubTitle!(ctx)).toBe("Genesis 1");
    });

    it("subTitle/shortSubTitle fall back to the default label when the first playlist has no title", async () => {
      makeManager("user-1");
      await flush();
      const playlist = makePlaylist({
        title: null,
        items: [{ type: "html", html: "a" }],
      });
      const instance = activateExtension();

      const ctx = {
        readingState: {} as any,
        data: signal({
          playlists: [playlist],
          queue: playlist.items,
          step: 0,
        }) as any,
        label: "Genesis 1",
      };

      expect(instance.transformSubTitle!(ctx)).toBe("Genesis 1");
      expect(instance.transformShortSubTitle!(ctx)).toBe("Genesis 1");
    });

    it("mirrors local navigation into the serializable data (outbound sync)", async () => {
      makeManager("user-1");
      await flush();
      const playlist = makePlaylist({
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
        ],
      });
      const data = signal<unknown>({
        playlists: [playlist],
        queue: playlist.items,
        step: 0,
      });
      const definition =
        lastReadingExtensionManager.getReadingExtension("playlist")!;
      const instance = definition.activate({
        readingState: {} as any,
        data,
        isShared: signal(false),
      }) as unknown as PlaylistReadingExtensionInstance;

      // Advancing the queue writes the new step back into `data`.
      await instance.playingState.next();
      expect((data.value as PlaylistReadingData).step).toBe(1);
    });

    it("applies remote data changes onto the live playing state (inbound sync)", async () => {
      makeManager("user-1");
      await flush();
      const playlist = makePlaylist({
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
          { type: "html", html: "c" },
        ],
      });
      const data = signal<unknown>({
        playlists: [playlist],
        queue: playlist.items,
        step: 0,
      });
      const definition =
        lastReadingExtensionManager.getReadingExtension("playlist")!;
      const instance = definition.activate({
        readingState: {} as any,
        data,
        isShared: signal(false),
      }) as unknown as PlaylistReadingExtensionInstance;

      // A peer removes the first item and moves to step 1.
      data.value = {
        playlists: [playlist],
        queue: playlist.items.slice(1),
        step: 1,
      } satisfies PlaylistReadingData;

      expect(instance.playingState.queue.value).toEqual(
        playlist.items.slice(1)
      );
      expect(instance.playingState.currentIndex.value).toBe(1);
    });
  });

  it("resolves the playlist and step from a single coordinated URL change, even while another playlist is already playing", async () => {
    const manager = makeManager("user-1");
    await flush();
    manager.startPlaying(
      makePlaylist({ id: "first", items: [{ type: "html", html: "a" }] })
    );
    expect(manager.playing.value?.currentIndex.value).toBe(0);

    const second = makePlaylist({
      id: "second",
      recordName: "user-2",
      items: [
        { type: "html", html: "x" },
        { type: "html", html: "y" },
        { type: "html", html: "z" },
      ],
    });
    getDataMock.mockResolvedValueOnce({ success: true, data: second });

    const url = new URL(lastNavigation.currentUrl.value);
    url.search = "";
    url.searchParams.set("playlist", "user-2.second");
    url.searchParams.set("playlistStep", "2");
    lastNavigation.push(url.toString());
    await flush();

    expect(getDataMock).toHaveBeenCalledWith("user-2", "second");
    expect(manager.playing.value?.playlists.value).toEqual([second]);
    expect(manager.playing.value?.currentIndex.value).toBe(2);
  });

  it("stops playback when the playlist URL param is cleared", async () => {
    const playlist = makePlaylist({
      id: "playlist-1",
      items: [{ type: "html", html: "a" }],
    });
    getDataMock.mockResolvedValue({ success: true, data: playlist });

    const manager = makeManager(
      "user-1",
      undefined,
      "http://localhost:3000/?playlist=user-1.playlist-1"
    );
    await flush();
    expect(manager.playing.value).not.toBeNull();

    const url = new URL(lastNavigation.currentUrl.value);
    url.searchParams.delete("playlist");
    url.searchParams.delete("playlistStep");
    lastNavigation.push(url.toString());
    await flush();

    expect(manager.playing.value).toBeNull();
  });

  describe("playlist analytics", () => {
    let mockPosthogCapture: Mock;

    beforeEach(() => {
      mockPosthogCapture = vi.fn();
      (globalThis as any).posthog = { capture: mockPosthogCapture };
    });

    afterEach(() => {
      delete (globalThis as any).posthog;
    });

    it("captures playlist_created when saving a new draft", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.createNewPlaylist();
      const draftId = manager.editingPlaylist.value!.id;

      await manager.saveEditingPlaylist();

      expect(mockPosthogCapture).toHaveBeenCalledWith("playlist_created", {
        playlistId: draftId,
        playlistLocator: `user-1.${draftId}`,
        isCreator: true,
        itemCount: 0,
      });
    });

    it("captures playlist_updated when saving an existing playlist", async () => {
      listDataByMarkerMock.mockResolvedValue({
        success: true,
        items: [{ data: makePlaylist({ id: "playlist-1" }) }],
      });
      const manager = makeManager("user-1");
      await flush();

      manager.editingPlaylist.value = makePlaylist({
        id: "playlist-1",
        title: "New",
      });
      await manager.saveEditingPlaylist();

      expect(mockPosthogCapture).toHaveBeenCalledWith("playlist_updated", {
        playlistId: "playlist-1",
        playlistLocator: "user-1.playlist-1",
        isCreator: true,
        itemCount: 0,
      });
    });

    it("captures playlist_played with isCreator true for the user's own playlist", async () => {
      const manager = makeManager("user-1");
      await flush();
      const playlist = makePlaylist({ authorUserId: "user-1" });

      manager.startPlaying(playlist);

      expect(mockPosthogCapture).toHaveBeenCalledWith("playlist_played", {
        playlistId: playlist.id,
        playlistLocator: `${playlist.recordName}.${playlist.id}`,
        isCreator: true,
      });
    });

    it("captures playlist_played with isCreator false for a playlist shared by someone else", async () => {
      const manager = makeManager("user-1");
      await flush();
      const playlist = makePlaylist({ authorUserId: "user-2" });

      manager.startPlaying(playlist);

      expect(mockPosthogCapture).toHaveBeenCalledWith("playlist_played", {
        playlistId: playlist.id,
        playlistLocator: `${playlist.recordName}.${playlist.id}`,
        isCreator: false,
      });
    });

    it("captures playlist_finished once playback reaches the last item, and not again on revisit", async () => {
      const manager = makeManager("user-1");
      await flush();
      const playlist = makePlaylist({
        authorUserId: "user-2",
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
        ],
      });

      manager.startPlaying(playlist);
      mockPosthogCapture.mockClear(); // drop the "played" capture from startPlaying

      await manager.playing.value!.next();

      expect(mockPosthogCapture).toHaveBeenCalledWith("playlist_finished", {
        playlistId: playlist.id,
        playlistLocator: `${playlist.recordName}.${playlist.id}`,
        isCreator: false,
      });
      expect(mockPosthogCapture).toHaveBeenCalledTimes(1);

      // Navigating back to the last item again does not re-report it.
      await manager.playing.value!.previous();
      await manager.playing.value!.next();
      expect(mockPosthogCapture).toHaveBeenCalledTimes(1);
    });

    it("does not capture playlist_finished when a single-item playlist starts (start-at-last is not the same as finishing)", async () => {
      const manager = makeManager("user-1");
      await flush();
      const playlist = makePlaylist({ items: [{ type: "html", html: "a" }] });

      manager.startPlaying(playlist);

      // "played" fires for the start; "finished" must not, since nothing was
      // actually played through — the queue just happens to be one item long,
      // so its start and its end are the same index.
      expect(mockPosthogCapture).toHaveBeenCalledWith(
        "playlist_played",
        expect.anything()
      );
      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        "playlist_finished",
        expect.anything()
      );
    });

    it("does not capture playlist_finished when a deep link opens directly on the last step", async () => {
      const playlist = makePlaylist({
        id: "playlist-1",
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
          { type: "html", html: "c" },
        ],
      });
      getDataMock.mockResolvedValue({ success: true, data: playlist });

      // The URL opens straight on step 2 (the last item) via a shared link,
      // rather than the user navigating there.
      makeManager(
        "user-1",
        undefined,
        "http://localhost:3000/?playlist=user-1.playlist-1&playlistStep=2"
      );
      await flush();

      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        "playlist_finished",
        expect.anything()
      );
    });

    it("does not capture playlist_finished when removing trailing items clamps the current index to the new last item", async () => {
      const manager = makeManager("user-1");
      await flush();
      const playlist = makePlaylist({
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
          { type: "html", html: "c" },
          { type: "html", html: "d" },
        ],
      });

      manager.startPlaying(playlist);
      mockPosthogCapture.mockClear(); // drop the "played" capture from startPlaying
      await manager.playing.value!.next();
      await manager.playing.value!.next();
      expect(manager.playing.value!.currentIndex.value).toBe(2);

      // Deleting the trailing item shrinks the queue so index 2 becomes the
      // new last index, without the user ever advancing into it.
      manager.playing.value!.removeFromQueue(3);
      expect(manager.playing.value!.queue.value).toHaveLength(3);
      expect(manager.playing.value!.currentIndex.value).toBe(2);

      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        "playlist_finished",
        expect.anything()
      );
    });

    it("captures playlist_finished only for the participant that advances, not for a peer whose index moves via session sync", async () => {
      makeManager("user-1");
      await flush();
      const playlist = makePlaylist({
        authorUserId: "user-2",
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
        ],
      });
      // Both participants' enablements are mirrored onto the same `data`
      // signal, the same way `SessionsManager` keeps a shared session's
      // participants in sync.
      const sharedData = signal<unknown>({
        playlists: [playlist],
        queue: playlist.items,
        step: 0,
      });
      const definition =
        lastReadingExtensionManager.getReadingExtension("playlist")!;
      const participantA = definition.activate({
        readingState: {} as any,
        data: sharedData,
        isShared: signal(true),
      }) as unknown as PlaylistReadingExtensionInstance;
      const participantB = definition.activate({
        readingState: {} as any,
        data: sharedData,
        isShared: signal(true),
      }) as unknown as PlaylistReadingExtensionInstance;
      mockPosthogCapture.mockClear();

      // A advances locally into the last item...
      await participantA.playingState.next();
      // ...which propagates to B purely via the synced `data`...
      expect(participantB.playingState.currentIndex.value).toBe(1);

      // ...but only A actually finished playback; B's move was an inbound sync.
      expect(mockPosthogCapture).toHaveBeenCalledTimes(1);
      expect(mockPosthogCapture).toHaveBeenCalledWith("playlist_finished", {
        playlistId: playlist.id,
        playlistLocator: `${playlist.recordName}.${playlist.id}`,
        isCreator: false,
      });
    });

    it("does not throw and does not report playback events when posthog is unavailable", async () => {
      delete (globalThis as any).posthog;
      const manager = makeManager("user-1");
      await flush();
      const playlist = makePlaylist({
        items: [
          { type: "html", html: "a" },
          { type: "html", html: "b" },
        ],
      });

      expect(() => manager.startPlaying(playlist)).not.toThrow();
      await expect(manager.playing.value!.next()).resolves.toBeUndefined();

      expect(mockPosthogCapture).not.toHaveBeenCalled();
    });
  });
});

describe("createPlayingState", () => {
  const item = (n: number): PlaylistItemData => ({
    type: "html",
    html: `<p>${n}</p>`,
  });

  const makeItems = (count: number): PlaylistItemData[] =>
    Array.from({ length: count }, (_, i) => item(i));

  it("copies items into the queue without mutating the source playlist", () => {
    const items = makeItems(3);
    const playlist = makePlaylist({ items });
    const state = createPlayingState([playlist]);

    expect(state.queue.value).toEqual(items);

    state.addToQueue(item(99));
    state.removeFromQueue(0);

    expect(playlist.items).toEqual(items);
    expect(playlist.items).toHaveLength(3);
  });

  it("flattens items across multiple playlists in order", () => {
    const a = makePlaylist({ id: "a", items: [item(0), item(1)] });
    const b = makePlaylist({ id: "b", items: [item(2)] });
    const state = createPlayingState([a, b]);

    expect(state.queue.value).toEqual([item(0), item(1), item(2)]);
    expect(state.playlists.value).toEqual([a, b]);
  });

  it("defaults currentIndex to 0 and exposes the current item", () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(3) })]);

    expect(state.currentIndex.value).toBe(0);
    expect(state.currentItem.value).toEqual(item(0));
  });

  it("uses currentIndex -1 and a null current item for an empty queue", () => {
    const state = createPlayingState([makePlaylist({ items: [] })]);

    expect(state.currentIndex.value).toBe(-1);
    expect(state.currentItem.value).toBeNull();
    expect(state.hasNext.value).toBe(false);
    expect(state.hasPrevious.value).toBe(false);
  });

  it("clamps next()/previous() at the queue bounds", async () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(3) })]);

    expect(state.hasPrevious.value).toBe(false);
    await state.previous();
    expect(state.currentIndex.value).toBe(0);

    await state.next();
    expect(state.currentIndex.value).toBe(1);
    await state.next();
    expect(state.currentIndex.value).toBe(2);
    expect(state.hasNext.value).toBe(false);
    await state.next();
    expect(state.currentIndex.value).toBe(2);
  });

  it("jumps to an in-range index and ignores out-of-range jumps", async () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(3) })]);

    await state.jumpTo(2);
    expect(state.currentIndex.value).toBe(2);
    await state.jumpTo(5);
    expect(state.currentIndex.value).toBe(2);
    await state.jumpTo(-1);
    expect(state.currentIndex.value).toBe(2);
  });

  it("appends to the queue and activates an empty queue", () => {
    const state = createPlayingState([makePlaylist({ items: [] })]);

    state.addToQueue(item(0));
    expect(state.queue.value).toEqual([item(0)]);
    expect(state.currentIndex.value).toBe(0);
  });

  it("shifts currentIndex when removing an earlier item", async () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(4) })]);
    await state.jumpTo(2);

    state.removeFromQueue(0);

    expect(state.queue.value).toEqual([item(1), item(2), item(3)]);
    expect(state.currentIndex.value).toBe(1);
    expect(state.currentItem.value).toEqual(item(2));
  });

  it("clamps currentIndex when removing the last (current) item", async () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(3) })]);
    await state.jumpTo(2);

    state.removeFromQueue(2);

    expect(state.currentIndex.value).toBe(1);
    expect(state.currentItem.value).toEqual(item(1));
  });

  it("resets currentIndex to -1 when the queue becomes empty", () => {
    const state = createPlayingState([makePlaylist({ items: [item(0)] })]);

    state.removeFromQueue(0);

    expect(state.queue.value).toEqual([]);
    expect(state.currentIndex.value).toBe(-1);
    expect(state.currentItem.value).toBeNull();
  });

  it("keeps the current item selected when reordering", async () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(4) })]);
    await state.jumpTo(1); // currently on item(1)

    // Move item(1) to the end; currentIndex should follow it.
    state.reorderQueue(1, 3);
    expect(state.queue.value).toEqual([item(0), item(2), item(3), item(1)]);
    expect(state.currentIndex.value).toBe(3);
    expect(state.currentItem.value).toEqual(item(1));
  });

  it("shifts currentIndex when a reorder moves items across it", async () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(4) })]);
    await state.jumpTo(2); // currently on item(2)

    // Move a leading item to after the current one; current shifts left.
    state.reorderQueue(0, 3);
    expect(state.queue.value).toEqual([item(1), item(2), item(3), item(0)]);
    expect(state.currentIndex.value).toBe(1);
    expect(state.currentItem.value).toEqual(item(2));
  });

  it("ignores out-of-range or no-op reorders", () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(3) })]);
    const before = state.queue.value;

    state.reorderQueue(0, 0);
    state.reorderQueue(5, 0);
    state.reorderQueue(0, 5);

    expect(state.queue.value).toBe(before);
  });

  it("reset() returns to the first item", async () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(3) })]);
    await state.jumpTo(2);

    await state.reset();

    expect(state.currentIndex.value).toBe(0);
  });

  it("setState replaces playlists/queue and clamps the step into range", async () => {
    const a = makePlaylist({ id: "a", items: makeItems(3) });
    const state = createPlayingState([a]);
    const b = makePlaylist({ id: "b", items: makeItems(2) });

    await state.setState({ playlists: [b], queue: b.items, step: 5 });

    expect(state.playlists.value).toEqual([b]);
    expect(state.queue.value).toEqual(b.items);
    // step is clamped to the last index of the new queue
    expect(state.currentIndex.value).toBe(1);
  });

  it("setState uses currentIndex -1 for an empty queue", async () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(3) })]);

    await state.setState({ playlists: [], queue: [], step: 0 });

    expect(state.queue.value).toEqual([]);
    expect(state.currentIndex.value).toBe(-1);
  });

  describe("tab navigation", () => {
    const verse = (
      bookId: string,
      chapter: number,
      v: number,
      translationId?: string
    ): PlaylistItemData => ({
      type: "bible-verse",
      ref: { bookId, chapter, verse: v },
      translationId,
    });

    it("stores the provided tab", () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav);
      const state = createPlayingState(
        [makePlaylist({ items: makeItems(2) })],
        tab
      );
      expect(state.tab).toBe(tab);
    });

    it("does not navigate on creation (navigation is explicit, not effect-driven)", () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav);
      createPlayingState(
        [makePlaylist({ items: [verse("JHN", 3, 16, "WEB")] })],
        tab
      );

      // The old effect navigated to the first verse on creation; navigation is
      // now driven only by explicit next/previous/jumpTo/reset/setState calls.
      expect(nav).not.toHaveBeenCalled();
    });

    it("navigates to the current verse when jumping to it", async () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav);
      const state = createPlayingState(
        [
          makePlaylist({
            items: [verse("GEN", 1, 1), verse("JHN", 3, 16, "WEB")],
          }),
        ],
        tab
      );

      await state.jumpTo(1);

      expect(nav).toHaveBeenCalledTimes(1);
      expect(nav).toHaveBeenCalledWith("WEB", "JHN", 3, { scrollToVerse: 16 });
    });

    it("navigates when setState moves to a different step", async () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav, "WEB");
      const playlist = makePlaylist({
        items: [verse("GEN", 1, 1), verse("JHN", 3, 16, "WEB")],
      });
      const state = createPlayingState([playlist], tab);

      // This is how playback performs its initial navigation in production: the
      // reading extension hydrates the live state via setState.
      await state.setState({
        playlists: [playlist],
        queue: playlist.items,
        step: 1,
      });

      expect(nav).toHaveBeenCalledWith("WEB", "JHN", 3, { scrollToVerse: 16 });
    });

    it("falls back to the tab's current translation when the item has none", async () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav, "BSB");
      const state = createPlayingState(
        [makePlaylist({ items: [verse("GEN", 1, 1)] })],
        tab
      );

      await state.jumpTo(0);

      expect(nav).toHaveBeenCalledWith("BSB", "GEN", 1, { scrollToVerse: 1 });
    });

    it("re-navigates when advancing to another verse", async () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav, "BSB");
      const state = createPlayingState(
        [makePlaylist({ items: [verse("GEN", 1, 1), verse("EXO", 2, 3)] })],
        tab
      );

      await state.next();

      expect(nav).toHaveBeenCalledTimes(1);
      expect(nav).toHaveBeenCalledWith("BSB", "EXO", 2, { scrollToVerse: 3 });
    });

    it("next() resolves only after chapter navigation completes", async () => {
      let resolveNav: (() => void) | undefined;
      const nav = vi
        .fn()
        .mockReturnValue(new Promise<void>((r) => (resolveNav = r)));
      const tab = makeTab("tab-1", nav, "BSB");
      const state = createPlayingState(
        [makePlaylist({ items: [verse("GEN", 1, 1), verse("EXO", 2, 3)] })],
        tab
      );

      let settled = false;
      const done = state.next().then(() => {
        settled = true;
      });

      // Let any synchronous microtasks flush; the promise must still be pending
      // because chapter navigation hasn't resolved.
      await Promise.resolve();
      expect(nav).toHaveBeenCalledWith("BSB", "EXO", 2, { scrollToVerse: 3 });
      expect(settled).toBe(false);

      resolveNav!();
      await done;
      expect(settled).toBe(true);
    });

    it("does not navigate for non-verse items", async () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav, "BSB");
      const state = createPlayingState(
        [
          makePlaylist({
            items: [verse("GEN", 1, 1), { type: "html", html: "<p>x</p>" }],
          }),
        ],
        tab
      );

      await state.next(); // now on the html item

      expect(nav).not.toHaveBeenCalled();
    });

    it("does nothing when no tab is provided", async () => {
      const state = createPlayingState([
        makePlaylist({ items: [verse("GEN", 1, 1), verse("EXO", 2, 3)] }),
      ]);
      // No tab, no throw; navigation simply doesn't happen.
      await expect(state.next()).resolves.toBeUndefined();
      expect(state.tab).toBeNull();
    });

    it("highlights the full verse range, including the end verse", async () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav, "BSB");
      const decorateVerses = tab.readingState.decorateVerses as unknown as Mock;
      const state = createPlayingState(
        [
          makePlaylist({
            items: [
              {
                type: "bible-verse",
                ref: { bookId: "EXO", chapter: 5, verse: 2, endVerse: 5 },
              },
            ],
          }),
        ],
        tab
      );

      await state.jumpTo(0);

      expect(decorateVerses).toHaveBeenCalledWith(
        "EXO",
        5,
        [2, 3, 4, 5],
        expect.any(Object)
      );
    });

    it("dispose removes the active verse decoration", async () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav, "BSB");
      const decorateVerses = tab.readingState.decorateVerses as unknown as Mock;
      decorateVerses.mockReturnValue("dec-1");
      const state = createPlayingState(
        [makePlaylist({ items: [verse("GEN", 1, 1)] })],
        tab
      );

      await state.jumpTo(0); // navigate to the verse, creating a decoration
      expect(decorateVerses).toHaveBeenCalled();

      state.dispose();

      expect(tab.readingState.removeDecoration).toHaveBeenCalledWith("dec-1");
    });
  });

  describe("cross-chapter expansion", () => {
    it("expands a verse-anchored cross-chapter range into one item per chapter", () => {
      const state = createPlayingState([
        makePlaylist({
          items: [
            {
              type: "bible-verse",
              ref: {
                bookId: "GEN",
                chapter: 1,
                verse: 2,
                endChapter: 3,
                endVerse: 4,
              },
            },
          ],
        }),
      ]);

      expect(state.queue.value).toEqual([
        {
          type: "bible-verse",
          translationId: undefined,
          ref: { bookId: "GEN", chapter: 1, verse: 2, toEndOfChapter: true },
        },
        {
          type: "bible-verse",
          translationId: undefined,
          ref: { bookId: "GEN", chapter: 2 },
        },
        {
          type: "bible-verse",
          translationId: undefined,
          ref: { bookId: "GEN", chapter: 3, verse: 1, endVerse: 4 },
        },
      ]);
    });

    it("expands a pure chapter range (no verse anchor) into whole-chapter items", () => {
      const state = createPlayingState([
        makePlaylist({
          items: [
            {
              type: "bible-verse",
              ref: { bookId: "JHN", chapter: 1, endChapter: 3 },
            },
          ],
        }),
      ]);

      expect(state.queue.value).toEqual([
        {
          type: "bible-verse",
          translationId: undefined,
          ref: { bookId: "JHN", chapter: 1 },
        },
        {
          type: "bible-verse",
          translationId: undefined,
          ref: { bookId: "JHN", chapter: 2 },
        },
        {
          type: "bible-verse",
          translationId: undefined,
          ref: { bookId: "JHN", chapter: 3 },
        },
      ]);
    });

    it("does not expand when endChapter equals chapter", () => {
      const item: PlaylistItemData = {
        type: "bible-verse",
        ref: {
          bookId: "GEN",
          chapter: 1,
          verse: 2,
          endChapter: 1,
          endVerse: 4,
        },
      };
      const state = createPlayingState([makePlaylist({ items: [item] })]);

      expect(state.queue.value).toEqual([item]);
    });

    it("does not expand non-bible-verse items", () => {
      const item: PlaylistItemData = { type: "html", html: "<p>hi</p>" };
      const state = createPlayingState([makePlaylist({ items: [item] })]);

      expect(state.queue.value).toEqual([item]);
    });

    it("does not expand when endChapter exceeds the maximum possible chapter number", () => {
      const item: PlaylistItemData = {
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 1, endChapter: 999 },
      };
      const state = createPlayingState([makePlaylist({ items: [item] })]);

      expect(state.queue.value).toEqual([item]);
    });

    it("addToQueue also expands a cross-chapter item", () => {
      const state = createPlayingState([makePlaylist({ items: [] })]);

      state.addToQueue({
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 1, endChapter: 2 },
      });

      expect(state.queue.value).toEqual([
        {
          type: "bible-verse",
          translationId: undefined,
          ref: { bookId: "GEN", chapter: 1 },
        },
        {
          type: "bible-verse",
          translationId: undefined,
          ref: { bookId: "GEN", chapter: 2 },
        },
      ]);
    });

    it("resolves the toEndOfChapter highlight from the loaded chapter data", async () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav, "BSB");
      const decorateVerses = tab.readingState.decorateVerses as unknown as Mock;
      tab.readingState.chapterData.value = {
        book: { id: "GEN" },
        chapter: { number: 1, numberOfVerses: 31 },
        numberOfVerses: 31,
      } as any;
      const state = createPlayingState(
        [
          makePlaylist({
            items: [
              {
                type: "bible-verse",
                ref: { bookId: "GEN", chapter: 1, verse: 29, endChapter: 2 },
              },
            ],
          }),
        ],
        tab
      );

      await state.jumpTo(0); // the first fragment: GEN 1:29, toEndOfChapter

      expect(decorateVerses).toHaveBeenCalledWith(
        "GEN",
        1,
        [29, 30, 31],
        expect.any(Object)
      );
    });

    it("falls back to a single-verse highlight when chapter data hasn't loaded yet", async () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav, "BSB");
      const decorateVerses = tab.readingState.decorateVerses as unknown as Mock;
      // chapterData defaults to null in the fixture: simulates navigation
      // not having resolved chapter data yet.
      const state = createPlayingState(
        [
          makePlaylist({
            items: [
              {
                type: "bible-verse",
                ref: { bookId: "GEN", chapter: 1, verse: 29, endChapter: 2 },
              },
            ],
          }),
        ],
        tab
      );

      await state.jumpTo(0);

      expect(decorateVerses).toHaveBeenCalledWith(
        "GEN",
        1,
        [29],
        expect.any(Object)
      );
    });

    it("falls back to a single-verse highlight when chapter data belongs to a different chapter (stale fetch)", async () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav, "BSB");
      const decorateVerses = tab.readingState.decorateVerses as unknown as Mock;
      // Simulates a failed fetch: `chapterData` still holds a previous,
      // unrelated chapter rather than being cleared.
      tab.readingState.chapterData.value = {
        book: { id: "GEN" },
        chapter: { number: 9, numberOfVerses: 29 },
        numberOfVerses: 29,
      } as any;
      const state = createPlayingState(
        [
          makePlaylist({
            items: [
              {
                type: "bible-verse",
                ref: { bookId: "GEN", chapter: 1, verse: 29, endChapter: 2 },
              },
            ],
          }),
        ],
        tab
      );

      await state.jumpTo(0);

      expect(decorateVerses).toHaveBeenCalledWith(
        "GEN",
        1,
        [29],
        expect.any(Object)
      );
    });
  });
});
