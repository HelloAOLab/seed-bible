import type { Annotation } from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import {
  createInMemoryRecordStore,
  createIndexedDbRecordStore,
  LOCAL_OWNER,
  migrateV1Listed,
  migrateV1Row,
  syncedRow,
  type StoredRecord,
} from "@packages/seed-bible/seed-bible/managers/OfflineRecordStore";

const COLLECTION = "GEN/1";

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

function synced(
  owner: string,
  annotation: Annotation
): StoredRecord<Annotation> {
  return syncedRow(owner, annotation.id, COLLECTION, annotation);
}

function pendingRow(
  owner: string,
  annotation: Annotation,
  overrides: Partial<StoredRecord<Annotation>> = {}
): StoredRecord<Annotation> {
  return {
    ...synced(owner, annotation),
    pendingOp: "upsert",
    base: null,
    ...overrides,
  };
}

function tombstone(
  owner: string,
  address: string,
  overrides: Partial<StoredRecord<Annotation>> = {}
): StoredRecord<Annotation> {
  return {
    key: `${owner}/${address}`,
    owner,
    address,
    collection: COLLECTION,
    payload: null,
    base: makeAnnotation(address),
    deleted: true,
    updatedAtMs: 5_000,
    pendingOp: "delete",
    attempts: 0,
    ...overrides,
  };
}

describe("createIndexedDbRecordStore()", () => {
  it("returns null where IndexedDB is unavailable, so callers can fall back", () => {
    // jsdom provides no IndexedDB, which is the same situation as server-side
    // rendering and browsers that block storage.
    expect(typeof indexedDB).toBe("undefined");
    expect(createIndexedDbRecordStore("seed-bible-annotations")).toBeNull();
  });
});

describe("migrateV1Row()", () => {
  const legacy = {
    key: "user-1/ann-1",
    owner: "user-1",
    annotationId: "ann-1",
    bookId: "GEN",
    chapterNumber: 1,
    annotation: makeAnnotation("ann-1"),
    deleted: false,
    updatedAtMs: 9_000,
    baseUpdatedAtMs: null as number | null,
    baseFingerprint: null as string | null,
    pendingOp: null as "upsert" | "delete" | null,
    attempts: 0,
  };

  it("keys the row by address and collection", () => {
    const row = migrateV1Row(legacy);
    expect(row.address).toBe("ann-1");
    expect(row.collection).toBe("GEN/1");
    expect(row.payload).toEqual(makeAnnotation("ann-1"));
  });

  it("rebuilds the base from the annotation when the server had a copy", () => {
    const row = migrateV1Row({
      ...legacy,
      baseFingerprint: "fp",
      pendingOp: "upsert",
    });
    expect(row.base).toEqual(makeAnnotation("ann-1"));
  });

  it("leaves the base null for a note that never reached the server", () => {
    const row = migrateV1Row({ ...legacy, pendingOp: "upsert" });
    expect(row.base).toBeNull();
  });
});

describe("migrateV1Listed()", () => {
  it("re-keys a chapter marker as a collection", () => {
    expect(
      migrateV1Listed({
        key: "user-1/GEN/1",
        owner: "user-1",
        bookId: "GEN",
        chapterNumber: 1,
        listedAtMs: 7,
      })
    ).toEqual({
      key: "user-1/GEN/1",
      owner: "user-1",
      collection: "GEN/1",
      listedAtMs: 7,
    });
  });
});

