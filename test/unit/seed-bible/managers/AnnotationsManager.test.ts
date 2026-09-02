import {
  annotationVerseNumbers,
  annotationListHasOtherAuthors,
  createAnnotationsManager,
  formatAnnotationVerseNumbers,
  groupAnnotationsByVerseRange,
  type Annotation,
} from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import {
  createInMemoryAnnotationStore,
  LOCAL_OWNER,
  syncedRow,
  type OfflineAnnotationStore,
} from "@packages/seed-bible/seed-bible/managers/OfflineAnnotationStore";
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

function createMockTabsManager(
  tab: ReaderTab | null,
  ...moreTabs: ReaderTab[]
): TabsManager {
  return {
    tabs: signal(tab ? [tab, ...moreTabs] : []),
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
    // The sync engine reads the server's copy before writing, so this has to be
    // stubbed or it reaches the real records client.
    vi.spyOn(os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
    } as never);

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

    expect(saved).toEqual({
      ...annotation,
      data: {
        ...annotation.data,
        createdAtMs: expect.any(Number),
        updatedAtMs: expect.any(Number),
      },
    });
    expect(recordDataMock).toHaveBeenCalledWith("user-1", "ann-1", saved, {
      marker: "publicRead:annotations/GEN/1",
    });
  });

  it("saveAnnotation() stamps timestamps even when the caller supplies none", async () => {
    const manager = createManager();

    // The conflict check has nothing to compare without these, so every path
    // that persists an annotation has to set them — not just the editor flow.
    const saved = await manager.saveAnnotation(createCommentAnnotation());

    expect(saved.data.createdAtMs).toEqual(expect.any(Number));
    expect(saved.data.updatedAtMs).toEqual(expect.any(Number));
  });

  it("saveAnnotation() keeps an existing createdAtMs and refreshes updatedAtMs", async () => {
    const manager = createManager();
    const annotation = createCommentAnnotation({
      data: { type: "comment", html: "<p>Hi</p>", createdAtMs: 1000 },
    });

    const saved = await manager.saveAnnotation(annotation);

    expect(saved.data.createdAtMs).toBe(1000);
    expect(saved.data.updatedAtMs).toBeGreaterThan(1000);
  });

  it("saveAnnotation() supports custom record and marker group", async () => {
    const manager = createManager();
    const annotation = createCommentAnnotation({ id: "ann-2" });

    const saved = await manager.saveAnnotation(annotation, {
      recordName: "shared-record",
      group: "team_notes",
    });

    expect(recordDataMock).toHaveBeenCalledWith(
      "shared-record",
      "ann-2",
      saved,
      {
        marker: "publicRead:team_notes/GEN/1",
      }
    );
  });

  it("saveAnnotation() fails rather than prompting to log in when signed out", async () => {
    login.userId.value = null;
    const manager = createManager();

    // Prompting for a sign-in mid-save is wrong: offline the request can't
    // succeed anyway, and with a local store the note belongs on the device
    // until the user chooses to sign in. The prompt lives in
    // `createNewAnnotation`, where the user is present and expecting it.
    await expect(
      manager.saveAnnotation(createCommentAnnotation())
    ).rejects.toThrow("User is not authenticated");
    expect(login.login).not.toHaveBeenCalled();
    expect(recordDataMock).not.toHaveBeenCalled();
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

  describe("recordOverride", () => {
    function createManagerWithOverride(recordOverride: string) {
      return createAnnotationsManager(
        os,
        login,
        tabs,
        discover,
        recordOverride
      );
    }

    it("hasRecordOverride is false with no override, true with one", () => {
      expect(createManager().hasRecordOverride).toBe(false);
      expect(
        createManagerWithOverride("override-record").hasRecordOverride
      ).toBe(true);
    });

    it("saveAnnotation() uses the record override instead of the signed-in user's id", async () => {
      const manager = createManagerWithOverride("override-record");
      const annotation = createCommentAnnotation();

      const saved = await manager.saveAnnotation(annotation);

      expect(recordDataMock).toHaveBeenCalledWith(
        "override-record",
        "ann-1",
        saved,
        { marker: "publicRead:annotations/GEN/1" }
      );
    });

    it("saveAnnotation() still prefers an explicit query.recordName over the record override", async () => {
      const manager = createManagerWithOverride("override-record");
      const annotation = createCommentAnnotation();

      const saved = await manager.saveAnnotation(annotation, {
        recordName: "explicit-record",
      });

      expect(recordDataMock).toHaveBeenCalledWith(
        "explicit-record",
        "ann-1",
        saved,
        { marker: "publicRead:annotations/GEN/1" }
      );
    });

    it("saveAnnotation() does not require a signed-in user when a record override is set", async () => {
      login.userId.value = null;
      const manager = createManagerWithOverride("override-record");

      await manager.saveAnnotation(createCommentAnnotation());

      expect(login.login).not.toHaveBeenCalled();
      expect(recordDataMock).toHaveBeenCalledWith(
        "override-record",
        "ann-1",
        expect.any(Object),
        { marker: "publicRead:annotations/GEN/1" }
      );
    });

    it("deleteAnnotation() uses the record override instead of the signed-in user's id", async () => {
      const manager = createManagerWithOverride("override-record");

      await manager.deleteAnnotation("ann-5");

      expect(eraseDataMock).toHaveBeenCalledWith("override-record", "ann-5");
    });

    it("listAnnotationsForChapter() uses the record override instead of the signed-in user's id", async () => {
      const manager = createManagerWithOverride("override-record");

      await manager.listAnnotationsForChapter("GEN", 1);

      expect(listDataByMarkerMock).toHaveBeenCalledWith(
        "override-record",
        "publicRead:annotations/GEN/1",
        undefined
      );
    });

    it("getAnnotationsForChapter() loads via the record override, not the signed-in user's id", async () => {
      listDataByMarkerMock
        .mockResolvedValueOnce({
          success: true,
          items: [
            {
              address: "a1",
              data: createCommentAnnotation({ id: "override-note" }),
            },
          ],
        })
        .mockResolvedValueOnce({ success: true, items: [] });

      const manager = createManagerWithOverride("override-record");
      const view = manager.getAnnotationsForChapter("GEN", 1);
      expect(view.value).toEqual([]);

      await vi.waitFor(() => {
        expect(view.value.map((a) => a.id)).toEqual(["override-note"]);
      });

      expect(listDataByMarkerMock).toHaveBeenCalledWith(
        "override-record",
        "publicRead:annotations/GEN/1",
        undefined
      );
    });

    it("getAnnotationsForChapter() surfaces the override record's annotations when signed out, instead of an empty array", async () => {
      login.userId.value = null;
      listDataByMarkerMock
        .mockResolvedValueOnce({
          success: true,
          items: [
            {
              address: "a1",
              data: createCommentAnnotation({ id: "override-note" }),
            },
          ],
        })
        .mockResolvedValueOnce({ success: true, items: [] });

      const manager = createManagerWithOverride("override-record");
      const view = manager.getAnnotationsForChapter("GEN", 1);

      await vi.waitFor(() => {
        expect(view.value.map((a) => a.id)).toEqual(["override-note"]);
      });
    });

    it("saveEditingAnnotation() upserts into the override-keyed cache while signed out, so getAnnotationsForChapter reflects the save immediately", async () => {
      login.userId.value = null;
      const manager = createManagerWithOverride("override-record");
      manager.editAnnotation(createCommentAnnotation({ id: "a1" }));

      await manager.saveEditingAnnotation();

      expect(login.login).not.toHaveBeenCalled();
      expect(
        manager.getAnnotationsForChapter("GEN", 1).value.map((a) => a.id)
      ).toEqual(["a1"]);
    });
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
      login.login.mockResolvedValue(null);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const manager = createManager();

      await manager.createNewAnnotation();

      expect(manager.editingAnnotation.value).toBeNull();
      expect(warn).toHaveBeenCalled();
    });

    it("does not prompt to sign in while offline, where it could only fail", async () => {
      login.userId.value = null;
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const manager = createManager();
      window.dispatchEvent(new Event("offline"));

      await manager.createNewAnnotation();

      // No store here (jsdom has no IndexedDB), so there is nowhere to put the
      // note either — say so rather than opening a sign-in that cannot work.
      expect(login.login).not.toHaveBeenCalled();
      expect(manager.editingAnnotation.value).toBeNull();
      expect(warn).toHaveBeenCalled();
      manager.sync.dispose();
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
      expect(draft?.verseNumbers).toBeNull();
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
      expect(draft?.verseNumbers).toEqual([5, 6, 7]);
    });

    it("preserves gaps in a non-contiguous selection instead of collapsing to a range", async () => {
      tab = createMockTab({
        bookId: "GEN",
        chapterNumber: 1,
        selectedVerses: [
          { bookId: "GEN", chapterNumber: 1, verse: { number: 3 } },
          { bookId: "GEN", chapterNumber: 1, verse: { number: 7 } },
          { bookId: "GEN", chapterNumber: 1, verse: { number: 5 } },
          { bookId: "GEN", chapterNumber: 1, verse: { number: 4 } },
        ],
      });
      tabs = createMockTabsManager(tab);
      const manager = createManager();

      await manager.createNewAnnotation();

      const draft = manager.editingAnnotation.value;
      expect(draft?.verseNumber).toBe(3);
      expect(draft?.endVerseNumber).toBe(7);
      expect(draft?.verseNumbers).toEqual([3, 4, 5, 7]);
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
      expect(draft?.verseNumbers).toBeNull();
    });

    it("keeps a new draft's verse targeting live-synced to the selection while composing", async () => {
      tab = createMockTab({ bookId: "GEN", chapterNumber: 1 });
      tabs = createMockTabsManager(tab);
      const manager = createManager();

      await manager.createNewAnnotation();
      expect(manager.editingAnnotation.value?.verseNumber).toBeNull();

      tab.readingState.selectedVerses.value = [
        { bookId: "GEN", chapterNumber: 1, verse: { number: 5 } },
      ] as never;

      expect(manager.editingAnnotation.value?.verseNumber).toBe(5);
      expect(manager.editingAnnotation.value?.endVerseNumber).toBeNull();
      expect(manager.editingAnnotation.value?.verseNumbers).toEqual([5]);

      tab.readingState.selectedVerses.value = [
        { bookId: "GEN", chapterNumber: 1, verse: { number: 3 } },
        { bookId: "GEN", chapterNumber: 1, verse: { number: 7 } },
        { bookId: "GEN", chapterNumber: 1, verse: { number: 5 } },
      ] as never;

      expect(manager.editingAnnotation.value?.verseNumber).toBe(3);
      expect(manager.editingAnnotation.value?.endVerseNumber).toBe(7);
      expect(manager.editingAnnotation.value?.verseNumbers).toEqual([3, 5, 7]);

      tab.readingState.selectedVerses.value = [];

      expect(manager.editingAnnotation.value?.verseNumber).toBeNull();
      expect(manager.editingAnnotation.value?.endVerseNumber).toBeNull();
      expect(manager.editingAnnotation.value?.verseNumbers).toBeNull();
    });

    it("keeps syncing against the tab the draft was started on after switching the active tab", async () => {
      const tabA = createMockTab({
        id: "tab-1",
        bookId: "GEN",
        chapterNumber: 1,
        selectedVerses: [
          { bookId: "GEN", chapterNumber: 1, verse: { number: 5 } },
        ],
      });
      const tabB = createMockTab({ id: "tab-2", bookId: "EXO" });
      tabs = createMockTabsManager(tabA, tabB);
      const manager = createManager();

      await manager.createNewAnnotation();
      expect(manager.editingAnnotation.value?.verseNumber).toBe(5);

      tabs.selectedTabId.value = "tab-2";

      expect(manager.editingAnnotation.value?.verseNumber).toBe(5);
      expect(manager.editingAnnotation.value?.endVerseNumber).toBeNull();
      expect(manager.editingAnnotation.value?.verseNumbers).toEqual([5]);

      tabA.readingState.selectedVerses.value = [
        { bookId: "GEN", chapterNumber: 1, verse: { number: 5 } },
        { bookId: "GEN", chapterNumber: 1, verse: { number: 6 } },
      ] as never;

      expect(manager.editingAnnotation.value?.verseNumber).toBe(5);
      expect(manager.editingAnnotation.value?.endVerseNumber).toBe(6);
    });

    it("stops syncing once the new draft is saved", async () => {
      tab = createMockTab({
        bookId: "GEN",
        chapterNumber: 1,
        selectedVerses: [
          { bookId: "GEN", chapterNumber: 1, verse: { number: 5 } },
        ],
      });
      tabs = createMockTabsManager(tab);
      const manager = createManager();

      await manager.createNewAnnotation();
      await manager.saveEditingAnnotation();

      tab.readingState.selectedVerses.value = [
        { bookId: "GEN", chapterNumber: 1, verse: { number: 9 } },
      ] as never;

      expect(manager.editingAnnotation.value).toBeNull();
    });

    it("stops syncing once the new draft is cancelled", async () => {
      tab = createMockTab({
        bookId: "GEN",
        chapterNumber: 1,
        selectedVerses: [
          { bookId: "GEN", chapterNumber: 1, verse: { number: 5 } },
        ],
      });
      tabs = createMockTabsManager(tab);
      const manager = createManager();

      await manager.createNewAnnotation();
      manager.cancelEditingAnnotation();

      tab.readingState.selectedVerses.value = [
        { bookId: "GEN", chapterNumber: 1, verse: { number: 9 } },
      ] as never;

      expect(manager.editingAnnotation.value).toBeNull();
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

    it("does not live-sync an existing annotation's verse targeting to the reader's selection", () => {
      tab = createMockTab({
        bookId: "GEN",
        chapterNumber: 1,
        selectedVerses: [
          { bookId: "GEN", chapterNumber: 1, verse: { number: 9 } },
        ],
      });
      tabs = createMockTabsManager(tab);
      const manager = createManager();
      const annotation = createCommentAnnotation({
        id: "existing",
        bookId: "GEN",
        chapterNumber: 1,
        verseNumber: 3,
        endVerseNumber: 5,
      });

      manager.editAnnotation(annotation);

      tab.readingState.selectedVerses.value = [
        { bookId: "GEN", chapterNumber: 1, verse: { number: 12 } },
      ] as never;

      expect(manager.editingAnnotation.value?.verseNumber).toBe(3);
      expect(manager.editingAnnotation.value?.endVerseNumber).toBe(5);
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

  // The default store is IndexedDB, which jsdom doesn't have — so the tests
  // above all exercise the no-store fallback that talks straight to the server.
  // These inject the in-memory store to cover the offline paths.
  describe("with a local store", () => {
    let store: OfflineAnnotationStore;

    beforeEach(() => {
      store = createInMemoryAnnotationStore();
    });

    function createOfflineManager() {
      const manager = createAnnotationsManager(
        os,
        login,
        tabs,
        discover,
        undefined,
        { store }
      );
      offlineManagers.push(manager);
      return manager;
    }

    const offlineManagers: ReturnType<typeof createAnnotationsManager>[] = [];
    afterEach(() => {
      for (const manager of offlineManagers) {
        manager.sync.dispose();
      }
      offlineManagers.length = 0;
    });

    /** Lets any in-flight load finish before asserting on it. */
    function settle() {
      return new Promise((resolve) => setTimeout(resolve, 0));
    }

    /** Puts the manager in the state of having no connection. */
    function goOffline() {
      window.dispatchEvent(new Event("offline"));
    }

    /**
     * Makes `listDataByMarker` return one page of annotations and then stop.
     *
     * `listFromServer` pages until it sees an empty response, so a plain
     * `mockResolvedValue` of a non-empty page would loop forever.
     */
    function serverList(annotations: Annotation[]) {
      listDataByMarkerMock.mockImplementation(
        async (_record: string, _marker: string, lastAddress?: string) =>
          lastAddress
            ? { success: true, items: [] }
            : {
                success: true,
                items: annotations.map((a) => ({ address: a.id, data: a })),
              }
      );
    }

    it("saves a note with no connection instead of failing", async () => {
      const manager = createOfflineManager();
      goOffline();

      const saved = await manager.saveAnnotation(
        createCommentAnnotation({ id: "offline-1" })
      );

      // Resolving is what lets the composer close cleanly rather than showing
      // an error the user can do nothing about.
      expect(saved.id).toBe("offline-1");
      expect(recordDataMock).not.toHaveBeenCalled();
      expect((await store.get("user-1", "offline-1"))?.pendingOp).toBe(
        "upsert"
      );
    });

    it("shows a note saved offline when the chapter is read back", async () => {
      const manager = createOfflineManager();
      goOffline();
      await manager.saveAnnotation(
        createCommentAnnotation({ id: "offline-1" })
      );

      const listed = await manager.listAnnotationsForChapter("GEN", 1);

      expect(listed.map((a) => a.id)).toEqual(["offline-1"]);
      expect(listDataByMarkerMock).not.toHaveBeenCalled();
    });

    it("coalesces repeated offline edits into one pending change", async () => {
      const manager = createOfflineManager();
      goOffline();
      const annotation = createCommentAnnotation({ id: "offline-1" });

      await manager.saveAnnotation(annotation);
      await manager.saveAnnotation({
        ...annotation,
        data: { ...annotation.data, html: "<p>second</p>" },
      });
      await manager.saveAnnotation({
        ...annotation,
        data: { ...annotation.data, html: "<p>third</p>" },
      });

      expect(await store.listPending("user-1")).toHaveLength(1);
      expect(
        (await store.get("user-1", "offline-1"))?.annotation?.data.html
      ).toBe("<p>third</p>");
    });

    it("records a tombstone when deleting a note the server knows about", async () => {
      const manager = createOfflineManager();
      // Pretend the server already has it, so there is something to delete.
      await store.put(
        syncedRow("user-1", createCommentAnnotation({ id: "known" }))
      );
      goOffline();

      await manager.deleteAnnotation("known");

      const row = await store.get("user-1", "known");
      expect(row?.deleted).toBe(true);
      expect(row?.pendingOp).toBe("delete");
      expect(eraseDataMock).not.toHaveBeenCalled();
    });

    it("hides a note deleted offline from the chapter listing", async () => {
      const manager = createOfflineManager();
      await store.put(
        syncedRow("user-1", createCommentAnnotation({ id: "known" }))
      );
      goOffline();

      await manager.deleteAnnotation("known");

      expect(await manager.listAnnotationsForChapter("GEN", 1)).toEqual([]);
    });

    it("costs no requests at all to create and then delete a note offline", async () => {
      const manager = createOfflineManager();
      goOffline();

      await manager.saveAnnotation(
        createCommentAnnotation({ id: "throwaway" })
      );
      await manager.deleteAnnotation("throwaway");

      // It never reached the server, so there is nothing to tombstone.
      expect(await store.get("user-1", "throwaway")).toBeNull();
      expect(await store.listPending("user-1")).toEqual([]);
      expect(recordDataMock).not.toHaveBeenCalled();
      expect(eraseDataMock).not.toHaveBeenCalled();
    });

    it("pushes offline work once the connection returns", async () => {
      const manager = createOfflineManager();
      goOffline();
      await manager.saveAnnotation(
        createCommentAnnotation({ id: "offline-1" })
      );

      window.dispatchEvent(new Event("online"));
      await manager.sync.sync();

      expect(recordDataMock).toHaveBeenCalledWith(
        "user-1",
        "offline-1",
        expect.objectContaining({ id: "offline-1" }),
        { marker: "publicRead:annotations/GEN/1" }
      );
      expect(await store.listPending("user-1")).toEqual([]);
    });

    it("writes a signed-out note to the local bucket", async () => {
      login.userId.value = null;
      const manager = createOfflineManager();

      await manager.saveAnnotation(createCommentAnnotation({ id: "draft" }));

      expect(await store.get(LOCAL_OWNER, "draft")).not.toBeNull();
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("starts a signed-out draft offline without prompting to sign in", async () => {
      login.userId.value = null;
      const manager = createOfflineManager();
      goOffline();

      await manager.createNewAnnotation();

      // With somewhere local to put it, the note is drafted straight away and
      // becomes the account's when the user signs in later.
      expect(login.login).not.toHaveBeenCalled();
      expect(manager.editingAnnotation.value).not.toBeNull();
    });

    it("shows signed-out drafts in the chapter listing", async () => {
      login.userId.value = null;
      const manager = createOfflineManager();
      await manager.saveAnnotation(createCommentAnnotation({ id: "draft" }));

      const listed = await manager.listAnnotationsForChapter("GEN", 1);

      expect(listed.map((a) => a.id)).toEqual(["draft"]);
      // `LOCAL_OWNER` is not a record name, so nothing should be asked of the
      // server on this path.
      expect(listDataByMarkerMock).not.toHaveBeenCalled();
    });

    it("retries a failed load once the connection returns, instead of caching it as empty", async () => {
      // A refresh failure leaves the mirror empty but unsettled. The old
      // behaviour settled it, so the chapter read as "you have no annotations"
      // for the rest of the page's life even after the connection came back.
      listDataByMarkerMock.mockRejectedValue(new Error("offline"));
      const manager = createOfflineManager();

      const view = manager.getAnnotationsForChapter("GEN", 1);
      expect(view.value).toEqual([]);
      // Waits for the failed load to finish, not merely to start.
      await settle();
      expect(listDataByMarkerMock).toHaveBeenCalledTimes(1);

      // Reading again must not spin up another request while still failing —
      // reads happen inside a `computed`, so retrying per read would spin.
      expect(view.value).toEqual([]);
      expect(view.value).toEqual([]);
      expect(listDataByMarkerMock).toHaveBeenCalledTimes(1);

      serverList([createCommentAnnotation({ id: "later" })]);
      goOffline();
      window.dispatchEvent(new Event("online"));

      await vi.waitFor(() =>
        expect(view.value.map((a) => a.id)).toEqual(["later"])
      );
    });

    it("keeps an unsent edit when the server list is refreshed", async () => {
      const manager = createOfflineManager();
      const mine = createCommentAnnotation({
        id: "ann-1",
        data: { type: "comment", html: "<p>mine</p>" },
      });
      goOffline();
      await manager.saveAnnotation(mine);
      window.dispatchEvent(new Event("online"));

      serverList([
        createCommentAnnotation({
          id: "ann-1",
          data: { type: "comment", html: "<p>theirs</p>" },
        }),
      ]);

      const listed = await manager.listAnnotationsForChapter("GEN", 1);

      // The unsent edit wins locally; deciding between the two is the sync
      // pass's job, not the refresh's.
      expect(listed[0]?.data.html).toBe("<p>mine</p>");
    });

    it("drops a note the server no longer has when refreshing", async () => {
      const manager = createOfflineManager();
      await store.put(
        syncedRow("user-1", createCommentAnnotation({ id: "gone" }))
      );
      serverList([]);

      const listed = await manager.listAnnotationsForChapter("GEN", 1);

      expect(listed).toEqual([]);
      expect(await store.get("user-1", "gone")).toBeNull();
    });

    it("still writes straight to the server for another account's record", async () => {
      const manager = createOfflineManager();

      await manager.saveAnnotation(createCommentAnnotation({ id: "shared" }), {
        recordName: "shared-record",
        group: "team_notes",
      });

      // Not this device's note to queue.
      expect(recordDataMock).toHaveBeenCalledWith(
        "shared-record",
        "shared",
        expect.anything(),
        { marker: "publicRead:team_notes/GEN/1" }
      );
      expect(await store.get("user-1", "shared")).toBeNull();
    });

    it("files a save under the account it started as, not whoever signs in next", async () => {
      const manager = createOfflineManager();
      goOffline();
      manager.editAnnotation(createCommentAnnotation({ id: "alice-note" }));

      // The account changes while the save is mid-flight (two IndexedDB round
      // trips). The durable row was always written correctly; it was the UI
      // cache that re-read the *current* login and filed it under the newcomer.
      const savePromise = manager.saveEditingAnnotation();
      login.userId.value = "user-2";
      await savePromise;

      // Nothing of Alice's may appear in the account now signed in.
      const view = manager.getAnnotationsForChapter("GEN", 1);
      await settle();
      expect(view.value.map((a) => a.id)).not.toContain("alice-note");
      expect(await store.get("user-1", "alice-note")).not.toBeNull();
      expect(await store.get("user-2", "alice-note")).toBeNull();
    });

    it("removes a deleted note from the account it started as", async () => {
      const manager = createOfflineManager();
      const annotation = createCommentAnnotation({ id: "known" });
      await store.put(syncedRow("user-1", annotation));
      goOffline();

      const deletePromise = manager.deleteAnnotationAndRefresh(annotation);
      login.userId.value = "user-2";
      await deletePromise;

      // The tombstone belongs to user-1, and user-2's view must be unaffected.
      const row = await store.get("user-1", "known");
      expect(row?.deleted).toBe(true);
      expect(await store.get("user-2", "known")).toBeNull();
    });

    it("reports how many changes are waiting", async () => {
      const manager = createOfflineManager();
      goOffline();

      await manager.saveAnnotation(createCommentAnnotation({ id: "a" }));
      await manager.saveAnnotation(
        createCommentAnnotation({ id: "b", verseNumber: 2 })
      );
      await manager.sync.refreshPendingCount();

      expect(manager.sync.pendingCount.value).toBe(2);
    });
  });
});

describe("annotationVerseNumbers", () => {
  it("returns verseNumbers when present, even if it doesn't match verseNumber/endVerseNumber", () => {
    expect(
      annotationVerseNumbers({
        verseNumber: 3,
        endVerseNumber: 7,
        verseNumbers: [3, 4, 5, 7],
      })
    ).toEqual([3, 4, 5, 7]);
  });

  it("expands verseNumber/endVerseNumber into a range when verseNumbers is absent", () => {
    expect(
      annotationVerseNumbers({ verseNumber: 3, endVerseNumber: 5 })
    ).toEqual([3, 4, 5]);
  });

  it("returns a single verse when endVerseNumber is absent", () => {
    expect(
      annotationVerseNumbers({ verseNumber: 5, endVerseNumber: null })
    ).toEqual([5]);
  });

  it("returns an empty array for a whole-chapter annotation", () => {
    expect(
      annotationVerseNumbers({ verseNumber: null, endVerseNumber: null })
    ).toEqual([]);
  });
});

describe("annotationListHasOtherAuthors", () => {
  it("is false when the list is empty or every comment is the current user's", () => {
    expect(annotationListHasOtherAuthors([], "user-1")).toBe(false);
    expect(
      annotationListHasOtherAuthors(
        [
          createCommentAnnotation({
            data: { type: "comment", html: "<p>Hi</p>", userId: "user-1" },
          }),
        ],
        "user-1"
      )
    ).toBe(false);
  });

  it("ignores comments with no author id, including when signed out", () => {
    const noAuthor = createCommentAnnotation({
      data: { type: "comment", html: "<p>Hi</p>", userId: null },
    });
    expect(annotationListHasOtherAuthors([noAuthor], "user-1")).toBe(false);
    expect(annotationListHasOtherAuthors([noAuthor], null)).toBe(false);
  });

  it("is true when any comment was written by someone else", () => {
    expect(
      annotationListHasOtherAuthors(
        [
          createCommentAnnotation({
            data: { type: "comment", html: "<p>Hi</p>", userId: "user-1" },
          }),
          createCommentAnnotation({
            id: "ann-2",
            data: { type: "comment", html: "<p>Yo</p>", userId: "user-2" },
          }),
        ],
        "user-1"
      )
    ).toBe(true);
    expect(
      annotationListHasOtherAuthors(
        [
          createCommentAnnotation({
            data: { type: "comment", html: "<p>Hi</p>", userId: "user-2" },
          }),
        ],
        "user-1"
      )
    ).toBe(true);
  });
});

describe("formatAnnotationVerseNumbers", () => {
  it("formats a single verse", () => {
    expect(formatAnnotationVerseNumbers([7])).toBe("7");
  });

  it("formats a contiguous run as a range", () => {
    expect(formatAnnotationVerseNumbers([3, 4, 5])).toBe("3-5");
  });

  it("groups a range plus a non-contiguous verse", () => {
    expect(formatAnnotationVerseNumbers([3, 4, 5, 7])).toBe("3-5,7");
  });

  it("sorts and dedupes before grouping", () => {
    expect(formatAnnotationVerseNumbers([7, 3, 5, 4, 4])).toBe("3-5,7");
  });
});

describe("groupAnnotationsByVerseRange", () => {
  it("groups annotations that share the same start and end verse", () => {
    const a = createCommentAnnotation({ id: "a", verseNumber: 3 });
    const b = createCommentAnnotation({ id: "b", verseNumber: 3 });

    const groups = groupAnnotationsByVerseRange([a, b]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.startVerseNumber).toBe(3);
    expect(groups[0]?.endVerseNumber).toBe(3);
    expect(groups[0]?.annotations.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("splits annotations with a different start or end verse into separate groups", () => {
    const a = createCommentAnnotation({ id: "a", verseNumber: 3 });
    const b = createCommentAnnotation({
      id: "b",
      verseNumber: 3,
      endVerseNumber: 5,
    });
    const c = createCommentAnnotation({ id: "c", verseNumber: 4 });

    const groups = groupAnnotationsByVerseRange([a, b, c]);

    expect(groups).toHaveLength(3);
  });

  it("splits annotations that share a start/end verse but target different verses in between", () => {
    const gapped = createCommentAnnotation({
      id: "gapped",
      verseNumber: 3,
      endVerseNumber: 5,
      verseNumbers: [3, 5],
    });
    const full = createCommentAnnotation({
      id: "full",
      verseNumber: 3,
      endVerseNumber: 5,
      verseNumbers: [3, 4, 5],
    });

    const groups = groupAnnotationsByVerseRange([gapped, full]);

    expect(groups).toHaveLength(2);
  });

  it("groups annotations that target the identical non-contiguous verse set", () => {
    const a = createCommentAnnotation({
      id: "a",
      verseNumber: 3,
      endVerseNumber: 5,
      verseNumbers: [3, 5],
    });
    const b = createCommentAnnotation({
      id: "b",
      verseNumber: 3,
      endVerseNumber: 5,
      verseNumbers: [3, 5],
    });

    const groups = groupAnnotationsByVerseRange([a, b]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.annotations.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("groups whole-chapter annotations together, separate from verse-targeted ones", () => {
    const wholeChapterA = createCommentAnnotation({
      id: "a",
      verseNumber: null,
    });
    const wholeChapterB = createCommentAnnotation({
      id: "b",
      verseNumber: null,
    });
    const verseSpecific = createCommentAnnotation({ id: "c", verseNumber: 3 });

    const groups = groupAnnotationsByVerseRange([
      wholeChapterA,
      verseSpecific,
      wholeChapterB,
    ]);

    expect(groups).toHaveLength(2);
    const chapterGroup = groups.find((g) => g.startVerseNumber === null);
    expect(chapterGroup?.annotations.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("orders groups with whole-chapter first, then ascending by start verse, then end verse", () => {
    const verse7 = createCommentAnnotation({ id: "verse-7", verseNumber: 7 });
    const verse3to5 = createCommentAnnotation({
      id: "verse-3-5",
      verseNumber: 3,
      endVerseNumber: 5,
    });
    const verse3 = createCommentAnnotation({ id: "verse-3", verseNumber: 3 });
    const wholeChapter = createCommentAnnotation({
      id: "chapter",
      verseNumber: null,
    });

    const groups = groupAnnotationsByVerseRange([
      verse7,
      verse3to5,
      verse3,
      wholeChapter,
    ]);

    expect(groups.map((g) => g.annotations[0]?.id)).toEqual([
      "chapter",
      "verse-3",
      "verse-3-5",
      "verse-7",
    ]);
  });

  it("sorts annotations within a group oldest-first by createdAtMs", () => {
    const newer = createCommentAnnotation({
      id: "newer",
      verseNumber: 3,
      data: { type: "comment", html: "", createdAtMs: 200 },
    });
    const older = createCommentAnnotation({
      id: "older",
      verseNumber: 3,
      data: { type: "comment", html: "", createdAtMs: 100 },
    });

    const groups = groupAnnotationsByVerseRange([newer, older]);

    expect(groups[0]?.annotations.map((a) => a.id)).toEqual(["older", "newer"]);
  });

  it("keeps incoming order when createdAtMs is missing on either side", () => {
    const a = createCommentAnnotation({ id: "a", verseNumber: 3 });
    const b = createCommentAnnotation({
      id: "b",
      verseNumber: 3,
      data: { type: "comment", html: "", createdAtMs: 100 },
    });

    const groups = groupAnnotationsByVerseRange([a, b]);

    expect(groups[0]?.annotations.map((x) => x.id)).toEqual(["a", "b"]);
  });
});
