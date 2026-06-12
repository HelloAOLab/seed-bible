import { TodayReadingHistoryService } from "todayScreen.application.services.TodayReadingHistoryService";
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
 * Reading-events provider mock. `eventsByUser` maps a userId to the events it
 * should return; unknown users return an empty array.
 */
function makeReadingEventsPort(
  eventsByUser: Record<string, ReadingEvent[]> = {}
) {
  return {
    getReadingHistoryEvents: jest.fn(
      async (recordName: string): Promise<ReadingEvent[]> =>
        eventsByUser[recordName] ?? []
    ),
  };
}

function makeUsersPort(ids: string[]) {
  return { getUsersIds: jest.fn(() => ids) };
}

function makeService(
  readingEventsPort: ReturnType<typeof makeReadingEventsPort>,
  usersPort: ReturnType<typeof makeUsersPort>
) {
  return new TodayReadingHistoryService({
    readingEventsProviderPort: readingEventsPort,
    usersIdProviderPort: usersPort,
  });
}

// ─── getCommunityReading ──────────────────────────────────────────────────────

describe("TodayReadingHistoryService.getCommunityReading", () => {
  it("returns an entry per span id even when there are no users", async () => {
    const service = makeService(makeReadingEventsPort(), makeUsersPort([]));

    const result = await service.getCommunityReading([
      { id: "a", span: { from: 0, to: 100 } },
      { id: "b", span: { from: 200, to: 300 } },
    ]);

    expect(result).toEqual({ a: {}, b: {} });
  });

  it("does not query reading events when there are no users", async () => {
    const readingEventsPort = makeReadingEventsPort();
    const service = makeService(readingEventsPort, makeUsersPort([]));

    await service.getCommunityReading([{ id: "a", span: { from: 0, to: 10 } }]);

    expect(readingEventsPort.getReadingHistoryEvents).not.toHaveBeenCalled();
  });

  it("groups a user under bookId → chapter for an event inside the span", async () => {
    const readingEventsPort = makeReadingEventsPort({
      u1: [makeEvent({ bookId: "JHN", chapter: 3, end: 50 })],
    });
    const service = makeService(readingEventsPort, makeUsersPort(["u1"]));

    const result = await service.getCommunityReading([
      { id: "value", span: { from: 0, to: 100 } },
    ]);

    expect(result).toEqual({ value: { JHN: { 3: ["u1"] } } });
  });

  it("accumulates multiple users who read the same book/chapter", async () => {
    const readingEventsPort = makeReadingEventsPort({
      u1: [makeEvent({ bookId: "JHN", chapter: 3, end: 40 })],
      u2: [makeEvent({ bookId: "JHN", chapter: 3, end: 60, userId: "u2" })],
    });
    const service = makeService(readingEventsPort, makeUsersPort(["u1", "u2"]));

    const result = await service.getCommunityReading([
      { id: "value", span: { from: 0, to: 100 } },
    ]);

    expect(result.value).toEqual({ JHN: { 3: ["u1", "u2"] } });
  });

  it("groups distinct books and chapters separately", async () => {
    const readingEventsPort = makeReadingEventsPort({
      u1: [
        makeEvent({ bookId: "GEN", chapter: 1, end: 10 }),
        makeEvent({ bookId: "GEN", chapter: 2, end: 20 }),
        makeEvent({ bookId: "EXO", chapter: 1, end: 30 }),
      ],
    });
    const service = makeService(readingEventsPort, makeUsersPort(["u1"]));

    const result = await service.getCommunityReading([
      { id: "value", span: { from: 0, to: 100 } },
    ]);

    expect(result.value).toEqual({
      GEN: { 1: ["u1"], 2: ["u1"] },
      EXO: { 1: ["u1"] },
    });
  });

  it("excludes events whose end falls outside the span", async () => {
    const readingEventsPort = makeReadingEventsPort({
      u1: [
        makeEvent({ bookId: "GEN", chapter: 1, end: 5 }), // before span
        makeEvent({ bookId: "GEN", chapter: 2, end: 150 }), // after span
        makeEvent({ bookId: "GEN", chapter: 3, end: 50 }), // inside span
      ],
    });
    const service = makeService(readingEventsPort, makeUsersPort(["u1"]));

    const result = await service.getCommunityReading([
      { id: "value", span: { from: 10, to: 100 } },
    ]);

    expect(result.value).toEqual({ GEN: { 3: ["u1"] } });
  });

  it("includes events whose end is exactly on the span boundaries", async () => {
    const readingEventsPort = makeReadingEventsPort({
      u1: [
        makeEvent({ bookId: "GEN", chapter: 1, end: 10 }), // == from
        makeEvent({ bookId: "GEN", chapter: 2, end: 100 }), // == to
      ],
    });
    const service = makeService(readingEventsPort, makeUsersPort(["u1"]));

    const result = await service.getCommunityReading([
      { id: "value", span: { from: 10, to: 100 } },
    ]);

    expect(result.value).toEqual({ GEN: { 1: ["u1"], 2: ["u1"] } });
  });

  it("queries events over the widest window across all spans", async () => {
    const readingEventsPort = makeReadingEventsPort({ u1: [] });
    const service = makeService(readingEventsPort, makeUsersPort(["u1"]));

    await service.getCommunityReading([
      { id: "a", span: { from: 100, to: 500 } },
      { id: "b", span: { from: 200, to: 300 } }, // narrower → must not shrink window
    ]);

    // furthestTime = min(from) = 100, closestTime = max(to) = 500
    expect(readingEventsPort.getReadingHistoryEvents).toHaveBeenCalledWith(
      "u1",
      100,
      500
    );
  });

  it("routes each event to only the spans whose window contains it", async () => {
    const readingEventsPort = makeReadingEventsPort({
      u1: [
        makeEvent({ bookId: "GEN", chapter: 1, end: 150 }), // only in span a
        makeEvent({ bookId: "GEN", chapter: 2, end: 250 }), // in both a and b
      ],
    });
    const service = makeService(readingEventsPort, makeUsersPort(["u1"]));

    const result = await service.getCommunityReading([
      { id: "a", span: { from: 100, to: 300 } },
      { id: "b", span: { from: 200, to: 400 } },
    ]);

    expect(result.a).toEqual({ GEN: { 1: ["u1"], 2: ["u1"] } });
    expect(result.b).toEqual({ GEN: { 2: ["u1"] } });
  });

  it("queries each connected user once", async () => {
    const readingEventsPort = makeReadingEventsPort({ u1: [], u2: [] });
    const service = makeService(readingEventsPort, makeUsersPort(["u1", "u2"]));

    await service.getCommunityReading([{ id: "a", span: { from: 0, to: 10 } }]);

    expect(readingEventsPort.getReadingHistoryEvents).toHaveBeenCalledTimes(2);
    expect(readingEventsPort.getReadingHistoryEvents).toHaveBeenCalledWith(
      "u1",
      0,
      10
    );
    expect(readingEventsPort.getReadingHistoryEvents).toHaveBeenCalledWith(
      "u2",
      0,
      10
    );
  });
});

