import { signal } from "@preact/signals";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  createInMemoryReadingHistoryStore,
  type OfflineReadingHistoryStore,
} from "@packages/seed-bible/seed-bible/managers/OfflineReadingHistoryStore";
import type { ReadingEvent } from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";
import {
  createReadingHistorySyncManager,
  type ReadingHistorySyncManager,
} from "@packages/seed-bible/seed-bible/managers/ReadingHistorySyncManager";

const HALF_HOUR = 30 * 60;
const IN_2025 = Math.floor(Date.UTC(2025, 11, 31, 12) / 1000);
const IN_2026 = Math.floor(Date.UTC(2026, 5, 15, 12) / 1000);

/** A `LoginManager` stub with just the signal the sync manager reads. */
function fakeLogin(userId: string | null) {
  const userIdSignal = signal<string | null>(userId);
  return {
    login: { userId: userIdSignal } as unknown as LoginManager,
    setUserId: (next: string | null) => {
      userIdSignal.value = next;
    },
  };
}

/**
 * Records what each year's document was asked to take.
 *
 * Failures are settable per year as well as across the board, because a pass
 * covering two years has to be able to lose one of them and keep the other —
 * one unreachable document must not take the whole backlog down with it.
 */
function recordingWriter() {
  const writes: { recordName: string; year: number; events: ReadingEvent[] }[] =
    [];
  let failWith: Error | null = null;
  let disconnected = false;
  const failuresByYear = new Map<number, Error>();
  let gate: Promise<void> | null = null;
  let openGate: (() => void) | null = null;
  return {
    writes,

    /**
     * Holds every write open until {@link release} is called, so a second
     * `sync()` can be made to arrive while the first pass is still in flight
     * rather than relying on timing to overlap them.
     */
    block: () => {
      gate = new Promise<void>((resolve) => {
        openGate = resolve;
      });
    },

    release: () => {
      openGate?.();
      gate = null;
      openGate = null;
    },

    /** Fails every year's write. */
    failWith: (error: Error | null) => {
      failWith = error;
    },

    /** Fails just this year's write, leaving other years working. Null clears it. */
    failYear: (year: number, error: Error | null) => {
      if (error) {
        failuresByYear.set(year, error);
      } else {
        failuresByYear.delete(year);
      }
    },

    /**
     * Takes writes without complaint, but reports the document was not
     * connected.
     *
     * This is what an offline write actually looks like: the events go into a
     * document held in memory and nothing throws, because the edit is local.
     * Only the document's own status says the server never saw them.
     */
    acceptButDisconnected: (value: boolean) => {
      disconnected = value;
    },

    /** Every event written to one year, across all of that year's writes. */
    eventsFor: (year: number): ReadingEvent[] =>
      writes.filter((w) => w.year === year).flatMap((w) => w.events),

    writeEvents: async (
      recordName: string,
      year: number,
      events: readonly ReadingEvent[]
    ) => {
      const failure = failWith ?? failuresByYear.get(year);
      if (failure) {
        throw failure;
      }
      // Recorded before the wait, so a test can see the write has been reached
      // while it is still being held open.
      writes.push({ recordName, year, events: [...events] });
      if (gate) {
        await gate;
      }
      return { synced: !disconnected };
    },
  };
}

function onLineGetter() {
  return vi.spyOn(navigator, "onLine", "get");
}
let onLineSpy: ReturnType<typeof onLineGetter> | null = null;

/**
 * Puts the browser into the state a real connection change produces.
 *
 * Dispatching the event on its own leaves `navigator.onLine` saying the
 * opposite, which no browser does — and the manager reads both, so a test that
 * only fires the event is testing a state that cannot happen.
 *
 * `announce: false` is the case that matters most: the connection returns but
 * the event never arrives.
 */
function setOnline(
  online: boolean,
  { announce = true }: { announce?: boolean } = {}
): void {
  onLineSpy ??= onLineGetter();
  onLineSpy.mockReturnValue(online);
  if (announce) {
    window.dispatchEvent(new Event(online ? "online" : "offline"));
  }
}

afterEach(() => {
  onLineSpy?.mockRestore();
  onLineSpy = null;
});

