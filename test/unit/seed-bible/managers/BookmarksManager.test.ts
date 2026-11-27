import {
  createBookmarksManager,
  MAX_BOOKMARKS,
  type Bookmark,
  type BookmarksManager,
  type BookmarksPayload,
} from "@packages/seed-bible/seed-bible/managers/BookmarksManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  createInMemoryRecordStore,
  type OfflineRecordStore,
} from "@packages/seed-bible/seed-bible/managers/OfflineRecordStore";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal } from "@preact/signals";
import type { Mock } from "vitest";

const GEN_10 = { translationId: "BSB", bookId: "GEN", chapterNumber: 10 };
const EXO_3 = { translationId: "BSB", bookId: "EXO", chapterNumber: 3 };
const PSA_23 = { translationId: "BSB", bookId: "PSA", chapterNumber: 23 };

function aBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: "bm-1",
    name: "My bookmark",
    colorId: "orange",
    ...GEN_10,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

const NOT_FOUND = {
  success: false,
  errorCode: "data_not_found",
  errorMessage: "Data not found",
};

describe("BookmarksManager", () => {
  let getDataMock: Mock;
  let recordDataMock: Mock;
  let warnSpy: Mock;
  let login: LoginManager;
  let os: CasualOSManager;
  /** The bookmarks kept on the device, shared by every manager in a test. */
  let store: OfflineRecordStore<BookmarksPayload>;
  /** What the records server holds, by address. */
  let records: Record<string, unknown>;
  let managers: BookmarksManager[];

  const createManager = () => {
    const manager = createBookmarksManager(os, login, { store });
    managers.push(manager);
    return manager;
  };

  // A zero-delay timer runs only once the whole microtask queue has drained,
  // however many awaits deep the store-then-server chain is.
  const flushPromises = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 0));

  /** Lets every queued change reach the server. */
  const settle = async (manager: BookmarksManager) => {
    await flushPromises();
    await manager.sync.sync();
    await flushPromises();
  };

  /** What the server holds for the bookmarks record. */
  const onServer = (): Bookmark[] =>
    (records.readingBookmarks as BookmarksPayload | undefined)?.bookmarks ?? [];

  /** Writes to the server as another device would. */
  const otherDeviceWrites = (bookmarks: Bookmark[]) => {
    records.readingBookmarks = { bookmarks };
  };

  const goOffline = () => {
    getDataMock.mockRejectedValue(new Error("offline"));
    recordDataMock.mockRejectedValue(new Error("offline"));
    window.dispatchEvent(new Event("offline"));
  };

  const serveRecords = () => {
    getDataMock.mockImplementation(async (_userId: string, address: string) =>
      address in records ? { success: true, data: records[address] } : NOT_FOUND
    );
    recordDataMock.mockImplementation(
      async (_userId: string, address: string, data: unknown) => {
        records[address] = data;
        return { success: true };
      }
    );
  };

  const goOnline = () => {
    serveRecords();
    window.dispatchEvent(new Event("online"));
  };

  beforeEach(() => {
    records = {};
    managers = [];
    store = createInMemoryRecordStore<BookmarksPayload>();
    os = CasualOSManager();
    getDataMock = vi.spyOn(os, "getData") as unknown as Mock;
    recordDataMock = vi.spyOn(os, "recordData") as unknown as Mock;
    serveRecords();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    login = {
      userId: signal<string | null>("user-1"),
      login: vi.fn().mockResolvedValue(undefined),
    } as unknown as LoginManager;
  });

  afterEach(() => {
    for (const manager of managers) {
      manager.sync.dispose();
    }
    warnSpy.mockRestore();
  });

  it("starts empty and reads nothing when signed out", () => {
    login.userId.value = null;

    const manager = createManager();

    expect(manager.bookmarks.value).toEqual([]);
    expect(getDataMock).not.toHaveBeenCalled();
  });

  it("loads only the readingBookmarks record", async () => {
    // A user with a full saves history must not see it as bookmarks.
    records = {
      readingBookmarks: { bookmarks: [aBookmark()] },
      bookmarks: { bookmarks: [aBookmark({ id: "legacy" })] },
      saves: { saves: [aBookmark({ id: "save" })] },
    };

    const manager = createManager();
    await flushPromises();

    expect(manager.bookmarks.value.map((b) => b.id)).toEqual(["bm-1"]);
    expect(
      new Set(getDataMock.mock.calls.map((call) => call[1] as string))
    ).toEqual(new Set(["readingBookmarks"]));
  });

  it("keeps the valid bookmarks of a list that has a broken one", async () => {
    records = {
      readingBookmarks: {
        bookmarks: [aBookmark(), { id: "broken", name: "" }],
      },
    };

    const manager = createManager();
    await flushPromises();

    expect(manager.bookmarks.value.map((b) => b.id)).toEqual(["bm-1"]);
  });

  it("orders bookmarks most recently moved first", async () => {
    records = {
      readingBookmarks: {
        bookmarks: [
          aBookmark({ id: "old", updatedAt: 100 }),
          aBookmark({ id: "new", updatedAt: 300 }),
          aBookmark({ id: "mid", updatedAt: 200 }),
        ],
      },
    };

    const manager = createManager();
    await flushPromises();

    expect(manager.bookmarks.value.map((b) => b.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("creates a bookmark at a chapter and writes it", async () => {
    const manager = createManager();
    await flushPromises();

    const created = await manager.createBookmark(
      { name: "  Reading plan  ", colorId: "blue" },
      GEN_10
    );
    await settle(manager);

    expect(created).toMatchObject({
      name: "Reading plan",
      colorId: "blue",
      ...GEN_10,
    });
    expect(manager.bookmarks.value).toEqual([created]);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "readingBookmarks",
      { bookmarks: [created] },
      { marker: "publicRead" }
    );
  });

  it("refuses a blank name", async () => {
    const manager = createManager();
    await flushPromises();

    const created = await manager.createBookmark(
      { name: "   ", colorId: "blue" },
      GEN_10
    );
    await settle(manager);

    expect(created).toBeNull();
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  describe("the cap", () => {
    const stored = (count: number) =>
      Array.from({ length: count }, (_, i) => aBookmark({ id: `bm-${i}` }));

    it("stops creating at the cap", async () => {
      records = { readingBookmarks: { bookmarks: stored(MAX_BOOKMARKS) } };
      const manager = createManager();
      await flushPromises();

      expect(manager.canCreate.value).toBe(false);
      const created = await manager.createBookmark(
        { name: "One more", colorId: "red" },
        GEN_10
      );
      await settle(manager);

      expect(created).toBeNull();
      expect(manager.bookmarks.value).toHaveLength(MAX_BOOKMARKS);
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("never truncates a stored list that is already over the cap", async () => {
      records = {
        readingBookmarks: { bookmarks: stored(MAX_BOOKMARKS + 2) },
      };
      const manager = createManager();
      await flushPromises();

      expect(manager.bookmarks.value).toHaveLength(MAX_BOOKMARKS + 2);

      await manager.moveBookmark("bm-0", EXO_3);
      await settle(manager);

      expect(onServer()).toHaveLength(MAX_BOOKMARKS + 2);
    });
  });

  it("moves a bookmark and brings it to the front", async () => {
    records = {
      readingBookmarks: {
        bookmarks: [
          aBookmark({ id: "a", updatedAt: 100 }),
          aBookmark({ id: "b", updatedAt: 200 }),
        ],
      },
    };
    const manager = createManager();
    await flushPromises();

    await manager.moveBookmark("a", EXO_3);
    await settle(manager);

    const [front] = manager.bookmarks.value;
    expect(front).toMatchObject({ id: "a", ...EXO_3 });
    expect(front!.updatedAt).toBeGreaterThan(200);
    expect(onServer().find((b) => b.id === "a")).toMatchObject(EXO_3);
  });

  it("renames and recolors without moving", async () => {
    records = { readingBookmarks: { bookmarks: [aBookmark()] } };
    const manager = createManager();
    await flushPromises();

    await manager.updateBookmark("bm-1", {
      name: "Sermon prep",
      colorId: "purple",
    });
    await settle(manager);

    const renamed = aBookmark({ name: "Sermon prep", colorId: "purple" });
    expect(manager.bookmarks.value).toEqual([renamed]);
    expect(onServer()).toEqual([renamed]);
  });

  it("deletes a bookmark", async () => {
    records = { readingBookmarks: { bookmarks: [aBookmark()] } };
    const manager = createManager();
    await flushPromises();

    await manager.removeBookmark("bm-1");
    await settle(manager);

    expect(manager.bookmarks.value).toEqual([]);
    expect(onServer()).toEqual([]);
  });

  it("keeps every change made in quick succession", async () => {
    records = {
      readingBookmarks: {
        bookmarks: [aBookmark({ id: "a" }), aBookmark({ id: "b" })],
      },
    };
    const manager = createManager();
    await flushPromises();

    await Promise.all([
      manager.removeBookmark("a"),
      manager.updateBookmark("b", { name: "Renamed", colorId: "red" }),
      manager.createBookmark({ name: "New", colorId: "blue" }, EXO_3),
    ]);
    await settle(manager);

    const names = (list: Bookmark[]) => list.map((b) => b.name).sort();
    expect(names(manager.bookmarks.value)).toEqual(["New", "Renamed"]);
    expect(names(onServer())).toEqual(["New", "Renamed"]);
  });

  describe("lookups by chapter", () => {
    it("returns every bookmark on the chapter, most recently moved first", async () => {
      records = {
        readingBookmarks: {
          bookmarks: [
            aBookmark({ id: "first", updatedAt: 100 }),
            aBookmark({ id: "elsewhere", ...EXO_3, updatedAt: 300 }),
            aBookmark({ id: "latest", updatedAt: 200 }),
          ],
        },
      };
      const manager = createManager();
      await flushPromises();

      expect(
        manager
          .getBookmarksForLocation("BSB", "GEN", 10)
          .map((bookmark) => bookmark.id)
      ).toEqual(["latest", "first"]);
    });

    it("ignores a bookmark on the same chapter in another translation", async () => {
      records = {
        readingBookmarks: {
          bookmarks: [aBookmark({ translationId: "KJV" })],
        },
      };
      const manager = createManager();
      await flushPromises();

      expect(manager.getBookmarksForLocation("BSB", "GEN", 10)).toEqual([]);
    });

    it("returns nothing for an unknown location", () => {
      const manager = createManager();
      expect(manager.getBookmarksForLocation(null, "GEN", 10)).toEqual([]);
    });
  });

  describe("when the record can't be read and the device has no copy", () => {
    beforeEach(() => {
      getDataMock.mockResolvedValue({
        success: false,
        errorCode: "server_error",
        errorMessage: "Server error",
      });
    });

    it("writes nothing rather than replace a record it never saw", async () => {
      const manager = createManager();
      await flushPromises();

      expect(await manager.ensureLoaded()).toBe(false);
      const created = await manager.createBookmark(
        { name: "My bookmark", colorId: "orange" },
        GEN_10
      );
      await settle(manager);

      expect(created).toBeNull();
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("recovers on the next action once the read succeeds", async () => {
      const manager = createManager();
      await flushPromises();

      getDataMock.mockResolvedValue({
        success: true,
        data: { bookmarks: [aBookmark()] },
      });

      expect(await manager.ensureLoaded()).toBe(true);
      expect(manager.bookmarks.value.map((b) => b.id)).toEqual(["bm-1"]);
    });
  });

  describe("offline", () => {
    let manager: BookmarksManager;
    const a = aBookmark({ id: "a", name: "Reading plan", updatedAt: 200 });
    const b = aBookmark({ id: "b", name: "Sermon prep", updatedAt: 100 });

    beforeEach(async () => {
      records = { readingBookmarks: { bookmarks: [a, b] } };
      manager = createManager();
      await flushPromises();
      goOffline();
    });

    afterEach(() => {
      // Each manager reads `navigator.onLine` at creation, which jsdom never
      // changes, but the event resets any still listening.
      window.dispatchEvent(new Event("online"));
    });

    it("creates, moves, renames and deletes, keeping each on screen", async () => {
      const created = await manager.createBookmark(
        { name: "Flight", colorId: "blue" },
        PSA_23
      );
      await manager.moveBookmark("a", EXO_3);
      await manager.updateBookmark("a", { name: "Renamed", colorId: "red" });
      await manager.removeBookmark("b");
      await settle(manager);

      expect(created).not.toBeNull();
      // Unordered: the create and the move can land in the same millisecond.
      expect(manager.bookmarks.value).toHaveLength(2);
      expect(manager.bookmarks.value).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "a", name: "Renamed", ...EXO_3 }),
          created,
        ])
      );
      expect(recordDataMock).not.toHaveBeenCalled();
      expect(manager.sync.pendingCount.value).toBe(1);
    });

    it("sends the queued changes on reconnect when nothing changed elsewhere", async () => {
      await manager.moveBookmark("a", EXO_3);
      await manager.removeBookmark("b");

      goOnline();
      await settle(manager);

      expect(onServer()).toEqual([
        expect.objectContaining({ id: "a", ...EXO_3 }),
      ]);
      expect(manager.sync.pendingCount.value).toBe(0);
    });

    it("shows the device's copy, with unsent changes, when reopened offline", async () => {
      await manager.moveBookmark("a", EXO_3);
      manager.sync.dispose();

      const reopened = createManager();
      await flushPromises();

      expect(await reopened.ensureLoaded()).toBe(true);
      expect(reopened.bookmarks.value).toEqual([
        expect.objectContaining({ id: "a", ...EXO_3 }),
        b,
      ]);

      await reopened.moveBookmark("b", PSA_23);
      expect(reopened.bookmarks.value[0]).toMatchObject({
        id: "b",
        ...PSA_23,
      });
    });

    it("keeps both moves when another device moved a different bookmark", async () => {
      await manager.moveBookmark("a", EXO_3);
      otherDeviceWrites([a, { ...b, ...PSA_23, updatedAt: 5000 }]);

      goOnline();
      await settle(manager);

      const expected = [
        expect.objectContaining({ id: "a", ...EXO_3 }),
        expect.objectContaining({ id: "b", ...PSA_23 }),
      ];
      expect(onServer()).toEqual(expect.arrayContaining(expected));
      expect(manager.bookmarks.value).toEqual(expect.arrayContaining(expected));
    });

    it("keeps the later move when the same bookmark moved in both places", async () => {
      await manager.moveBookmark("a", EXO_3);
      const movedHereAt = manager.bookmarks.value[0]!.updatedAt;
      otherDeviceWrites([{ ...a, ...PSA_23, updatedAt: movedHereAt + 1 }, b]);

      goOnline();
      await settle(manager);

      expect(onServer().find((x) => x.id === "a")).toMatchObject(PSA_23);
      expect(manager.bookmarks.value[0]).toMatchObject({ id: "a", ...PSA_23 });
    });

    it("keeps this device's move when it is the later one", async () => {
      await manager.moveBookmark("a", EXO_3);
      otherDeviceWrites([{ ...a, ...PSA_23, updatedAt: 300 }, b]);

      goOnline();
      await settle(manager);

      expect(onServer().find((x) => x.id === "a")).toMatchObject(EXO_3);
    });

    it("keeps a rename here and a move elsewhere of the same bookmark", async () => {
      await manager.updateBookmark("a", { name: "Renamed", colorId: "red" });
      otherDeviceWrites([{ ...a, ...PSA_23, updatedAt: 5000 }, b]);

      goOnline();
      await settle(manager);

      expect(onServer().find((x) => x.id === "a")).toMatchObject({
        name: "Renamed",
        colorId: "red",
        ...PSA_23,
        updatedAt: 5000,
      });
    });

    it("doesn't bring back a bookmark deleted here, and keeps one created elsewhere", async () => {
      await manager.removeBookmark("b");
      const elsewhere = aBookmark({ id: "c", name: "Elsewhere" });
      otherDeviceWrites([a, b, elsewhere]);

      goOnline();
      await settle(manager);

      expect(
        onServer()
          .map((x) => x.id)
          .sort()
      ).toEqual(["a", "c"]);
    });

    it("keeps every bookmark when merging takes the list over the cap", async () => {
      for (let i = 0; i < MAX_BOOKMARKS - 2; i++) {
        await manager.createBookmark(
          { name: `Here ${i}`, colorId: "blue" },
          GEN_10
        );
      }
      otherDeviceWrites([
        a,
        b,
        aBookmark({ id: "there-1" }),
        aBookmark({ id: "there-2" }),
      ]);

      goOnline();
      await settle(manager);

      expect(onServer()).toHaveLength(MAX_BOOKMARKS + 2);
      expect(manager.bookmarks.value).toHaveLength(MAX_BOOKMARKS + 2);
    });

    it("shows changes from another device on reconnect with nothing queued", async () => {
      otherDeviceWrites([{ ...a, ...PSA_23, updatedAt: 5000 }, b]);

      goOnline();
      await settle(manager);

      expect(manager.bookmarks.value[0]).toMatchObject({ id: "a", ...PSA_23 });
    });

    it("never writes over the record while the server can't be read", async () => {
      await manager.removeBookmark("a");
      await manager.removeBookmark("b");

      // Back online, but every read of the record fails.
      getDataMock.mockResolvedValue({
        success: false,
        errorCode: "server_error",
      });
      recordDataMock.mockResolvedValue({ success: true });
      window.dispatchEvent(new Event("online"));
      await settle(manager);

      expect(recordDataMock).not.toHaveBeenCalled();
      expect(onServer()).toEqual([a, b]);
      expect(manager.sync.pendingCount.value).toBe(1);
    });
  });

  it("clears bookmarks and closes the panel on sign-out", async () => {
    records = { readingBookmarks: { bookmarks: [aBookmark()] } };
    const manager = createManager();
    await flushPromises();
    manager.isPanelOpen.value = true;

    login.userId.value = null;

    expect(manager.bookmarks.value).toEqual([]);
    expect(manager.isPanelOpen.value).toBe(false);
  });
});
