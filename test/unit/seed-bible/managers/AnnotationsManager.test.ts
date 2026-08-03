import {
  createAnnotationsManager,
  type Annotation,
} from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import { createDiscoverManager } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type {
  ReaderTab,
  TabsManager,
} from "@packages/seed-bible/seed-bible/managers/TabsManager";
import { signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

function createCommentAnnotation(
  overrides: Partial<Annotation> = {}
): Annotation {
  return {
    id: "ann-1",
    bookId: "GEN",
    chapterNumber: 1,
    verseNumber: 1,
    data: {
      type: "comment",
      html: "<p>Hello</p>",
    },
    ...overrides,
  };
}

function createMockTab(
  overrides: {
    id?: string;
    bookId?: string | null;
    chapterNumber?: number;
    selectedVerses?: Array<{
      bookId: string;
      chapterNumber: number;
      verse: { number: number };
    }>;
  } = {}
): ReaderTab {
  return {
    id: overrides.id ?? "tab-1",
    readingState: {
      bookId: signal(overrides.bookId === undefined ? "GEN" : overrides.bookId),
      chapterNumber: signal(overrides.chapterNumber ?? 1),
      selectedVerses: signal(overrides.selectedVerses ?? []),
    },
  } as unknown as ReaderTab;
}

function createMockTabsManager(tab: ReaderTab | null): TabsManager {
  return {
    tabs: signal(tab ? [tab] : []),
    selectedTabId: signal(tab?.id ?? null),
  } as unknown as TabsManager;
}

describe("AnnotationsManager", () => {
  let recordDataMock: Mock;
  let eraseDataMock: Mock;
  let listDataByMarkerMock: Mock;
  let login: Mocked<LoginManager>;
  let os: CasualOSManager;
  let tab: ReaderTab;
  let tabs: TabsManager;
  let discover: ReturnType<typeof createDiscoverManager>;

  beforeEach(() => {
    os = CasualOSManager();
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue({ success: true } as any);
    eraseDataMock = vi
      .spyOn(os, "eraseData")
      .mockResolvedValue({ success: true } as never);
    listDataByMarkerMock = vi
      .spyOn(os, "listDataByMarker")
      .mockResolvedValue({ success: true, items: [] } as never);

    login = {
      authBot: signal(null),
      sessionEnded: signal(null),
      userId: signal("user-1"),
      connectionId: "conn-1",
      profile: signal(null),
      cachedProfile: signal(null),
      localConfig: signal({}),
      profilePromise: null,
      isProfileLoading: signal(false),
      isSavingProfile: signal(false),
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      updateProfile: vi.fn().mockResolvedValue(undefined),
      getUserProfile: vi.fn().mockResolvedValue({ name: "" }),
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

    tab = createMockTab();
    tabs = createMockTabsManager(tab);
    discover = createDiscoverManager();
  });

  function createManager() {
    return createAnnotationsManager(os, login, tabs, discover);
  }

  it("saveAnnotation() stores annotation using default marker", async () => {
    const manager = createManager();
    const annotation = createCommentAnnotation();

    const saved = await manager.saveAnnotation(annotation);

    expect(saved).toEqual(annotation);
    expect(recordDataMock).toHaveBeenCalledWith("user-1", "ann-1", annotation, {
      marker: "publicRead:annotations/GEN/1",
    });
  });

  it("saveAnnotation() supports custom record and marker group", async () => {
    const manager = createManager();
    const annotation = createCommentAnnotation({ id: "ann-2" });

    await manager.saveAnnotation(annotation, {
      recordName: "shared-record",
      group: "team_notes",
    });

    expect(recordDataMock).toHaveBeenCalledWith(
      "shared-record",
      "ann-2",
      annotation,
      {
        marker: "publicRead:team_notes/GEN/1",
      }
    );
  });

  it("saveAnnotation() logs in when no user is authenticated", async () => {
    login.userId.value = null;
    login.login.mockImplementation(async () => {
      login.userId.value = "user-after-login";
      return { id: "user-after-login", email: "test@example.com" };
    });
    const manager = createManager();

    await manager.saveAnnotation(createCommentAnnotation());

    expect(login.login).toHaveBeenCalledTimes(1);
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-after-login",
      "ann-1",
      expect.any(Object),
      {
        marker: "publicRead:annotations/GEN/1",
      }
    );
  });

  it("deleteAnnotation() deletes the record by annotation id", async () => {
    const manager = createManager();

    await manager.deleteAnnotation("ann-5");

    expect(eraseDataMock).toHaveBeenCalledWith("user-1", "ann-5");
  });

  it("deleteAnnotation() supports record names", async () => {
    const manager = createManager();

    await manager.deleteAnnotation("ann-5", {
      recordName: "shared-record",
    });

    expect(eraseDataMock).toHaveBeenCalledWith("shared-record", "ann-5");
  });

  it("listAnnotationsForChapter() paginates and sorts results", async () => {
    listDataByMarkerMock
      .mockResolvedValueOnce({
        success: true,
        items: [
          {
            address: "a1",
            data: createCommentAnnotation({ id: "b", order: 4 }),
          },
          {
            address: "a2",
            data: createCommentAnnotation({ id: "a", order: 1 }),
          },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        items: [
          {
            address: "a3",
            data: createCommentAnnotation({ id: "c" }),
          },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        items: [],
      });

    const manager = createManager();
    const annotations = await manager.listAnnotationsForChapter("GEN", 1);

    expect(listDataByMarkerMock).toHaveBeenNthCalledWith(
      1,
      "user-1",
      "publicRead:annotations/GEN/1",
      undefined
    );
    expect(listDataByMarkerMock).toHaveBeenNthCalledWith(
      2,
      "user-1",
      "publicRead:annotations/GEN/1",
      "a2"
    );
    expect(listDataByMarkerMock).toHaveBeenNthCalledWith(
      3,
      "user-1",
      "publicRead:annotations/GEN/1",
      "a3"
    );

    expect(annotations.map((a) => a.id)).toEqual(["a", "b", "c"]);
  });

  it("listAnnotationsForChapter() skips invalid records", async () => {
    listDataByMarkerMock
      .mockResolvedValueOnce({
        success: true,
        items: [
          {
            address: "a1",
            data: createCommentAnnotation({ id: "valid" }),
          },
          {
            address: "a2",
            data: {
              id: "invalid",
              bookId: "GEN",
              chapterNumber: 1,
              data: {
                type: "unsupported",
              },
            },
          },
        ],
      })
      .mockResolvedValueOnce({ success: true, items: [] });

    const manager = createManager();
    const annotations = await manager.listAnnotationsForChapter("GEN", 1);

    expect(annotations).toHaveLength(1);
    expect(annotations[0]?.id).toBe("valid");
  });

  it("operations throw when login cannot resolve a user record", async () => {
    login.userId.value = null;
    login.login.mockResolvedValue({
      id: "user-after-login",
      email: "test@example.com",
    });
    const manager = createManager();

    await expect(
      manager.saveAnnotation(createCommentAnnotation())
    ).rejects.toThrow("Unable to resolve annotation record");
    await expect(manager.deleteAnnotation("ann-1")).rejects.toThrow(
      "Unable to resolve annotation record"
    );
    await expect(manager.listAnnotationsForChapter("GEN", 1)).rejects.toThrow(
      "Unable to resolve annotation record"
    );
  });

  it("save/delete/list throw when os call fails", async () => {
    recordDataMock.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    });
    eraseDataMock.mockResolvedValueOnce({
      success: false,
      errorCode: "not_allowed",
    });
    listDataByMarkerMock.mockResolvedValueOnce({
      success: false,
      errorCode: "server_error",
    });

    const manager = createManager();

    await expect(
      manager.saveAnnotation(createCommentAnnotation())
    ).rejects.toThrow("Error saving annotation: server_error");
    await expect(manager.deleteAnnotation("ann-1")).rejects.toThrow(
      "Error deleting annotation: not_allowed"
    );
    await expect(manager.listAnnotationsForChapter("GEN", 1)).rejects.toThrow(
      "Error listing annotations: server_error"
    );
  });

  describe("getAnnotationsForChapter", () => {
    it("is empty when signed out", () => {
      login.userId.value = null;
      const manager = createManager();

      expect(manager.getAnnotationsForChapter("GEN", 1).value).toEqual([]);
      expect(listDataByMarkerMock).not.toHaveBeenCalled();
    });

    it("lazily loads via listAnnotationsForChapter on first access", async () => {
      listDataByMarkerMock
        .mockResolvedValueOnce({
          success: true,
          items: [
            { address: "a1", data: createCommentAnnotation({ id: "a1" }) },
          ],
        })
        .mockResolvedValueOnce({ success: true, items: [] });

      const manager = createManager();
      const view = manager.getAnnotationsForChapter("GEN", 1);
      expect(view.value).toEqual([]);

      await vi.waitFor(() => {
        expect(view.value.map((a) => a.id)).toEqual(["a1"]);
      });
    });

    it("returns the same signal identity for repeated calls with the same args", () => {
      const manager = createManager();
      const first = manager.getAnnotationsForChapter("GEN", 1);
      const second = manager.getAnnotationsForChapter("GEN", 1);
      expect(first).toBe(second);
    });

    it("reflects an account switch instead of leaking the previous account's data", async () => {
      listDataByMarkerMock.mockImplementation(
        async (recordName: string, _marker: string, lastAddress?: string) => {
          // Pagination terminates on the second call (`lastAddress` set) —
          // real behavior when there's exactly one page of results.
          if (lastAddress) {
            return { success: true, items: [] };
          }
          return {
            success: true,
            items:
              recordName === "user-1"
                ? [
                    {
                      address: "a1",
                      data: createCommentAnnotation({ id: "user-1-note" }),
                    },
                  ]
                : [
                    {
                      address: "a2",
                      data: createCommentAnnotation({ id: "user-2-note" }),
                    },
                  ],
          };
        }
      );

      const manager = createManager();
      const view = manager.getAnnotationsForChapter("GEN", 1);

      await vi.waitFor(() => {
        expect(view.value.map((a) => a.id)).toEqual(["user-1-note"]);
      });

      login.userId.value = "user-2";

      await vi.waitFor(() => {
        expect(view.value.map((a) => a.id)).toEqual(["user-2-note"]);
      });
    });
  });

  describe("createNewAnnotation", () => {
    it("no-ops and warns when signed out and login is declined", async () => {
      login.userId.value = null;
      login.login.mockResolvedValue(undefined);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const manager = createManager();

      await manager.createNewAnnotation();

      expect(manager.editingAnnotation.value).toBeNull();
      expect(warn).toHaveBeenCalled();
    });

    it("no-ops and warns when there is no active tab", async () => {
      tabs = createMockTabsManager(null);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const manager = createManager();

      await manager.createNewAnnotation();

      expect(manager.editingAnnotation.value).toBeNull();
      expect(warn).toHaveBeenCalled();
    });

    it("no-ops and warns when the active tab has no chapter loaded", async () => {
      tab = createMockTab({ bookId: null });
      tabs = createMockTabsManager(tab);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const manager = createManager();

      await manager.createNewAnnotation();

      expect(manager.editingAnnotation.value).toBeNull();
      expect(warn).toHaveBeenCalled();
    });

    it("starts a whole-chapter draft on the active tab's chapter and switches the view", async () => {
      tab = createMockTab({ bookId: "EXO", chapterNumber: 3 });
      tabs = createMockTabsManager(tab);
      const manager = createManager();

      await manager.createNewAnnotation();

      const draft = manager.editingAnnotation.value;
      expect(draft?.bookId).toBe("EXO");
      expect(draft?.chapterNumber).toBe(3);
      expect(draft?.verseNumber).toBeNull();
      expect(draft?.endVerseNumber).toBeNull();
      expect(draft?.data).toMatchObject({ type: "comment", html: "" });
      expect(discover.view.value).toBe("create_annotation");
    });

    it("pre-fills verse targeting from the reader's current text selection", async () => {
      tab = createMockTab({
        bookId: "GEN",
        chapterNumber: 1,
        selectedVerses: [
          { bookId: "GEN", chapterNumber: 1, verse: { number: 5 } },
          { bookId: "GEN", chapterNumber: 1, verse: { number: 7 } },
          { bookId: "GEN", chapterNumber: 1, verse: { number: 6 } },
        ],
      });
      tabs = createMockTabsManager(tab);
      const manager = createManager();

      await manager.createNewAnnotation();

      const draft = manager.editingAnnotation.value;
      expect(draft?.verseNumber).toBe(5);
      expect(draft?.endVerseNumber).toBe(7);
    });

    it("ignores selected verses that belong to a different chapter", async () => {
      tab = createMockTab({
        bookId: "GEN",
        chapterNumber: 1,
        selectedVerses: [
          { bookId: "GEN", chapterNumber: 2, verse: { number: 5 } },
        ],
      });
      tabs = createMockTabsManager(tab);
      const manager = createManager();

      await manager.createNewAnnotation();

      const draft = manager.editingAnnotation.value;
      expect(draft?.verseNumber).toBeNull();
      expect(draft?.endVerseNumber).toBeNull();
    });
  });

  describe("editAnnotation", () => {
    it("copies the annotation into editingAnnotation and switches the view", () => {
      const manager = createManager();
      const annotation = createCommentAnnotation({ id: "existing" });

      manager.editAnnotation(annotation);

      expect(manager.editingAnnotation.value).toEqual(annotation);
      expect(manager.editingAnnotation.value).not.toBe(annotation);
      expect(discover.view.value).toBe("create_annotation");
    });
  });

  describe("saveEditingAnnotation", () => {
    it("no-ops when nothing is being edited", async () => {
      const manager = createManager();

      await manager.saveEditingAnnotation();

      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("persists, upserts into the chapter cache, clears the draft, and returns to discover", async () => {
      const manager = createManager();
      manager.editAnnotation(createCommentAnnotation({ id: "a1" }));

      await manager.saveEditingAnnotation();

      expect(recordDataMock).toHaveBeenCalledTimes(1);
      expect(manager.editingAnnotation.value).toBeNull();
      expect(discover.view.value).toBe("discover");
      expect(
        manager.getAnnotationsForChapter("GEN", 1).value.map((a) => a.id)
      ).toEqual(["a1"]);
    });

    it("leaves the draft intact and rethrows when saving fails", async () => {
      recordDataMock.mockResolvedValueOnce({
        success: false,
        errorCode: "server_error",
      });
      const manager = createManager();
      manager.editAnnotation(createCommentAnnotation({ id: "a1" }));

      await expect(manager.saveEditingAnnotation()).rejects.toThrow();

      expect(manager.editingAnnotation.value?.id).toBe("a1");
    });
  });

  describe("cancelEditingAnnotation", () => {
    it("discards the draft and returns to discover", () => {
      const manager = createManager();
      manager.editAnnotation(createCommentAnnotation());

      manager.cancelEditingAnnotation();

      expect(manager.editingAnnotation.value).toBeNull();
      expect(discover.view.value).toBe("discover");
    });
  });

  describe("deleteAnnotationAndRefresh", () => {
    it("removes the annotation from the chapter cache", async () => {
      const manager = createManager();
      manager.editAnnotation(createCommentAnnotation({ id: "a1" }));
      await manager.saveEditingAnnotation();

      await manager.deleteAnnotationAndRefresh(
        createCommentAnnotation({ id: "a1" })
      );

      expect(eraseDataMock).toHaveBeenCalledWith("user-1", "a1");
      expect(manager.getAnnotationsForChapter("GEN", 1).value).toEqual([]);
    });

    it("clears editingAnnotation when the deleted annotation was open", async () => {
      const manager = createManager();
      const annotation = createCommentAnnotation({ id: "a1" });
      manager.editAnnotation(annotation);

      await manager.deleteAnnotationAndRefresh(annotation);

      expect(manager.editingAnnotation.value).toBeNull();
      expect(discover.view.value).toBe("discover");
    });

    it("rethrows on failure", async () => {
      eraseDataMock.mockResolvedValueOnce({
        success: false,
        errorCode: "not_allowed",
      });
      const manager = createManager();

      await expect(
        manager.deleteAnnotationAndRefresh(createCommentAnnotation())
      ).rejects.toThrow();
    });
  });
});
