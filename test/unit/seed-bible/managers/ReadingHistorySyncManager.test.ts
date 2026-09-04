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

/** Records what each year's document was asked to take. */
function recordingWriter() {
  const writes: { recordName: string; year: number; events: ReadingEvent[] }[] =
    [];
  let failWith: Error | null = null;
  return {
    writes,
    failWith: (error: Error | null) => {
      failWith = error;
    },
    writeEvents: async (
      recordName: string,
      year: number,
      events: readonly ReadingEvent[]
    ) => {
      if (failWith) {
        throw failWith;
      }
      writes.push({ recordName, year, events: [...events] });
    },
  };
}

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
 * Lets the queued work settle when the expectation is that *nothing* happens,
 * so there is no condition to poll for.
 */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20));
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

  const record = (atSeconds: number, chapter = 1, userId = "user-1") =>
    store.recordReading({
      userId,
      bookId: "GEN",
      chapter,
      atSeconds,
      recencyThresholdSeconds: HALF_HOUR,
    });

  it("replays events recorded before this load, grouped by year", async () => {
    await record(IN_2025);
    await record(IN_2026, 2);

    const { manager: sync } = create("user-1");
    await sync.sync();

    expect(writer.writes.map((w) => w.year).sort()).toEqual([2025, 2026]);
    expect(writer.writes.every((w) => w.recordName === "user-1")).toBe(true);
    expect(await store.listPending("user-1")).toEqual([]);
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

  it("keeps events queued when the document can't be reached", async () => {
    const row = await record(IN_2026);
    writer.failWith(new Error("no connection"));

    const { manager: sync } = create("user-1");
    await sync.sync();

    expect((await store.listPending("user-1")).map((r) => r.key)).toEqual([
      row.key,
    ]);
    expect(sync.pendingCount.value).toBe(1);
    expect(sync.lastError.value).toBe("no connection");
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
    const { manager: sync } = create("user-1");
    // Start offline so the sign-in pass can't be the thing that drains it.
    window.dispatchEvent(new Event("offline"));
    await sync.sync();
    expect(writer.writes).toHaveLength(0);

    window.dispatchEvent(new Event("online"));
    await waitForCondition(() => writer.writes.length > 0);

    expect(sync.isOnline.value).toBe(true);
  });

  it("does nothing while the browser reports no connection", async () => {
    await record(IN_2026);
    const { manager: sync } = create("user-1");

    window.dispatchEvent(new Event("offline"));
    await sync.sync();

    expect(writer.writes).toHaveLength(0);
    expect((await store.listPending("user-1")).length).toBe(1);
  });

  it("stops listening once disposed", async () => {
    await record(IN_2026);
    const { manager: sync } = create("user-1");
    window.dispatchEvent(new Event("offline"));
    sync.dispose();
    manager = null;

    window.dispatchEvent(new Event("online"));
    await settle();

    expect(writer.writes).toHaveLength(0);
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

  it("does not prune while anything is still queued", async () => {
    const stale = await record(IN_2026 - 500 * 24 * 60 * 60);
    writer.failWith(new Error("no connection"));

    const { manager: sync } = create("user-1");
    await sync.sync();

    expect(
      (await store.listForWindow("user-1", 0, IN_2026 + 1)).map((r) => r.key)
    ).toEqual([stale.key]);
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
