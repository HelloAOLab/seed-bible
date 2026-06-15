import {
  CadenceSchema,
  ReadingPlanSchema,
  ReadingPlanProgressSchema,
  effectiveCadence,
  slotsForCadence,
  dateForSession,
  sessionsForDate,
  isSessionComplete,
  planCompletion,
  getReadingCalendar,
  createReadingPlansManager,
  type Cadence,
  type ReadingPlan,
  type ReadingPlanProgress,
  type ReadingCalendarEntry,
  type CalendarReadingDay,
  type CalendarSkipRange,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import { signal } from "@preact/signals";

// An arbitrary mid-week start instant to exercise "start any time".
// 2026-06-17 is a Wednesday.
const START_MS = Date.UTC(2026, 5, 17, 13, 45, 0);

function reading(id: string) {
  return {
    id,
    item: {
      type: "bible-verse" as const,
      ref: { bookId: "GEN", chapter: 1, verse: 1 },
    },
  };
}

function makePlan(overrides: Partial<ReadingPlan> = {}): ReadingPlan {
  return ReadingPlanSchema.parse({
    address: "plan-1",
    recordName: "record-1",
    authorUserId: "author-1",
    title: "Test Plan",
    locale: "en-US",
    description: null,
    cadenceOptions: [
      {
        id: "daily",
        label: "One year (daily)",
        cadence: { segments: [{ type: "read", days: 1, sessionsPerDay: 1 }] },
      },
      {
        id: "every-other-day",
        label: "Two years (every other day)",
        cadence: {
          segments: [
            { type: "read", days: 1 },
            { type: "skip", days: 1 },
          ],
        },
      },
    ],
    defaultCadenceId: "daily",
    sessions: [
      { id: "s1", readings: [reading("r1")] },
      { id: "s2", readings: [reading("r2")] },
      { id: "s3", readings: [reading("r3")] },
    ],
    createdAtMs: START_MS,
    updatedAtMs: START_MS,
    ...overrides,
  });
}

function makeProgress(
  overrides: Partial<ReadingPlanProgress> = {}
): ReadingPlanProgress {
  return ReadingPlanProgressSchema.parse({
    planId: "rp_record-1_plan-1",
    recordName: "record-1",
    userId: "user-1",
    startedAtMs: START_MS,
    sessions: [],
    createdAtMs: START_MS,
    updatedAtMs: START_MS,
    ...overrides,
  });
}

// Resolve day boundaries in a fixed zone so the schedule math is deterministic
// regardless of the machine's local time zone.
const ZONE = "utc";
const START_DAY = DateTime.fromMillis(START_MS, { zone: ZONE }).startOf("day");
const dayOffsetOf = (date: ReturnType<typeof DateTime.fromMillis>) =>
  Math.round(date.diff(START_DAY, "days").days);

describe("ReadingPlansManager schemas", () => {
  it("parses a large plan with multiple cadence options", () => {
    const sessions = Array.from({ length: 365 }, (_, i) => ({
      id: `s${i}`,
      readings: [reading(`r${i}`)],
    }));
    const plan = makePlan({ sessions });
    expect(plan.sessions).toHaveLength(365);
    expect(plan.cadenceOptions).toHaveLength(2);
    expect(plan.schemaVersion).toBe(1);
  });

  it("parses a session with multiple readings", () => {
    const plan = makePlan({
      sessions: [{ id: "s1", readings: [reading("r1"), reading("r2")] }],
    });
    expect(plan.sessions[0]!.readings).toHaveLength(2);
  });

  it("treats an omitted sessionsPerDay as 1", () => {
    const cadence = CadenceSchema.parse({
      segments: [{ type: "read", days: 1 }],
    });
    const slots = slotsForCadence(cadence, START_MS, 3);
    expect(slots.map((s) => s.dayOffset)).toEqual([0, 1, 2]);
  });
});

describe("effectiveCadence", () => {
  it("prefers a custom override over everything", () => {
    const plan = makePlan();
    const custom: Cadence = {
      segments: [{ type: "read", days: 1, sessionsPerDay: 2 }],
    };
    const progress = makeProgress({
      selectedCadenceId: "every-other-day",
      customCadence: custom,
    });
    expect(effectiveCadence(plan, progress)).toEqual(custom);
  });

  it("falls back to selected, then default, then first option", () => {
    const plan = makePlan();
    expect(
      effectiveCadence(
        plan,
        makeProgress({ selectedCadenceId: "every-other-day" })
      )
    ).toEqual(plan.cadenceOptions[1]!.cadence);
    expect(effectiveCadence(plan, makeProgress())).toEqual(
      plan.cadenceOptions[0]!.cadence
    );
    expect(
      effectiveCadence(
        makePlan({ defaultCadenceId: null }),
        makeProgress({ selectedCadenceId: "nope" })
      )
    ).toEqual(plan.cadenceOptions[0]!.cadence);
  });
});

describe("schedule math", () => {
  const cases: {
    name: string;
    cadence: Cadence;
    activeDayOffsets: number[];
    perDay: number;
  }[] = [
    {
      name: "every day",
      cadence: { segments: [{ type: "read", days: 1, sessionsPerDay: 1 }] },
      activeDayOffsets: [0, 1, 2, 3, 4],
      perDay: 1,
    },
    {
      name: "twice a day",
      cadence: { segments: [{ type: "read", days: 1, sessionsPerDay: 2 }] },
      activeDayOffsets: [0, 0, 1, 1, 2],
      perDay: 2,
    },
    {
      name: "every other day",
      cadence: {
        segments: [
          { type: "read", days: 1 },
          { type: "skip", days: 1 },
        ],
      },
      activeDayOffsets: [0, 2, 4, 6, 8],
      perDay: 1,
    },
    {
      name: "once a week",
      cadence: {
        segments: [
          { type: "read", days: 1 },
          { type: "skip", days: 6 },
        ],
      },
      activeDayOffsets: [0, 7, 14, 21, 28],
      perDay: 1,
    },
    {
      name: "three times a week",
      cadence: {
        segments: [
          { type: "read", days: 1 },
          { type: "skip", days: 1 },
          { type: "read", days: 1 },
          { type: "skip", days: 1 },
          { type: "read", days: 1 },
          { type: "skip", days: 2 },
        ],
      },
      activeDayOffsets: [0, 2, 4, 7, 9],
      perDay: 1,
    },
  ];

  for (const c of cases) {
    it(`${c.name}: slots land on the expected day offsets`, () => {
      const slots = slotsForCadence(
        c.cadence,
        START_MS,
        c.activeDayOffsets.length
      );
      expect(slots.map((s) => s.dayOffset)).toEqual(c.activeDayOffsets);
    });

    it(`${c.name}: dateForSession and sessionsForDate are inverses`, () => {
      const slots = slotsForCadence(c.cadence, START_MS, 6);
      slots.forEach((slot, sessionIndex) => {
        const date = dateForSession(c.cadence, START_MS, sessionIndex, ZONE);
        expect(date).not.toBeNull();
        expect(dayOffsetOf(date!)).toBe(slot.dayOffset);
        expect(
          sessionsForDate(c.cadence, START_MS, date!.toMillis(), ZONE)
        ).toContain(sessionIndex);
      });
    });
  }

  it("returns no slots for an all-skip cadence (no infinite loop)", () => {
    const cadence: Cadence = { segments: [{ type: "skip", days: 3 }] };
    expect(slotsForCadence(cadence, START_MS, 5)).toEqual([]);
    expect(dateForSession(cadence, START_MS, 0)).toBeNull();
    expect(sessionsForDate(cadence, START_MS, START_MS)).toEqual([]);
  });

  it("ignores dates before the start", () => {
    const cadence: Cadence = { segments: [{ type: "read", days: 1 }] };
    expect(sessionsForDate(cadence, START_MS, START_MS - 86_400_000)).toEqual(
      []
    );
  });
});

describe("completion tracking", () => {
  it("isSessionComplete requires all readings done", () => {
    const session = { id: "s1", readings: [reading("r1"), reading("r2")] };
    expect(isSessionComplete(session, undefined)).toBe(false);
    expect(
      isSessionComplete(session, {
        sessionId: "s1",
        completedReadingIds: ["r1"],
      })
    ).toBe(false);
    expect(
      isSessionComplete(session, {
        sessionId: "s1",
        completedReadingIds: ["r1", "r2"],
      })
    ).toBe(true);
  });

  it("planCompletion aggregates session and reading counts", () => {
    const plan = makePlan({
      sessions: [
        { id: "s1", readings: [reading("r1"), reading("r2")] },
        { id: "s2", readings: [reading("r3")] },
      ],
    });
    const progress = makeProgress({
      sessions: [
        { sessionId: "s1", completedReadingIds: ["r1"] },
        { sessionId: "s2", completedReadingIds: ["r3"] },
      ],
    });
    expect(planCompletion(plan, progress)).toEqual({
      doneSessions: 1,
      totalSessions: 2,
      doneReadings: 2,
      totalReadings: 3,
    });
  });
});

describe("getReadingCalendar", () => {
  const session = (id: string) => ({ id, readings: [reading(id)] });

  // Progress driven by an explicit custom cadence (wins in effectiveCadence)
  // and a fixed zone so day boundaries are deterministic.
  const calProgress = (
    cadence: Cadence,
    overrides: Partial<ReadingPlanProgress> = {}
  ) => makeProgress({ customCadence: cadence, timeZone: ZONE, ...overrides });

  const nowAtOffset = (days: number, hours = 5) =>
    START_DAY.plus({ days, hours }).toMillis();

  const asReading = (e: ReadingCalendarEntry): CalendarReadingDay => {
    expect(e.type).toBe("reading");
    return e as CalendarReadingDay;
  };
  const asSkip = (e: ReadingCalendarEntry): CalendarSkipRange => {
    expect(e.type).toBe("skip");
    return e as CalendarSkipRange;
  };

  it("returns one reading day per session for a daily cadence", () => {
    const plan = makePlan({
      sessions: [session("s0"), session("s1"), session("s2")],
    });
    const cadence: Cadence = {
      segments: [{ type: "read", days: 1, sessionsPerDay: 1 }],
    };
    const cal = getReadingCalendar(plan, calProgress(cadence), START_MS);

    expect(cal.map((e) => e.type)).toEqual(["reading", "reading", "reading"]);
    cal.forEach((e, i) => {
      const day = asReading(e);
      expect(day.dayOffset).toBe(i);
      expect(dayOffsetOf(day.date)).toBe(i);
      expect(day.startSessionIndex).toBe(i);
      expect(day.endSessionIndex).toBe(i);
      expect(day.sessions).toHaveLength(1);
      expect(day.sessions[0]!.index).toBe(i);
    });
    expect(asReading(cal[0]!).containsNow).toBe(true);
    expect(asReading(cal[1]!).containsNow).toBe(false);
  });

  it("interleaves skip ranges and omits the trailing skip", () => {
    const plan = makePlan({
      sessions: [session("s0"), session("s1"), session("s2")],
    });
    const cadence: Cadence = {
      segments: [
        { type: "read", days: 1 },
        { type: "skip", days: 1 },
      ],
    };
    const cal = getReadingCalendar(plan, calProgress(cadence), START_MS);

    expect(cal.map((e) => e.type)).toEqual([
      "reading",
      "skip",
      "reading",
      "skip",
      "reading",
    ]);
    expect(cal.map((e) => e.type).at(-1)).toBe("reading"); // no trailing skip
    expect(asReading(cal[0]!).dayOffset).toBe(0);
    expect(asReading(cal[2]!).dayOffset).toBe(2);
    expect(asReading(cal[4]!).dayOffset).toBe(4);

    const skip1 = asSkip(cal[1]!);
    expect(skip1.startDayOffset).toBe(1);
    expect(skip1.days).toBe(1);
    expect(dayOffsetOf(skip1.startDate)).toBe(1);
    expect(dayOffsetOf(skip1.endDate)).toBe(1);
    expect(asSkip(cal[3]!).startDayOffset).toBe(3);
  });

  it("includes a leading skip range", () => {
    const plan = makePlan({ sessions: [session("s0")] });
    const cadence: Cadence = {
      segments: [
        { type: "skip", days: 2 },
        { type: "read", days: 1 },
      ],
    };
    const cal = getReadingCalendar(plan, calProgress(cadence), START_MS);

    expect(cal.map((e) => e.type)).toEqual(["skip", "reading"]);
    const skip = asSkip(cal[0]!);
    expect(skip.startDayOffset).toBe(0);
    expect(skip.days).toBe(2);
    expect(asReading(cal[1]!).dayOffset).toBe(2);
  });

  it("attaches per-session labels from the cadence", () => {
    const plan = makePlan({ sessions: [session("s0"), session("s1")] });
    const cadence: Cadence = {
      segments: [
        {
          type: "read",
          days: 1,
          sessionsPerDay: 2,
          segmentLabels: ["Morning", "Evening"],
        },
      ],
    };
    const cal = getReadingCalendar(plan, calProgress(cadence), START_MS);

    expect(cal).toHaveLength(1);
    const day = asReading(cal[0]!);
    expect(day.startSessionIndex).toBe(0);
    expect(day.endSessionIndex).toBe(1);
    expect(day.sessions.map((s) => s.label)).toEqual(["Morning", "Evening"]);
  });

  it("reports day completion as the latest session time when all complete", () => {
    const plan = makePlan({ sessions: [session("s0"), session("s1")] });
    const cadence: Cadence = {
      segments: [{ type: "read", days: 1, sessionsPerDay: 2 }],
    };

    const complete = getReadingCalendar(
      plan,
      calProgress(cadence, {
        sessions: [
          { sessionId: "s0", completedReadingIds: ["s0"], completedAtMs: 100 },
          { sessionId: "s1", completedReadingIds: ["s1"], completedAtMs: 200 },
        ],
      }),
      START_MS
    );
    const completeDay = asReading(complete[0]!);
    expect(completeDay.sessions.every((s) => s.isComplete)).toBe(true);
    expect(completeDay.completedAtMs).toBe(200);

    const partial = getReadingCalendar(
      plan,
      calProgress(cadence, {
        sessions: [
          { sessionId: "s0", completedReadingIds: ["s0"], completedAtMs: 100 },
        ],
      }),
      START_MS
    );
    const partialDay = asReading(partial[0]!);
    expect(partialDay.completedAtMs).toBeNull();
    expect(partialDay.sessions[0]!.isComplete).toBe(true);
    expect(partialDay.sessions[1]!.isComplete).toBe(false);
    expect(partialDay.sessions[1]!.completedAtMs).toBeNull();
  });

  it("flags containsNow on a reading day, a skip range, or nothing", () => {
    const plan = makePlan({
      sessions: [session("s0"), session("s1"), session("s2")],
    });
    const cadence: Cadence = {
      segments: [
        { type: "read", days: 1 },
        { type: "skip", days: 1 },
      ],
    };
    const progress = calProgress(cadence);

    // now on the reading day at offset 2
    const onReading = getReadingCalendar(plan, progress, nowAtOffset(2));
    expect(onReading.filter((e) => e.containsNow).map((e) => e.type)).toEqual([
      "reading",
    ]);
    expect(asReading(onReading[2]!).containsNow).toBe(true);

    // now on the skip day at offset 1
    const onSkip = getReadingCalendar(plan, progress, nowAtOffset(1));
    expect(onSkip.filter((e) => e.containsNow).map((e) => e.type)).toEqual([
      "skip",
    ]);

    // now after the last reading day (offset 4) → nothing flagged
    const after = getReadingCalendar(plan, progress, nowAtOffset(10));
    expect(after.some((e) => e.containsNow)).toBe(false);
  });

  it("returns [] for no sessions or a never-reading cadence", () => {
    const plan = makePlan({ sessions: [session("s0")] });
    expect(
      getReadingCalendar(
        makePlan({ sessions: [] }),
        calProgress({ segments: [{ type: "read", days: 1 }] }),
        START_MS
      )
    ).toEqual([]);
    expect(
      getReadingCalendar(
        plan,
        calProgress({ segments: [{ type: "skip", days: 3 }] }),
        START_MS
      )
    ).toEqual([]);
  });
});

describe("createReadingPlansManager", () => {
  type LoginArg = Parameters<typeof createReadingPlansManager>[0];

  let recordDataMock: jest.Mock;
  let getDataMock: jest.Mock;
  let listDataByMarkerMock: jest.Mock;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let userId: ReturnType<typeof signal<string | null>>;

  const flush = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  // A marker-aware, paginated mock of os.listDataByMarker. `byMarker` maps a
  // marker to its ordered pages of `{ address, data }` records.
  const setListData = (
    byMarker: Record<string, { address: string; data: unknown }[][]>
  ) => {
    listDataByMarkerMock.mockImplementation(
      async (_recordName: string, marker: string, lastAddress?: string) => {
        const pages = byMarker[marker] ?? [[]];
        if (!lastAddress) {
          return { success: true, items: pages[0] ?? [] };
        }
        const idx = pages.findIndex(
          (p) => p.length > 0 && p[p.length - 1]!.address === lastAddress
        );
        return { success: true, items: pages[idx + 1] ?? [] };
      }
    );
  };

  const metadataOf = (plan: ReadingPlan) => {
    const { sessions: _sessions, ...metadata } = plan;
    return metadata;
  };

  const makeManager = (id: string | null = "user-1") => {
    userId = signal<string | null>(id);
    const login = { userId } as unknown as LoginArg;
    return createReadingPlansManager(login);
  };

  beforeEach(() => {
    recordDataMock = jest.fn().mockResolvedValue(undefined);
    getDataMock = jest.fn().mockResolvedValue({ success: false });
    listDataByMarkerMock = jest
      .fn()
      .mockResolvedValue({ success: true, items: [] });
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    (globalThis as { os?: unknown }).os = {
      ...(globalThis as { os?: object }).os,
      recordData: recordDataMock,
      getData: getDataMock,
      listDataByMarker: listDataByMarkerMock,
    };
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("syncs the user's plans and progresses on creation", async () => {
    const metadata = metadataOf(makePlan());
    const progress = makeProgress();
    setListData({
      "publicRead:readingPlanMetadata": [
        [{ address: "plan-1", data: metadata }],
      ],
      "publicRead:readingPlanProgress": [
        [{ address: "rp_record-1_plan-1", data: progress }],
      ],
    });

    const manager = makeManager("user-1");
    await flush();

    expect(listDataByMarkerMock).toHaveBeenCalledWith(
      "user-1",
      "publicRead:readingPlanMetadata",
      undefined
    );
    expect(listDataByMarkerMock).toHaveBeenCalledWith(
      "user-1",
      "publicRead:readingPlanProgress",
      undefined
    );
    expect(manager.userReadingPlans.value).toEqual([metadata]);
    expect(manager.userReadingPlanProgresses.value).toEqual([progress]);
  });

  it("skips records that fail validation", async () => {
    const metadata = metadataOf(makePlan());
    setListData({
      "publicRead:readingPlanMetadata": [
        [
          { address: "plan-1", data: metadata },
          { address: "bad", data: { not: "a plan" } },
        ],
      ],
    });

    const manager = makeManager("user-1");
    await flush();

    expect(manager.userReadingPlans.value).toEqual([metadata]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("walks every page of results", async () => {
    const metaA = metadataOf(makePlan({ address: "plan-1" }));
    const metaB = metadataOf(makePlan({ address: "plan-2" }));
    setListData({
      "publicRead:readingPlanMetadata": [
        [{ address: "plan-1", data: metaA }],
        [{ address: "plan-2", data: metaB }],
      ],
    });

    const manager = makeManager("user-1");
    await flush();

    expect(manager.userReadingPlans.value).toEqual([metaA, metaB]);
    // page 1 (no cursor), page 2 (cursor plan-1), page 3 (cursor plan-2, empty)
    const metaCalls = listDataByMarkerMock.mock.calls.filter(
      (c) => c[1] === "publicRead:readingPlanMetadata"
    );
    expect(metaCalls).toHaveLength(3);
  });

  it("clears the signals when the user logs out", async () => {
    setListData({
      "publicRead:readingPlanMetadata": [
        [{ address: "plan-1", data: metadataOf(makePlan()) }],
      ],
    });
    const manager = makeManager("user-1");
    await flush();
    expect(manager.userReadingPlans.value).toHaveLength(1);

    userId.value = null;
    await flush();

    expect(manager.userReadingPlans.value).toEqual([]);
    expect(manager.userReadingPlanProgresses.value).toEqual([]);
  });

  it("saveReadingPlan records the full plan and metadata under separate markers", async () => {
    const manager = makeManager("user-1");
    const plan = makePlan();
    await manager.saveReadingPlan(plan);

    expect(recordDataMock).toHaveBeenCalledWith("record-1", "plan-1", plan, {
      markers: ["publicRead:readingPlan"],
    });
    const metaCall = recordDataMock.mock.calls.find(
      (c) => c[3]?.markers?.[0] === "publicRead:readingPlanMetadata"
    );
    expect(metaCall).toBeDefined();
    expect(metaCall![2]).not.toHaveProperty("sessions");
    expect(metaCall![2]).toMatchObject({
      address: "plan-1",
      title: "Test Plan",
    });
  });

  it("selectReadingPlan loads the full plan via getData", async () => {
    const plan = makePlan();
    getDataMock.mockResolvedValue({ success: true, data: plan });
    const manager = makeManager("user-1");
    await flush();

    await manager.selectReadingPlan(metadataOf(plan));

    expect(getDataMock).toHaveBeenCalledWith("record-1", "plan-1");
    expect(manager.selectedReadingPlan.value).toEqual(plan);
  });

  it("selectReadingPlan(null) clears the selection", async () => {
    const plan = makePlan();
    getDataMock.mockResolvedValue({ success: true, data: plan });
    const manager = makeManager("user-1");
    await manager.selectReadingPlan(metadataOf(plan));
    expect(manager.selectedReadingPlan.value).not.toBeNull();

    await manager.selectReadingPlan(null);

    expect(manager.selectedReadingPlan.value).toBeNull();
  });

  it("selectReadingPlan leaves the selection unchanged when loading fails", async () => {
    getDataMock.mockResolvedValue({ success: false, errorCode: "not_found" });
    const manager = makeManager("user-1");

    await manager.selectReadingPlan(metadataOf(makePlan()));

    expect(manager.selectedReadingPlan.value).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});
