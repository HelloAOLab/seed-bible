import {
  loadDailyReadingHistory,
  type ReadingEvent,
} from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";

const DAY = 60 * 60 * 24;
const START = 1_700_000_000;
const DAY_KEYS = ["d0", "d1", "d2"];

function event(overrides: Partial<ReadingEvent> = {}): ReadingEvent {
  return {
    userId: "u1",
    bookId: "GEN",
    chapter: 1,
    start: START,
    end: START + 600,
    ...overrides,
  } as ReadingEvent;
}

function fetcherReturning(byReader: Record<string, ReadingEvent[]>) {
  return vi.fn(async (readerId: string) => byReader[readerId] ?? []);
}

describe("loadDailyReadingHistory", () => {
  it("fetches nothing and summarizes empty when there are no readers", async () => {
    const fetchEvents = fetcherReturning({});

    const result = await loadDailyReadingHistory({
      fetchEvents,
      readerIds: [],
      dayKeys: DAY_KEYS,
      startSeconds: START,
      endSeconds: START + 3 * DAY,
    });

    expect(fetchEvents).not.toHaveBeenCalled();
    expect(result.events).toEqual([]);
    expect(result.eventsByDay.size).toBe(0);
    expect(result.summariesByDay.size).toBe(0);
    expect(result.total.totalTimeSpentReading).toBe(0);
  });

  it("fetches each reader over the whole window and flattens the results", async () => {
    const fetchEvents = fetcherReturning({
      u1: [event({ userId: "u1" })],
      u2: [event({ userId: "u2" })],
    });

    const result = await loadDailyReadingHistory({
      fetchEvents,
      readerIds: ["u1", "u2"],
      dayKeys: DAY_KEYS,
      startSeconds: START,
      endSeconds: START + 3 * DAY,
    });

    expect(fetchEvents).toHaveBeenCalledTimes(2);
    expect(fetchEvents).toHaveBeenCalledWith("u1", START, START + 3 * DAY);
    expect(result.events).toHaveLength(2);
  });

  it("buckets events into the day their reading started", async () => {
    const fetchEvents = fetcherReturning({
      u1: [
        event({ start: START + 60, end: START + 700 }),
        event({ start: START + DAY + 60, end: START + DAY + 700 }),
        event({ start: START + 2 * DAY + 60, end: START + 2 * DAY + 700 }),
      ],
    });

    const result = await loadDailyReadingHistory({
      fetchEvents,
      readerIds: ["u1"],
      dayKeys: DAY_KEYS,
      startSeconds: START,
      endSeconds: START + 3 * DAY,
    });

    expect([...result.eventsByDay.keys()]).toEqual(["d0", "d1", "d2"]);
    expect(result.eventsByDay.get("d1")).toHaveLength(1);
    expect(result.summariesByDay.get("d1")?.totalTimeSpentReading).toBe(640);
  });

  it("leaves days with no reading out of the maps entirely", async () => {
    const fetchEvents = fetcherReturning({
      u1: [event({ start: START + 2 * DAY, end: START + 2 * DAY + 600 })],
    });

    const result = await loadDailyReadingHistory({
      fetchEvents,
      readerIds: ["u1"],
      dayKeys: DAY_KEYS,
      startSeconds: START,
      endSeconds: START + 3 * DAY,
    });

    expect([...result.eventsByDay.keys()]).toEqual(["d2"]);
    expect(result.summariesByDay.has("d0")).toBe(false);
  });

  // A glance at a verse shouldn't light up a day on the timeline.
  it("ignores events shorter than the minimum duration", async () => {
    const fetchEvents = fetcherReturning({
      u1: [
        event({ start: START, end: START + 59 }),
        event({ start: START, end: START + 61 }),
      ],
    });

    const result = await loadDailyReadingHistory({
      fetchEvents,
      readerIds: ["u1"],
      dayKeys: DAY_KEYS,
      startSeconds: START,
      endSeconds: START + 3 * DAY,
    });

    expect(result.eventsByDay.get("d0")).toHaveLength(1);
  });

  it("honours a custom minimum duration", async () => {
    const fetchEvents = fetcherReturning({
      u1: [event({ start: START, end: START + 59 })],
    });

    const result = await loadDailyReadingHistory({
      fetchEvents,
      readerIds: ["u1"],
      dayKeys: DAY_KEYS,
      startSeconds: START,
      endSeconds: START + 3 * DAY,
      minDurationSeconds: 10,
    });

    expect(result.eventsByDay.get("d0")).toHaveLength(1);
  });

  it("drops events falling outside the day keys", async () => {
    const fetchEvents = fetcherReturning({
      u1: [
        event({ start: START - DAY, end: START - DAY + 600 }),
        event({ start: START + 9 * DAY, end: START + 9 * DAY + 600 }),
      ],
    });

    const result = await loadDailyReadingHistory({
      fetchEvents,
      readerIds: ["u1"],
      dayKeys: DAY_KEYS,
      startSeconds: START,
      endSeconds: START + 3 * DAY,
    });

    expect(result.eventsByDay.size).toBe(0);
    // They are out of range for the timeline, but they were still fetched, so
    // the window total still counts them.
    expect(result.events).toHaveLength(2);
    expect(result.total.totalTimeSpentReading).toBe(1200);
  });

  it("totals across every reader, not just one", async () => {
    const fetchEvents = fetcherReturning({
      u1: [event({ userId: "u1", start: START, end: START + 600 })],
      u2: [
        event({ userId: "u2", bookId: "EXO", start: START, end: START + 300 }),
      ],
    });

    const result = await loadDailyReadingHistory({
      fetchEvents,
      readerIds: ["u1", "u2"],
      dayKeys: DAY_KEYS,
      startSeconds: START,
      endSeconds: START + 3 * DAY,
    });

    expect(result.total.totalTimeSpentReading).toBe(900);
    expect(Object.keys(result.total.users).sort()).toEqual(["u1", "u2"]);
  });

  // Summarizing a year of history is enough work to drop frames if it runs in
  // one go, so the loop hands the main thread back every `yieldEvery` days.
  // "Hands back" means a real turn of the event loop, not a microtask — that
  // is what lets a click or a paint in between actually run.
  it("summarizes in batches, giving the main thread a turn between them", async () => {
    const dayKeys = Array.from({ length: 6 }, (_, index) => `d${index}`);
    const fetchEvents = fetcherReturning({
      u1: dayKeys.map((_key, index) =>
        event({ start: START + index * DAY, end: START + index * DAY + 600 })
      ),
    });

    // Counts the turns of the event loop that other work gets while the
    // summary runs, using a task that reschedules itself. It can only run when
    // the summary has actually handed the thread back.
    const turnsDuring = async (yieldEvery: number) => {
      let turns = 0;
      let running = true;
      let timer: ReturnType<typeof setTimeout>;
      const tick = () => {
        turns++;
        if (running) {
          timer = setTimeout(tick, 0);
        }
      };
      timer = setTimeout(tick, 0);

      await loadDailyReadingHistory({
        fetchEvents,
        readerIds: ["u1"],
        dayKeys,
        startSeconds: START,
        endSeconds: START + 6 * DAY,
        yieldEvery,
      });

      running = false;
      clearTimeout(timer);
      return turns;
    };

    // Six days in batches of two: a turn between each batch, plus the one the
    // function always takes before returning.
    expect(await turnsDuring(2)).toBe(4);
    // The same six days summarized in a single batch only take that last turn,
    // so the count above is measuring the batching and not a fixed overhead.
    expect(await turnsDuring(1000)).toBe(1);
  });

  it("rejects when a reader's fetch fails, rather than reporting partial data", async () => {
    const fetchEvents = vi.fn(async (readerId: string) => {
      if (readerId === "u2") throw new Error("network");
      return [event()];
    });

    await expect(
      loadDailyReadingHistory({
        fetchEvents,
        readerIds: ["u1", "u2"],
        dayKeys: DAY_KEYS,
        startSeconds: START,
        endSeconds: START + 3 * DAY,
      })
    ).rejects.toThrow("network");
  });
});
