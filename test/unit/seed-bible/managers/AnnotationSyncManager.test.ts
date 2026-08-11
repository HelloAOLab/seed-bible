import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import {
  conflictResolutions,
  createAnnotationSyncManager,
  type AnnotationSyncManager,
} from "@packages/seed-bible/seed-bible/managers/AnnotationSyncManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  annotationFingerprint,
  createInMemoryAnnotationStore,
  LOCAL_OWNER,
  MAX_SYNC_ATTEMPTS,
  syncedRow,
  type OfflineAnnotationStore,
  type StoredAnnotation,
} from "@packages/seed-bible/seed-bible/managers/OfflineAnnotationStore";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

const OWNER = "user-1";

function makeAnnotation(
  id: string,
  overrides: { html?: string; updatedAtMs?: number | null } = {}
): Annotation {
  return {
    id,
    bookId: "GEN",
    chapterNumber: 1,
    verseNumber: 1,
    data: {
      type: "comment",
      html: overrides.html ?? `<p>${id}</p>`,
      createdAtMs: 1_000,
      updatedAtMs:
        overrides.updatedAtMs === undefined ? 2_000 : overrides.updatedAtMs,
    },
  };
}

/** A row holding an unsent edit, based on the given server version. */
function pendingUpsert(
  annotation: Annotation,
  base: Annotation | null,
  overrides: Partial<StoredAnnotation> = {}
): StoredAnnotation {
  return {
    ...syncedRow(OWNER, annotation),
    updatedAtMs: 9_000,
    pendingOp: "upsert",
    baseUpdatedAtMs: base ? (base.data.updatedAtMs ?? null) : null,
    baseFingerprint: base ? annotationFingerprint(base) : null,
    ...overrides,
  };
}

/** A row holding an unsent deletion of the given server version. */
function pendingDelete(
  annotationId: string,
  base: Annotation | null,
  overrides: Partial<StoredAnnotation> = {}
): StoredAnnotation {
  return {
    key: `${OWNER}/${annotationId}`,
    owner: OWNER,
    annotationId,
    bookId: "GEN",
    chapterNumber: 1,
    annotation: null,
    deleted: true,
    updatedAtMs: 9_000,
    baseUpdatedAtMs: base ? (base.data.updatedAtMs ?? null) : null,
    baseFingerprint: base ? annotationFingerprint(base) : null,
    pendingOp: "delete",
    attempts: 0,
    ...overrides,
  };
}

function createLoginMock(userId: string | null): Mocked<LoginManager> {
  return {
    authBot: signal(null),
    sessionEnded: signal(null),
    userId: signal(userId),
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
    userInfo: signal({ id: userId ?? "", email: "test@example.com" }),
    cancelLogin: vi.fn().mockResolvedValue(undefined),
    isLoginOpen: signal(false),
    requestLoginByEmail: vi
      .fn()
      .mockResolvedValue({ success: true, requestId: "req-1" }),
    submitLoginCode: vi.fn().mockResolvedValue({
      success: true,
      userInfo: { id: userId ?? "", email: "test@example.com" },
    }),
  } as unknown as Mocked<LoginManager>;
}

