import {
  buildTimespanOptions,
  getCommunityReading,
  getUserLastReading,
} from "@packages/seed-bible/seed-bible/managers/TodayReadingHistory";
import type { ReadingEvent } from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";

const DAY = 24 * 60 * 60;

// ─── factories ──────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<ReadingEvent> = {}): ReadingEvent {
  return {
    bookId: "GEN",
    chapter: 1,
    userId: "u1",
    start: 0,
    end: 100,
    ...overrides,
  };
}

/**
 * Reading-events fetcher. `eventsByReader` maps a record name to the events it
 * should return; unknown record names return an empty array.
 */
function makeFetchEvents(eventsByReader: Record<string, ReadingEvent[]> = {}) {
  return vi.fn(
    async (recordName: string): Promise<ReadingEvent[]> =>
      eventsByReader[recordName] ?? []
  );
}

// ─── buildTimespanOptions ────────────────────────────────────────────────────

describe("buildTimespanOptions", () => {
  const FIXED = new Date("2026-06-15T12:34:56.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Derive the expectations the same way the implementation does, so the
  // assertions are timezone-independent.
  const now = () => new Date();
  const nowSeconds = () => Math.floor(now().getTime() / 1000);
  const currentYear = () => now().getFullYear();

  it("computes the two-days window relative to now", () => {
    expect(buildTimespanOptions().twoDays).toEqual({
      year: currentYear(),
      timespan: { from: nowSeconds() - 2 * DAY, to: nowSeconds() },
    });
  });

  it("computes the week window relative to now", () => {
    expect(buildTimespanOptions().week).toEqual({
      year: currentYear(),
      timespan: { from: nowSeconds() - 7 * DAY, to: nowSeconds() },
    });
  });

  it("computes the month window relative to now", () => {
    expect(buildTimespanOptions().month).toEqual({
      year: currentYear(),
      timespan: { from: nowSeconds() - 30 * DAY, to: nowSeconds() },
    });
  });

  it("leaves the 'all' option without a timespan window", () => {
    expect(buildTimespanOptions().all).toEqual({
      year: currentYear(),
      timespan: undefined,
    });
  });

  it("exposes exactly the four timespan option ids", () => {
    expect(Object.keys(buildTimespanOptions()).sort()).toEqual(
      ["all", "month", "twoDays", "week"].sort()
    );
  });

  it("returns a freshly computed object on each call", () => {
    const first = buildTimespanOptions();
    const second = buildTimespanOptions();
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });

  it("recomputes the window when time advances", () => {
    const before = buildTimespanOptions().twoDays.timespan!.to;

    vi.setSystemTime(new Date(FIXED.getTime() + 5000));
    const after = buildTimespanOptions().twoDays.timespan!.to;

    expect(after).toBe(before + 5);
  });
});

// ─── getCommunityReading ─────────────────────────────────────────────────────

describe("getCommunityReading", () => {
  it("returns nothing when there are no readers", async () => {
    const result = await getCommunityReading(makeFetchEvents(), [], {
      from: 0,
      to: 100,
    });

    expect(result).toEqual({});
  });

  it("does not query reading events when there are no readers", async () => {
    const fetchEvents = makeFetchEvents();

    await getCommunityReading(fetchEvents, [], { from: 0, to: 10 });

    expect(fetchEvents).not.toHaveBeenCalled();
  });

  it("groups a reader under bookId → chapter for an event inside the span", async () => {
    const fetchEvents = makeFetchEvents({
      u1: [makeEvent({ bookId: "JHN", chapter: 3, end: 50 })],
    });

    const result = await getCommunityReading(fetchEvents, ["u1"], {
      from: 0,
      to: 100,
    });

    expect(result).toEqual({ JHN: { 3: ["u1"] } });
  });

  it("accumulates multiple readers who read the same book/chapter", async () => {
    const fetchEvents = makeFetchEvents({
      u1: [makeEvent({ bookId: "JHN", chapter: 3, end: 40 })],
      u2: [makeEvent({ bookId: "JHN", chapter: 3, end: 60, userId: "u2" })],
    });

    const result = await getCommunityReading(fetchEvents, ["u1", "u2"], {
      from: 0,
      to: 100,
    });

    expect(result).toEqual({ JHN: { 3: ["u1", "u2"] } });
  });

  it("keys readers by the record name fetched, not the event's userId", async () => {
    // The two are not provably the same value, and the card matches its avatars
    // against the reader list the caller supplied.
    const fetchEvents = makeFetchEvents({
      u1: [makeEvent({ bookId: "JHN", chapter: 3, end: 50, userId: "other" })],
    });

    const result = await getCommunityReading(fetchEvents, ["u1"], {
      from: 0,
      to: 100,
    });

    expect(result).toEqual({ JHN: { 3: ["u1"] } });
  });

  it("groups distinct books and chapters separately", async () => {
    const fetchEvents = makeFetchEvents({
      u1: [
        makeEvent({ bookId: "GEN", chapter: 1, end: 10 }),
        makeEvent({ bookId: "GEN", chapter: 2, end: 20 }),
        makeEvent({ bookId: "EXO", chapter: 1, end: 30 }),
      ],
    });

    const result = await getCommunityReading(fetchEvents, ["u1"], {
      from: 0,
      to: 100,
    });

    expect(result).toEqual({
      GEN: { 1: ["u1"], 2: ["u1"] },
      EXO: { 1: ["u1"] },
    });
  });

  it("excludes events whose end falls outside the span", async () => {
    const fetchEvents = makeFetchEvents({
      u1: [
        makeEvent({ bookId: "GEN", chapter: 1, end: 5 }), // before span
        makeEvent({ bookId: "GEN", chapter: 2, end: 150 }), // after span
        makeEvent({ bookId: "GEN", chapter: 3, end: 50 }), // inside span
      ],
    });

    const result = await getCommunityReading(fetchEvents, ["u1"], {
      from: 10,
      to: 100,
    });

    expect(result).toEqual({ GEN: { 3: ["u1"] } });
  });

  it("includes events whose end is exactly on the span boundaries", async () => {
    const fetchEvents = makeFetchEvents({
      u1: [
        makeEvent({ bookId: "GEN", chapter: 1, end: 10 }), // == from
        makeEvent({ bookId: "GEN", chapter: 2, end: 100 }), // == to
      ],
    });

    const result = await getCommunityReading(fetchEvents, ["u1"], {
      from: 10,
      to: 100,
    });

    expect(result).toEqual({ GEN: { 1: ["u1"], 2: ["u1"] } });
  });

  it("records a reader once per chapter however many events they logged", async () => {
    const fetchEvents = makeFetchEvents({
      u1: [
        makeEvent({ bookId: "GEN", chapter: 1, end: 20 }),
        makeEvent({ bookId: "GEN", chapter: 1, end: 40 }),
      ],
    });

    const result = await getCommunityReading(fetchEvents, ["u1"], {
      from: 0,
      to: 100,
    });

    expect(result).toEqual({ GEN: { 1: ["u1"] } });
  });

  it("queries each reader once, over the requested span", async () => {
    const fetchEvents = makeFetchEvents({ u1: [], u2: [] });

    await getCommunityReading(fetchEvents, ["u1", "u2"], { from: 0, to: 10 });

    expect(fetchEvents).toHaveBeenCalledTimes(2);
    expect(fetchEvents).toHaveBeenCalledWith("u1", 0, 10);
    expect(fetchEvents).toHaveBeenCalledWith("u2", 0, 10);
  });

  it("rejects when a reader's fetch rejects", async () => {
    // Pins today's all-or-nothing behaviour: one unreachable reader blanks the
    // whole card. Softening that to a per-reader catch is a behaviour change and
    // belongs in its own commit.
    const fetchEvents = vi.fn(async () => {
      throw new Error("unreachable");
    });

    await expect(
      getCommunityReading(fetchEvents, ["u1"], { from: 0, to: 10 })
    ).rejects.toThrow("unreachable");
  });
});

// ─── getUserLastReading ──────────────────────────────────────────────────────

describe("getUserLastReading", () => {
  it("returns undefined when the user has no events", async () => {
    const result = await getUserLastReading(makeFetchEvents({ u1: [] }), "u1", {
      from: 0,
      to: 100,
    });

    expect(result).toBeUndefined();
  });

  it("returns the book/chapter of the event with the latest end time", async () => {
    const fetchEvents = makeFetchEvents({
      u1: [
        makeEvent({ bookId: "GEN", chapter: 1, end: 30 }),
        makeEvent({ bookId: "JHN", chapter: 3, end: 90 }), // latest
        makeEvent({ bookId: "EXO", chapter: 2, end: 60 }),
      ],
    });

    const result = await getUserLastReading(fetchEvents, "u1", {
      from: 0,
      to: 100,
    });

    expect(result).toEqual({ bookId: "JHN", chapter: 3 });
  });

  it("keeps the earlier event when a later one has a smaller end time", async () => {
    const fetchEvents = makeFetchEvents({
      u1: [
        makeEvent({ bookId: "JHN", chapter: 3, end: 90 }), // latest, comes first
        makeEvent({ bookId: "GEN", chapter: 1, end: 30 }),
      ],
    });

    const result = await getUserLastReading(fetchEvents, "u1", {
      from: 0,
      to: 100,
    });

    expect(result).toEqual({ bookId: "JHN", chapter: 3 });
  });

  it("returns the single event when there is exactly one", async () => {
    const fetchEvents = makeFetchEvents({
      u1: [makeEvent({ bookId: "PSA", chapter: 23, end: 42 })],
    });

    const result = await getUserLastReading(fetchEvents, "u1", {
      from: 0,
      to: 100,
    });

    expect(result).toEqual({ bookId: "PSA", chapter: 23 });
  });

  it("queries the fetcher with the user id and the span bounds", async () => {
    const fetchEvents = makeFetchEvents({ u1: [] });

    await getUserLastReading(fetchEvents, "u1", { from: 11, to: 22 });

    expect(fetchEvents).toHaveBeenCalledWith("u1", 11, 22);
  });
});
