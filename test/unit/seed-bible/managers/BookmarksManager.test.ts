import {
  createBookmarksManager,
  DEFAULT_BOOKMARK_CATEGORY,
  type Bookmark,
} from "@packages/seed-bible/seed-bible/managers/BookmarksManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

function createBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: "bm-1",
    translationId: "BSB",
    bookId: "GEN",
    chapterNumber: 1,
    createdAt: 1000,
    category: DEFAULT_BOOKMARK_CATEGORY,
    ...overrides,
  };
}

describe("BookmarksManager", () => {
  let getDataMock: Mock;
  let recordDataMock: Mock;
  let warnSpy: Mock;
  let login: Mocked<LoginManager>;
  let os: CasualOSManager;

  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(() => {
    os = CasualOSManager();
    getDataMock = vi.spyOn(os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "Data not found",
    });
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue(undefined as never);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    login = {
      authBot: signal(null),
      userId: signal("user-1"),
      connectionId: "conn-1",
      profile: signal(null),
      profilePromise: null,
      updateProfile: vi.fn().mockResolvedValue(undefined),
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      getUserProfile: vi.fn().mockResolvedValue(null),
      uploadProfilePicture: vi.fn().mockResolvedValue(undefined),
      userInfo: signal({ id: "user-1", email: "test@example.com" }),
      cancelLogin: vi.fn().mockResolvedValue(undefined),
      isLoginOpen: signal(false),
      requestLoginByEmail: vi
        .fn()
        .mockResolvedValue({ success: true, requestId: "req-1" }),
      submitLoginCode: vi.fn().mockResolvedValue({
        success: true,
        userInfo: { id: "user-1", email: "test@example.com" },
      }),
    };
  });

  afterEach(() => {
    warnSpy.mockRestore();
    delete (globalThis as any).authBot;
  });

  it("starts empty when logged out", () => {
    login.userId.value = null;

    const manager = createBookmarksManager(os, login);

    expect(manager.bookmarks.value).toEqual([]);
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
    ]);
    expect(Array.from(manager.expandedCategories.value)).toEqual([
      DEFAULT_BOOKMARK_CATEGORY,
    ]);
    expect(manager.isFilterActive.value).toBe(false);
    expect(getDataMock).not.toHaveBeenCalled();
  });

  it("loads persisted bookmarks and normalizes legacy payloads", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [
          {
            id: "legacy-1",
            translationId: "BSB",
            bookId: "GEN",
            chapterNumber: 1,
            createdAt: 1,
          },
          {
            id: "fav-1",
            translationId: "BSB",
            bookId: "EXO",
            chapterNumber: 2,
            createdAt: 2,
            category: "Favorites",
          },
        ],
      },
    });

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    expect(getDataMock).toHaveBeenCalledWith("user-1", "bookmarks");
    expect(manager.bookmarks.value).toEqual([
      createBookmark({ id: "legacy-1", createdAt: 1 }),
      createBookmark({
        id: "fav-1",
        bookId: "EXO",
        chapterNumber: 2,
        createdAt: 2,
        category: "Favorites",
      }),
    ]);
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "Favorites" },
    ]);
  });

  it("adds a bookmark and avoids duplicates", async () => {
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.addBookmark("BSB", "GEN", 1);

    expect(manager.isLocationBookmarked("BSB", "GEN", 1)).toBe(true);
    expect(manager.bookmarks.value).toHaveLength(1);
    expect(recordDataMock).toHaveBeenCalledTimes(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "bookmarks",
      {
        bookmarks: [
          expect.objectContaining({
            translationId: "BSB",
            bookId: "GEN",
            chapterNumber: 1,
            category: DEFAULT_BOOKMARK_CATEGORY,
          }),
        ],
        categories: [{ name: DEFAULT_BOOKMARK_CATEGORY }],
      },
      { marker: "publicRead" }
    );

    await manager.addBookmark("BSB", "GEN", 1);

    expect(manager.bookmarks.value).toHaveLength(1);
    expect(recordDataMock).toHaveBeenCalledTimes(1);
  });

  it("attempts login before adding when unauthenticated", async () => {
    login.userId.value = null;
    login.login.mockImplementation(async () => {
      login.userId.value = "user-2";
      (globalThis as any).authBot = { id: "user-2" };
      return { id: "user-2", email: "test@example.com" };
    });

    const manager = createBookmarksManager(os, login);

    await manager.addBookmark("BSB", "GEN", 1);

    expect(login.login).toHaveBeenCalledTimes(1);
    expect(manager.bookmarks.value).toHaveLength(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-2",
      "bookmarks",
      expect.any(Object),
      { marker: "publicRead" }
    );
  });

  it("does not persist if login fails to authenticate", async () => {
    login.userId.value = null;

    const manager = createBookmarksManager(os, login);

    await manager.addBookmark("BSB", "GEN", 1);

    expect(login.login).toHaveBeenCalledTimes(1);
    expect(manager.bookmarks.value).toEqual([]);
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("removes bookmark for a location", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [createBookmark()],
        categories: [{ name: DEFAULT_BOOKMARK_CATEGORY }],
      },
    });

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.removeBookmarkForLocation("BSB", "GEN", 1);

    expect(manager.bookmarks.value).toEqual([]);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "bookmarks",
      {
        bookmarks: [],
        categories: [{ name: DEFAULT_BOOKMARK_CATEGORY }],
      },
      { marker: "publicRead" }
    );
  });

  it("toggles bookmark by location and ignores incomplete locations", async () => {
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.toggleBookmarkAtLocation(null, "GEN", 1);
    await manager.toggleBookmarkAtLocation("BSB", null, 1);
    await manager.toggleBookmarkAtLocation("BSB", "GEN", null);

    expect(manager.bookmarks.value).toEqual([]);
    expect(recordDataMock).not.toHaveBeenCalled();

    await manager.toggleBookmarkAtLocation("BSB", "GEN", 1);
    expect(manager.bookmarks.value).toHaveLength(1);

    await manager.toggleBookmarkAtLocation("BSB", "GEN", 1);
    expect(manager.bookmarks.value).toHaveLength(0);
  });

  it("toggles bookmark for tab reading location", async () => {
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    const tab = {
      readingState: {
        translationId: signal("BSB"),
        bookId: signal("PSA"),
        chapterNumber: signal(23),
      },
    } as any;

    await manager.toggleBookmarkForTab(tab);

    expect(manager.isLocationBookmarked("BSB", "PSA", 23)).toBe(true);
  });

  it("creates, renames, and deletes categories with bookmark updates", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [
          createBookmark({ id: "cat-1", category: "To Study" }),
          createBookmark({ id: "cat-2", bookId: "EXO", category: "To Study" }),
        ],
        categories: [{ name: DEFAULT_BOOKMARK_CATEGORY }, { name: "To Study" }],
      },
    });

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.createCategory("  Favorites  ");
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "To Study" },
      { name: "Favorites" },
    ]);

    await manager.renameCategory("To Study", "Deep Study");
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "Deep Study" },
      { name: "Favorites" },
    ]);
    expect(
      manager.bookmarks.value.every((b) => b.category !== "To Study")
    ).toBe(true);
    expect(
      manager.bookmarks.value.filter((b) => b.category === "Deep Study").length
    ).toBe(2);

    await manager.deleteCategory(DEFAULT_BOOKMARK_CATEGORY);
    expect(
      manager.categories.value.some((c) => c.name === DEFAULT_BOOKMARK_CATEGORY)
    ).toBe(true);

    await manager.deleteCategory("Deep Study");
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "Favorites" },
    ]);
    expect(manager.bookmarks.value).toEqual([]);
  });

  it("toggles filter and category expansion", () => {
    const manager = createBookmarksManager(os, login);

    expect(manager.isFilterActive.value).toBe(false);
    manager.toggleFilter();
    expect(manager.isFilterActive.value).toBe(true);

    expect(
      manager.expandedCategories.value.has(DEFAULT_BOOKMARK_CATEGORY)
    ).toBe(true);
    manager.toggleCategoryExpanded(DEFAULT_BOOKMARK_CATEGORY);
    expect(
      manager.expandedCategories.value.has(DEFAULT_BOOKMARK_CATEGORY)
    ).toBe(false);
    manager.toggleCategoryExpanded(DEFAULT_BOOKMARK_CATEGORY);
    expect(
      manager.expandedCategories.value.has(DEFAULT_BOOKMARK_CATEGORY)
    ).toBe(true);
  });
});
