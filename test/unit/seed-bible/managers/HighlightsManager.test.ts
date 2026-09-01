import {
  chapterHighlightsSchema,
  createHighlightsManager,
  highlightContainsVerse,
  highlightsSyncDomain,
  mergeChapterHighlights,
  type ChapterHighlight,
  type ChapterHighlights,
} from "@packages/seed-bible/seed-bible/managers/HighlightsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  createInMemoryRecordStore,
  LOCAL_OWNER,
  type OfflineRecordStore,
} from "@packages/seed-bible/seed-bible/managers/OfflineRecordStore";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { effect, signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

describe("HighlightsManager", () => {
  let getDataMock: Mock;
  let recordDataMock: Mock;
  let warnSpy: Mock;
  let login: Mocked<LoginManager>;
  let os: CasualOSManager;
  let store: OfflineRecordStore<ChapterHighlights>;

  const createManager = () => createHighlightsManager(os, login, { store });

  // The local store sits in front of the server, so a load is several awaits
  // deep; flushing a handful of times covers the whole chain.
  const flushPromises = async () => {
    for (let i = 0; i < 10; i += 1) {
      await Promise.resolve();
    }
  };

  const createDeferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  };

  beforeEach(() => {
    store = createInMemoryRecordStore<ChapterHighlights>();
    os = CasualOSManager();
    getDataMock = vi.spyOn(os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "Data not found",
    });
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue({ success: true } as never);
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
  });

  it("getChapterHighlights() returns empty highlights when signed out with nothing saved on the device", async () => {
    login.userId.value = null;
    const manager = createManager();

    const result = manager.getChapterHighlights("BSB", "GEN", 1);

    expect(result.value).toEqual({ highlights: [] });
    expect(getDataMock).not.toHaveBeenCalled();
  });

  it("getChapterHighlights() loads chapter highlights from the user record", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        highlights: [
          { colorId: "color-1", verse: 3 },
          { colorId: "color-2", verse: [5, 7] },
        ],
      },
    });
    const manager = createManager();

    const result = manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();

    expect(getDataMock).toHaveBeenCalledWith("user-1", "highlights:BSB/GEN/1");
    expect(result.value).toEqual({
      highlights: [
        { colorId: "color-1", verse: 3 },
        { colorId: "color-2", verse: [5, 7] },
      ],
    });
  });

  it("getChapterHighlights() normalizes overlapping stored highlights", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        highlights: [
          { colorId: "color-4", verse: [1, 4] },
          { colorId: "color-5", verse: [3, 5] },
        ],
      },
    });
    const manager = createManager();

    const result = manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();

    expect(result.value).toEqual({
      highlights: [
        { colorId: "color-4", verse: [1, 2] },
        { colorId: "color-5", verse: [3, 5] },
      ],
    });
  });

  it("getChapterHighlights() caches highlights to avoid repeated network calls", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        highlights: [{ colorId: "color-1", verse: 3 }],
      },
    });
    const manager = createManager();

    // First call fetches from network
    manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();
    expect(getDataMock).toHaveBeenCalledTimes(1);

    // Second call returns cached result without calling os.getData
    manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();
    expect(getDataMock).toHaveBeenCalledTimes(1);

    // Different chapter makes a new network call
    manager.getChapterHighlights("BSB", "GEN", 2);
    await flushPromises();
    expect(getDataMock).toHaveBeenCalledTimes(2);
  });

  it("getChapterHighlights() reads empty for a chapter with nothing stored yet", async () => {
    // The default mock in beforeEach answers `data_not_found`, which is what
    // the server returns for any chapter the user has never highlighted.
    const manager = createManager();

    const view = manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();

    expect(getDataMock).toHaveBeenCalledWith("user-1", "highlights:BSB/GEN/1");
    expect(view.value).toEqual({ highlights: [] });

    // "Nothing stored" is an answer, so re-reading must not ask again.
    manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();
    expect(getDataMock).toHaveBeenCalledTimes(1);
  });

  it("getChapterHighlights() shares one request between callers that arrive before it answers", async () => {
    const load = createDeferred<{
      success: boolean;
      data: { highlights: { colorId: string; verse: number }[] };
    }>();
    getDataMock.mockReturnValue(load.promise);
    const manager = createManager();

    // Both callers arrive while the request is still on the wire, the way a
    // reader skimming chapters revisits one that is mid-load.
    const first = manager.getChapterHighlights("BSB", "GEN", 1);
    const second = manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();

    expect(getDataMock).toHaveBeenCalledTimes(1);
    // BibleReadingManager reassigns this signal on every navigation, so the
    // same chapter has to keep handing back the same signal.
    expect(second).toBe(first);

    load.resolve({
      success: true,
      data: { highlights: [{ colorId: "color-1", verse: 3 }] },
    });
    await flushPromises();

    expect(first.value).toEqual({
      highlights: [{ colorId: "color-1", verse: 3 }],
    });
  });

  it("getChapterHighlights() returns empty highlights when stored data is invalid", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: { highlights: [{ colorId: "#fff" }] },
    });
    const manager = createManager();

    const result = manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();

    expect(result.value).toEqual({ highlights: [] });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("saveChapterHighlights() stores highlights at the chapter address", async () => {
    const manager = createManager();

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-1", verse: 1 },
      { colorId: "color-3", verse: [2, 4] },
    ]);
    await manager.sync.sync();

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [
          { colorId: "color-1", verse: 1 },
          { colorId: "color-3", verse: [2, 4] },
        ],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("saveChapterHighlights() saves to the device when signed out, without prompting", async () => {
    login.userId.value = null;
    const manager = createManager();

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-1", verse: 1 },
    ]);

    expect(login.login).not.toHaveBeenCalled();
    expect(recordDataMock).not.toHaveBeenCalled();
    expect(
      (await store.get(LOCAL_OWNER, "highlights:BSB/GEN/1"))?.payload
    ).toEqual({ highlights: [{ colorId: "color-1", verse: 1 }] });
  });

  it("saveChapterHighlights() warns and does not save when signed out with no local storage", async () => {
    login.userId.value = null;
    const manager = createHighlightsManager(os, login, { store: null });

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-1", verse: 1 },
    ]);

    expect(login.login).not.toHaveBeenCalled();
    expect(recordDataMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Unable to save highlights: signed out with no local storage."
    );
  });

  it("saveChapterHighlights() stores normalized highlights without overlap", async () => {
    const manager = createManager();

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-4", verse: [1, 4] },
      { colorId: "color-5", verse: [3, 5] },
    ]);
    await manager.sync.sync();

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [
          { colorId: "color-4", verse: [1, 2] },
          { colorId: "color-5", verse: [3, 5] },
        ],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("saveChapterHighlights() updates the cache with saved highlights", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        highlights: [{ colorId: "color-1", verse: 3 }],
      },
    });
    const manager = createManager();

    // Load and cache initial highlights
    const initial = manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();
    expect(initial.value).toEqual({
      highlights: [{ colorId: "color-1", verse: 3 }],
    });
    expect(getDataMock).toHaveBeenCalledTimes(1);

    // Save new highlights
    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-2", verse: [5, 7] },
    ]);
    await manager.sync.sync();
    expect(recordDataMock).toHaveBeenCalledTimes(1);
    const readsSoFar = getDataMock.mock.calls.length;

    // Subsequent getChapterHighlights call should return cached (saved) highlights without another network call
    const updated = manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();
    expect(updated.value).toEqual({
      highlights: [{ colorId: "color-2", verse: [5, 7] }],
    });
    expect(getDataMock).toHaveBeenCalledTimes(readsSoFar);
  });

  it("saveChapterHighlights() updates local signal before persistence resolves", async () => {
    const manager = createManager();
    const chapterHighlights = manager.getChapterHighlights("BSB", "GEN", 1);

    const savePromise = manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-9", verse: [2, 4] },
    ]);

    // Read before the save resolves: the highlight has to be on screen the
    // moment it is made, not once storage has caught up.
    expect(chapterHighlights.value).toEqual({
      highlights: [{ colorId: "color-9", verse: [2, 4] }],
    });

    await savePromise;
  });

  it("saveChapterHighlights() is not reverted by a load that was already in flight", async () => {
    const pendingLoad = createDeferred<{
      success: boolean;
      data: { highlights: { colorId: string; verse: number }[] };
    }>();
    getDataMock.mockReturnValue(pendingLoad.promise);
    const manager = createManager();

    // Arriving at the chapter starts a load that hasn't come back yet.
    const view = manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();

    // Offline, so nothing is pushed while this runs: the question here is
    // what the load does to the save, not what the server does.
    window.dispatchEvent(new Event("offline"));
    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-9", verse: [2, 4] },
    ]);
    expect(view.value).toEqual({
      highlights: [{ colorId: "color-9", verse: [2, 4] }],
    });

    // The load finally answers, with what the server held before the save.
    pendingLoad.resolve({
      success: true,
      data: { highlights: [{ colorId: "stale-color", verse: 8 }] },
    });
    await flushPromises();

    expect(view.value).toEqual({
      highlights: [{ colorId: "color-9", verse: [2, 4] }],
    });
  });

  it("highlightVerse() adds or overrides overlapping highlights", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        highlights: [
          { colorId: "color-6", verse: [1, 3] },
          { colorId: "color-6", verse: [5, 7] },
        ],
      },
    });
    const manager = createManager();

    await manager.highlightVerse("BSB", "GEN", 1, {
      colorId: "color-5",
      verse: [3, 6],
    });
    await manager.sync.sync();

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [
          { colorId: "color-6", verse: [1, 2] },
          { colorId: "color-5", verse: [3, 6] },
          { colorId: "color-6", verse: 7 },
        ],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("highlightVerse() merges adjacent highlights with identical styling", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        highlights: [{ colorId: "color-6", verse: [1, 2] }],
      },
    });
    const manager = createManager();

    await manager.highlightVerse("BSB", "GEN", 1, {
      colorId: "color-6",
      verse: [3, 4],
    });
    await manager.sync.sync();

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [{ colorId: "color-6", verse: [1, 4] }],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("highlightVerses() applies a style to multiple verses in a single save", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        highlights: [{ colorId: "color-6", verse: [1, 8] }],
      },
    });
    const manager = createManager();

    await manager.highlightVerses("BSB", "GEN", 1, [2, 3, 6], {
      colorId: "custom",
      customColor: "#ffeeaa",
      customFontColor: "#222222",
    });
    await manager.sync.sync();

    expect(recordDataMock).toHaveBeenCalledTimes(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [
          { colorId: "color-6", verse: 1 },
          {
            colorId: "custom",
            customColor: "#ffeeaa",
            customFontColor: "#222222",
            verse: [2, 3],
          },
          { colorId: "color-6", verse: [4, 5] },
          {
            colorId: "custom",
            customColor: "#ffeeaa",
            customFontColor: "#222222",
            verse: 6,
          },
          { colorId: "color-6", verse: [7, 8] },
        ],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("unhighlightVerse() removes a verse range and splits impacted highlights", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        highlights: [{ colorId: "color-6", verse: [1, 7] }],
      },
    });
    const manager = createManager();

    await manager.unhighlightVerse("BSB", "GEN", 1, [3, 5]);
    await manager.sync.sync();

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [
          { colorId: "color-6", verse: [1, 2] },
          { colorId: "color-6", verse: [6, 7] },
        ],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("unhighlightVerse() can remove a single highlighted verse", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        highlights: [{ colorId: "color-6", verse: 4 }],
      },
    });
    const manager = createManager();

    await manager.unhighlightVerse("BSB", "GEN", 1, 4);
    await manager.sync.sync();

    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("unhighlightVerses() removes highlights for multiple verses in a single save", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        highlights: [
          { colorId: "color-6", verse: [1, 3] },
          { colorId: "color-7", verse: [5, 8] },
        ],
      },
    });
    const manager = createManager();

    await manager.unhighlightVerses("BSB", "GEN", 1, [2, 3, 6, 7]);
    await manager.sync.sync();

    expect(recordDataMock).toHaveBeenCalledTimes(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "highlights:BSB/GEN/1",
      {
        highlights: [
          { colorId: "color-6", verse: 1 },
          { colorId: "color-7", verse: 5 },
          { colorId: "color-7", verse: 8 },
        ],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("unhighlightVerses() does nothing when the user is not logged in", async () => {
    login.userId.value = null;

    getDataMock.mockResolvedValue({
      success: true,
      data: {
        highlights: [
          { colorId: "color-6", verse: [1, 3] },
          { colorId: "color-7", verse: [5, 8] },
        ],
      },
    });
    const manager = createManager();

    await manager.unhighlightVerses("BSB", "GEN", 1, [2, 3, 6, 7]);

    expect(recordDataMock).toHaveBeenCalledTimes(0);
    // Signed out there is nothing saved to remove, so the clear resolves no
    // account at all. Prompting would put a login modal in front of someone
    // clearing a highlight that was never in their records — a shared
    // session's broadcast highlight, say.
    expect(login.login).not.toHaveBeenCalled();
    expect(getDataMock).not.toHaveBeenCalled();
  });

  it("unhighlightVerses() does not write when no saved highlight covers the verses", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        highlights: [{ colorId: "color-7", verse: [5, 8] }],
      },
    });
    const manager = createManager();

    await manager.unhighlightVerses("BSB", "GEN", 1, [1, 2]);

    // Nothing on these verses to remove, so the write would have stored an
    // unchanged set.
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("highlightVerses() does nothing for an empty verse list, without asking the user to sign in", async () => {
    login.userId.value = null;
    const manager = createManager();

    await manager.highlightVerses("BSB", "GEN", 1, [], {
      colorId: "color-9",
    });

    // Bailing out before resolving an account is the point: a stray empty
    // call must not put a login prompt in front of a signed-out reader.
    expect(login.login).not.toHaveBeenCalled();
    expect(getDataMock).not.toHaveBeenCalled();
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("unhighlightVerses() does nothing for an empty verse list, without asking the user to sign in", async () => {
    login.userId.value = null;
    const manager = createManager();

    await manager.unhighlightVerses("BSB", "GEN", 1, []);

    expect(login.login).not.toHaveBeenCalled();
    expect(getDataMock).not.toHaveBeenCalled();
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  describe("account switching (regression for #1564)", () => {
    const mockPerUserHighlights = () => {
      getDataMock.mockImplementation(async (recordName: unknown) => {
        if (recordName === "user-1") {
          return {
            success: true,
            data: { highlights: [{ colorId: "user-1-color", verse: 1 }] },
          };
        }
        if (recordName === "user-2") {
          return {
            success: true,
            data: { highlights: [{ colorId: "user-2-color", verse: 2 }] },
          };
        }
        return {
          success: false,
          errorCode: "data_not_found",
          errorMessage: "Data not found",
        };
      });
    };

    it("loads the newly signed-in account's highlights after switching accounts", async () => {
      mockPerUserHighlights();
      const manager = createManager();

      const first = manager.getChapterHighlights("BSB", "GEN", 11);
      await flushPromises();
      expect(first.value).toEqual({
        highlights: [{ colorId: "user-1-color", verse: 1 }],
      });

      // Simulates navigating to a chapter user A had already visited, now
      // signed in as user B.
      login.userId.value = "user-2";
      const second = manager.getChapterHighlights("BSB", "GEN", 11);
      await flushPromises();

      expect(getDataMock).toHaveBeenCalledWith(
        "user-2",
        "highlights:BSB/GEN/11"
      );
      expect(second.value).toEqual({
        highlights: [{ colorId: "user-2-color", verse: 2 }],
      });
    });

    it("updates a view already held by a caller in place when the account changes, without another getChapterHighlights() call", async () => {
      mockPerUserHighlights();
      const manager = createManager();

      // Simulates a reader pane holding the signal for rendering, the way
      // BibleReadingManager's activeChapterHighlights does.
      const view = manager.getChapterHighlights("BSB", "GEN", 12);
      await flushPromises();
      expect(view.value).toEqual({
        highlights: [{ colorId: "user-1-color", verse: 1 }],
      });

      const seen: ChapterHighlights[] = [];
      const dispose = effect(() => {
        seen.push(view.value);
      });

      login.userId.value = "user-2";
      await flushPromises();

      expect(view.value).toEqual({
        highlights: [{ colorId: "user-2-color", verse: 2 }],
      });
      expect(getDataMock).toHaveBeenCalledWith(
        "user-2",
        "highlights:BSB/GEN/12"
      );
      expect(getDataMock).toHaveBeenCalledTimes(2);
      dispose();
    });

    it("clears a held view immediately when the user signs out", async () => {
      getDataMock.mockResolvedValue({
        success: true,
        data: { highlights: [{ colorId: "color-1", verse: 1 }] },
      });
      const manager = createManager();

      const view = manager.getChapterHighlights("BSB", "GEN", 1);
      await flushPromises();
      expect(view.value).toEqual({
        highlights: [{ colorId: "color-1", verse: 1 }],
      });

      login.userId.value = null;

      expect(view.value).toEqual({ highlights: [] });
    });

    it("refetches from the server after signing out and back in as the same account", async () => {
      getDataMock.mockResolvedValue({
        success: true,
        data: { highlights: [{ colorId: "color-1", verse: 1 }] },
      });
      const manager = createManager();

      manager.getChapterHighlights("BSB", "GEN", 1);
      await flushPromises();
      expect(getDataMock).toHaveBeenCalledTimes(1);

      login.userId.value = null;
      login.userId.value = "user-1";

      const view = manager.getChapterHighlights("BSB", "GEN", 1);
      await flushPromises();

      expect(getDataMock).toHaveBeenCalledTimes(2);
      expect(view.value).toEqual({
        highlights: [{ colorId: "color-1", verse: 1 }],
      });
    });

    it("ignores a late response from the previous account after switching", async () => {
      const user1Load = createDeferred<{
        success: boolean;
        data: { highlights: { colorId: string; verse: number }[] };
      }>();
      getDataMock.mockImplementation((recordName: unknown) => {
        if (recordName === "user-1") {
          return user1Load.promise;
        }
        return Promise.resolve({
          success: true,
          data: { highlights: [{ colorId: "user-2-color", verse: 2 }] },
        });
      });
      const manager = createManager();

      const view = manager.getChapterHighlights("BSB", "GEN", 1);
      // user-1's load is now pending and held open by resolveUser1Load.

      // Simulates navigating to the same chapter as user-2.
      login.userId.value = "user-2";
      manager.getChapterHighlights("BSB", "GEN", 1);
      await flushPromises();
      expect(view.value).toEqual({
        highlights: [{ colorId: "user-2-color", verse: 2 }],
      });

      // The stale user-1 request finally resolves after the switch.
      user1Load.resolve({
        success: true,
        data: { highlights: [{ colorId: "user-1-color", verse: 1 }] },
      });
      await flushPromises();

      expect(view.value).toEqual({
        highlights: [{ colorId: "user-2-color", verse: 2 }],
      });
    });

    it("loads highlights once an anonymous session signs in, for a view already held by the caller", async () => {
      getDataMock.mockResolvedValue({
        success: true,
        data: { highlights: [{ colorId: "color-1", verse: 1 }] },
      });
      login.userId.value = null;
      const manager = createManager();

      const view = manager.getChapterHighlights("BSB", "GEN", 1);
      expect(view.value).toEqual({ highlights: [] });
      expect(getDataMock).not.toHaveBeenCalled();

      const seen: ChapterHighlights[] = [];
      const dispose = effect(() => {
        seen.push(view.value);
      });

      login.userId.value = "user-1";
      await flushPromises();

      expect(view.value).toEqual({
        highlights: [{ colorId: "color-1", verse: 1 }],
      });
      expect(getDataMock).toHaveBeenCalledTimes(1);
      dispose();
    });

    it("highlightVerses() saves to the device when signed out, without prompting or reading anybody's record", async () => {
      login.userId.value = null;
      getDataMock.mockResolvedValue({
        success: true,
        data: { highlights: [{ colorId: "color-1", verse: 1 }] },
      });
      const manager = createManager();

      await manager.highlightVerses("BSB", "GEN", 1, [5], {
        colorId: "color-9",
      });

      expect(login.login).not.toHaveBeenCalled();
      expect(getDataMock).not.toHaveBeenCalled();
      expect(recordDataMock).not.toHaveBeenCalled();
      expect(
        (await store.get(LOCAL_OWNER, "highlights:BSB/GEN/1"))?.payload
      ).toEqual({ highlights: [{ colorId: "color-9", verse: 5 }] });
    });

    it("highlightVerses() writes to the account it merged from when the account changes mid-load", async () => {
      const user1Load = createDeferred<{
        success: boolean;
        data: { highlights: { colorId: string; verse: number }[] };
      }>();
      getDataMock.mockImplementation((recordName: unknown) => {
        if (recordName === "user-1") {
          return user1Load.promise;
        }
        return Promise.resolve({
          success: true,
          data: { highlights: [{ colorId: "user-2-color", verse: 9 }] },
        });
      });
      const manager = createManager();

      const highlighting = manager.highlightVerses("BSB", "GEN", 1, [5], {
        colorId: "color-9",
      });

      // The session is invalidated and a different account signs in while
      // user-1's existing highlights are still on the wire.
      login.userId.value = "user-2";
      user1Load.resolve({
        success: true,
        data: { highlights: [{ colorId: "user-1-color", verse: 1 }] },
      });
      await highlighting;

      // user-1's highlights must never be stored in user-2's record. They stay
      // queued under user-1 until that account is signed in again, which is
      // also why nothing is pushed here.
      expect(recordDataMock).not.toHaveBeenCalled();
      expect(await store.get("user-2", "highlights:BSB/GEN/1")).toBeNull();
      expect(
        (await store.get("user-1", "highlights:BSB/GEN/1"))?.payload
      ).toEqual({
        highlights: [
          { colorId: "user-1-color", verse: 1 },
          { colorId: "color-9", verse: 5 },
        ],
      });
    });

    it("unhighlightVerses() writes to the account it merged from when the account changes mid-load", async () => {
      const user1Load = createDeferred<{
        success: boolean;
        data: { highlights: { colorId: string; verse: number[] }[] };
      }>();
      getDataMock.mockImplementation((recordName: unknown) => {
        if (recordName === "user-1") {
          return user1Load.promise;
        }
        return Promise.resolve({
          success: true,
          data: { highlights: [{ colorId: "user-2-color", verse: 9 }] },
        });
      });
      const manager = createManager();

      const unhighlighting = manager.unhighlightVerses("BSB", "GEN", 1, [2]);

      login.userId.value = "user-2";
      user1Load.resolve({
        success: true,
        data: { highlights: [{ colorId: "user-1-color", verse: [1, 3] }] },
      });
      await unhighlighting;

      expect(recordDataMock).not.toHaveBeenCalled();
      expect(await store.get("user-2", "highlights:BSB/GEN/1")).toBeNull();
      expect(
        (await store.get("user-1", "highlights:BSB/GEN/1"))?.payload
      ).toEqual({
        highlights: [
          { colorId: "user-1-color", verse: 1 },
          { colorId: "user-1-color", verse: 3 },
        ],
      });
    });

    it("highlightVerses() warns and does not save when signed out with no local storage", async () => {
      login.userId.value = null;
      const manager = createHighlightsManager(os, login, { store: null });

      await manager.highlightVerses("BSB", "GEN", 1, [5], {
        colorId: "color-9",
      });

      expect(login.login).not.toHaveBeenCalled();
      expect(getDataMock).not.toHaveBeenCalled();
      expect(recordDataMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        "Unable to save highlights: signed out with no local storage."
      );
    });
  });

  describe("offline and signed-out highlighting (regression for #1591)", () => {
    it("highlightVerse() while signed out saves locally and never prompts for login", async () => {
      login.userId.value = null;
      const manager = createManager();
      const view = manager.getChapterHighlights("BSB", "GEN", 1);

      await manager.highlightVerse("BSB", "GEN", 1, {
        colorId: "c1",
        verse: 3,
      });

      expect(login.login).not.toHaveBeenCalled();
      expect(recordDataMock).not.toHaveBeenCalled();
      expect(view.value).toEqual({
        highlights: [{ colorId: "c1", verse: 3 }],
      });
      expect(
        (await store.get(LOCAL_OWNER, "highlights:BSB/GEN/1"))?.pendingOp
      ).toBe("upsert");
    });

    it("highlightVerse() while offline queues the write and pushes it once back online", async () => {
      const manager = createManager();
      window.dispatchEvent(new Event("offline"));

      await manager.highlightVerse("BSB", "GEN", 1, {
        colorId: "c1",
        verse: 3,
      });
      expect(recordDataMock).not.toHaveBeenCalled();
      expect(
        (await store.get("user-1", "highlights:BSB/GEN/1"))?.pendingOp
      ).toBe("upsert");

      window.dispatchEvent(new Event("online"));
      await manager.sync.sync();

      expect(recordDataMock).toHaveBeenCalledWith(
        "user-1",
        "highlights:BSB/GEN/1",
        { highlights: [{ colorId: "c1", verse: 3 }] },
        { marker: "publicRead:highlights/BSB" }
      );
      expect(
        (await store.get("user-1", "highlights:BSB/GEN/1"))?.pendingOp
      ).toBeNull();
    });

    it("getChapterHighlights() serves a previously visited chapter from the store while offline", async () => {
      getDataMock.mockResolvedValue({
        success: true,
        data: { highlights: [{ colorId: "c1", verse: 3 }] },
      });
      const first = createManager();
      first.getChapterHighlights("BSB", "GEN", 1);
      await flushPromises();
      await flushPromises();

      window.dispatchEvent(new Event("offline"));
      getDataMock.mockRejectedValue(new Error("offline"));
      const second = createManager();
      const view = second.getChapterHighlights("BSB", "GEN", 1);
      await flushPromises();
      await flushPromises();

      expect(view.value).toEqual({
        highlights: [{ colorId: "c1", verse: 3 }],
      });
    });

    it("adopts signed-out highlights on sign-in and merges them with the account's", async () => {
      login.userId.value = null;
      const manager = createManager();
      await manager.highlightVerse("BSB", "GEN", 1, {
        colorId: "mine",
        verse: 3,
      });
      getDataMock.mockResolvedValue({
        success: true,
        data: { highlights: [{ colorId: "theirs", verse: 7 }] },
      });

      login.userId.value = "user-1";
      await flushPromises();
      await manager.sync.sync();

      expect(recordDataMock).toHaveBeenCalledWith(
        "user-1",
        "highlights:BSB/GEN/1",
        {
          highlights: [
            { colorId: "mine", verse: 3 },
            { colorId: "theirs", verse: 7 },
          ],
        },
        { marker: "publicRead:highlights/BSB" }
      );
      expect(manager.getChapterHighlights("BSB", "GEN", 1).value).toEqual({
        highlights: [
          { colorId: "mine", verse: 3 },
          { colorId: "theirs", verse: 7 },
        ],
      });
    });

    it("signing out, highlighting, and signing back in as the same account merges with the account's chapter", async () => {
      getDataMock.mockResolvedValue({
        success: true,
        data: { highlights: [{ colorId: "c1", verse: 3 }] },
      });
      const manager = createManager();
      manager.getChapterHighlights("BSB", "GEN", 1);
      await flushPromises();
      await flushPromises();

      login.userId.value = null;
      await manager.highlightVerse("BSB", "GEN", 1, {
        colorId: "c1",
        verse: 5,
      });
      getDataMock.mockResolvedValue({
        success: true,
        data: {
          highlights: [
            { colorId: "c1", verse: 3 },
            { colorId: "c1", verse: 9 },
          ],
        },
      });
      login.userId.value = "user-1";
      await flushPromises();
      await manager.sync.sync();

      // Verse 3 was never touched locally, so the server's copy of it stands;
      // the server's verse 9 and the signed-out verse 5 both survive.
      expect(recordDataMock).toHaveBeenLastCalledWith(
        "user-1",
        "highlights:BSB/GEN/1",
        {
          highlights: [
            { colorId: "c1", verse: 3 },
            { colorId: "c1", verse: 5 },
            { colorId: "c1", verse: 9 },
          ],
        },
        { marker: "publicRead:highlights/BSB" }
      );
    });
  });
});

describe("highlightContainsVerse", () => {
  it("matches only the verse a single-verse highlight covers", () => {
    const highlight: ChapterHighlight = { colorId: "color-1", verse: 5 };

    expect(highlightContainsVerse(highlight, 4)).toBe(false);
    expect(highlightContainsVerse(highlight, 5)).toBe(true);
    expect(highlightContainsVerse(highlight, 6)).toBe(false);
  });

  it("includes both ends of a range highlight and nothing beyond them", () => {
    const highlight: ChapterHighlight = { colorId: "color-1", verse: [5, 8] };

    expect(highlightContainsVerse(highlight, 4)).toBe(false);
    expect(highlightContainsVerse(highlight, 5)).toBe(true);
    expect(highlightContainsVerse(highlight, 7)).toBe(true);
    expect(highlightContainsVerse(highlight, 8)).toBe(true);
    expect(highlightContainsVerse(highlight, 9)).toBe(false);
  });
});

describe("chapterHighlightsSchema", () => {
  it("validates single-verse and range highlights", () => {
    const result = chapterHighlightsSchema.safeParse({
      highlights: [
        { colorId: "color-1", verse: 6 },
        { colorId: "color-6", verse: [8, 10] },
      ],
    });

    expect(result).toEqual({
      success: true,
      data: {
        highlights: [
          { colorId: "color-1", verse: 6 },
          { colorId: "color-6", verse: [8, 10] },
        ],
      },
    });
  });

  it("validates custom colors", () => {
    const result = chapterHighlightsSchema.safeParse({
      highlights: [
        {
          colorId: "custom",
          customColor: "#00ff00",
          customFontColor: "#000000",
          verse: 6,
        },
        {
          colorId: "custom",
          customColor: "#00ff00",
          customFontColor: "#000000",
          verse: [8, 10],
        },
      ],
    });

    expect(result).toEqual({
      success: true,
      data: {
        highlights: [
          {
            colorId: "custom",
            customColor: "#00ff00",
            customFontColor: "#000000",
            verse: 6,
          },
          {
            colorId: "custom",
            customColor: "#00ff00",
            customFontColor: "#000000",
            verse: [8, 10],
          },
        ],
      },
    });
  });

  it("rejects verse ranges where start is greater than end", () => {
    const result = chapterHighlightsSchema.safeParse({
      highlights: [{ colorId: "color-1", verse: [10, 8] }],
    });

    expect(result.success).toBe(false);
  });
});

describe("mergeChapterHighlights()", () => {
  const c = (
    verse: ChapterHighlight["verse"],
    colorId = "c1"
  ): ChapterHighlight => ({ colorId, verse });
  const hl = (...highlights: ChapterHighlight[]): ChapterHighlights => ({
    highlights,
  });

  it("keeps verses added on both sides", () => {
    expect(mergeChapterHighlights(hl(), hl(c(3)), hl(c(7)))).toEqual(
      hl(c(3), c(7))
    );
  });

  it("lets the local color win when both sides recolored the same verse", () => {
    expect(
      mergeChapterHighlights(
        hl(c(3, "old")),
        hl(c(3, "mine")),
        hl(c(3, "theirs"))
      )
    ).toEqual(hl(c(3, "mine")));
  });

  it("removes a verse removed locally when the server left it alone", () => {
    expect(mergeChapterHighlights(hl(c(3)), hl(), hl(c(3)))).toEqual(hl());
  });

  it("removes a verse removed on the server when the local side left it alone", () => {
    expect(
      mergeChapterHighlights(hl(c(3), c(5)), hl(c(3), c(5)), hl(c(5)))
    ).toEqual(hl(c(5)));
  });

  it("unions when there is no base, with local winning overlaps", () => {
    expect(
      mergeChapterHighlights(
        null,
        hl(c(3, "mine"), c(4)),
        hl(c(3, "theirs"), c(8))
      )
    ).toEqual(hl(c(3, "mine"), c(4), c(8)));
  });

  it("collapses adjacent equal styles back into ranges", () => {
    expect(mergeChapterHighlights(hl(), hl(c([3, 5])), hl(c(6)))).toEqual(
      hl(c([3, 6]))
    );
  });
});

describe("highlightsSyncDomain", () => {
  it("derives the marker from the translation in the address", () => {
    expect(
      highlightsSyncDomain.marker("highlights:BSB/GEN/1", { highlights: [] })
    ).toBe("publicRead:highlights/BSB");
  });

  it("treats two payloads as the same version when they normalize equal", () => {
    expect(
      highlightsSyncDomain.sameVersion(
        { highlights: [{ colorId: "c1", verse: [3, 4] }] },
        {
          highlights: [
            { colorId: "c1", verse: 3 },
            { colorId: "c1", verse: 4 },
          ],
        }
      )
    ).toBe(true);
  });
});
