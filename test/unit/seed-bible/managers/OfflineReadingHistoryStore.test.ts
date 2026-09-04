import {
  createIndexedDbReadingHistoryStore,
  createInMemoryReadingHistoryStore,
  extendOrCreateReadingRow,
  readingEventYear,
  storedReadingEventKey,
  toReadingEvent,
  type OfflineReadingHistoryStore,
  type StoredReadingEvent,
} from "@packages/seed-bible/seed-bible/managers/OfflineReadingHistoryStore";

const HALF_HOUR = 30 * 60;
/** 2026-06-15T12:00:00Z, comfortably inside one UTC year. */
const NOON = Math.floor(Date.UTC(2026, 5, 15, 12, 0, 0) / 1000);

/**
 * One stretch of reading. `atSeconds` is shorthand for a stretch that begins and
 * ends at the same moment, which is what the reader's very first tick on a
 * chapter looks like.
 */
function span(overrides: {
  userId?: string;
  bookId?: string;
  chapter?: number;
  atSeconds?: number;
  startSeconds?: number;
  endSeconds?: number;
  joinThresholdSeconds?: number;
}) {
  const { atSeconds, ...rest } = overrides;
  return {
    userId: "user-1",
    bookId: "GEN",
    chapter: 1,
    joinThresholdSeconds: HALF_HOUR,
    startSeconds: atSeconds ?? 0,
    endSeconds: atSeconds ?? 0,
    ...rest,
  };
}

describe("createIndexedDbReadingHistoryStore()", () => {
  it("returns null where IndexedDB is unavailable, so callers can fall back", () => {
    // jsdom provides no IndexedDB, which is the same situation as server-side
    // rendering and browsers that block storage. Callers treat null as "this
    // device can't hold reading events locally" and write straight to the year
    // document instead.
    expect(typeof indexedDB).toBe("undefined");
    expect(createIndexedDbReadingHistoryStore()).toBeNull();
  });
});

