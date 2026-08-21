import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import {
  annotationFingerprint,
  createInMemoryAnnotationStore,
  createIndexedDbAnnotationStore,
  LOCAL_OWNER,
  syncedRow,
  type StoredAnnotation,
} from "@packages/seed-bible/seed-bible/managers/OfflineAnnotationStore";

function makeAnnotation(
  id: string,
  overrides: Partial<Annotation> = {}
): Annotation {
  return {
    id,
    bookId: "GEN",
    chapterNumber: 1,
    verseNumber: 1,
    data: {
      type: "comment",
      html: `<p>${id}</p>`,
      createdAtMs: 1_000,
      updatedAtMs: 2_000,
    },
    ...overrides,
  };
}

function pendingRow(
  owner: string,
  annotation: Annotation,
  overrides: Partial<StoredAnnotation> = {}
): StoredAnnotation {
  return {
    ...syncedRow(owner, annotation),
    pendingOp: "upsert",
    baseUpdatedAtMs: null,
    baseFingerprint: null,
    ...overrides,
  };
}

function tombstone(
  owner: string,
  annotationId: string,
  overrides: Partial<StoredAnnotation> = {}
): StoredAnnotation {
  return {
    key: `${owner}/${annotationId}`,
    owner,
    annotationId,
    bookId: "GEN",
    chapterNumber: 1,
    annotation: null,
    deleted: true,
    updatedAtMs: 5_000,
    baseUpdatedAtMs: 2_000,
    baseFingerprint: "fingerprint",
    pendingOp: "delete",
    attempts: 0,
    ...overrides,
  };
}

describe("createIndexedDbAnnotationStore()", () => {
  it("returns null where IndexedDB is unavailable, so callers can fall back", () => {
    // jsdom provides no IndexedDB, which is the same situation as server-side
    // rendering and browsers that block storage.
    expect(typeof indexedDB).toBe("undefined");
    expect(createIndexedDbAnnotationStore()).toBeNull();
  });
});

describe("annotationFingerprint()", () => {
  it("ignores updatedAtMs, so it can answer 'is this still the copy I edited?'", () => {
    const a = makeAnnotation("ann-1");
    const b = makeAnnotation("ann-1");
    b.data.updatedAtMs = 99_999;

    expect(annotationFingerprint(a)).toBe(annotationFingerprint(b));
  });

  it("changes when the content changes", () => {
    const a = makeAnnotation("ann-1");
    const b = makeAnnotation("ann-1");
    b.data.html = "<p>different</p>";

    expect(annotationFingerprint(a)).not.toBe(annotationFingerprint(b));
  });

  it("does not depend on key order", () => {
    const a: Annotation = {
      id: "ann-1",
      bookId: "GEN",
      chapterNumber: 1,
      data: { type: "comment", html: "<p>x</p>", createdAtMs: 1 },
    };
    const b: Annotation = {
      data: { createdAtMs: 1, html: "<p>x</p>", type: "comment" },
      chapterNumber: 1,
      bookId: "GEN",
      id: "ann-1",
    };

    expect(annotationFingerprint(a)).toBe(annotationFingerprint(b));
  });

  it("treats an explicitly-undefined optional field as absent", () => {
    const a = makeAnnotation("ann-1");
    const b = { ...makeAnnotation("ann-1"), order: undefined };

    expect(annotationFingerprint(a)).toBe(annotationFingerprint(b));
  });
});

