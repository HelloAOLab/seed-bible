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
  type Cadence,
  type ReadingPlan,
  type ReadingPlanProgress,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";

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

const dayOffsetOf = (date: Date) =>
  Math.round(
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      Date.UTC(2026, 5, 17)) /
      86_400_000
  );

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
        const date = dateForSession(c.cadence, START_MS, sessionIndex);
        expect(date).not.toBeNull();
        expect(dayOffsetOf(date!)).toBe(slot.dayOffset);
        expect(sessionsForDate(c.cadence, START_MS, date!.getTime())).toContain(
          sessionIndex
        );
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