describe("OfflineReadingHistoryStore", () => {
  let store: OfflineReadingHistoryStore;

  beforeEach(() => {
    store = createInMemoryReadingHistoryStore();
  });

  describe("recordReadingSpan", () => {
    it("records a tick as a pending event that starts and ends now", async () => {
      const row = await store.recordReadingSpan(span({ atSeconds: NOON }));

      expect(row).toEqual({
        key: `user-1/2026/GEN/1/${NOON}`,
        userId: "user-1",
        year: 2026,
        bookId: "GEN",
        chapter: 1,
        start: NOON,
        end: NOON,
        pendingOp: "append",
      } satisfies StoredReadingEvent);
    });

    it("extends the same event while reading continues", async () => {
      await store.recordReadingSpan(span({ atSeconds: NOON }));
      const row = await store.recordReadingSpan(span({ atSeconds: NOON + 5 }));

      expect(row.start).toBe(NOON);
      expect(row.end).toBe(NOON + 5);
      expect(await store.listForWindow("user-1", NOON - 1, NOON + 100)).toEqual(
        [row]
      );
    });

    it("starts a new event once the recency window has passed", async () => {
      await store.recordReadingSpan(span({ atSeconds: NOON }));
      const later = NOON + HALF_HOUR + 1;
      const row = await store.recordReadingSpan(span({ atSeconds: later }));

      expect(row.start).toBe(later);
      const rows = await store.listForWindow("user-1", NOON - 1, later + 1);
      expect(rows.map((r) => r.start)).toEqual([NOON, later]);
    });

    it("keeps each chapter's reading separate", async () => {
      await store.recordReadingSpan(span({ atSeconds: NOON, chapter: 1 }));
      await store.recordReadingSpan(span({ atSeconds: NOON + 5, chapter: 2 }));

      const rows = await store.listForWindow("user-1", NOON - 1, NOON + 100);
      expect(rows.map((r) => r.chapter)).toEqual([1, 2]);
    });

    it("does not re-queue a synced event when the tick moves nothing", async () => {
      const row = await store.recordReadingSpan(span({ atSeconds: NOON }));
      await store.markSynced([{ key: row.key, end: row.end }]);

      // A tick at the same second: the event's `end` is already there, so there
      // is nothing new for the server and the row should stay out of the queue.
      const again = await store.recordReadingSpan(span({ atSeconds: NOON }));

      expect(again.pendingOp).toBeNull();
      expect(await store.listPending("user-1")).toEqual([]);
    });

    it("re-queues a synced event when reading resumes inside the window", async () => {
      const row = await store.recordReadingSpan(span({ atSeconds: NOON }));
      await store.markSynced([{ key: row.key, end: row.end }]);

      const again = await store.recordReadingSpan(
        span({ atSeconds: NOON + 5 })
      );

      expect(again.pendingOp).toBe("append");
      expect((await store.listPending("user-1")).map((r) => r.end)).toEqual([
        NOON + 5,
      ]);
    });
  });

  describe("recordReadingSpan with a measured stretch", () => {
    it("stores the whole stretch, not just the moment it was reported", async () => {
      const row = await store.recordReadingSpan(
        span({ startSeconds: NOON, endSeconds: NOON + 45 * 60 })
      );

      expect(row.start).toBe(NOON);
      expect(row.end).toBe(NOON + 45 * 60);
    });

    it("joins the sitting it continues, judged from its own start", async () => {
      // What a long listen leaves behind: the event was opened when the chapter
      // was first shown, so by the time the listening is written it is older
      // than a window measured from the clock would allow.
      const opened = await store.recordReadingSpan(span({ atSeconds: NOON }));

      const row = await store.recordReadingSpan(
        span({
          startSeconds: NOON,
          endSeconds: NOON + 45 * 60,
          joinThresholdSeconds: 30,
        })
      );

      expect(row.key).toBe(opened.key);
      expect(row.start).toBe(NOON);
      expect(row.end).toBe(NOON + 45 * 60);
    });

    it("opens a new sitting for a stretch that starts after the gap", async () => {
      await store.recordReadingSpan(span({ atSeconds: NOON }));
      const resumed = NOON + 20 * 60;

      const row = await store.recordReadingSpan(
        span({
          startSeconds: resumed,
          endSeconds: resumed + 5,
          joinThresholdSeconds: 30,
        })
      );

      expect(row.start).toBe(resumed);
      const rows = await store.listForWindow("user-1", 0, resumed + 10);
      expect(rows.map((r) => r.end)).toEqual([NOON, resumed + 5]);
    });

    it("never shortens a sitting another writer has already extended", async () => {
      const listened = await store.recordReadingSpan(
        span({ startSeconds: NOON, endSeconds: NOON + 600 })
      );

      // A reader tick that was in flight while the listen was written.
      const row = await store.recordReadingSpan(
        span({ startSeconds: NOON + 100, endSeconds: NOON + 120 })
      );

      expect(row.key).toBe(listened.key);
      expect(row.end).toBe(NOON + 600);
    });
  });

  describe("listForWindow", () => {
    it("keeps events whose start is in the window, excluding the end bound", async () => {
      await store.recordReadingSpan(span({ atSeconds: NOON }));
      await store.recordReadingSpan(
        span({ atSeconds: NOON + HALF_HOUR + 1, chapter: 2 })
      );

      const rows = await store.listForWindow(
        "user-1",
        NOON,
        NOON + HALF_HOUR + 1
      );

      expect(rows.map((r) => r.start)).toEqual([NOON]);
    });

    it("returns nothing for another user", async () => {
      await store.recordReadingSpan(span({ atSeconds: NOON }));

      expect(await store.listForWindow("user-2", 0, NOON + 100)).toEqual([]);
    });
  });

  describe("listPending", () => {
    it("returns only unsynced events, oldest first", async () => {
      const first = await store.recordReadingSpan(span({ atSeconds: NOON }));
      const second = await store.recordReadingSpan(
        span({ atSeconds: NOON + HALF_HOUR + 1, chapter: 2 })
      );
      await store.markSynced([{ key: second.key, end: second.end }]);

      expect((await store.listPending("user-1")).map((r) => r.key)).toEqual([
        first.key,
      ]);
    });
  });

  describe("markSynced", () => {
    it("leaves the event queued when it grew while the push was in flight", async () => {
      const pushed = await store.recordReadingSpan(span({ atSeconds: NOON }));
      // Five seconds more reading landed before the push came back.
      await store.recordReadingSpan(span({ atSeconds: NOON + 5 }));

      await store.markSynced([{ key: pushed.key, end: pushed.end }]);

      const pending = await store.listPending("user-1");
      expect(pending.map((r) => r.end)).toEqual([NOON + 5]);
    });

    it("ignores an event that is no longer stored", async () => {
      await expect(
        store.markSynced([{ key: "user-1/2026/GEN/9/1", end: 1 }])
      ).resolves.toBeUndefined();
    });
  });

  describe("prune", () => {
    it("drops synced events that ended before the cutoff", async () => {
      const old = await store.recordReadingSpan(span({ atSeconds: NOON }));
      const recent = await store.recordReadingSpan(
        span({ atSeconds: NOON + HALF_HOUR + 1, chapter: 2 })
      );
      await store.markSynced([
        { key: old.key, end: old.end },
        { key: recent.key, end: recent.end },
      ]);

      await store.prune("user-1", NOON + 1);

      const rows = await store.listForWindow("user-1", 0, NOON + 10_000);
      expect(rows.map((r) => r.key)).toEqual([recent.key]);
    });

    it("never drops an event the server hasn't got", async () => {
      const row = await store.recordReadingSpan(span({ atSeconds: NOON }));

      await store.prune("user-1", NOON + 10_000);

      expect((await store.listPending("user-1")).map((r) => r.key)).toEqual([
        row.key,
      ]);
    });
  });

  describe("clearSynced", () => {
    it("keeps unsynced events and drops the rest", async () => {
      const synced = await store.recordReadingSpan(span({ atSeconds: NOON }));
      await store.markSynced([{ key: synced.key, end: synced.end }]);
      const pending = await store.recordReadingSpan(
        span({ atSeconds: NOON + HALF_HOUR + 1, chapter: 2 })
      );

      await store.clearSynced("user-1");

      const rows = await store.listForWindow("user-1", 0, NOON + 10_000);
      expect(rows.map((r) => r.key)).toEqual([pending.key]);
    });

    it("leaves another user's events alone", async () => {
      const other = await store.recordReadingSpan(
        span({ atSeconds: NOON, userId: "user-2" })
      );
      await store.markSynced([{ key: other.key, end: other.end }]);

      await store.clearSynced("user-1");

      expect(
        (await store.listForWindow("user-2", 0, NOON + 100)).map((r) => r.key)
      ).toEqual([other.key]);
    });
  });

  describe("helpers", () => {
    it("keys a row by user, year, book, chapter and start", () => {
      expect(
        storedReadingEventKey({
          userId: "user-1",
          year: 2026,
          bookId: "GEN",
          chapter: 3,
          start: 42,
        })
      ).toBe("user-1/2026/GEN/3/42");
    });

    it("buckets an event into its UTC year", () => {
      // 2026-01-01T00:30:00Z — the previous year in every timezone west of UTC.
      expect(
        readingEventYear(Math.floor(Date.UTC(2026, 0, 1, 0, 30) / 1000))
      ).toBe(2026);
    });

    it("strips sync bookkeeping off a row", () => {
      const row: StoredReadingEvent = {
        key: "user-1/2026/GEN/1/10",
        userId: "user-1",
        year: 2026,
        bookId: "GEN",
        chapter: 1,
        start: 10,
        end: 20,
        pendingOp: "append",
      };

      expect(toReadingEvent(row)).toEqual({
        userId: "user-1",
        bookId: "GEN",
        chapter: 1,
        start: 10,
        end: 20,
      });
    });

    it("extends the most recently started event, not the first one it finds", () => {
      const rows: StoredReadingEvent[] = [
        {
          key: "a",
          userId: "user-1",
          year: 2026,
          bookId: "GEN",
          chapter: 1,
          start: NOON - 600,
          end: NOON - 590,
          pendingOp: null,
        },
        {
          key: "b",
          userId: "user-1",
          year: 2026,
          bookId: "GEN",
          chapter: 1,
          start: NOON - 60,
          end: NOON - 50,
          pendingOp: null,
        },
      ];

      const { row, changed } = extendOrCreateReadingRow(
        rows,
        span({ atSeconds: NOON })
      );

      expect(changed).toBe(true);
      expect(row.key).toBe("b");
      expect(row.end).toBe(NOON);
    });
  });
});
