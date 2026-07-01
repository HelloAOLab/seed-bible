import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers";
import {
  PlaylistItem,
  PlaylistSchema,
  createPlaylistManager,
  type Playlist,
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

describe("createPlaylistManager", () => {
  type LoginArg = Parameters<typeof createPlaylistManager>[1];

  let recordDataMock: Mock;
  let listDataByMarkerMock: Mock;
  let loginMock: Mock;
  let warnSpy: Mock;
  let errorSpy: Mock;
  let userId: ReturnType<typeof signal<string | null>>;

  const flush = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  const makeManager = (id: string | null = "user-1") => {
    userId = signal<string | null>(id);
    const os = CasualOSManager();
    Object.assign(os, {
      recordData: recordDataMock,
      listDataByMarker: listDataByMarkerMock,
    });
    const login = { userId, login: loginMock } as unknown as LoginArg;
    return createPlaylistManager(os, login);
  };

  beforeEach(() => {
    recordDataMock = vi.fn().mockResolvedValue(undefined);
    listDataByMarkerMock = vi
      .fn()
      .mockResolvedValue({ success: true, items: [] });
    loginMock = vi.fn().mockResolvedValue(null);
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
    expect(manager.view.value).toBe("discover");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("saveEditingPlaylist is a no-op when nothing is being edited", async () => {
    const manager = makeManager("user-1");
    await flush();
    recordDataMock.mockClear();

    await manager.saveEditingPlaylist();

    expect(recordDataMock).not.toHaveBeenCalled();
    expect(manager.view.value).toBe("discover");
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
});