describe("createInMemoryRecordStore<Annotation>()", () => {
  it("round-trips a row", async () => {
    const store = createInMemoryRecordStore<Annotation>();
    const row = pendingRow("user-1", makeAnnotation("ann-1"));

    await store.put(row);

    expect(await store.get("user-1", "ann-1")).toEqual(row);
  });

  it("returns null for a record this device has never seen", async () => {
    const store = createInMemoryRecordStore<Annotation>();

    expect(await store.get("user-1", "missing")).toBeNull();
  });

  it("scopes rows to their owner", async () => {
    const store = createInMemoryRecordStore<Annotation>();
    await store.put(pendingRow("user-1", makeAnnotation("ann-1")));
    await store.put(pendingRow("user-2", makeAnnotation("ann-2")));

    const forUser1 = await store.listForCollection("user-1", COLLECTION);

    expect(forUser1.map((r) => r.address)).toEqual(["ann-1"]);
  });

  it("scopes rows to their collection", async () => {
    const store = createInMemoryRecordStore<Annotation>();
    await store.put(pendingRow("user-1", makeAnnotation("ann-1")));
    await store.put(
      pendingRow(
        "user-1",
        makeAnnotation("ann-2", { bookId: "EXO", chapterNumber: 3 }),
        { collection: "EXO/3" }
      )
    );

    const genesis = await store.listForCollection("user-1", COLLECTION);

    expect(genesis.map((r) => r.address)).toEqual(["ann-1"]);
  });

  it("keeps tombstones in the collection listing so callers can filter them", async () => {
    const store = createInMemoryRecordStore<Annotation>();
    await store.put(tombstone("user-1", "ann-1"));

    const rows = await store.listForCollection("user-1", COLLECTION);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.deleted).toBe(true);
    expect(rows[0]?.payload).toBeNull();
  });

  it("removes a row entirely on delete, leaving no tombstone", async () => {
    const store = createInMemoryRecordStore<Annotation>();
    await store.put(pendingRow("user-1", makeAnnotation("ann-1")));

    await store.delete("user-1", "ann-1");

    expect(await store.get("user-1", "ann-1")).toBeNull();
  });

  describe("listPending()", () => {
    it("excludes rows that already match the server", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(synced("user-1", makeAnnotation("synced")));
      await store.put(pendingRow("user-1", makeAnnotation("waiting")));

      const pending = await store.listPending("user-1");

      expect(pending.map((r) => r.address)).toEqual(["waiting"]);
    });

    it("includes pending deletes alongside pending upserts", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(
        pendingRow("user-1", makeAnnotation("edit"), { updatedAtMs: 1 })
      );
      await store.put(tombstone("user-1", "gone", { updatedAtMs: 2 }));

      const pending = await store.listPending("user-1");

      expect(pending.map((r) => r.address)).toEqual(["edit", "gone"]);
    });

    it("returns oldest change first, so a burst of edits pushes in order", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(
        pendingRow("user-1", makeAnnotation("second"), { updatedAtMs: 200 })
      );
      await store.put(
        pendingRow("user-1", makeAnnotation("first"), { updatedAtMs: 100 })
      );

      const pending = await store.listPending("user-1");

      expect(pending.map((r) => r.address)).toEqual(["first", "second"]);
    });

    it("does not leak another account's pending work", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(pendingRow("user-2", makeAnnotation("theirs")));

      expect(await store.listPending("user-1")).toEqual([]);
    });
  });

  describe("getListed()", () => {
    it("is null until the collection has been listed, telling 'empty' from 'unfetched'", async () => {
      const store = createInMemoryRecordStore<Annotation>();

      expect(await store.getListed("user-1", COLLECTION)).toBeNull();

      await store.reconcileCollection("user-1", COLLECTION, [], 1_234);

      expect(await store.getListed("user-1", COLLECTION)).toMatchObject({
        owner: "user-1",
        collection: COLLECTION,
        listedAtMs: 1_234,
      });
    });
  });

  describe("reconcileCollection()", () => {
    it("stores the server's records as synced, with the base pointer set", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      const annotation = makeAnnotation("ann-1");

      await store.reconcileCollection(
        "user-1",
        COLLECTION,
        [{ address: "ann-1", payload: annotation }],
        1
      );

      const row = await store.get("user-1", "ann-1");
      expect(row?.pendingOp).toBeNull();
      expect(row?.base).toEqual(annotation);
    });

    it("leaves a pending row alone, so an unsent edit is not overwritten", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      const mine = makeAnnotation("ann-1", {
        data: { type: "comment", html: "<p>mine</p>", updatedAtMs: 9_000 },
      });
      await store.put(pendingRow("user-1", mine));

      await store.reconcileCollection(
        "user-1",
        COLLECTION,
        [{ address: "ann-1", payload: makeAnnotation("ann-1") }],
        1
      );

      const row = await store.get("user-1", "ann-1");
      expect(row?.pendingOp).toBe("upsert");
      expect(row?.payload?.data.html).toBe("<p>mine</p>");
    });

    it("drops a synced row the server no longer has, i.e. deleted elsewhere", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(synced("user-1", makeAnnotation("ann-1")));

      await store.reconcileCollection("user-1", COLLECTION, [], 1);

      expect(await store.get("user-1", "ann-1")).toBeNull();
    });

    it("keeps a pending row the server does not have, leaving the decision to sync", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(pendingRow("user-1", makeAnnotation("ann-1")));

      await store.reconcileCollection("user-1", COLLECTION, [], 1);

      expect(await store.get("user-1", "ann-1")).not.toBeNull();
    });

    it("keeps a pending tombstone the server still has", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(tombstone("user-1", "ann-1"));

      await store.reconcileCollection(
        "user-1",
        COLLECTION,
        [{ address: "ann-1", payload: makeAnnotation("ann-1") }],
        1
      );

      const row = await store.get("user-1", "ann-1");
      expect(row?.pendingOp).toBe("delete");
      expect(row?.deleted).toBe(true);
    });

    it("does not overwrite an edit that lands while it is running", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      const serverCopy = makeAnnotation("ann-1");
      await store.put(synced("user-1", serverCopy));

      const mine = makeAnnotation("ann-1");
      mine.data.html = "<p>mine</p>";

      // Fired without awaiting, then a local edit is queued behind it. Reading
      // the rows and writing them back has to be one atomic step: reading first
      // and writing after a yield let this edit land in the gap, look unpending
      // to the reconcile, and get replaced by the server's older copy.
      const reconciling = store.reconcileCollection(
        "user-1",
        COLLECTION,
        [{ address: "ann-1", payload: serverCopy }],
        1
      );
      await store.put({
        ...synced("user-1", mine),
        pendingOp: "upsert",
        updatedAtMs: 9_999,
      });
      await reconciling;

      const row = await store.get("user-1", "ann-1");
      expect(row?.payload?.data.html).toBe("<p>mine</p>");
      expect(row?.pendingOp).toBe("upsert");
    });

    it("does not touch another collection's rows", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put({
        ...synced(
          "user-1",
          makeAnnotation("other", { bookId: "EXO", chapterNumber: 3 })
        ),
        collection: "EXO/3",
      });

      await store.reconcileCollection("user-1", COLLECTION, [], 1);

      expect(await store.get("user-1", "other")).not.toBeNull();
    });
  });

  describe("adoptLocalRows()", () => {
    it("re-keys signed-out rows onto the account and empties the local bucket", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(pendingRow(LOCAL_OWNER, makeAnnotation("draft")));

      const adopted = await store.adoptLocalRows("user-1");

      expect(adopted.map((r) => r.owner)).toEqual(["user-1"]);
      expect(await store.get(LOCAL_OWNER, "draft")).toBeNull();
      expect(await store.get("user-1", "draft")).not.toBeNull();
    });

    it("marks adopted rows as fresh creates when the account has no existing row", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(
        pendingRow(LOCAL_OWNER, makeAnnotation("draft"), { attempts: 3 })
      );

      const [adopted] = await store.adoptLocalRows("user-1");

      expect(adopted?.pendingOp).toBe("upsert");
      expect(adopted?.base).toBeNull();
      expect(adopted?.attempts).toBe(0);
    });

    it("keeps the account's existing base so the push is a three-way merge", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      const server = makeAnnotation("ann-1");
      await store.put(synced("user-1", server));
      await store.put(
        pendingRow(
          LOCAL_OWNER,
          makeAnnotation("ann-1", {
            data: { ...server.data, html: "<p>local</p>" },
          })
        )
      );

      const [adopted] = await store.adoptLocalRows("user-1");

      expect(adopted?.base).toEqual(server);
      expect(adopted?.pendingOp).toBe("upsert");
      expect((await store.get("user-1", "ann-1"))?.payload?.data.html).toBe(
        "<p>local</p>"
      );
    });

    it("discards a signed-out tombstone, which refers to nothing on any server", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(tombstone(LOCAL_OWNER, "never-sent"));

      const adopted = await store.adoptLocalRows("user-1");

      expect(adopted).toEqual([]);
      expect(await store.get(LOCAL_OWNER, "never-sent")).toBeNull();
      expect(await store.get("user-1", "never-sent")).toBeNull();
    });

    it("cannot adopt the same drafts twice, so a second account can't inherit them", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(pendingRow(LOCAL_OWNER, makeAnnotation("draft")));

      await store.adoptLocalRows("user-1");
      const second = await store.adoptLocalRows("user-2");

      expect(second).toEqual([]);
      expect(await store.get("user-2", "draft")).toBeNull();
      expect(await store.get("user-1", "draft")).not.toBeNull();
    });

    it("leaves rows that already belong to an account alone", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(synced("user-2", makeAnnotation("theirs")));

      await store.adoptLocalRows("user-1");

      expect(await store.get("user-2", "theirs")).not.toBeNull();
    });
  });

  describe("clearSynced()", () => {
    it("drops synced rows but keeps unsent writing", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(synced("user-1", makeAnnotation("synced")));
      await store.put(pendingRow("user-1", makeAnnotation("unsent")));

      await store.clearSynced("user-1");

      expect(await store.get("user-1", "synced")).toBeNull();
      expect(await store.get("user-1", "unsent")).not.toBeNull();
    });

    it("keeps a pending tombstone, so a queued delete still reaches the server", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(tombstone("user-1", "ann-1"));

      await store.clearSynced("user-1");

      expect(await store.get("user-1", "ann-1")).not.toBeNull();
    });

    it("leaves another account's rows alone", async () => {
      const store = createInMemoryRecordStore<Annotation>();
      await store.put(synced("user-2", makeAnnotation("theirs")));

      await store.clearSynced("user-1");

      expect(await store.get("user-2", "theirs")).not.toBeNull();
    });
  });
});
