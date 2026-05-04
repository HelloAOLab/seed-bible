import {
  BOOKMARK_COLORS,
  createBookmarksManager,
} from "@packages/seed-bible/seed-bible/managers/BookmarksManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { signal } from "@preact/signals";

describe("BookmarksManager", () => {
  let getDataMock: jest.Mock;
  let recordDataMock: jest.Mock;
  let login: jest.Mocked<LoginManager>;
  let warnSpy: jest.SpyInstance;

  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(() => {
    getDataMock = jest.fn().mockResolvedValue(null);
    recordDataMock = jest.fn().mockResolvedValue(undefined);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    login = {
      authBot: signal(null),
      userId: signal("user-1"),
      profile: signal(null),
      updateProfile: jest.fn().mockResolvedValue(undefined),
      login: jest.fn().mockResolvedValue(undefined),
      logout: jest.fn().mockResolvedValue(undefined),
      getUserProfile: jest.fn().mockResolvedValue(null),
      uploadProfilePicture: jest.fn().mockResolvedValue(undefined),
    };

    (globalThis as any).os = {
      ...(globalThis as any).os,
      getData: getDataMock,
      recordData: recordDataMock,
    };

    (globalThis as any).uuid = jest.fn(() => "generated-id");
  });

  afterEach(() => {
    warnSpy.mockRestore();
    delete (globalThis as any).uuid;
  });

  it("loads bookmarks from the single bookmarks address", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [
          {
            id: "b-older",
            translationId: "BSB",
            bookId: "GEN",
            chapterNumber: 1,
            createdAtMs: 100,
            color: "blue",
          },
          {
            id: "b-newer",
            translationId: "KJV",
            bookId: "MAT",
            chapterNumber: 2,
            createdAtMs: 200,
            color: "green",
          },
        ],
      },
    });

    const manager = createBookmarksManager(login);
    await flushPromises();

    expect(getDataMock).toHaveBeenCalledWith("user-1", "bookmarks");
    expect(manager.bookmarks.value.map((bookmark) => bookmark.id)).toEqual([
      "b-newer",
      "b-older",
    ]);
  });

  it("exposes 10 common bookmark ribbon colors", () => {
    expect(BOOKMARK_COLORS).toHaveLength(10);
    expect(BOOKMARK_COLORS).toContain("maroon");
    expect(BOOKMARK_COLORS).toContain("blue");
  });

  it("keeps bookmarks empty and skips load when unauthenticated", async () => {
    login.userId.value = null;

    const manager = createBookmarksManager(login);
    await flushPromises();

    expect(manager.bookmarks.value).toEqual([]);
    expect(getDataMock).not.toHaveBeenCalled();
  });

  it("saveBookmark() stores one record at bookmarks with required fields", async () => {
    const manager = createBookmarksManager(login);
    await flushPromises();

    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(12345);

    try {
      await manager.saveBookmark("BSB", "GEN", 1);
    } finally {
      nowSpy.mockRestore();
    }

    expect(recordDataMock).toHaveBeenCalledWith("user-1", "bookmarks", {
      bookmarks: [
        {
          id: "bookmark-generated-id",
          translationId: "BSB",
          bookId: "GEN",
          chapterNumber: 1,
          createdAtMs: 12345,
          color: "maroon",
        },
      ],
    });
  });

  it("saveBookmark() updates an existing chapter bookmark instead of duplicating", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [
          {
            id: "existing",
            translationId: "BSB",
            bookId: "GEN",
            chapterNumber: 1,
            createdAtMs: 999,
            color: "orange",
          },
        ],
      },
    });

    const manager = createBookmarksManager(login);
    await flushPromises();

    await manager.saveBookmark("BSB", "GEN", 1);

    expect(recordDataMock).toHaveBeenLastCalledWith("user-1", "bookmarks", {
      bookmarks: [
        {
          id: "existing",
          translationId: "BSB",
          bookId: "GEN",
          chapterNumber: 1,
          createdAtMs: 999,
          color: "orange",
        },
      ],
    });
    expect((globalThis as any).uuid).not.toHaveBeenCalled();
  });

  it("saveBookmark() attempts login and uses authenticated user", async () => {
    login.userId.value = null;
    login.login.mockImplementation(async () => {
      login.userId.value = "user-after-login";
    });

    const manager = createBookmarksManager(login);

    await manager.saveBookmark("BSB", "GEN", 1);

    expect(login.login).toHaveBeenCalledTimes(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-after-login",
      "bookmarks",
      expect.any(Object)
    );
  });

  it("saveBookmark() warns and does not persist when login does not authenticate", async () => {
    login.userId.value = null;

    const manager = createBookmarksManager(login);

    await manager.saveBookmark("BSB", "GEN", 1);

    expect(login.login).toHaveBeenCalledTimes(1);
    expect(recordDataMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Unable to save bookmark: user is not authenticated."
    );
  });

  it("deleteBookmark() removes bookmark and persists updated list", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [
          {
            id: "b-1",
            translationId: "BSB",
            bookId: "GEN",
            chapterNumber: 1,
            createdAtMs: 200,
            color: "maroon",
          },
          {
            id: "b-2",
            translationId: "BSB",
            bookId: "EXO",
            chapterNumber: 2,
            createdAtMs: 100,
            color: "blue",
          },
        ],
      },
    });

    const manager = createBookmarksManager(login);
    await flushPromises();

    await manager.deleteBookmark("b-1");

    expect(recordDataMock).toHaveBeenLastCalledWith("user-1", "bookmarks", {
      bookmarks: [
        {
          id: "b-2",
          translationId: "BSB",
          bookId: "EXO",
          chapterNumber: 2,
          createdAtMs: 100,
          color: "blue",
        },
      ],
    });
    expect(manager.bookmarks.value.map((bookmark) => bookmark.id)).toEqual([
      "b-2",
    ]);
  });

  it("deleteBookmark() is a no-op when bookmark id does not exist", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [
          {
            id: "b-1",
            translationId: "BSB",
            bookId: "GEN",
            chapterNumber: 1,
            createdAtMs: 100,
            color: "maroon",
          },
        ],
      },
    });

    const manager = createBookmarksManager(login);
    await flushPromises();

    await manager.deleteBookmark("missing");

    expect(recordDataMock).not.toHaveBeenCalled();
    expect(manager.bookmarks.value.map((bookmark) => bookmark.id)).toEqual([
      "b-1",
    ]);
  });
});
