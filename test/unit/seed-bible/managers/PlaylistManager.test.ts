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
  createPlaylistManager,
  createPlayingState,
  type Playlist,
  type PlaylistItemData,
  type PlaylistReadingData,
  type PlaylistReadingExtensionInstance,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import { computed, signal } from "@preact/signals";
import type { Mock } from "vitest";

const START_MS = Date.UTC(2026, 5, 17, 13, 45, 0);
const MARKER = "publicRead:playlists";

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

type LoginArg = Parameters<typeof createPlaylistManager>[1];
type TabsArg = Parameters<typeof createPlaylistManager>[2];
type TabArg = Parameters<typeof createPlayingState>[1];

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
    lastNavigation = navigation;
    lastReadingExtensionManager = readingExtensionManager;
    return createPlaylistManager(
      os,
      login,
      tabs,
      navigation,
      isMobile,
      modals,
      i18n,
      readingExtensionManager
    );
  };

  beforeEach(() => {
    recordDataMock = vi.fn().mockResolvedValue(undefined);
    listDataByMarkerMock = vi
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

  it("deletePlaylist erases the record and drops it from userPlaylists", async () => {
    listDataByMarkerMock.mockResolvedValue({
      success: true,
      items: [{ data: makePlaylist({ id: "playlist-a" }) }],
    });
    const manager = makeManager("user-1");
    await flush();
    expect(manager.userPlaylists.value).toHaveLength(1);

    await manager.deletePlaylist(
      makePlaylist({ id: "playlist-a", recordName: "user-1" })
    );

    expect(eraseDataMock).toHaveBeenCalledWith("user-1", "playlist-a");
    expect(manager.userPlaylists.value).toEqual([]);
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

  describe("playlist reading extension", () => {
    /**
     * Activates the registered "playlist" reading extension in isolation, with
     * the given per-enablement `data`. The returned instance owns its own live
     * playing state, built from that data.
     */
    const activateExtension = (
      data?: PlaylistReadingData,
      isShared = false
    ): PlaylistReadingExtensionInstance => {
      const definition =
        lastReadingExtensionManager.getReadingExtension("playlist");
      if (!definition) {
        throw new Error('"playlist" reading extension was not registered');
      }
      return definition.activate({
        readingState: {} as any,
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

    it("navigateNext/navigatePrevious advance the queue and prevent at the bounds", async () => {
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

      // At the start of the queue, previous() is prevented.
      expect(await instance.navigatePrevious!({} as any)).toEqual({
        type: "prevent",
      });
      // Advancing is handled by the playing state itself (which drives the
      // reader), so the hook returns "prevent" to stop the reader's own
      // chapter navigation rather than "handled".
      expect(await instance.navigateNext!({} as any)).toEqual({
        type: "prevent",
      });
      expect(instance.playingState.currentIndex.value).toBe(1);
      // At the end of the queue, next() is prevented too.
      expect(await instance.navigateNext!({} as any)).toEqual({
        type: "prevent",
      });
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
});