// ─── getUserLastReading ───────────────────────────────────────────────────────

describe("TodayReadingHistoryService.getUserLastReading", () => {
  it("returns undefined when the user has no events", async () => {
    const service = makeService(
      makeReadingEventsPort({ u1: [] }),
      makeUsersPort([])
    );

    const result = await service.getUserLastReading("u1", { from: 0, to: 100 });

    expect(result).toBeUndefined();
  });

  it("returns the book/chapter of the event with the latest end time", async () => {
    const readingEventsPort = makeReadingEventsPort({
      u1: [
        makeEvent({ bookId: "GEN", chapter: 1, end: 30 }),
        makeEvent({ bookId: "JHN", chapter: 3, end: 90 }), // latest
        makeEvent({ bookId: "EXO", chapter: 2, end: 60 }),
      ],
    });
    const service = makeService(readingEventsPort, makeUsersPort([]));

    const result = await service.getUserLastReading("u1", { from: 0, to: 100 });

    expect(result).toEqual({ bookId: "JHN", chapter: 3 });
  });

  it("keeps the earlier event when a later one has a smaller end time", async () => {
    const readingEventsPort = makeReadingEventsPort({
      u1: [
        makeEvent({ bookId: "JHN", chapter: 3, end: 90 }), // latest, comes first
        makeEvent({ bookId: "GEN", chapter: 1, end: 30 }),
      ],
    });
    const service = makeService(readingEventsPort, makeUsersPort([]));

    const result = await service.getUserLastReading("u1", { from: 0, to: 100 });

    expect(result).toEqual({ bookId: "JHN", chapter: 3 });
  });

  it("returns the single event when there is exactly one", async () => {
    const readingEventsPort = makeReadingEventsPort({
      u1: [makeEvent({ bookId: "PSA", chapter: 23, end: 42 })],
    });
    const service = makeService(readingEventsPort, makeUsersPort([]));

    const result = await service.getUserLastReading("u1", { from: 0, to: 100 });

    expect(result).toEqual({ bookId: "PSA", chapter: 23 });
  });

  it("queries the provider with the user id and the span bounds", async () => {
    const readingEventsPort = makeReadingEventsPort({ u1: [] });
    const service = makeService(readingEventsPort, makeUsersPort([]));

    await service.getUserLastReading("u1", { from: 11, to: 22 });

    expect(readingEventsPort.getReadingHistoryEvents).toHaveBeenCalledWith(
      "u1",
      11,
      22
    );
  });
});
