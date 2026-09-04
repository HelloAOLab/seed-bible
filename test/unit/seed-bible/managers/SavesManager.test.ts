import {
  createSavesManager,
  DEFAULT_SAVE_CATEGORY,
  normalizeSaveCategories,
  saveBelongsToCategory,
  type Save,
} from "@packages/seed-bible/seed-bible/managers/SavesManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

function createSave(overrides: Partial<Save> = {}): Save {
  return {
    id: "save-1",
    translationId: "BSB",
    bookId: "GEN",
    chapterNumber: 1,
    createdAt: 1000,
    categories: [DEFAULT_SAVE_CATEGORY],
    ...overrides,
  };
}

/** The pre-rename default folder, as it appears in a legacy record. */
const LEGACY_DEFAULT_CATEGORY = "My Bookmarks";

describe("SavesManager", () => {
  let getDataMock: Mock;
  let recordDataMock: Mock;
  let eraseDataMock: Mock;
  let captureMock: Mock;
  let warnSpy: Mock;
  let login: Mocked<LoginManager>;
  let os: CasualOSManager;

  const flushPromises = async () => {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  };

  /**
   * Points `getData` at a fixture per storage address. Anything not listed
   * answers the way the records server does for a record that isn't there.
   */
  const setRecords = (records: {
    saves?: unknown;
    bookmarks?: unknown;
  }): void => {
    getDataMock.mockImplementation(async (_userId: string, address: string) => {
      const data = records[address as keyof typeof records];
      if (data === undefined) {
        return {
          success: false,
          errorCode: "data_not_found",
          errorMessage: "Data not found",
        };
      }
      return { success: true, data };
    });
  };

  beforeEach(() => {
    os = CasualOSManager();
    getDataMock = vi.spyOn(os, "getData") as unknown as Mock;
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue(undefined as never);
    eraseDataMock = vi
      .spyOn(os, "eraseData")
      .mockResolvedValue(undefined as never);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    captureMock = vi.fn();
    (globalThis as any).posthog = { capture: captureMock };
    setRecords({});

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
    delete (globalThis as any).posthog;
  });

  it("starts empty when logged out", () => {
    login.userId.value = null;

    const manager = createSavesManager(os, login);

    expect(manager.saves.value).toEqual([]);
    expect(manager.categories.value).toEqual([{ name: DEFAULT_SAVE_CATEGORY }]);
    expect(Array.from(manager.expandedCategories.value)).toEqual([
      DEFAULT_SAVE_CATEGORY,
    ]);
    expect(manager.isFilterActive.value).toBe(false);
    expect(getDataMock).not.toHaveBeenCalled();
  });

  it("loads persisted saves and normalizes older item shapes", async () => {
    setRecords({
      saves: {
        saves: [
          {
            id: "no-category",
            translationId: "BSB",
            bookId: "GEN",
            chapterNumber: 1,
            createdAt: 1,
          },
          {
            id: "single",
            translationId: "BSB",
            bookId: "EXO",
            chapterNumber: 2,
            createdAt: 2,
            categories: ["Favorites"],
          },
          {
            id: "multi",
            translationId: "BSB",
            bookId: "LEV",
            chapterNumber: 3,
            createdAt: 3,
            categories: ["Favorites", "To Study"],
          },
        ],
      },
    });

    const manager = createSavesManager(os, login);
    await flushPromises();

    expect(getDataMock).toHaveBeenCalledWith("user-1", "saves");
    expect(manager.saves.value).toEqual([
      createSave({ id: "no-category", createdAt: 1 }),
      createSave({
        id: "single",
        bookId: "EXO",
        chapterNumber: 2,
        createdAt: 2,
        categories: ["Favorites"],
      }),
      createSave({
        id: "multi",
        bookId: "LEV",
        chapterNumber: 3,
        createdAt: 3,
        categories: ["Favorites", "To Study"],
      }),
    ]);
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_SAVE_CATEGORY },
      { name: "Favorites" },
      { name: "To Study" },
    ]);
  });

  describe("migration from the legacy bookmarks record", () => {
    const legacyRecord = {
      bookmarks: [
        {
          id: "legacy-1",
          translationId: "BSB",
          bookId: "GEN",
          chapterNumber: 1,
          createdAt: 1,
        },
        {
          id: "legacy-2",
          translationId: "BSB",
          bookId: "EXO",
          chapterNumber: 2,
          createdAt: 2,
          category: LEGACY_DEFAULT_CATEGORY,
        },
        {
          id: "legacy-3",
          translationId: "BSB",
          bookId: "LEV",
          chapterNumber: 3,
          createdAt: 3,
          verse: [5, 7],
          category: ["Favorites", "To Study"],
        },
      ],
      categories: [
        { name: LEGACY_DEFAULT_CATEGORY },
        { name: "Favorites" },
        { name: "To Study" },
      ],
    };

    const migratedSaves: Save[] = [
      createSave({ id: "legacy-1", createdAt: 1 }),
      createSave({
        id: "legacy-2",
        bookId: "EXO",
        chapterNumber: 2,
        createdAt: 2,
      }),
      createSave({
        id: "legacy-3",
        bookId: "LEV",
        chapterNumber: 3,
        createdAt: 3,
        verse: [5, 7],
        categories: ["Favorites", "To Study"],
      }),
    ];

    const migratedCategories = [
      { name: DEFAULT_SAVE_CATEGORY },
      { name: "Favorites" },
      { name: "To Study" },
    ];

    it("copies a legacy-only record forward to the saves address", async () => {
      setRecords({ bookmarks: legacyRecord });

      const manager = createSavesManager(os, login);
      await flushPromises();

      expect(manager.saves.value).toEqual(migratedSaves);
      // The pre-rename default folder becomes the new one, so the user ends up
      // with a single default rather than "My Bookmarks" plus an empty
      // "My Saves".
      expect(manager.categories.value).toEqual(migratedCategories);
      expect(recordDataMock).toHaveBeenCalledTimes(1);
      expect(recordDataMock).toHaveBeenCalledWith(
        "user-1",
        "saves",
        { saves: migratedSaves, categories: migratedCategories },
        { marker: "publicRead" }
      );
      expect(captureMock).toHaveBeenCalledWith(
        "saves_migrated_from_legacy_bookmarks",
        { saveCount: 3, categoryCount: 3 }
      );
    });

    it("merges a folder the user had already named My Saves", async () => {
      // The pre-rename default maps onto the new default name, so a user who
      // happened to have their own "My Saves" ends up with one folder holding
      // both sets rather than a duplicate.
      setRecords({
        bookmarks: {
          bookmarks: [
            {
              id: "from-default",
              translationId: "BSB",
              bookId: "GEN",
              chapterNumber: 1,
              createdAt: 1,
              category: LEGACY_DEFAULT_CATEGORY,
            },
            {
              id: "from-own-folder",
              translationId: "BSB",
              bookId: "EXO",
              chapterNumber: 2,
              createdAt: 2,
              category: DEFAULT_SAVE_CATEGORY,
            },
          ],
          categories: [
            { name: LEGACY_DEFAULT_CATEGORY },
            { name: DEFAULT_SAVE_CATEGORY },
          ],
        },
      });

      const manager = createSavesManager(os, login);
      await flushPromises();

      expect(manager.categories.value).toEqual([
        { name: DEFAULT_SAVE_CATEGORY },
      ]);
      expect(manager.saves.value.map((save) => save.id)).toEqual([
        "from-default",
        "from-own-folder",
      ]);
      for (const save of manager.saves.value) {
        expect(save.categories).toEqual([DEFAULT_SAVE_CATEGORY]);
      }
    });

    it("never erases the legacy record", async () => {
      setRecords({ bookmarks: legacyRecord });

      createSavesManager(os, login);
      await flushPromises();

      expect(eraseDataMock).not.toHaveBeenCalled();
      expect(recordDataMock).not.toHaveBeenCalledWith(
        "user-1",
        "bookmarks",
        expect.anything(),
        expect.anything()
      );
    });

    it("prefers an existing saves record and ignores a non-empty legacy one", async () => {
      setRecords({
        saves: {
          saves: [createSave({ id: "current-1", bookId: "JHN" })],
          categories: [{ name: DEFAULT_SAVE_CATEGORY }],
        },
        bookmarks: legacyRecord,
      });

      const manager = createSavesManager(os, login);
      await flushPromises();

      expect(manager.saves.value).toEqual([
        createSave({ id: "current-1", bookId: "JHN" }),
      ]);
      expect(manager.categories.value).toEqual([
        { name: DEFAULT_SAVE_CATEGORY },
      ]);
      // Nothing is merged, and nothing is written — the existing record stands.
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    /**
     * Answers each address from a fixture, where a fixture may be a failure
     * result rather than a payload — the case `setRecords` can't express.
     */
    const setReadResults = (results: {
      saves?: unknown;
      bookmarks?: unknown;
    }): void => {
      getDataMock.mockImplementation(
        async (_userId: string, address: string) => {
          const entry = results[address as keyof typeof results];
          if (entry === undefined) {
            return {
              success: false,
              errorCode: "data_not_found",
              errorMessage: "Data not found",
            };
          }
          if (
            entry &&
            typeof entry === "object" &&
            (entry as { success?: unknown }).success === false
          ) {
            return entry;
          }
          return { success: true, data: entry };
        }
      );
    };

    const readFailure = {
      success: false,
      errorCode: "server_error",
      errorMessage: "A server error occurred.",
    };

    it("does not migrate over a saves record it merely failed to read", async () => {
      // The dangerous case: an already-migrated user whose `saves` read
      // hiccups while the legacy read succeeds. Treating that as "no saves
      // record yet" would write their pre-migration snapshot over the real
      // one, losing every save made since they migrated.
      setReadResults({ saves: readFailure, bookmarks: legacyRecord });

      const manager = createSavesManager(os, login);
      await flushPromises();

      expect(recordDataMock).not.toHaveBeenCalled();
      expect(captureMock).not.toHaveBeenCalledWith(
        "saves_migrated_from_legacy_bookmarks",
        expect.anything()
      );
      expect(manager.saves.value).toEqual([]);
    });

    it("does not write a save made after a failed load", async () => {
      // In-memory state after a failed read is empty because nothing loaded,
      // not because the user has nothing. Persisting it would replace the
      // record the read never reached.
      setReadResults({ saves: readFailure, bookmarks: legacyRecord });

      const manager = createSavesManager(os, login);
      await flushPromises();

      await manager.addSave("BSB", "JHN", 3);

      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("waits rather than starting fresh when the legacy read fails", async () => {
      // Neither address answered usefully, so whether there is a legacy record
      // to copy forward is still unknown. Applying an empty list here would
      // let the next save write a `saves` record and strand the migration.
      setReadResults({ bookmarks: readFailure });

      const manager = createSavesManager(os, login);
      await flushPromises();

      await manager.addSave("BSB", "JHN", 3);

      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("still migrates when the legacy record is the only one there", async () => {
      // The other side of the guard: `data_not_found` on `saves` is an answer,
      // not a failure, so the copy-forward runs exactly as before.
      setReadResults({ bookmarks: legacyRecord });

      const manager = createSavesManager(os, login);
      await flushPromises();

      expect(manager.saves.value).toEqual(migratedSaves);
      expect(recordDataMock).toHaveBeenCalledTimes(1);
    });

    it("neither rewrites nor duplicates on the load after a migration", async () => {
      setRecords({ bookmarks: legacyRecord });

      const first = createSavesManager(os, login);
      await flushPromises();

      const written = recordDataMock.mock.calls[0]![2];
      recordDataMock.mockClear();
      captureMock.mockClear();

      // Second visit: the record the migration just wrote is now there.
      setRecords({ saves: written, bookmarks: legacyRecord });
      const second = createSavesManager(os, login);
      await flushPromises();

      expect(second.saves.value).toEqual(first.saves.value);
      expect(second.categories.value).toEqual(first.categories.value);
      expect(recordDataMock).not.toHaveBeenCalled();
      expect(captureMock).not.toHaveBeenCalledWith(
        "saves_migrated_from_legacy_bookmarks",
        expect.anything()
      );
    });

    it("reports legacy ids that never made it into saves", async () => {
      setRecords({
        saves: {
          saves: [createSave({ id: "legacy-1", createdAt: 1 })],
          categories: [{ name: DEFAULT_SAVE_CATEGORY }],
        },
        bookmarks: legacyRecord,
      });

      createSavesManager(os, login);
      await flushPromises();

      expect(captureMock).toHaveBeenCalledWith("saves_legacy_record_diverged", {
        orphanCount: 2,
        legacyCount: 3,
        saveCount: 1,
      });
    });

    it("stays quiet when the legacy record adds nothing new", async () => {
      setRecords({
        saves: {
          saves: migratedSaves,
          categories: migratedCategories,
        },
        bookmarks: legacyRecord,
      });

      createSavesManager(os, login);
      await flushPromises();

      expect(captureMock).not.toHaveBeenCalledWith(
        "saves_legacy_record_diverged",
        expect.anything()
      );
    });

    it("does not let the load overwrite a save made while it was in flight", async () => {
      let releaseReads = () => {};
      const reads = new Promise<void>((resolve) => {
        releaseReads = resolve;
      });
      getDataMock.mockImplementation(
        async (_userId: string, address: string) => {
          await reads;
          if (address === "bookmarks") {
            return { success: true, data: legacyRecord };
          }
          return {
            success: false,
            errorCode: "data_not_found",
            errorMessage: "Data not found",
          };
        }
      );

      const manager = createSavesManager(os, login);
      const adding = manager.addSave("BSB", "JHN", 3);
      await flushPromises();

      // The reads are still out, so nothing has been applied yet.
      expect(manager.saves.value).toEqual([]);

      releaseReads();
      await adding;
      await flushPromises();

      // The migrated saves and the new one both survive, and the copy-forward
      // still happened rather than being skipped.
      expect(manager.saves.value.map((s) => s.id)).toEqual([
        "legacy-1",
        "legacy-2",
        "legacy-3",
        manager.saves.value[3]!.id,
      ]);
      expect(manager.getSaveForLocation("BSB", "JHN", 3)).toBeDefined();
      expect(recordDataMock).toHaveBeenCalledTimes(2);
      expect(recordDataMock).toHaveBeenNthCalledWith(
        1,
        "user-1",
        "saves",
        { saves: migratedSaves, categories: migratedCategories },
        { marker: "publicRead" }
      );
    });

    it("keeps the migrated saves in memory when the copy-forward write fails", async () => {
      setRecords({ bookmarks: legacyRecord });
      recordDataMock.mockRejectedValue(new Error("offline"));

      const manager = createSavesManager(os, login);
      await flushPromises();

      expect(manager.saves.value).toEqual(migratedSaves);
      expect(captureMock).not.toHaveBeenCalledWith(
        "saves_migrated_from_legacy_bookmarks",
        expect.anything()
      );
    });
  });

  it("adds a save and avoids duplicates", async () => {
    const manager = createSavesManager(os, login);
    await flushPromises();

    await manager.addSave("BSB", "GEN", 1);

    expect(manager.isLocationSaved("BSB", "GEN", 1)).toBe(true);
    expect(manager.saves.value).toHaveLength(1);
    expect(recordDataMock).toHaveBeenCalledTimes(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "saves",
      {
        saves: [
          expect.objectContaining({
            translationId: "BSB",
            bookId: "GEN",
            chapterNumber: 1,
            categories: [DEFAULT_SAVE_CATEGORY],
          }),
        ],
        categories: [{ name: DEFAULT_SAVE_CATEGORY }],
      },
      { marker: "publicRead" }
    );

    await manager.addSave("BSB", "GEN", 1);

    expect(manager.saves.value).toHaveLength(1);
    expect(recordDataMock).toHaveBeenCalledTimes(1);
  });

  it("saves a whole chapter alongside a verse range in the same chapter", async () => {
    const manager = createSavesManager(os, login);
    await flushPromises();

    await manager.addSave("BSB", "ROM", 8, { verse: [28, 30] });
    await manager.addSave("BSB", "ROM", 8);

    expect(manager.saves.value).toHaveLength(2);
    // The chapter-level save is its own entry: a verse-scoped save for the same
    // chapter does not stand in for it.
    expect(manager.getSaveForLocation("BSB", "ROM", 8)?.verse).toBeUndefined();
    expect(
      manager.getSaveForLocation("BSB", "ROM", 8, [28, 30])?.verse
    ).toEqual([28, 30]);
  });

  it("adds a save to multiple categories", async () => {
    const manager = createSavesManager(os, login);
    await flushPromises();

    await manager.addSave("BSB", "GEN", 1, {
      categories: [DEFAULT_SAVE_CATEGORY, "Favorites"],
    });

    expect(manager.saves.value[0]?.categories).toEqual([
      DEFAULT_SAVE_CATEGORY,
      "Favorites",
    ]);
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_SAVE_CATEGORY },
      { name: "Favorites" },
    ]);
  });

  it("looks up the save filed at a location", async () => {
    const manager = createSavesManager(os, login);
    await flushPromises();

    await manager.addSave("BSB", "GEN", 1);
    await manager.addSave("BSB", "GEN", 1, { verse: 3 });
    await manager.addSave("BSB", "GEN", 1, { verse: [5, 7] });

    const chapter = manager.getSaveForLocation("BSB", "GEN", 1);
    expect(chapter?.verse).toBeUndefined();

    expect(manager.getSaveForLocation("BSB", "GEN", 1, 3)?.id).toBe(
      manager.saves.value.find((s) => s.verse === 3)?.id
    );
    expect(manager.getSaveForLocation("BSB", "GEN", 1, [5, 7])?.verse).toEqual([
      5, 7,
    ]);

    // A verse the user never saved, and a range that only partly overlaps a
    // saved one, both count as misses.
    expect(manager.getSaveForLocation("BSB", "GEN", 1, 4)).toBeUndefined();
    expect(manager.getSaveForLocation("BSB", "GEN", 1, [5, 6])).toBeUndefined();
    expect(manager.getSaveForLocation("BSB", "EXO", 1)).toBeUndefined();
  });

  it("removes a save from every folder it belongs to", async () => {
    const manager = createSavesManager(os, login);
    await flushPromises();

    await manager.addSave("BSB", "GEN", 1, {
      categories: ["Favorites", "To Study"],
      verse: 3,
    });
    const id = manager.saves.value[0]!.id;

    await manager.removeSave(id);

    expect(manager.saves.value).toEqual([]);
    expect(manager.getSaveForLocation("BSB", "GEN", 1, 3)).toBeUndefined();
    // The folders themselves outlive the saves stored in them.
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_SAVE_CATEGORY },
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

    const manager = createSavesManager(os, login);

    await manager.addSave("BSB", "GEN", 1);

    expect(login.login).toHaveBeenCalledTimes(1);
    expect(manager.saves.value).toHaveLength(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-2",
      "saves",
      expect.any(Object),
      { marker: "publicRead" }
    );
  });

  it("does not persist if login fails to authenticate", async () => {
    login.userId.value = null;

    const manager = createSavesManager(os, login);

    await manager.addSave("BSB", "GEN", 1);

    expect(login.login).toHaveBeenCalledTimes(1);
    expect(manager.saves.value).toEqual([]);
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("removes a save from one category without touching the others", async () => {
    setRecords({
      saves: {
        saves: [
          createSave({
            categories: [DEFAULT_SAVE_CATEGORY, "Favorites", "To Study"],
          }),
        ],
        categories: [
          { name: DEFAULT_SAVE_CATEGORY },
          { name: "Favorites" },
          { name: "To Study" },
        ],
      },
    });

    const manager = createSavesManager(os, login);
    await flushPromises();

    await manager.removeSaveFromCategory("save-1", "Favorites");

    expect(manager.saves.value).toEqual([
      createSave({ categories: [DEFAULT_SAVE_CATEGORY, "To Study"] }),
    ]);
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_SAVE_CATEGORY },
      { name: "Favorites" },
      { name: "To Study" },
    ]);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "saves",
      {
        saves: [
          createSave({ categories: [DEFAULT_SAVE_CATEGORY, "To Study"] }),
        ],
        categories: [
          { name: DEFAULT_SAVE_CATEGORY },
          { name: "Favorites" },
          { name: "To Study" },
        ],
      },
      { marker: "publicRead" }
    );
  });

  it("deletes the save when removing it from its last category", async () => {
    setRecords({
      saves: {
        saves: [createSave({ categories: ["Favorites"] })],
        categories: [{ name: DEFAULT_SAVE_CATEGORY }, { name: "Favorites" }],
      },
    });

    const manager = createSavesManager(os, login);
    await flushPromises();

    await manager.removeSaveFromCategory("save-1", "Favorites");

    expect(manager.saves.value).toEqual([]);
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_SAVE_CATEGORY },
      { name: "Favorites" },
    ]);
  });

  it("ignores removal for an unknown save or a category it is not in", async () => {
    setRecords({
      saves: {
        saves: [createSave({ categories: ["Favorites"] })],
        categories: [{ name: DEFAULT_SAVE_CATEGORY }, { name: "Favorites" }],
      },
    });

    const manager = createSavesManager(os, login);
    await flushPromises();

    await manager.removeSaveFromCategory("missing", "Favorites");
    await manager.removeSaveFromCategory("save-1", "To Study");

    expect(manager.saves.value).toEqual([
      createSave({ categories: ["Favorites"] }),
    ]);
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("creates, renames, and deletes categories with save updates", async () => {
    setRecords({
      saves: {
        saves: [
          createSave({ id: "cat-1", categories: ["To Study"] }),
          createSave({
            id: "cat-2",
            bookId: "EXO",
            categories: ["To Study"],
          }),
          createSave({
            id: "multi-1",
            bookId: "LEV",
            categories: ["To Study", "Favorites"],
          }),
        ],
        categories: [
          { name: DEFAULT_SAVE_CATEGORY },
          { name: "To Study" },
          { name: "Favorites" },
        ],
      },
    });

    const manager = createSavesManager(os, login);
    await flushPromises();

    await manager.createCategory("  Later  ");
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_SAVE_CATEGORY },
      { name: "To Study" },
      { name: "Favorites" },
      { name: "Later" },
    ]);

    await manager.renameCategory("To Study", "Deep Study");
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_SAVE_CATEGORY },
      { name: "Deep Study" },
      { name: "Favorites" },
      { name: "Later" },
    ]);
    expect(
      manager.saves.value.every((s) => !s.categories.includes("To Study"))
    ).toBe(true);
    expect(
      manager.saves.value.filter((s) => s.categories.includes("Deep Study"))
        .length
    ).toBe(3);
    expect(
      manager.saves.value.find((s) => s.id === "multi-1")?.categories
    ).toEqual(["Deep Study", "Favorites"]);

    await manager.deleteCategory(DEFAULT_SAVE_CATEGORY);
    expect(
      manager.categories.value.some((c) => c.name === DEFAULT_SAVE_CATEGORY)
    ).toBe(true);

    await manager.deleteCategory("Deep Study");
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_SAVE_CATEGORY },
      { name: "Favorites" },
      { name: "Later" },
    ]);
    // Sole-membership saves are removed; multi-folder keeps what remains.
    expect(manager.saves.value).toEqual([
      createSave({
        id: "multi-1",
        bookId: "LEV",
        categories: ["Favorites"],
      }),
    ]);
  });

  it("sets save categories, creating missing folders as needed", async () => {
    setRecords({
      saves: {
        saves: [
          createSave({ id: "move-1", categories: [DEFAULT_SAVE_CATEGORY] }),
        ],
        categories: [{ name: DEFAULT_SAVE_CATEGORY }, { name: "Favorites" }],
      },
    });

    const manager = createSavesManager(os, login);
    await flushPromises();

    await manager.setSaveCategories("move-1", ["Favorites"]);
    expect(manager.saves.value[0]?.categories).toEqual(["Favorites"]);
    expect(manager.expandedCategories.value.has("Favorites")).toBe(true);

    await manager.setSaveCategories("move-1", ["Favorites"]);
    expect(recordDataMock).toHaveBeenCalledTimes(1);

    await manager.setSaveCategories("missing", ["Favorites"]);
    expect(recordDataMock).toHaveBeenCalledTimes(1);

    await manager.setSaveCategories("move-1", ["Favorites", "  Later  "]);
    expect(manager.saves.value[0]?.categories).toEqual(["Favorites", "Later"]);
    expect(manager.categories.value.some((c) => c.name === "Later")).toBe(true);
    expect(manager.expandedCategories.value.has("Later")).toBe(true);
  });

  it("toggles filter and category expansion", () => {
    const manager = createSavesManager(os, login);

    expect(manager.isFilterActive.value).toBe(false);
    manager.toggleFilter();
    expect(manager.isFilterActive.value).toBe(true);

    expect(manager.expandedCategories.value.has(DEFAULT_SAVE_CATEGORY)).toBe(
      true
    );
    manager.toggleCategoryExpanded(DEFAULT_SAVE_CATEGORY);
    expect(manager.expandedCategories.value.has(DEFAULT_SAVE_CATEGORY)).toBe(
      false
    );
    manager.toggleCategoryExpanded(DEFAULT_SAVE_CATEGORY);
    expect(manager.expandedCategories.value.has(DEFAULT_SAVE_CATEGORY)).toBe(
      true
    );
  });

  it("creates an empty category without assigning any saves", async () => {
    setRecords({
      saves: {
        saves: [createSave({ id: "existing" })],
        categories: [{ name: DEFAULT_SAVE_CATEGORY }],
      },
    });

    const manager = createSavesManager(os, login);
    await flushPromises();

    const beforeSaves = manager.saves.value;
    await manager.createCategory("Empty Folder");

    expect(manager.categories.value).toEqual([
      { name: DEFAULT_SAVE_CATEGORY },
      { name: "Empty Folder" },
    ]);
    // Folder is empty — existing saves are untouched.
    expect(manager.saves.value).toEqual(beforeSaves);
    expect(
      manager.saves.value.every((s) => !s.categories.includes("Empty Folder"))
    ).toBe(true);
    expect(manager.expandedCategories.value.has("Empty Folder")).toBe(true);
  });

  it("persists new categories only when the save is written", async () => {
    const manager = createSavesManager(os, login);
    await flushPromises();

    // The modal stages new folder names in local state; nothing is written
    // until Save. On Save, addSave creates missing folders in the same persist
    // as the save itself.
    await manager.addSave("BSB", "GEN", 1, {
      categories: [DEFAULT_SAVE_CATEGORY, "Study Later"],
    });

    expect(manager.saves.value).toHaveLength(1);
    expect(manager.saves.value[0]?.categories).toEqual([
      DEFAULT_SAVE_CATEGORY,
      "Study Later",
    ]);
    expect(manager.categories.value).toEqual([
      { name: DEFAULT_SAVE_CATEGORY },
      { name: "Study Later" },
    ]);
    // Single persist — no orphan empty folder written first.
    expect(recordDataMock).toHaveBeenCalledTimes(1);
  });

  it("setSaveCategories creates missing folders in the same write", async () => {
    setRecords({
      saves: {
        saves: [
          createSave({ id: "edit-1", categories: [DEFAULT_SAVE_CATEGORY] }),
        ],
        categories: [{ name: DEFAULT_SAVE_CATEGORY }],
      },
    });

    const manager = createSavesManager(os, login);
    await flushPromises();

    await manager.setSaveCategories("edit-1", [
      DEFAULT_SAVE_CATEGORY,
      "Favorites",
    ]);
    expect(manager.saves.value[0]?.categories).toEqual([
      DEFAULT_SAVE_CATEGORY,
      "Favorites",
    ]);
    expect(manager.categories.value.some((c) => c.name === "Favorites")).toBe(
      true
    );
    expect(recordDataMock).toHaveBeenCalledTimes(1);

    // No-op when the same set is reapplied (order-insensitive).
    await manager.setSaveCategories("edit-1", [
      "Favorites",
      DEFAULT_SAVE_CATEGORY,
    ]);
    expect(recordDataMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes category lists and reports membership", () => {
    expect(normalizeSaveCategories(["Favorites"])).toEqual(["Favorites"]);
    expect(normalizeSaveCategories(["A", "B"])).toEqual(["A", "B"]);
    expect(normalizeSaveCategories(["A", " A ", "B", ""])).toEqual(["A", "B"]);
    expect(normalizeSaveCategories([])).toEqual([DEFAULT_SAVE_CATEGORY]);

    const multi = createSave({ categories: ["A", "B"] });
    const single = createSave({ categories: ["A"] });
    expect(saveBelongsToCategory(multi, "A")).toBe(true);
    expect(saveBelongsToCategory(multi, "C")).toBe(false);
    expect(saveBelongsToCategory(single, "A")).toBe(true);
    expect(saveBelongsToCategory(single, "B")).toBe(false);
  });

  it("drops a save whose last remaining folder is deleted", async () => {
    setRecords({
      saves: {
        saves: [
          createSave({
            id: "collapse-1",
            categories: [DEFAULT_SAVE_CATEGORY, "Favorites"],
          }),
        ],
        categories: [{ name: DEFAULT_SAVE_CATEGORY }, { name: "Favorites" }],
      },
    });

    const manager = createSavesManager(os, login);
    await flushPromises();

    await manager.setSaveCategories("collapse-1", ["Favorites"]);
    expect(manager.saves.value[0]?.categories).toEqual(["Favorites"]);

    await manager.deleteCategory("Favorites");
    expect(manager.saves.value).toEqual([]);
  });
});
