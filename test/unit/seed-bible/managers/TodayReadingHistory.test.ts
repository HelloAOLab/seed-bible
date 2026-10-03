import {
  buildTimespanOptions,
  getTimelineYearTimespan,
  getTimelineYearWindow,
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

// ─── getTimelineYearWindow ──────────────────────────────────────────────────

describe("getTimelineYearWindow", () => {
  // Local-time constructor on purpose: the window is defined on the reader's
  // calendar, so the assertions below read in local time too.
  const NOW = new Date(2026, 5, 15, 12, 34, 56);

  it("ends the current year on today, at the end of the day", () => {
    const { endDate } = getTimelineYearWindow(2026, NOW);

    expect(endDate).toEqual(new Date(2026, 5, 15, 23, 59, 59, 999));
  });

  it("starts the current year on the same date a year earlier, at midnight", () => {
    const { startDate } = getTimelineYearWindow(2026, NOW);

    expect(startDate).toEqual(new Date(2025, 5, 15, 0, 0, 0, 0));
  });

  it("gives an earlier year the same calendar window, shifted back", () => {
    const { startDate, endDate } = getTimelineYearWindow(2024, NOW);

    expect(startDate).toEqual(new Date(2023, 5, 15, 0, 0, 0, 0));
    expect(endDate).toEqual(new Date(2024, 5, 15, 23, 59, 59, 999));
  });

  it("does not mutate the date it was given", () => {
    const now = new Date(NOW);

    getTimelineYearWindow(2024, now);

    expect(now).toEqual(NOW);
  });

  it("converts to whole unix seconds, flooring the end-of-day millisecond", () => {
    const { startDate, endDate } = getTimelineYearWindow(2026, NOW);

    expect(getTimelineYearTimespan(2026, NOW)).toEqual({
      from: startDate.getTime() / 1000,
      to: Math.floor(endDate.getTime() / 1000),
    });
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
