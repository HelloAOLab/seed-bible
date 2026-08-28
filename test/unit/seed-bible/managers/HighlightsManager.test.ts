import {
  chapterHighlightsSchema,
  createHighlightsManager,
  highlightContainsVerse,
  type ChapterHighlight,
  type ChapterHighlights,
} from "@packages/seed-bible/seed-bible/managers/HighlightsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { effect, signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

describe("HighlightsManager", () => {
  let getDataMock: Mock;
  let recordDataMock: Mock;
  let warnSpy: Mock;
  let login: Mocked<LoginManager>;
  let os: CasualOSManager;

  const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  const createDeferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => {
      resolve = r;
    });
    return { promise, resolve };
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
  });

  it("getChapterHighlights() returns empty highlights when unauthenticated", async () => {
    login.userId.value = null;
    const manager = createHighlightsManager(os, login);

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
    const manager = createHighlightsManager(os, login);

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
    const manager = createHighlightsManager(os, login);

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
    const manager = createHighlightsManager(os, login);

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
    const manager = createHighlightsManager(os, login);

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
    const manager = createHighlightsManager(os, login);

    // Both callers arrive while the request is still on the wire, the way a
    // reader skimming chapters revisits one that is mid-load.
    const first = manager.getChapterHighlights("BSB", "GEN", 1);
    const second = manager.getChapterHighlights("BSB", "GEN", 1);

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
    const manager = createHighlightsManager(os, login);

    const result = manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();

    expect(result.value).toEqual({ highlights: [] });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("saveChapterHighlights() stores highlights at the chapter address", async () => {
    const manager = createHighlightsManager(os, login);

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-1", verse: 1 },
      { colorId: "color-3", verse: [2, 4] },
    ]);

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

  it("saveChapterHighlights() attempts login before saving when unauthenticated", async () => {
    login.userId.value = null;
    login.login.mockImplementation(async () => {
      login.userId.value = "user-2";
      return { id: "user-2", email: "test@example.com" };
    });
    const manager = createHighlightsManager(os, login);

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-1", verse: 1 },
    ]);

    expect(login.login).toHaveBeenCalledTimes(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-2",
      "highlights:BSB/GEN/1",
      {
        highlights: [{ colorId: "color-1", verse: 1 }],
      },
      {
        marker: "publicRead:highlights/BSB",
      }
    );
  });

  it("saveChapterHighlights() warns and does not save when login does not authenticate", async () => {
    login.userId.value = null;
    const manager = createHighlightsManager(os, login);

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-1", verse: 1 },
    ]);

    expect(login.login).toHaveBeenCalledTimes(1);
    expect(recordDataMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Unable to save highlights: user is not authenticated."
    );
  });

  it("saveChapterHighlights() stores normalized highlights without overlap", async () => {
    const manager = createHighlightsManager(os, login);

    await manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-4", verse: [1, 4] },
      { colorId: "color-5", verse: [3, 5] },
    ]);

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
    const manager = createHighlightsManager(os, login);

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
    expect(recordDataMock).toHaveBeenCalledTimes(1);

    // Subsequent getChapterHighlights call should return cached (saved) highlights without another network call
    const updated = manager.getChapterHighlights("BSB", "GEN", 1);
    await flushPromises();
    expect(updated.value).toEqual({
      highlights: [{ colorId: "color-2", verse: [5, 7] }],
    });
    expect(getDataMock).toHaveBeenCalledTimes(1); // Still just 1 call
  });

  it("saveChapterHighlights() updates local signal before persistence resolves", async () => {
    let resolveRecordData: (() => void) | null = null;
    recordDataMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRecordData = resolve;
        })
    );
    const manager = createHighlightsManager(os, login);
    const chapterHighlights = manager.getChapterHighlights("BSB", "GEN", 1);

    const savePromise = manager.saveChapterHighlights("BSB", "GEN", 1, [
      { colorId: "color-9", verse: [2, 4] },
    ]);

    expect(chapterHighlights.value).toEqual({
      highlights: [{ colorId: "color-9", verse: [2, 4] }],
    });

    (resolveRecordData as any)?.();
    await savePromise;
  });

  it("saveChapterHighlights() is not reverted by a load that was already in flight", async () => {
    const pendingLoad = createDeferred<{
      success: boolean;
      data: { highlights: { colorId: string; verse: number }[] };
    }>();
    getDataMock.mockReturnValue(pendingLoad.promise);
    const manager = createHighlightsManager(os, login);

    // Arriving at the chapter starts a load that hasn't come back yet.
    const view = manager.getChapterHighlights("BSB", "GEN", 1);

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
    const manager = createHighlightsManager(os, login);

    await manager.highlightVerse("BSB", "GEN", 1, {
      colorId: "color-5",
      verse: [3, 6],
    });

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
    const manager = createHighlightsManager(os, login);

    await manager.highlightVerse("BSB", "GEN", 1, {
      colorId: "color-6",
      verse: [3, 4],
    });

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
    const manager = createHighlightsManager(os, login);

    await manager.highlightVerses("BSB", "GEN", 1, [2, 3, 6], {
      colorId: "custom",
      customColor: "#ffeeaa",
      customFontColor: "#222222",
    });

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
    const manager = createHighlightsManager(os, login);

    await manager.unhighlightVerse("BSB", "GEN", 1, [3, 5]);

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
    const manager = createHighlightsManager(os, login);

    await manager.unhighlightVerse("BSB", "GEN", 1, 4);

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
    const manager = createHighlightsManager(os, login);

    await manager.unhighlightVerses("BSB", "GEN", 1, [2, 3, 6, 7]);

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
    const manager = createHighlightsManager(os, login);

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
    const manager = createHighlightsManager(os, login);

    await manager.unhighlightVerses("BSB", "GEN", 1, [1, 2]);

    // Nothing on these verses to remove, so the write would have stored an
    // unchanged set.
    expect(recordDataMock).not.toHaveBeenCalled();
  });

  it("highlightVerses() does nothing for an empty verse list, without asking the user to sign in", async () => {
    login.userId.value = null;
    const manager = createHighlightsManager(os, login);

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
    const manager = createHighlightsManager(os, login);

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
      const manager = createHighlightsManager(os, login);

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
      const manager = createHighlightsManager(os, login);

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
      const manager = createHighlightsManager(os, login);

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
      const manager = createHighlightsManager(os, login);

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
      const manager = createHighlightsManager(os, login);

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
      const manager = createHighlightsManager(os, login);

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

    it("highlightVerses() merges into the newly signed-in account's existing highlights instead of replacing them", async () => {
      login.userId.value = null;
      login.login.mockImplementation(async () => {
        login.userId.value = "user-2";
        return { id: "user-2", email: "test@example.com" };
      });
      getDataMock.mockResolvedValue({
        success: true,
        data: { highlights: [{ colorId: "color-1", verse: 1 }] },
      });
      const manager = createHighlightsManager(os, login);

      await manager.highlightVerses("BSB", "GEN", 1, [5], {
        colorId: "color-9",
      });

      expect(getDataMock).toHaveBeenCalledWith(
        "user-2",
        "highlights:BSB/GEN/1"
      );
      expect(getDataMock.mock.invocationCallOrder[0]).toBeLessThan(
        recordDataMock.mock.invocationCallOrder[0]!
      );
      expect(recordDataMock).toHaveBeenCalledWith(
        "user-2",
        "highlights:BSB/GEN/1",
        {
          highlights: [
            { colorId: "color-1", verse: 1 },
            { colorId: "color-9", verse: 5 },
          ],
        },
        { marker: "publicRead:highlights/BSB" }
      );
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
      const manager = createHighlightsManager(os, login);

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

      // user-1's highlights must never be stored in user-2's record.
      expect(recordDataMock).toHaveBeenCalledTimes(1);
      expect(recordDataMock).toHaveBeenCalledWith(
        "user-1",
        "highlights:BSB/GEN/1",
        {
          highlights: [
            { colorId: "user-1-color", verse: 1 },
            { colorId: "color-9", verse: 5 },
          ],
        },
        { marker: "publicRead:highlights/BSB" }
      );
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
      const manager = createHighlightsManager(os, login);

      const unhighlighting = manager.unhighlightVerses("BSB", "GEN", 1, [2]);

      login.userId.value = "user-2";
      user1Load.resolve({
        success: true,
        data: { highlights: [{ colorId: "user-1-color", verse: [1, 3] }] },
      });
      await unhighlighting;

      expect(recordDataMock).toHaveBeenCalledTimes(1);
      expect(recordDataMock).toHaveBeenCalledWith(
        "user-1",
        "highlights:BSB/GEN/1",
        {
          highlights: [
            { colorId: "user-1-color", verse: 1 },
            { colorId: "user-1-color", verse: 3 },
          ],
        },
        { marker: "publicRead:highlights/BSB" }
      );
    });

    it("highlightVerses() warns and does not save when login does not authenticate", async () => {
      login.userId.value = null;
      const manager = createHighlightsManager(os, login);

      await manager.highlightVerses("BSB", "GEN", 1, [5], {
        colorId: "color-9",
      });

      expect(login.login).toHaveBeenCalledTimes(1);
      expect(getDataMock).not.toHaveBeenCalled();
      expect(recordDataMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        "Unable to save highlights: user is not authenticated."
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
