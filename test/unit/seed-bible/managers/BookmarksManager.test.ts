import {
  createBookmarksManager,
  MAX_BOOKMARKS,
  type Bookmark,
} from "@packages/seed-bible/seed-bible/managers/BookmarksManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal } from "@preact/signals";
import type { Mock } from "vitest";

const GEN_10 = { translationId: "BSB", bookId: "GEN", chapterNumber: 10 };
const EXO_3 = { translationId: "BSB", bookId: "EXO", chapterNumber: 3 };

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
  /** What the records server holds, by address. */
  let records: Record<string, unknown>;

  /** Settles the load the manager kicks off for the signed-in user. */
  const flushPromises = async () => {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  };

  /** The bookmarks the most recent write sent to the server. */
  const lastWritten = (): Bookmark[] => {
    const call = recordDataMock.mock.calls.at(-1);
    return (call?.[2] as { bookmarks: Bookmark[] }).bookmarks;
  };

  beforeEach(() => {
    records = {};
    os = CasualOSManager();
    getDataMock = vi.spyOn(os, "getData") as unknown as Mock;
    getDataMock.mockImplementation(async (_userId: string, address: string) =>
      address in records ? { success: true, data: records[address] } : NOT_FOUND
    );
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue(undefined as never) as unknown as Mock;
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    login = {
      userId: signal<string | null>("user-1"),
      login: vi.fn().mockResolvedValue(undefined),
    } as unknown as LoginManager;
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("starts empty and reads nothing when signed out", () => {
    login.userId.value = null;

    const manager = createBookmarksManager(os, login);

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

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    expect(manager.bookmarks.value.map((b) => b.id)).toEqual(["bm-1"]);
    expect(getDataMock.mock.calls.map((call) => call[1])).toEqual([
      "readingBookmarks",
    ]);
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

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    expect(manager.bookmarks.value.map((b) => b.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("creates a bookmark at a chapter and writes it", async () => {
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    const created = await manager.createBookmark(
      { name: "  Reading plan  ", colorId: "blue" },
      GEN_10
    );

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
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    const created = await manager.createBookmark(
      { name: "   ", colorId: "blue" },
      GEN_10
    );

    expect(created).toBeNull();
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  describe("the cap", () => {
    const stored = (count: number) =>
      Array.from({ length: count }, (_, i) => aBookmark({ id: `bm-${i}` }));

    it("stops creating at the cap", async () => {
      records = { readingBookmarks: { bookmarks: stored(MAX_BOOKMARKS) } };
      const manager = createBookmarksManager(os, login);
      await flushPromises();

      expect(manager.canCreate.value).toBe(false);
      const created = await manager.createBookmark(
        { name: "One more", colorId: "red" },
        GEN_10
      );

      expect(created).toBeNull();
      expect(manager.bookmarks.value).toHaveLength(MAX_BOOKMARKS);
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("never truncates a stored list that is already over the cap", async () => {
      records = {
        readingBookmarks: { bookmarks: stored(MAX_BOOKMARKS + 2) },
      };
      const manager = createBookmarksManager(os, login);
      await flushPromises();

      expect(manager.bookmarks.value).toHaveLength(MAX_BOOKMARKS + 2);

      await manager.moveBookmark("bm-0", EXO_3);

      expect(lastWritten()).toHaveLength(MAX_BOOKMARKS + 2);
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
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.moveBookmark("a", EXO_3);

    const [front] = manager.bookmarks.value;
    expect(front).toMatchObject({ id: "a", ...EXO_3 });
    expect(front!.updatedAt).toBeGreaterThan(200);
    expect(lastWritten().find((b) => b.id === "a")).toMatchObject(EXO_3);
  });

  it("renames and recolors without moving", async () => {
    records = { readingBookmarks: { bookmarks: [aBookmark()] } };
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.updateBookmark("bm-1", {
      name: "Sermon prep",
      colorId: "purple",
    });

    expect(manager.bookmarks.value[0]).toEqual(
      aBookmark({ name: "Sermon prep", colorId: "purple" })
    );
  });

  it("deletes a bookmark", async () => {
    records = { readingBookmarks: { bookmarks: [aBookmark()] } };
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.removeBookmark("bm-1");

    expect(manager.bookmarks.value).toEqual([]);
    expect(lastWritten()).toEqual([]);
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
      const manager = createBookmarksManager(os, login);
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
      const manager = createBookmarksManager(os, login);
      await flushPromises();

      expect(manager.getBookmarksForLocation("BSB", "GEN", 10)).toEqual([]);
    });

    it("returns nothing for an unknown location", () => {
      const manager = createBookmarksManager(os, login);
      expect(manager.getBookmarksForLocation(null, "GEN", 10)).toEqual([]);
    });
  });

  describe("when the record can't be read", () => {
    beforeEach(() => {
      getDataMock.mockResolvedValue({
        success: false,
        errorCode: "server_error",
        errorMessage: "Server error",
      });
    });

    it("writes nothing rather than replace a record it never saw", async () => {
      const manager = createBookmarksManager(os, login);
      await flushPromises();

      expect(await manager.ensureLoaded()).toBe(false);
      const created = await manager.createBookmark(
        { name: "My bookmark", colorId: "orange" },
        GEN_10
      );

      expect(created).toBeNull();
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("recovers on the next action once the read succeeds", async () => {
      const manager = createBookmarksManager(os, login);
      await flushPromises();

      getDataMock.mockResolvedValue({
        success: true,
        data: { bookmarks: [aBookmark()] },
      });

      expect(await manager.ensureLoaded()).toBe(true);
      expect(manager.bookmarks.value.map((b) => b.id)).toEqual(["bm-1"]);
    });
  });

  it("surfaces a rejected write as an error", async () => {
    recordDataMock.mockResolvedValue({
      success: false,
      errorCode: "not_authorized",
    });
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await expect(
      manager.createBookmark({ name: "My bookmark", colorId: "orange" }, GEN_10)
    ).rejects.toThrow("not_authorized");
  });

  it("clears bookmarks and closes the panel on sign-out", async () => {
    records = { readingBookmarks: { bookmarks: [aBookmark()] } };
    const manager = createBookmarksManager(os, login);
    await flushPromises();
    manager.isPanelOpen.value = true;

    login.userId.value = null;

    expect(manager.bookmarks.value).toEqual([]);
    expect(manager.isPanelOpen.value).toBe(false);
  });
});
