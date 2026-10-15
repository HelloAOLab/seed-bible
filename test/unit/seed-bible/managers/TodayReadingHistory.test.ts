import {
  getTimelineYearTimespan,
  getTimelineYearWindow,
  getUserLastReading,
} from "@packages/seed-bible/seed-bible/managers/TodayReadingHistory";
import type { ReadingEvent } from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";

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
