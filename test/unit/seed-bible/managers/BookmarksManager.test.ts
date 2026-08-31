import {
  bookmarkBelongsToCategory,
  createBookmarksManager,
  DEFAULT_BOOKMARK_CATEGORY,
  getBookmarkCategories,
  serializeBookmarkCategories,
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
      sessionEnded: signal(null),
      userId: signal("user-1"),
      connectionId: "conn-1",
      profile: signal(null),
      cachedProfile: signal(null),
      localConfig: signal({}),
      hydrateLocalConfig: vi.fn(),
      profilePromise: null,
      isProfileLoading: signal(false),
      isSavingProfile: signal(false),
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
          {
            id: "multi-1",
            translationId: "BSB",
            bookId: "LEV",
            chapterNumber: 3,
            createdAt: 3,
            category: ["Favorites", "To Study"],
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
      createBookmark({
        id: "multi-1",
        bookId: "LEV",
        chapterNumber: 3,
        createdAt: 3,
        category: ["Favorites", "To Study"],
      }),
    ]);
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "Favorites" },
      { name: "To Study" },
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

  it("adds a bookmark to multiple categories", async () => {
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.addBookmark("BSB", "GEN", 1, {
      category: [DEFAULT_BOOKMARK_CATEGORY, "Favorites"],
    });

    expect(manager.bookmarks.value[0]?.category).toEqual([
      DEFAULT_BOOKMARK_CATEGORY,
      "Favorites",
    ]);
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "Favorites" },
    ]);
  });

  it("looks up the bookmark saved at a location", async () => {
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.addBookmark("BSB", "GEN", 1);
    await manager.addBookmark("BSB", "GEN", 1, { verse: 3 });
    await manager.addBookmark("BSB", "GEN", 1, { verse: [5, 7] });

    const chapter = manager.getBookmarkForLocation("BSB", "GEN", 1);
    expect(chapter?.verse).toBeUndefined();

    expect(manager.getBookmarkForLocation("BSB", "GEN", 1, 3)?.id).toBe(
      manager.bookmarks.value.find((b) => b.verse === 3)?.id
    );
    expect(
      manager.getBookmarkForLocation("BSB", "GEN", 1, [5, 7])?.verse
    ).toEqual([5, 7]);

    // A verse the user never bookmarked, and a range that only partly overlaps
    // a saved one, both count as misses.
    expect(manager.getBookmarkForLocation("BSB", "GEN", 1, 4)).toBeUndefined();
    expect(
      manager.getBookmarkForLocation("BSB", "GEN", 1, [5, 6])
    ).toBeUndefined();
    expect(manager.getBookmarkForLocation("BSB", "EXO", 1)).toBeUndefined();
  });

  it("removes a bookmark from every folder it belongs to", async () => {
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.addBookmark("BSB", "GEN", 1, {
      category: ["Favorites", "To Study"],
      verse: 3,
    });
    const id = manager.bookmarks.value[0]!.id;

    await manager.removeBookmark(id);

    expect(manager.bookmarks.value).toEqual([]);
    expect(manager.getBookmarkForLocation("BSB", "GEN", 1, 3)).toBeUndefined();
    // The folders themselves outlive the bookmarks stored in them.
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "Favorites" },
      { name: "To Study" },
    ]);
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

  it("removes a bookmark from one category without touching the others", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [
          createBookmark({
            category: [DEFAULT_BOOKMARK_CATEGORY, "Favorites", "To Study"],
          }),
        ],
        categories: [
          { name: DEFAULT_BOOKMARK_CATEGORY },
          { name: "Favorites" },
          { name: "To Study" },
        ],
      },
    });

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.removeBookmarkFromCategory("bm-1", "Favorites");

    expect(manager.bookmarks.value).toEqual([
      createBookmark({ category: [DEFAULT_BOOKMARK_CATEGORY, "To Study"] }),
    ]);
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "Favorites" },
      { name: "To Study" },
    ]);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "bookmarks",
      {
        bookmarks: [
          createBookmark({ category: [DEFAULT_BOOKMARK_CATEGORY, "To Study"] }),
        ],
        categories: [
          { name: DEFAULT_BOOKMARK_CATEGORY },
          { name: "Favorites" },
          { name: "To Study" },
        ],
      },
      { marker: "publicRead" }
    );
  });

  it("collapses to a single category name when one membership remains", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [
          createBookmark({
            category: [DEFAULT_BOOKMARK_CATEGORY, "Favorites"],
          }),
        ],
        categories: [
          { name: DEFAULT_BOOKMARK_CATEGORY },
          { name: "Favorites" },
        ],
      },
    });

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.removeBookmarkFromCategory("bm-1", "Favorites");

    expect(manager.bookmarks.value).toEqual([
      createBookmark({ category: DEFAULT_BOOKMARK_CATEGORY }),
    ]);
  });

  it("deletes the bookmark when removing it from its last category", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [createBookmark({ category: "Favorites" })],
        categories: [
          { name: DEFAULT_BOOKMARK_CATEGORY },
          { name: "Favorites" },
        ],
      },
    });

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.removeBookmarkFromCategory("bm-1", "Favorites");

    expect(manager.bookmarks.value).toEqual([]);
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "Favorites" },
    ]);
  });

  it("ignores removal for an unknown bookmark or a category it is not in", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [createBookmark({ category: "Favorites" })],
        categories: [
          { name: DEFAULT_BOOKMARK_CATEGORY },
          { name: "Favorites" },
        ],
      },
    });

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.removeBookmarkFromCategory("missing", "Favorites");
    await manager.removeBookmarkFromCategory("bm-1", "To Study");

    expect(manager.bookmarks.value).toEqual([
      createBookmark({ category: "Favorites" }),
    ]);
    expect(recordDataMock).not.toHaveBeenCalled();
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
          createBookmark({
            id: "multi-1",
            bookId: "LEV",
            category: ["To Study", "Favorites"],
          }),
        ],
        categories: [
          { name: DEFAULT_BOOKMARK_CATEGORY },
          { name: "To Study" },
          { name: "Favorites" },
        ],
      },
    });

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.createCategory("  Later  ");
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "To Study" },
      { name: "Favorites" },
      { name: "Later" },
    ]);

    await manager.renameCategory("To Study", "Deep Study");
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "Deep Study" },
      { name: "Favorites" },
      { name: "Later" },
    ]);
    expect(
      manager.bookmarks.value.every(
        (b) => !getBookmarkCategories(b.category).includes("To Study")
      )
    ).toBe(true);
    expect(
      manager.bookmarks.value.filter((b) =>
        getBookmarkCategories(b.category).includes("Deep Study")
      ).length
    ).toBe(3);
    expect(
      manager.bookmarks.value.find((b) => b.id === "multi-1")?.category
    ).toEqual(["Deep Study", "Favorites"]);

    await manager.deleteCategory(DEFAULT_BOOKMARK_CATEGORY);
    expect(
      manager.categories.value.some((c) => c.name === DEFAULT_BOOKMARK_CATEGORY)
    ).toBe(true);

    await manager.deleteCategory("Deep Study");
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "Favorites" },
      { name: "Later" },
    ]);
    // Sole-membership bookmarks are removed; multi-folder keeps remaining.
    expect(manager.bookmarks.value).toEqual([
      createBookmark({
        id: "multi-1",
        bookId: "LEV",
        category: "Favorites",
      }),
    ]);
  });

  it("sets bookmark categories, creating missing folders as needed", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [
          createBookmark({ id: "move-1", category: DEFAULT_BOOKMARK_CATEGORY }),
        ],
        categories: [
          { name: DEFAULT_BOOKMARK_CATEGORY },
          { name: "Favorites" },
        ],
      },
    });

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.setBookmarkCategories("move-1", "Favorites");
    expect(manager.bookmarks.value[0]?.category).toBe("Favorites");
    expect(manager.expandedCategories.value.has("Favorites")).toBe(true);

    await manager.setBookmarkCategories("move-1", "Favorites");
    expect(recordDataMock).toHaveBeenCalledTimes(1);

    await manager.setBookmarkCategories("missing", "Favorites");
    expect(recordDataMock).toHaveBeenCalledTimes(1);

    await manager.setBookmarkCategories("move-1", ["Favorites", "  Later  "]);
    expect(manager.bookmarks.value[0]?.category).toEqual([
      "Favorites",
      "Later",
    ]);
    expect(manager.categories.value.some((c) => c.name === "Later")).toBe(true);
    expect(manager.expandedCategories.value.has("Later")).toBe(true);
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

  it("creates an empty category without assigning any bookmarks", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [createBookmark({ id: "existing" })],
        categories: [{ name: DEFAULT_BOOKMARK_CATEGORY }],
      },
    });

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    const beforeBookmarks = manager.bookmarks.value;
    await manager.createCategory("Empty Folder");

    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "Empty Folder" },
    ]);
    // Folder is empty — existing bookmarks are untouched.
    expect(manager.bookmarks.value).toEqual(beforeBookmarks);
    expect(
      manager.bookmarks.value.every(
        (b) => !getBookmarkCategories(b.category).includes("Empty Folder")
      )
    ).toBe(true);
    expect(manager.expandedCategories.value.has("Empty Folder")).toBe(true);
  });

  it("persists new categories only when the bookmark is saved", async () => {
    const manager = createBookmarksManager(os, login);
    await flushPromises();

    // Modal stages new folder names in local state; nothing is written until Save.
    // On Save, addBookmark creates missing folders in the same persist as the bookmark.
    await manager.addBookmark("BSB", "GEN", 1, {
      category: [DEFAULT_BOOKMARK_CATEGORY, "Study Later"],
    });

    expect(manager.bookmarks.value).toHaveLength(1);
    expect(manager.bookmarks.value[0]?.category).toEqual([
      DEFAULT_BOOKMARK_CATEGORY,
      "Study Later",
    ]);
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_BOOKMARK_CATEGORY },
      { name: "Study Later" },
    ]);
    // Single persist — no orphan empty folder written first.
    expect(recordDataMock).toHaveBeenCalledTimes(1);
  });

  it("setBookmarkCategories creates missing folders in the same write", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [
          createBookmark({
            id: "edit-1",
            category: DEFAULT_BOOKMARK_CATEGORY,
          }),
        ],
        categories: [{ name: DEFAULT_BOOKMARK_CATEGORY }],
      },
    });

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.setBookmarkCategories("edit-1", [
      DEFAULT_BOOKMARK_CATEGORY,
      "Favorites",
    ]);
    expect(manager.bookmarks.value[0]?.category).toEqual([
      DEFAULT_BOOKMARK_CATEGORY,
      "Favorites",
    ]);
    expect(manager.categories.value.some((c) => c.name === "Favorites")).toBe(
      true
    );
    expect(recordDataMock).toHaveBeenCalledTimes(1);

    // No-op when the same set is reapplied (order-insensitive).
    await manager.setBookmarkCategories("edit-1", [
      "Favorites",
      DEFAULT_BOOKMARK_CATEGORY,
    ]);
    expect(recordDataMock).toHaveBeenCalledTimes(1);
  });

  it("serializes single membership as a string and multi as an array", () => {
    expect(serializeBookmarkCategories(["Favorites"])).toBe("Favorites");
    expect(serializeBookmarkCategories(["A", "B"])).toEqual(["A", "B"]);
    expect(serializeBookmarkCategories(["A", " A ", "B", ""])).toEqual([
      "A",
      "B",
    ]);
    expect(serializeBookmarkCategories([])).toBe(DEFAULT_BOOKMARK_CATEGORY);
    expect(getBookmarkCategories("Favorites")).toEqual(["Favorites"]);
    expect(getBookmarkCategories(["A", "B"])).toEqual(["A", "B"]);

    const multi = createBookmark({ category: ["A", "B"] });
    const single = createBookmark({ category: "A" });
    expect(bookmarkBelongsToCategory(multi, "A")).toBe(true);
    expect(bookmarkBelongsToCategory(multi, "C")).toBe(false);
    expect(bookmarkBelongsToCategory(single, "A")).toBe(true);
    expect(bookmarkBelongsToCategory(single, "B")).toBe(false);
  });

  it("collapses multi-category membership back to a string when only one remains", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        bookmarks: [
          createBookmark({
            id: "collapse-1",
            category: [DEFAULT_BOOKMARK_CATEGORY, "Favorites"],
          }),
        ],
        categories: [
          { name: DEFAULT_BOOKMARK_CATEGORY },
          { name: "Favorites" },
        ],
      },
    });

    const manager = createBookmarksManager(os, login);
    await flushPromises();

    await manager.setBookmarkCategories("collapse-1", ["Favorites"]);
    expect(manager.bookmarks.value[0]?.category).toBe("Favorites");

    await manager.deleteCategory("Favorites");
    expect(manager.bookmarks.value).toEqual([]);
  });
});
