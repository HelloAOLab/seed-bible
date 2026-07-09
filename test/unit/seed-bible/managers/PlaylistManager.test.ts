import { createI18nManager } from "@packages/seed-bible/seed-bible/i18n";
import {
  CasualOSManager,
  createModalManager,
  createNavigationManager,
} from "@packages/seed-bible/seed-bible/managers";
import {
  PlaylistItem,
  PlaylistSchema,
  createPlaylistManager,
  createPlayingState,
  type Playlist,
  type PlaylistItemData,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import { signal } from "@preact/signals";
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

/** Builds a mock reader tab whose reading state records navigation calls. */
function makeTab(
  id: string,
  selectTranslationAndChapter: Mock,
  translationId = "BSB"
): NonNullable<TabArg> {
  return {
    id,
    title: id,
    readingState: {
      selectTranslationAndChapter,
      translationId: signal(translationId),
      decorateVerses: vi.fn(),
    },
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

  const makeManager = (id: string | null = "user-1", tabsManager?: TabsArg) => {
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
    const navigation = createNavigationManager();
    const isMobile = signal(false);
    const modals = createModalManager();
    const i18n = createI18nManager(navigation, ["en"]);
    return createPlaylistManager(
      os,
      login,
      tabs,
      navigation,
      isMobile,
      modals,
      i18n
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
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
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

  it("startPlaying prefers shared tabs over selected tabs", async () => {
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
    expect(manager.playing.value?.tab?.id).toBe("tab-2");

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

  it("clamps next()/previous() at the queue bounds", () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(3) })]);

    expect(state.hasPrevious.value).toBe(false);
    state.previous();
    expect(state.currentIndex.value).toBe(0);

    state.next();
    expect(state.currentIndex.value).toBe(1);
    state.next();
    expect(state.currentIndex.value).toBe(2);
    expect(state.hasNext.value).toBe(false);
    state.next();
    expect(state.currentIndex.value).toBe(2);
  });

  it("jumps to an in-range index and ignores out-of-range jumps", () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(3) })]);

    state.jumpTo(2);
    expect(state.currentIndex.value).toBe(2);
    state.jumpTo(5);
    expect(state.currentIndex.value).toBe(2);
    state.jumpTo(-1);
    expect(state.currentIndex.value).toBe(2);
  });

  it("appends to the queue and activates an empty queue", () => {
    const state = createPlayingState([makePlaylist({ items: [] })]);

    state.addToQueue(item(0));
    expect(state.queue.value).toEqual([item(0)]);
    expect(state.currentIndex.value).toBe(0);
  });

  it("shifts currentIndex when removing an earlier item", () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(4) })]);
    state.jumpTo(2);

    state.removeFromQueue(0);

    expect(state.queue.value).toEqual([item(1), item(2), item(3)]);
    expect(state.currentIndex.value).toBe(1);
    expect(state.currentItem.value).toEqual(item(2));
  });

  it("clamps currentIndex when removing the last (current) item", () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(3) })]);
    state.jumpTo(2);

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

  it("keeps the current item selected when reordering", () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(4) })]);
    state.jumpTo(1); // currently on item(1)

    // Move item(1) to the end; currentIndex should follow it.
    state.reorderQueue(1, 3);
    expect(state.queue.value).toEqual([item(0), item(2), item(3), item(1)]);
    expect(state.currentIndex.value).toBe(3);
    expect(state.currentItem.value).toEqual(item(1));
  });

  it("shifts currentIndex when a reorder moves items across it", () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(4) })]);
    state.jumpTo(2); // currently on item(2)

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

  it("reset() returns to the first item", () => {
    const state = createPlayingState([makePlaylist({ items: makeItems(3) })]);
    state.jumpTo(2);

    state.reset();

    expect(state.currentIndex.value).toBe(0);
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

    it("navigates the tab to the first verse immediately", () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav);
      createPlayingState(
        [makePlaylist({ items: [verse("JHN", 3, 16, "WEB")] })],
        tab
      );

      expect(nav).toHaveBeenCalledTimes(1);
      expect(nav).toHaveBeenCalledWith("WEB", "JHN", 3, { scrollToVerse: 16 });
    });

    it("falls back to the tab's current translation when the item has none", () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav, "BSB");
      createPlayingState([makePlaylist({ items: [verse("GEN", 1, 1)] })], tab);

      expect(nav).toHaveBeenCalledWith("BSB", "GEN", 1, { scrollToVerse: 1 });
    });

    it("re-navigates when advancing to another verse", () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav, "BSB");
      const state = createPlayingState(
        [makePlaylist({ items: [verse("GEN", 1, 1), verse("EXO", 2, 3)] })],
        tab
      );
      nav.mockClear();

      state.next();

      expect(nav).toHaveBeenCalledTimes(1);
      expect(nav).toHaveBeenCalledWith("BSB", "EXO", 2, { scrollToVerse: 3 });
    });

    it("does not navigate for non-verse items", () => {
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
      nav.mockClear();

      state.next(); // now on the html item

      expect(nav).not.toHaveBeenCalled();
    });

    it("does nothing when no tab is provided", () => {
      const state = createPlayingState([
        makePlaylist({ items: [verse("GEN", 1, 1)] }),
      ]);
      // No tab, no throw; navigation simply doesn't happen.
      expect(() => state.next()).not.toThrow();
      expect(state.tab).toBeNull();
    });

    it("dispose stops further navigation", () => {
      const nav = vi.fn().mockResolvedValue(undefined);
      const tab = makeTab("tab-1", nav, "BSB");
      const state = createPlayingState(
        [makePlaylist({ items: [verse("GEN", 1, 1), verse("EXO", 2, 3)] })],
        tab
      );
      nav.mockClear();

      state.dispose();
      state.next();

      expect(nav).not.toHaveBeenCalled();
    });
  });
});