/** Polls until `check()` is true, or throws after `timeoutMs`. */
async function waitForCondition(
  check: () => boolean | Promise<boolean>,
  timeoutMs = 1000
): Promise<void> {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitForCondition timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

/**
 * Drains the microtask queue so anything a dispatched event set going has run.
 *
 * Used where the expectation is that *nothing* happens, which has no condition
 * to poll for. Every await in a pass over the in-memory store resolves as a
 * microtask, and the queue is drained to exhaustion — including whatever those
 * microtasks queue in turn — before a timer callback runs. So yielding once to
 * the macrotask queue means "the pass would have finished by now" without
 * guessing at a duration, or at how many turns it takes.
 */
async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("ReadingHistorySyncManager", () => {
  let store: OfflineReadingHistoryStore;
  let writer: ReturnType<typeof recordingWriter>;
  let manager: ReadingHistorySyncManager | null;

  beforeEach(() => {
    store = createInMemoryReadingHistoryStore();
    writer = recordingWriter();
    manager = null;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    manager?.dispose();
    vi.restoreAllMocks();
  });

  const create = (
    userId: string | null,
    overrides: Partial<
      Parameters<typeof createReadingHistorySyncManager>[0]
    > = {}
  ) => {
    const { login, setUserId } = fakeLogin(userId);
    manager = createReadingHistorySyncManager({
      login,
      store,
      writeEvents: writer.writeEvents,
      nowSeconds: () => IN_2026,
      ...overrides,
    });
    return { manager, setUserId };
  };

  const record = (endSeconds: number, chapter = 1, userId = "user-1") =>
    store.recordReadingSpan({
      userId,
      bookId: "GEN",
      chapter,
      startSeconds: endSeconds,
      endSeconds,
      joinThresholdSeconds: HALF_HOUR,
    });

  it("replays events recorded before this load, grouped by year", async () => {
    await record(IN_2025);
    await record(IN_2026, 2);

    const { manager: sync } = create("user-1");
    await sync.sync();

    expect(writer.writes.map((w) => w.year).sort()).toEqual([2025, 2026]);
    expect(writer.writes.every((w) => w.recordName === "user-1")).toBe(true);

    // Which events went into which year, not just that both years were written
    // to: bundling every row into one year's document would still produce the
    // right two year numbers.
    expect(writer.eventsFor(2025)).toEqual([
      {
        userId: "user-1",
        bookId: "GEN",
        chapter: 1,
        start: IN_2025,
        end: IN_2025,
      },
    ]);
    expect(writer.eventsFor(2026)).toEqual([
      {
        userId: "user-1",
        bookId: "GEN",
        chapter: 2,
        start: IN_2026,
        end: IN_2026,
      },
    ]);
    expect(await store.listPending("user-1")).toEqual([]);
  });

  it("keeps only the unreachable year queued when another year lands", async () => {
    const stranded = await record(IN_2025);
    const landed = await record(IN_2026, 2);
    writer.failYear(2025, new Error("no connection"));

    const { manager: sync } = create("user-1");
    await sync.sync();

    // 2026 got through, so its row is done; 2025 did not, so its row waits.
    expect(writer.writes.map((w) => w.year)).toEqual([2026]);
    expect((await store.listPending("user-1")).map((r) => r.key)).toEqual([
      stranded.key,
    ]);
    expect(sync.pendingCount.value).toBe(1);

    // And once the year is reachable again, the stranded row lands without
    // 2026's being pushed a second time.
    writer.failYear(2025, null);
    await sync.sync();

    expect(writer.eventsFor(2026)).toHaveLength(1);
    expect(writer.eventsFor(2025)).toHaveLength(1);
    expect(await store.listPending("user-1")).toEqual([]);
    expect(landed.key).not.toBe(stranded.key);
  });

  it("replays on the first resolution of the signed-in user", async () => {
    await record(IN_2026);

    const { setUserId } = create(null);
    expect(writer.writes).toHaveLength(0);

    setUserId("user-1");
    await waitForCondition(() => writer.writes.length > 0);

    expect(writer.writes).toHaveLength(1);
    expect(await store.listPending("user-1")).toEqual([]);
  });

  it("joins the pass already running instead of pushing the batch twice", async () => {
    await record(IN_2026);
    const { manager: sync } = create("user-1");

    // The manager calls `sync()` opportunistically after every successful push,
    // so a second call landing mid-pass is the normal case, not a rare race.
    writer.block();
    const first = sync.sync();
    await waitForCondition(() => writer.writes.length > 0);
    const second = sync.sync();
    writer.release();
    await Promise.all([first, second]);

    expect(writer.writes).toHaveLength(1);
    expect(await store.listPending("user-1")).toEqual([]);
  });

  it("keeps events queued when the document can't be reached", async () => {
    const row = await record(IN_2026);
    writer.failWith(new Error("no connection"));

    const { manager: sync } = create("user-1");
    await sync.sync();

    expect((await store.listPending("user-1")).map((r) => r.key)).toEqual([
      row.key,
    ]);
    expect(sync.pendingCount.value).toBe(1);
    expect(sync.lastError.value).toBe("2026: no connection");
  });

  it("names every year a pass couldn't reach, not just the last one", async () => {
    await record(IN_2025);
    await record(IN_2026, 2);
    writer.failYear(2025, new Error("session expired"));
    writer.failYear(2026, new Error("no connection"));

    const { manager: sync } = create("user-1");
    await sync.sync();

    // Two years can fail one pass for two different reasons, and being told
    // only about the second one hides the first.
    expect(sync.lastError.value).toContain("2025: session expired");
    expect(sync.lastError.value).toContain("2026: no connection");
    expect(sync.pendingCount.value).toBe(2);
  });

  it("pushes the years together rather than one after another", async () => {
    await record(IN_2025);
    await record(IN_2026, 2);

    const { manager: sync } = create("user-1");
    writer.block();
    const pass = sync.sync();
    // Both documents are reached while the first write is still open. A year
    // that waited for the one before it would leave the second unstarted here,
    // making a backlog take one round trip per year to drain.
    await waitForCondition(() => writer.writes.length === 2);
    writer.release();
    await pass;

    expect(await store.listPending("user-1")).toEqual([]);
  });

  it("keeps a row queued when the write went into a disconnected document", async () => {
    const row = await record(IN_2026);
    // Nothing throws: writing an event is a local edit to a document held in
    // memory, and that works with the network unplugged. Only the document's
    // own status tells us the server never saw it.
    writer.acceptButDisconnected(true);

    const { manager: sync } = create("user-1");
    await sync.sync();

    // Clearing `pendingOp` here would record the server as holding an event it
    // has never seen, and nothing would push it again — the reading would be
    // lost the moment the page went away.
    expect((await store.listPending("user-1")).map((r) => r.key)).toEqual([
      row.key,
    ]);
    expect(sync.pendingCount.value).toBe(1);

    // And it goes out for real once the connection is back.
    writer.acceptButDisconnected(false);
    await sync.sync();
    expect(await store.listPending("user-1")).toEqual([]);
  });

  it("replays a failed event once it can reach the document again", async () => {
    await record(IN_2026);
    writer.failWith(new Error("no connection"));

    const { manager: sync } = create("user-1");
    await sync.sync();
    expect(sync.pendingCount.value).toBe(1);

    writer.failWith(null);
    await sync.sync();

    expect(writer.writes).toHaveLength(1);
    expect(sync.pendingCount.value).toBe(0);
    expect(sync.lastError.value).toBeNull();
  });

  it("replays when the browser comes back online", async () => {
    await record(IN_2026);
    // Offline before the manager exists, so the sign-in pass can't be the thing
    // that drains it.
    setOnline(false);
    const { manager: sync } = create("user-1");
    await sync.sync();
    expect(writer.writes).toHaveLength(0);

    setOnline(true);
    await waitForCondition(() => writer.writes.length > 0);

    expect(sync.isOnline.value).toBe(true);
  });

  it("drains a backlog even if the `online` event never arrives", async () => {
    await record(IN_2026);
    setOnline(false);
    const { manager: sync } = create("user-1");
    await sync.sync();
    expect(writer.writes).toHaveLength(0);

    // The connection is back but nothing announced it. Going by the last event
    // heard would keep this gate shut for the rest of the page load: every
    // later pass returns immediately, and a backlog recorded offline stays
    // queued until the tab is closed and reopened.
    setOnline(true, { announce: false });
    await sync.sync();

    expect(writer.writes).toHaveLength(1);
    expect(await store.listPending("user-1")).toEqual([]);
    expect(sync.isOnline.value).toBe(true);
  });

  it("does nothing while the browser reports no connection", async () => {
    await record(IN_2026);
    setOnline(false);
    const { manager: sync } = create("user-1");

    await sync.sync();

    expect(writer.writes).toHaveLength(0);
    expect((await store.listPending("user-1")).length).toBe(1);
  });

  it("stops listening once disposed", async () => {
    await record(IN_2026);
    setOnline(false);
    const { manager: sync } = create("user-1");

    // Coming back online drives a pass while the listener is attached, so the
    // assertion after disposing is about the disposing and not about the event
    // having been inert all along.
    setOnline(true);
    await waitForCondition(() => writer.writes.length === 1);

    setOnline(false);
    sync.dispose();
    manager = null;
    await record(IN_2026, 2);

    setOnline(true);
    await flushMicrotasks();

    expect(writer.writes).toHaveLength(1);
    expect((await store.listPending("user-1")).length).toBe(1);

    // Nor by asking directly. A disposed manager reports into signals nothing is
    // watching any more, so it does no work at all rather than some of it.
    await sync.sync();
    expect(writer.writes).toHaveLength(1);
  });

  it("prunes long-synced events after a complete pass", async () => {
    const stale = await record(IN_2026 - 500 * 24 * 60 * 60);
    const recent = await record(IN_2026, 2);

    const { manager: sync } = create("user-1");
    await sync.sync();

    const rows = await store.listForWindow("user-1", 0, IN_2026 + 1);
    expect(rows.map((r) => r.key)).toEqual([recent.key]);
    expect(rows.map((r) => r.key)).not.toContain(stale.key);
  });

  it("never prunes an event the server still doesn't have", async () => {
    const stale = await record(IN_2026 - 500 * 24 * 60 * 60);
    writer.failWith(new Error("no connection"));

    const { manager: sync } = create("user-1");
    await sync.sync();

    // Old enough to prune, but it has never been pushed, so this device holds
    // the only copy of it.
    expect(
      (await store.listForWindow("user-1", 0, IN_2026 + 1)).map((r) => r.key)
    ).toEqual([stale.key]);
  });

  it("prunes the years that landed even while one stays unreachable", async () => {
    const stale = await record(IN_2026 - 500 * 24 * 60 * 60);
    await store.markSynced([{ key: stale.key, end: stale.end }]);
    const stranded = await record(IN_2026, 2);
    writer.failYear(2026, new Error("no connection"));

    const { manager: sync } = create("user-1");
    await sync.sync();

    expect((await store.listPending("user-1")).map((r) => r.key)).toEqual([
      stranded.key,
    ]);
    // A year that can never be reached again must not switch pruning off for
    // every other year, or the store grows forever.
    expect(
      (await store.listForWindow("user-1", 0, IN_2026 + 1)).map((r) => r.key)
    ).toEqual([stranded.key]);
  });

  it("doesn't report a queue it couldn't read as an empty one", async () => {
    await record(IN_2026);
    const unreadable: OfflineReadingHistoryStore = {
      ...store,
      listPending: () => Promise.reject(new Error("storage blocked")),
    };

    const { manager: sync } = create("user-1", { store: unreadable });
    await sync.refreshPendingCount();

    // The drain after a successful push is gated on this count, so answering
    // zero for a read that simply failed strands the backlog.
    expect(sync.pendingCount.value).toBeGreaterThan(0);
  });

  it("doesn't report a failed prune as a failed sync", async () => {
    await record(IN_2026);
    const storeThatCantPrune: OfflineReadingHistoryStore = {
      ...store,
      prune: () => Promise.reject(new Error("storage full")),
    };

    const { manager: sync } = create("user-1", { store: storeThatCantPrune });
    await sync.sync();

    // The event reached the server; only the local housekeeping afterwards
    // failed, and saying "sync failed" for that is simply wrong.
    expect(writer.writes).toHaveLength(1);
    expect(await storeThatCantPrune.listPending("user-1")).toEqual([]);
    expect(sync.lastError.value).toBeNull();
  });

  it("keeps unsynced events on sign-out and drops the synced ones", async () => {
    const synced = await record(IN_2026 - HALF_HOUR * 4);
    await store.markSynced([{ key: synced.key, end: synced.end }]);
    const pending = await record(IN_2026, 2);
    // The replay has to stay blocked, or it would land `pending` on the server
    // and sign-out would then be entitled to drop it too.
    writer.failWith(new Error("no connection"));

    const { setUserId } = create("user-1");
    setUserId(null);
    await waitForCondition(
      async () =>
        (await store.listForWindow("user-1", 0, IN_2026 + 1)).length === 1
    );

    const rows = await store.listForWindow("user-1", 0, IN_2026 + 1);
    expect(rows.map((r) => r.key)).toEqual([pending.key]);
  });

  it("does nothing at all when the device can't keep a local store", async () => {
    const { manager: sync } = create("user-1", { store: null });

    await sync.sync();

    expect(writer.writes).toHaveLength(0);
    expect(sync.pendingCount.value).toBe(0);
  });
});