describe("createInMemoryAnnotationStore()", () => {
  it("round-trips a row", async () => {
    const store = createInMemoryAnnotationStore();
    const row = pendingRow("user-1", makeAnnotation("ann-1"));

    await store.put(row);

    expect(await store.get("user-1", "ann-1")).toEqual(row);
  });

  it("returns null for an annotation this device has never seen", async () => {
    const store = createInMemoryAnnotationStore();

    expect(await store.get("user-1", "missing")).toBeNull();
  });

  it("scopes rows to their owner", async () => {
    const store = createInMemoryAnnotationStore();
    await store.put(pendingRow("user-1", makeAnnotation("ann-1")));
    await store.put(pendingRow("user-2", makeAnnotation("ann-2")));

    const forUser1 = await store.listForChapter("user-1", "GEN", 1);

    expect(forUser1.map((r) => r.annotationId)).toEqual(["ann-1"]);
  });

  it("scopes rows to their chapter", async () => {
    const store = createInMemoryAnnotationStore();
    await store.put(pendingRow("user-1", makeAnnotation("ann-1")));
    await store.put(
      pendingRow(
        "user-1",
        makeAnnotation("ann-2", { bookId: "EXO", chapterNumber: 3 })
      )
    );

    const genesis = await store.listForChapter("user-1", "GEN", 1);

    expect(genesis.map((r) => r.annotationId)).toEqual(["ann-1"]);
  });

  it("keeps tombstones in the chapter listing so callers can filter them", async () => {
    const store = createInMemoryAnnotationStore();
    await store.put(tombstone("user-1", "ann-1"));

    const rows = await store.listForChapter("user-1", "GEN", 1);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.deleted).toBe(true);
    expect(rows[0]?.annotation).toBeNull();
  });

  it("removes a row entirely on delete, leaving no tombstone", async () => {
    const store = createInMemoryAnnotationStore();
    await store.put(pendingRow("user-1", makeAnnotation("ann-1")));

    await store.delete("user-1", "ann-1");

    expect(await store.get("user-1", "ann-1")).toBeNull();
  });

  describe("listPending()", () => {
    it("excludes rows that already match the server", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(syncedRow("user-1", makeAnnotation("synced")));
      await store.put(pendingRow("user-1", makeAnnotation("waiting")));

      const pending = await store.listPending("user-1");

      expect(pending.map((r) => r.annotationId)).toEqual(["waiting"]);
    });

    it("includes pending deletes alongside pending upserts", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(
        pendingRow("user-1", makeAnnotation("edit"), { updatedAtMs: 1 })
      );
      await store.put(tombstone("user-1", "gone", { updatedAtMs: 2 }));

      const pending = await store.listPending("user-1");

      expect(pending.map((r) => r.annotationId)).toEqual(["edit", "gone"]);
    });

    it("returns oldest change first, so a burst of edits pushes in order", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(
        pendingRow("user-1", makeAnnotation("second"), { updatedAtMs: 200 })
      );
      await store.put(
        pendingRow("user-1", makeAnnotation("first"), { updatedAtMs: 100 })
      );

      const pending = await store.listPending("user-1");

      expect(pending.map((r) => r.annotationId)).toEqual(["first", "second"]);
    });

    it("does not leak another account's pending work", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(pendingRow("user-2", makeAnnotation("theirs")));

      expect(await store.listPending("user-1")).toEqual([]);
    });
  });

  describe("getChapter()", () => {
    it("is null until the chapter has been listed, telling 'empty' from 'unfetched'", async () => {
      const store = createInMemoryAnnotationStore();

      expect(await store.getChapter("user-1", "GEN", 1)).toBeNull();

      await store.reconcileChapter("user-1", "GEN", 1, [], 1_234);

      expect(await store.getChapter("user-1", "GEN", 1)).toMatchObject({
        owner: "user-1",
        bookId: "GEN",
        chapterNumber: 1,
        listedAtMs: 1_234,
      });
    });
  });

  describe("reconcileChapter()", () => {
    it("stores the server's annotations as synced, with base pointers set", async () => {
      const store = createInMemoryAnnotationStore();
      const annotation = makeAnnotation("ann-1");

      await store.reconcileChapter("user-1", "GEN", 1, [annotation], 1);

      const row = await store.get("user-1", "ann-1");
      expect(row?.pendingOp).toBeNull();
      expect(row?.baseUpdatedAtMs).toBe(2_000);
      expect(row?.baseFingerprint).toBe(annotationFingerprint(annotation));
    });

    it("leaves a pending row alone, so an unsent edit is not overwritten", async () => {
      const store = createInMemoryAnnotationStore();
      const mine = makeAnnotation("ann-1", {
        data: { type: "comment", html: "<p>mine</p>", updatedAtMs: 9_000 },
      });
      await store.put(pendingRow("user-1", mine));

      await store.reconcileChapter(
        "user-1",
        "GEN",
        1,
        [makeAnnotation("ann-1")],
        1
      );

      const row = await store.get("user-1", "ann-1");
      expect(row?.pendingOp).toBe("upsert");
      expect(row?.annotation?.data.html).toBe("<p>mine</p>");
    });

    it("drops a synced row the server no longer has, i.e. deleted elsewhere", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(syncedRow("user-1", makeAnnotation("ann-1")));

      await store.reconcileChapter("user-1", "GEN", 1, [], 1);

      expect(await store.get("user-1", "ann-1")).toBeNull();
    });

    it("keeps a pending row the server does not have, leaving the decision to sync", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(pendingRow("user-1", makeAnnotation("ann-1")));

      await store.reconcileChapter("user-1", "GEN", 1, [], 1);

      expect(await store.get("user-1", "ann-1")).not.toBeNull();
    });

    it("keeps a pending tombstone the server still has", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(tombstone("user-1", "ann-1"));

      await store.reconcileChapter(
        "user-1",
        "GEN",
        1,
        [makeAnnotation("ann-1")],
        1
      );

      const row = await store.get("user-1", "ann-1");
      expect(row?.pendingOp).toBe("delete");
      expect(row?.deleted).toBe(true);
    });

    it("does not overwrite an edit that lands while it is running", async () => {
      const store = createInMemoryAnnotationStore();
      const serverCopy = makeAnnotation("ann-1");
      await store.put(syncedRow("user-1", serverCopy));

      const mine = makeAnnotation("ann-1");
      mine.data.html = "<p>mine</p>";

      // Fired without awaiting, then a local edit is queued behind it. Reading
      // the rows and writing them back has to be one atomic step: reading first
      // and writing after a yield let this edit land in the gap, look unpending
      // to the reconcile, and get replaced by the server's older copy.
      const reconciling = store.reconcileChapter(
        "user-1",
        "GEN",
        1,
        [serverCopy],
        1
      );
      await store.put({
        ...syncedRow("user-1", mine),
        pendingOp: "upsert",
        updatedAtMs: 9_999,
      });
      await reconciling;

      const row = await store.get("user-1", "ann-1");
      expect(row?.annotation?.data.html).toBe("<p>mine</p>");
      expect(row?.pendingOp).toBe("upsert");
    });

    it("does not touch another chapter's rows", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(
        syncedRow(
          "user-1",
          makeAnnotation("other", { bookId: "EXO", chapterNumber: 3 })
        )
      );

      await store.reconcileChapter("user-1", "GEN", 1, [], 1);

      expect(await store.get("user-1", "other")).not.toBeNull();
    });
  });

  describe("adoptLocalRows()", () => {
    it("re-keys signed-out rows onto the account and empties the local bucket", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(pendingRow(LOCAL_OWNER, makeAnnotation("draft")));

      const adopted = await store.adoptLocalRows("user-1");

      expect(adopted.map((r) => r.owner)).toEqual(["user-1"]);
      expect(await store.get(LOCAL_OWNER, "draft")).toBeNull();
      expect(await store.get("user-1", "draft")).not.toBeNull();
    });

    it("marks adopted rows as fresh creates, since they were never on a server", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(
        pendingRow(LOCAL_OWNER, makeAnnotation("draft"), {
          baseUpdatedAtMs: 123,
          baseFingerprint: "stale",
          attempts: 3,
        })
      );

      const [adopted] = await store.adoptLocalRows("user-1");

      expect(adopted?.pendingOp).toBe("upsert");
      expect(adopted?.baseUpdatedAtMs).toBeNull();
      expect(adopted?.baseFingerprint).toBeNull();
      expect(adopted?.attempts).toBe(0);
    });

    it("discards a signed-out tombstone, which refers to nothing on any server", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(tombstone(LOCAL_OWNER, "never-sent"));

      const adopted = await store.adoptLocalRows("user-1");

      expect(adopted).toEqual([]);
      expect(await store.get(LOCAL_OWNER, "never-sent")).toBeNull();
      expect(await store.get("user-1", "never-sent")).toBeNull();
    });

    it("cannot adopt the same drafts twice, so a second account can't inherit them", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(pendingRow(LOCAL_OWNER, makeAnnotation("draft")));

      await store.adoptLocalRows("user-1");
      const second = await store.adoptLocalRows("user-2");

      expect(second).toEqual([]);
      expect(await store.get("user-2", "draft")).toBeNull();
      expect(await store.get("user-1", "draft")).not.toBeNull();
    });

    it("leaves rows that already belong to an account alone", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(syncedRow("user-2", makeAnnotation("theirs")));

      await store.adoptLocalRows("user-1");

      expect(await store.get("user-2", "theirs")).not.toBeNull();
    });
  });

  describe("clearSynced()", () => {
    it("drops synced rows but keeps unsent writing", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(syncedRow("user-1", makeAnnotation("synced")));
      await store.put(pendingRow("user-1", makeAnnotation("unsent")));

      await store.clearSynced("user-1");

      expect(await store.get("user-1", "synced")).toBeNull();
      expect(await store.get("user-1", "unsent")).not.toBeNull();
    });

    it("keeps a pending tombstone, so a queued delete still reaches the server", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(tombstone("user-1", "ann-1"));

      await store.clearSynced("user-1");

      expect(await store.get("user-1", "ann-1")).not.toBeNull();
    });

    it("leaves another account's rows alone", async () => {
      const store = createInMemoryAnnotationStore();
      await store.put(syncedRow("user-2", makeAnnotation("theirs")));

      await store.clearSynced("user-1");

      expect(await store.get("user-2", "theirs")).not.toBeNull();
    });
  });
});