describe("AnnotationSyncManager", () => {
  let os: CasualOSManager;
  let getDataMock: Mock;
  let recordDataMock: Mock;
  let eraseDataMock: Mock;
  let login: Mocked<LoginManager>;
  let store: OfflineAnnotationStore;
  let managers: AnnotationSyncManager[];

  beforeEach(() => {
    os = CasualOSManager();
    getDataMock = vi.spyOn(os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
    } as never);
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue({ success: true } as never);
    eraseDataMock = vi
      .spyOn(os, "eraseData")
      .mockResolvedValue({ success: true } as never);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    login = createLoginMock(OWNER);
    store = createInMemoryAnnotationStore();
    managers = [];
  });

  afterEach(() => {
    for (const manager of managers) {
      manager.dispose();
    }
    vi.restoreAllMocks();
  });

  function createSync(
    overrides: Partial<Parameters<typeof createAnnotationSyncManager>[0]> = {}
  ): AnnotationSyncManager {
    const manager = createAnnotationSyncManager({
      os,
      login,
      store,
      parseAnnotation: (value) => value as Annotation,
      getMarker: (bookId, chapterNumber) =>
        `publicRead:annotations/${bookId}/${chapterNumber}`,
      ...overrides,
    });
    managers.push(manager);
    return manager;
  }

  /** Makes `getData` answer with a specific server state for one address. */
  function serverHas(annotation: Annotation | null): void {
    getDataMock.mockResolvedValue(
      annotation
        ? ({ success: true, data: annotation } as never)
        : ({ success: false, errorCode: "data_not_found" } as never)
    );
  }

  describe("pending upsert", () => {
    it("creates a note the server has never seen", async () => {
      const mine = makeAnnotation("ann-1");
      await store.put(pendingUpsert(mine, null));
      serverHas(null);

      await createSync().sync();

      expect(recordDataMock).toHaveBeenCalledWith(OWNER, "ann-1", mine, {
        marker: "publicRead:annotations/GEN/1",
      });
      expect((await store.get(OWNER, "ann-1"))?.pendingOp).toBeNull();
    });

    it("updates a note the server still holds unchanged", async () => {
      const base = makeAnnotation("ann-1");
      const mine = makeAnnotation("ann-1", {
        html: "<p>mine</p>",
        updatedAtMs: 9_000,
      });
      await store.put(pendingUpsert(mine, base));
      serverHas(base);

      await createSync().sync();

      expect(recordDataMock).toHaveBeenCalledWith(OWNER, "ann-1", mine, {
        marker: "publicRead:annotations/GEN/1",
      });
    });

    it("asks the user when the note changed elsewhere, writing nothing", async () => {
      const base = makeAnnotation("ann-1");
      const theirs = makeAnnotation("ann-1", {
        html: "<p>theirs</p>",
        updatedAtMs: 5_000,
      });
      const mine = makeAnnotation("ann-1", {
        html: "<p>mine</p>",
        updatedAtMs: 9_000,
      });
      await store.put(pendingUpsert(mine, base));
      serverHas(theirs);

      const sync = createSync();
      await sync.sync();

      expect(recordDataMock).not.toHaveBeenCalled();
      expect(sync.conflicts.value).toHaveLength(1);
      expect(sync.conflicts.value[0]?.kind).toBe("edited_elsewhere");
      expect(sync.conflicts.value[0]?.local?.data.html).toBe("<p>mine</p>");
      expect(sync.conflicts.value[0]?.server?.data.html).toBe("<p>theirs</p>");
    });

    it("asks the user when the note was deleted elsewhere", async () => {
      const base = makeAnnotation("ann-1");
      await store.put(pendingUpsert(makeAnnotation("ann-1"), base));
      serverHas(null);

      const sync = createSync();
      await sync.sync();

      expect(recordDataMock).not.toHaveBeenCalled();
      expect(sync.conflicts.value[0]?.kind).toBe("deleted_elsewhere");
      expect(sync.conflicts.value[0]?.server).toBeNull();
    });

    it("falls back to comparing content when neither side has a timestamp", async () => {
      const base = makeAnnotation("ann-1", { updatedAtMs: null });
      const mine = makeAnnotation("ann-1", {
        html: "<p>mine</p>",
        updatedAtMs: null,
      });
      await store.put(pendingUpsert(mine, base));
      serverHas(base);

      const sync = createSync();
      await sync.sync();

      // Content matches the base, so this is a clean update rather than a clash.
      expect(sync.conflicts.value).toEqual([]);
      expect(recordDataMock).toHaveBeenCalled();
    });

    it("detects a change through content when neither side has a timestamp", async () => {
      const base = makeAnnotation("ann-1", { updatedAtMs: null });
      const theirs = makeAnnotation("ann-1", {
        html: "<p>theirs</p>",
        updatedAtMs: null,
      });
      await store.put(pendingUpsert(makeAnnotation("ann-1"), base));
      serverHas(theirs);

      const sync = createSync();
      await sync.sync();

      expect(sync.conflicts.value[0]?.kind).toBe("edited_elsewhere");
      expect(recordDataMock).not.toHaveBeenCalled();
    });
  });

  describe("pending delete", () => {
    it("converges silently when the note is already gone from the server", async () => {
      await store.put(pendingDelete("ann-1", makeAnnotation("ann-1")));
      serverHas(null);

      const sync = createSync();
      await sync.sync();

      expect(eraseDataMock).not.toHaveBeenCalled();
      expect(sync.conflicts.value).toEqual([]);
      expect(await store.get(OWNER, "ann-1")).toBeNull();
    });

    it("erases a note the server still holds unchanged", async () => {
      const base = makeAnnotation("ann-1");
      await store.put(pendingDelete("ann-1", base));
      serverHas(base);

      await createSync().sync();

      expect(eraseDataMock).toHaveBeenCalledWith(OWNER, "ann-1");
      expect(await store.get(OWNER, "ann-1")).toBeNull();
    });

    it("asks the user when the note was edited elsewhere after being deleted here", async () => {
      const base = makeAnnotation("ann-1");
      const theirs = makeAnnotation("ann-1", {
        html: "<p>theirs</p>",
        updatedAtMs: 5_000,
      });
      await store.put(pendingDelete("ann-1", base));
      serverHas(theirs);

      const sync = createSync();
      await sync.sync();

      expect(eraseDataMock).not.toHaveBeenCalled();
      expect(sync.conflicts.value[0]?.kind).toBe(
        "deleted_locally_edited_elsewhere"
      );
      expect(sync.conflicts.value[0]?.local).toBeNull();
    });

    it("treats an erase of an already-missing record as success", async () => {
      const base = makeAnnotation("ann-1");
      await store.put(pendingDelete("ann-1", base));
      serverHas(base);
      eraseDataMock.mockResolvedValue({
        success: false,
        errorCode: "data_not_found",
      } as never);

      const sync = createSync();
      await sync.sync();

      expect(await store.get(OWNER, "ann-1")).toBeNull();
      expect(sync.syncErrors.value.size).toBe(0);
    });
  });

  describe("conflictResolutions()", () => {
    it("offers all three choices when both versions exist", () => {
      expect(conflictResolutions("edited_elsewhere")).toEqual([
        "keep_mine",
        "keep_theirs",
        "keep_both",
      ]);
    });

    it("omits 'keep both' when there is only one version to keep", () => {
      // Deleted elsewhere: theirs is gone, so there is no second copy to keep.
      expect(conflictResolutions("deleted_elsewhere")).toEqual([
        "keep_mine",
        "keep_theirs",
      ]);
      // Deleted here: ours is gone, same reasoning.
      expect(conflictResolutions("deleted_locally_edited_elsewhere")).toEqual([
        "keep_mine",
        "keep_theirs",
      ]);
    });
  });

  describe("resolveConflict()", () => {
    async function raiseEditConflict(): Promise<{
      sync: AnnotationSyncManager;
      conflictId: string;
      mine: Annotation;
      theirs: Annotation;
    }> {
      const base = makeAnnotation("ann-1");
      const theirs = makeAnnotation("ann-1", {
        html: "<p>theirs</p>",
        updatedAtMs: 5_000,
      });
      const mine = makeAnnotation("ann-1", {
        html: "<p>mine</p>",
        updatedAtMs: 9_000,
      });
      await store.put(pendingUpsert(mine, base));
      serverHas(theirs);

      const sync = createSync();
      await sync.sync();
      const conflictId = sync.conflicts.value[0]!.id;
      return { sync, conflictId, mine, theirs };
    }

    it("keep_mine overwrites the server with the local version", async () => {
      const { sync, conflictId, mine } = await raiseEditConflict();
      recordDataMock.mockClear();

      await sync.resolveConflict(conflictId, "keep_mine");

      expect(recordDataMock).toHaveBeenCalledWith(OWNER, "ann-1", mine, {
        marker: "publicRead:annotations/GEN/1",
      });
      expect(sync.conflicts.value).toEqual([]);
    });

    it("keep_theirs discards the local change and adopts the server version", async () => {
      const { sync, conflictId, theirs } = await raiseEditConflict();
      recordDataMock.mockClear();

      await sync.resolveConflict(conflictId, "keep_theirs");

      expect(recordDataMock).not.toHaveBeenCalled();
      const row = await store.get(OWNER, "ann-1");
      expect(row?.pendingOp).toBeNull();
      expect(row?.annotation?.data.html).toBe(theirs.data.html);
      expect(sync.conflicts.value).toEqual([]);
    });

    it("keep_both writes ours under a new id and leaves theirs untouched", async () => {
      const { sync, conflictId, theirs } = await raiseEditConflict();
      recordDataMock.mockClear();
      // The copy is a fresh create, so the pre-write read finds nothing.
      serverHas(null);

      await sync.resolveConflict(conflictId, "keep_both");

      const written = recordDataMock.mock.calls.map((call) => call[1]);
      expect(written).toHaveLength(1);
      expect(written[0]).not.toBe("ann-1");
      expect(written[0]).toMatch(/^annotation_/);
      expect(recordDataMock.mock.calls[0]?.[2]).toMatchObject({
        data: { html: "<p>mine</p>" },
      });

      // Theirs survives as the synced copy of the original id.
      const original = await store.get(OWNER, "ann-1");
      expect(original?.annotation?.data.html ?? theirs.data.html).toBe(
        theirs.data.html
      );
    });

    it("keep_mine on a deleted-here conflict carries out the deletion", async () => {
      const base = makeAnnotation("ann-1");
      const theirs = makeAnnotation("ann-1", {
        html: "<p>theirs</p>",
        updatedAtMs: 5_000,
      });
      await store.put(pendingDelete("ann-1", base));
      serverHas(theirs);
      const sync = createSync();
      await sync.sync();
      const conflictId = sync.conflicts.value[0]!.id;

      await sync.resolveConflict(conflictId, "keep_mine");

      expect(eraseDataMock).toHaveBeenCalledWith(OWNER, "ann-1");
      expect(await store.get(OWNER, "ann-1")).toBeNull();
    });

    it("keep_theirs on a deleted-elsewhere conflict drops the local copy", async () => {
      await store.put(
        pendingUpsert(makeAnnotation("ann-1"), makeAnnotation("ann-1"))
      );
      serverHas(null);
      const sync = createSync();
      await sync.sync();
      const conflictId = sync.conflicts.value[0]!.id;

      await sync.resolveConflict(conflictId, "keep_theirs");

      expect(await store.get(OWNER, "ann-1")).toBeNull();
      expect(sync.conflicts.value).toEqual([]);
    });

    it("ignores a resolution once the account has changed", async () => {
      const { sync, conflictId } = await raiseEditConflict();
      recordDataMock.mockClear();
      login.userId.value = "someone-else";

      await sync.resolveConflict(conflictId, "keep_mine");

      // Applying it would write one account's note into another's record.
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("does nothing for an unknown conflict id", async () => {
      const sync = createSync();

      await sync.resolveConflict("nope", "keep_mine");

      expect(recordDataMock).not.toHaveBeenCalled();
    });
  });

  describe("failure handling", () => {
    it("keeps the change pending when the request rejects, and does not throw", async () => {
      await store.put(pendingUpsert(makeAnnotation("ann-1"), null));
      getDataMock.mockRejectedValue(new Error("offline"));

      const sync = createSync();
      await expect(sync.sync()).resolves.toBeUndefined();

      expect((await store.get(OWNER, "ann-1"))?.pendingOp).toBe("upsert");
      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("stops after one rejection rather than repeating it for every row", async () => {
      await store.put(
        pendingUpsert(makeAnnotation("ann-1"), null, { updatedAtMs: 1 })
      );
      await store.put(
        pendingUpsert(makeAnnotation("ann-2"), null, { updatedAtMs: 2 })
      );
      getDataMock.mockRejectedValue(new Error("offline"));

      await createSync().sync();

      expect(getDataMock).toHaveBeenCalledTimes(1);
    });

    it("gives up on a change the server permanently refuses", async () => {
      await store.put(pendingUpsert(makeAnnotation("ann-1"), null));
      recordDataMock.mockResolvedValue({
        success: false,
        errorCode: "not_authorized",
        errorMessage: "nope",
      } as never);

      const sync = createSync();
      await sync.sync();

      const row = await store.get(OWNER, "ann-1");
      expect(row?.pendingOp).toBeNull();
      expect(sync.syncErrors.value.get("ann-1")).toBe("nope");
    });

    it("retries a server error, but not forever", async () => {
      await store.put(
        pendingUpsert(makeAnnotation("ann-1"), null, {
          attempts: MAX_SYNC_ATTEMPTS - 1,
        })
      );
      recordDataMock.mockResolvedValue({
        success: false,
        errorCode: "server_error",
        errorMessage: "boom",
      } as never);

      const sync = createSync();
      await sync.sync();

      const row = await store.get(OWNER, "ann-1");
      expect(row?.attempts).toBe(MAX_SYNC_ATTEMPTS);
      expect(row?.pendingOp).toBeNull();
      expect(sync.syncErrors.value.get("ann-1")).toBe("boom");
    });

    it("leaves a retryable failure pending while attempts remain", async () => {
      await store.put(pendingUpsert(makeAnnotation("ann-1"), null));
      recordDataMock.mockResolvedValue({
        success: false,
        errorCode: "rate_limit_exceeded",
        errorMessage: "slow down",
      } as never);

      await createSync().sync();

      const row = await store.get(OWNER, "ann-1");
      expect(row?.attempts).toBe(1);
      expect(row?.pendingOp).toBe("upsert");
    });
  });

  describe("scoping and scheduling", () => {
    it("never pushes notes written while signed out", async () => {
      const store2 = createInMemoryAnnotationStore();
      await store2.put({
        ...syncedRow(LOCAL_OWNER, makeAnnotation("draft")),
        owner: LOCAL_OWNER,
        key: `${LOCAL_OWNER}/draft`,
        pendingOp: "upsert",
        baseUpdatedAtMs: null,
        baseFingerprint: null,
      });
      const signedOut = createLoginMock(null);

      const sync = createAnnotationSyncManager({
        os,
        login: signedOut,
        store: store2,
        parseAnnotation: (value) => value as Annotation,
        getMarker: () => "marker",
      });
      managers.push(sync);
      await sync.sync();

      expect(recordDataMock).not.toHaveBeenCalled();
    });

    it("stops mid-pass when the account changes", async () => {
      await store.put(
        pendingUpsert(makeAnnotation("ann-1"), null, { updatedAtMs: 1 })
      );
      await store.put(
        pendingUpsert(makeAnnotation("ann-2"), null, { updatedAtMs: 2 })
      );
      // Switch accounts as soon as the first row is looked at.
      getDataMock.mockImplementation(async () => {
        login.userId.value = "someone-else";
        return { success: false, errorCode: "data_not_found" };
      });

      await createSync().sync();

      // The first row's write is allowed (it was checked before the switch);
      // the second must not be, since it belongs to an account that has gone.
      expect(recordDataMock.mock.calls.length).toBeLessThanOrEqual(1);
      expect(recordDataMock.mock.calls.every((call) => call[0] === OWNER)).toBe(
        true
      );
    });

    it("shares one pass between concurrent callers", async () => {
      await store.put(pendingUpsert(makeAnnotation("ann-1"), null));
      const sync = createSync();

      await Promise.all([sync.sync(), sync.sync(), sync.sync()]);

      expect(getDataMock).toHaveBeenCalledTimes(1);
    });

    it("does nothing while offline", async () => {
      await store.put(pendingUpsert(makeAnnotation("ann-1"), null));
      const sync = createSync();
      window.dispatchEvent(new Event("offline"));

      await sync.sync();

      expect(getDataMock).not.toHaveBeenCalled();
      expect(sync.isOnline.value).toBe(false);
    });

    it("syncs when the connection comes back", async () => {
      await store.put(pendingUpsert(makeAnnotation("ann-1"), null));
      const sync = createSync();
      window.dispatchEvent(new Event("offline"));
      window.dispatchEvent(new Event("online"));
      await sync.sync();

      expect(sync.isOnline.value).toBe(true);
      expect(recordDataMock).toHaveBeenCalled();
    });

    it("reports how much is still waiting", async () => {
      await store.put(
        pendingUpsert(makeAnnotation("ann-1"), null, { updatedAtMs: 1 })
      );
      await store.put(
        pendingUpsert(makeAnnotation("ann-2"), null, { updatedAtMs: 2 })
      );
      const sync = createSync();

      await sync.refreshPendingCount();
      expect(sync.pendingCount.value).toBe(2);

      await sync.sync();
      expect(sync.pendingCount.value).toBe(0);
    });

    it("stops listening after dispose", async () => {
      const sync = createSync();
      sync.dispose();

      window.dispatchEvent(new Event("offline"));

      expect(sync.isOnline.value).toBe(true);
    });

    it("does nothing at all when there is no local store", async () => {
      const sync = createAnnotationSyncManager({
        os,
        login,
        store: null,
        parseAnnotation: (value) => value as Annotation,
        getMarker: () => "marker",
      });
      managers.push(sync);

      await sync.sync();

      expect(getDataMock).not.toHaveBeenCalled();
      expect(sync.pendingCount.value).toBe(0);
    });
  });

  describe("adoption on sign-in", () => {
    it("adopts signed-out drafts and pushes them once the user signs in", async () => {
      await store.put({
        ...syncedRow(LOCAL_OWNER, makeAnnotation("draft")),
        owner: LOCAL_OWNER,
        key: `${LOCAL_OWNER}/draft`,
        pendingOp: "upsert",
        baseUpdatedAtMs: null,
        baseFingerprint: null,
      });
      const signedOut = createLoginMock(null);
      const sync = createAnnotationSyncManager({
        os,
        login: signedOut,
        store,
        parseAnnotation: (value) => value as Annotation,
        getMarker: (bookId, chapterNumber) =>
          `publicRead:annotations/${bookId}/${chapterNumber}`,
      });
      managers.push(sync);

      signedOut.userId.value = OWNER;
      // Let the adoption effect's async work settle.
      await vi.waitFor(() => expect(recordDataMock).toHaveBeenCalled());

      expect(recordDataMock).toHaveBeenCalledWith(
        OWNER,
        "draft",
        expect.objectContaining({ id: "draft" }),
        expect.anything()
      );
      expect(await store.get(LOCAL_OWNER, "draft")).toBeNull();
    });

    it("drops synced rows on sign-out but keeps unsent writing", async () => {
      await store.put(syncedRow(OWNER, makeAnnotation("synced")));
      await store.put(pendingUpsert(makeAnnotation("unsent"), null));
      const sync = createSync();
      await sync.refreshPendingCount();

      login.userId.value = null;
      await vi.waitFor(async () =>
        expect(await store.get(OWNER, "synced")).toBeNull()
      );

      expect(await store.get(OWNER, "unsent")).not.toBeNull();
      expect(sync.pendingCount.value).toBe(0);
    });
  });
});
