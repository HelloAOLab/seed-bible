import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers";
import {
  CadenceSchema,
  DEFAULT_DRAFT_DURATION_DAYS,
  PlanReadingSchema,
  ReadingPlanSchema,
  ReadingPlanSessionSchema,
  ReadingPlanProgressSchema,
  effectiveCadence,
  estimateReadingMinutes,
  sessionMatchesPassage,
  summarizeCalendar,
  slotsForCadence,
  dateForSession,
  sessionsForDate,
  isSessionComplete,
  planCompletion,
  withProgressStats,
  getReadingCalendar,
  markReadingCompleteInProgress,
  markSessionCompleteInProgress,
  markDayCompleteInProgress,
  createReadingPlanProgress,
  createReadingPlan,
  createReadingPlanDraft,
  createReadingPlansManager,
  draftReadingCount,
  sessionsFromDraft,
  withDraftDuration,
  type Cadence,
  type ReadingPlanDraft,
  type ReadingPlan,
  type ReadingPlanProgress,
  type ReadingCalendarEntry,
  type CalendarReadingDay,
  type CalendarSkipRange,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import { signal } from "@preact/signals";
import { DateTime } from "luxon";
import type { Mock } from "vitest";

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
    id: "progress-1",
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

describe("reading plan drafts", () => {
  const verseItem = (chapter: number) => ({
    type: "bible-verse" as const,
    ref: { bookId: "GEN", chapter },
  });
  const draftReading = (id: string, chapter: number) => ({
    id,
    item: verseItem(chapter),
  });

  it("starts empty, flexible, and on the default duration", () => {
    const draft = createReadingPlanDraft(START_MS);

    expect(draft).toMatchObject({
      title: "",
      planType: "flexible",
      durationDays: DEFAULT_DRAFT_DURATION_DAYS,
      startDateMs: START_MS,
      readingsByDay: {},
      selectedDay: 0,
    });
    expect(draftReadingCount(draft)).toBe(0);
  });

  it("counts only readings on in-range days", () => {
    const draft: ReadingPlanDraft = {
      ...createReadingPlanDraft(START_MS),
      durationDays: 3,
      readingsByDay: {
        0: [draftReading("r1", 1), draftReading("r2", 2)],
        2: [draftReading("r3", 3)],
        // Out of range for a 3-day plan — must not be counted.
        7: [draftReading("r4", 4)],
      },
    };

    expect(draftReadingCount(draft)).toBe(3);
  });

  it("shortening the duration drops out-of-range readings and clamps the day", () => {
    const draft: ReadingPlanDraft = {
      ...createReadingPlanDraft(START_MS),
      durationDays: 30,
      selectedDay: 20,
      readingsByDay: {
        0: [draftReading("r1", 1)],
        20: [draftReading("r2", 2)],
      },
    };

    const shortened = withDraftDuration(draft, 5);

    expect(shortened.durationDays).toBe(5);
    expect(shortened.selectedDay).toBe(4); // clamped to the last day
    expect(Object.keys(shortened.readingsByDay)).toEqual(["0"]);
    // The gate and the write agree: nothing counted that wouldn't be saved.
    expect(draftReadingCount(shortened)).toBe(1);
    expect(
      sessionsFromDraft(shortened, () => "s").flatMap((s) => s.readings)
    ).toHaveLength(1);
    expect(draft.readingsByDay[20]).toHaveLength(1); // input not mutated
  });

  it("never lets the duration fall below one day", () => {
    const draft = withDraftDuration(createReadingPlanDraft(START_MS), 0);

    expect(draft.durationDays).toBe(1);
    expect(draft.selectedDay).toBe(0);
  });

  it("builds one session per in-range day with readings, in day order", () => {
    let n = 0;
    const draft: ReadingPlanDraft = {
      ...createReadingPlanDraft(START_MS),
      durationDays: 4,
      readingsByDay: {
        2: [draftReading("r3", 3)],
        0: [draftReading("r1", 1), draftReading("r2", 2)],
        1: [], // an emptied day produces no session
        9: [draftReading("r4", 4)], // out of range
      },
    };

    const sessions = sessionsFromDraft(draft, () => `s${++n}`);

    expect(sessions).toEqual([
      {
        id: "s1",
        title: null,
        readings: [draftReading("r1", 1), draftReading("r2", 2)],
      },
      { id: "s2", title: null, readings: [draftReading("r3", 3)] },
    ]);
  });
});

describe("summarizeCalendar", () => {
  const ZONED_START = DateTime.fromISO("2026-06-17T00:00:00", { zone: ZONE });

  /**
   * A daily calendar of `total` reading days starting at `ZONED_START`, with
   * the day offsets in `done` marked complete. `nowOffset` selects which day
   * counts as "today". Built directly (rather than through
   * `getReadingCalendar`) so each case states exactly the shape under test.
   */
  const calendar = (
    total: number,
    done: number[],
    nowOffset: number
  ): ReadingCalendarEntry[] =>
    Array.from({ length: total }, (_, dayOffset): CalendarReadingDay => {
      const isDone = done.includes(dayOffset);
      const date = ZONED_START.plus({ days: dayOffset });
      return {
        type: "reading",
        date,
        dayOffset,
        sessions: [],
        startSessionIndex: dayOffset,
        endSessionIndex: dayOffset,
        completedAtMs: isDone ? date.plus({ hours: 8 }).toMillis() : null,
        containsNow: dayOffset === nowOffset,
      };
    });

  const nowAt = (dayOffset: number, hours = 9) =>
    ZONED_START.plus({ days: dayOffset, hours }).toMillis();

  const cases: {
    name: string;
    total: number;
    done: number[];
    nowOffset: number;
    streak: number;
    behind: number;
  }[] = [
    {
      name: "today still pending doesn't break the streak behind it",
      total: 5,
      done: [0, 1],
      nowOffset: 2,
      streak: 2,
      behind: 0,
    },
    {
      name: "today complete counts toward the streak",
      total: 5,
      done: [0, 1, 2],
      nowOffset: 2,
      streak: 3,
      behind: 0,
    },
    {
      name: "a gap in past days stops the streak and counts as behind",
      total: 5,
      done: [0, 2, 3],
      nowOffset: 3,
      streak: 2,
      behind: 1,
    },
    {
      name: "a missed day before today breaks the streak entirely",
      total: 5,
      done: [0, 1],
      nowOffset: 3,
      streak: 0,
      behind: 1,
    },
    {
      name: "nothing done yet on day one",
      total: 5,
      done: [],
      nowOffset: 0,
      streak: 0,
      behind: 0,
    },
    {
      name: "all days complete on the last day",
      total: 3,
      done: [0, 1, 2],
      nowOffset: 2,
      streak: 3,
      behind: 0,
    },
    {
      name: "future days are neither behind nor streak-breaking",
      total: 10,
      done: [0, 1],
      nowOffset: 1,
      streak: 2,
      behind: 0,
    },
  ];

  it.each(cases)("$name", ({ total, done, nowOffset, streak, behind }) => {
    const summary = summarizeCalendar(
      calendar(total, done, nowOffset),
      nowAt(nowOffset)
    );
    expect(summary.streak).toBe(streak);
    expect(summary.behind).toBe(behind);
    expect(summary.totalDays).toBe(total);
    expect(summary.doneDays).toBe(done.length);
  });

  it("reports today, the next unread day, and the last day", () => {
    const summary = summarizeCalendar(calendar(5, [0, 1], 2), nowAt(2));

    expect(summary.today?.dayOffset).toBe(2);
    expect(summary.next?.dayOffset).toBe(2);
    expect(summary.nextDayNumber).toBe(3); // 1-based ordinal
    expect(summary.lastDay?.dayOffset).toBe(4);
  });

  it("has no next day once every day is complete", () => {
    const summary = summarizeCalendar(calendar(3, [0, 1, 2], 2), nowAt(2));

    expect(summary.next).toBeNull();
    expect(summary.nextDayNumber).toBeNull();
    expect(summary.doneDays).toBe(3);
  });

  it("drops skip ranges and returns zeroed stats for an empty calendar", () => {
    const skip: CalendarSkipRange = {
      type: "skip",
      startDate: ZONED_START,
      endDate: ZONED_START.plus({ days: 1 }),
      startDayOffset: 0,
      days: 2,
      containsNow: false,
    };
    const mixed = [skip, ...calendar(1, [0], 0)];

    expect(summarizeCalendar(mixed, nowAt(0)).readingDays).toHaveLength(1);
    expect(summarizeCalendar([], nowAt(0))).toMatchObject({
      totalDays: 0,
      doneDays: 0,
      streak: 0,
      behind: 0,
      today: null,
      next: null,
      nextDayNumber: null,
      lastDay: null,
    });
  });

  it("resolves 'today' in the calendar's zone, not the device's", () => {
    // A plan anchored to Tokyo, read by a device in Los Angeles. At this
    // instant it is still the 17th in LA but already the 18th in Tokyo, so
    // day 0 (the 17th, incomplete) is strictly past and counts as behind.
    const tokyoStart = DateTime.fromISO("2026-06-17T00:00:00", {
      zone: "Asia/Tokyo",
    });
    const days: ReadingCalendarEntry[] = [0, 1].map(
      (dayOffset): CalendarReadingDay => ({
        type: "reading",
        date: tokyoStart.plus({ days: dayOffset }),
        dayOffset,
        sessions: [],
        startSessionIndex: dayOffset,
        endSessionIndex: dayOffset,
        completedAtMs: null,
        containsNow: dayOffset === 1,
      })
    );
    const nowMs = tokyoStart.plus({ days: 1, hours: 9 }).toMillis();

    expect(
      DateTime.fromMillis(nowMs, { zone: "America/Los_Angeles" }).day
    ).toBe(17);
    expect(summarizeCalendar(days, nowMs).behind).toBe(1);
  });
});

describe("sessionMatchesPassage", () => {
  const verseReading = (id: string, ref: Record<string, unknown>) => ({
    id,
    item: { type: "bible-verse" as const, ref },
  });
  const sessionWith = (...readings: ReturnType<typeof verseReading>[]) =>
    ReadingPlanSessionSchema.parse({ id: "s1", readings });

  it("matches a single-chapter reading only on its own chapter", () => {
    const session = sessionWith(
      verseReading("r1", { bookId: "GEN", chapter: 3, verse: 1 })
    );

    expect(sessionMatchesPassage(session, "GEN", 3)).toBe(true);
    expect(sessionMatchesPassage(session, "GEN", 2)).toBe(false);
    expect(sessionMatchesPassage(session, "GEN", 4)).toBe(false);
  });

  it("matches any chapter inside a multi-chapter reading, inclusive", () => {
    const session = sessionWith(
      verseReading("r1", { bookId: "GEN", chapter: 2, endChapter: 4 })
    );

    expect(
      [1, 2, 3, 4, 5].map((c) => sessionMatchesPassage(session, "GEN", c))
    ).toEqual([false, true, true, true, false]);
  });

  it("requires the book to match", () => {
    const session = sessionWith(
      verseReading("r1", { bookId: "GEN", chapter: 1, endChapter: 50 })
    );

    expect(sessionMatchesPassage(session, "EXO", 1)).toBe(false);
  });

  it("matches when any one of several readings covers the passage", () => {
    const session = sessionWith(
      verseReading("r1", { bookId: "GEN", chapter: 1 }),
      verseReading("r2", { bookId: "PSA", chapter: 23 })
    );

    expect(sessionMatchesPassage(session, "PSA", 23)).toBe(true);
    expect(sessionMatchesPassage(session, "PSA", 24)).toBe(false);
  });

  it("ignores non-scripture readings", () => {
    const session = ReadingPlanSessionSchema.parse({
      id: "s1",
      readings: [
        { id: "r1", item: { type: "html", title: "Intro", html: "<p>Hi</p>" } },
      ],
    });

    expect(sessionMatchesPassage(session, "GEN", 1)).toBe(false);
  });
});

describe("estimateReadingMinutes", () => {
  const verseReading = (id: string, ref: Record<string, unknown>) =>
    PlanReadingSchema.parse({
      id,
      item: { type: "bible-verse", ref },
    });

  it("counts a single chapter (or a verse within one) as one chapter", () => {
    expect(
      estimateReadingMinutes([
        verseReading("r1", { bookId: "GEN", chapter: 1 }),
      ])
    ).toBe(3);
    expect(
      estimateReadingMinutes([
        verseReading("r1", {
          bookId: "GEN",
          chapter: 1,
          verse: 1,
          endVerse: 5,
        }),
      ])
    ).toBe(3);
  });

  it("counts a chapter range inclusively", () => {
    expect(
      estimateReadingMinutes([
        verseReading("r1", { bookId: "GEN", chapter: 1, endChapter: 3 }),
      ])
    ).toBe(9);
  });

  it("sums across readings", () => {
    expect(
      estimateReadingMinutes([
        verseReading("r1", { bookId: "GEN", chapter: 1, endChapter: 2 }),
        verseReading("r2", { bookId: "PSA", chapter: 23 }),
      ])
    ).toBe(9);
  });

  it("counts a non-scripture reading as one chapter", () => {
    expect(
      estimateReadingMinutes([
        PlanReadingSchema.parse({
          id: "r1",
          item: { type: "html", title: "Intro", html: "<p>Hi</p>" },
        }),
      ])
    ).toBe(3);
  });

  it("never returns less than a minute, even for no readings", () => {
    expect(estimateReadingMinutes([])).toBe(1);
  });
});

describe("createReadingPlansManager", () => {
  type LoginArg = Parameters<typeof createReadingPlansManager>[1];

  let recordDataMock: Mock;
  let getDataMock: Mock;
  let listDataByMarkerMock: Mock;
  let warnSpy: Mock;
  let errorSpy: Mock;
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sessions: _sessions, ...metadata } = plan;
    return metadata;
  };

  const makeManager = (id: string | null = "user-1") => {
    userId = signal<string | null>(id);
    const os = CasualOSManager();

    // Wire the manager's CasualOS gateway to the mocks. The manager lists via
    // os.listAllDataByMarker, which we reimplement here to page through the
    // marker-aware listDataByMarkerMock so the pagination assertions hold.
    Object.assign(os, {
      getData: getDataMock,
      recordData: recordDataMock,
      listDataByMarker: listDataByMarkerMock,
      listAllDataByMarker: async (recordName: string, marker: string) => {
        const items: { address: string; data: unknown }[] = [];
        let lastAddress: string | undefined;
        while (true) {
          const page = await listDataByMarkerMock(
            recordName,
            marker,
            lastAddress
          );
          if (!page.success) {
            throw new Error(`Error listing data: ${page.errorCode}`);
          }
          if (page.items.length === 0) {
            break;
          }
          for (const item of page.items) {
            items.push({ address: item.address, data: item.data });
          }
          lastAddress = page.items[page.items.length - 1]?.address;
        }
        return { success: true, items };
      },
    });
    const login = { userId } as unknown as LoginArg;
    return createReadingPlansManager(os, login);
  };

  beforeEach(() => {
    recordDataMock = vi.fn().mockResolvedValue(undefined);
    getDataMock = vi.fn().mockResolvedValue({ success: false });
    listDataByMarkerMock = vi
      .fn()
      .mockResolvedValue({ success: true, items: [] });
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
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
      marker: "publicRead:readingPlan",
    });
    const metaCall = recordDataMock.mock.calls.find(
      (c) => c[3]?.marker === "publicRead:readingPlanMetadata"
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

  it("markSessionComplete updates the selected progress and persists it", async () => {
    const progress = makeProgress();
    setListData({
      "publicRead:readingPlanProgress": [
        [{ address: "rp_record-1_plan-1", data: progress }],
      ],
    });
    const manager = makeManager("user-1");
    await flush();
    await manager.selectReadingPlanProgress(progress);
    recordDataMock.mockClear();

    await manager.markSessionComplete({
      id: "s1",
      readings: [reading("r1")],
    });

    const updated = manager.selectedReadingPlanProgress.value!;
    const sp = updated.sessions.find((s) => s.sessionId === "s1")!;
    expect(sp.completedReadingIds).toEqual(["r1"]);
    expect(typeof sp.completedAtMs).toBe("number");
    // reflected in the synced list
    expect(manager.userReadingPlanProgresses.value[0]!.sessions).toHaveLength(
      1
    );
    // persisted at the unique progress id address under the progress marker
    const call = recordDataMock.mock.calls.at(-1)!;
    expect(call[0]).toBe("record-1");
    expect(call[1]).toBe("progress-1");
    expect(call[3]).toEqual({
      marker: "publicRead:readingPlanProgress",
    });
  });

  it("markReadingComplete marks a single item", async () => {
    const manager = makeManager("user-1");
    await flush();
    await manager.selectReadingPlanProgress(makeProgress());

    await manager.markReadingComplete(
      { id: "s2", readings: [reading("r2a"), reading("r2b")] },
      "r2a"
    );

    const sp = manager.selectedReadingPlanProgress.value!.sessions.find(
      (s) => s.sessionId === "s2"
    )!;
    expect(sp.completedReadingIds).toEqual(["r2a"]);
    expect(sp.completedAtMs).toBeNull();
    expect(recordDataMock).toHaveBeenCalled();
  });

  it("markDayComplete completes every session on the day", async () => {
    const plan = makePlan({
      sessions: [
        { id: "s1", readings: [reading("r1")] },
        { id: "s2", readings: [reading("r2")] },
      ],
    });
    const progress = makeProgress({
      customCadence: {
        segments: [{ type: "read", days: 1, sessionsPerDay: 2 }],
      },
      timeZone: ZONE,
    });
    const manager = makeManager("user-1");
    await manager.selectReadingPlanProgress(progress);
    const day = getReadingCalendar(
      plan,
      progress,
      START_MS
    )[0] as CalendarReadingDay;

    await manager.markDayComplete(day);

    const updated = manager.selectedReadingPlanProgress.value!;
    expect(updated.sessions.map((s) => s.sessionId).sort()).toEqual([
      "s1",
      "s2",
    ]);
    expect(updated.sessions.every((s) => s.completedAtMs !== null)).toBe(true);
  });

  it("markSessionComplete(false) clears the session and persists", async () => {
    const session = { id: "s1", readings: [reading("r1")] };
    const manager = makeManager("user-1");
    await flush();
    await manager.selectReadingPlanProgress(makeProgress());
    await manager.markSessionComplete(session);
    expect(
      manager.selectedReadingPlanProgress.value!.sessions.find(
        (s) => s.sessionId === "s1"
      )!.completedReadingIds
    ).toEqual(["r1"]);
    recordDataMock.mockClear();

    await manager.markSessionComplete(session, false);

    const sp = manager.selectedReadingPlanProgress.value!.sessions.find(
      (s) => s.sessionId === "s1"
    )!;
    expect(sp.completedReadingIds).toEqual([]);
    expect(sp.completedAtMs).toBeNull();
    expect(recordDataMock).toHaveBeenCalled();
  });

  it("mark* throws when no progress is selected", async () => {
    const manager = makeManager("user-1");
    await flush();
    await expect(
      manager.markSessionComplete({ id: "s1", readings: [reading("r1")] })
    ).rejects.toThrow("No reading plan progress selected");
  });

  it("startReadingPlan creates, saves, and appends a new progress without selecting it", async () => {
    const manager = makeManager("user-1");
    await flush();
    recordDataMock.mockClear();

    const progress = await manager.startReadingPlan(metadataOf(makePlan()), {
      cadenceId: "every-other-day",
      timeZone: "utc",
    });

    expect(progress.planId).toBe("rp_record-1_plan-1");
    expect(progress.recordName).toBe("user-1");
    expect(progress.userId).toBe("user-1");
    expect(progress.selectedCadenceId).toBe("every-other-day");
    expect(progress.timeZone).toBe("utc");
    expect(progress.sessions).toEqual([]);

    const call = recordDataMock.mock.calls.at(-1)!;
    expect(call[0]).toBe("user-1");
    expect(call[1]).toBe(progress.id);
    expect(call[3]).toEqual({ marker: "publicRead:readingPlanProgress" });

    expect(manager.userReadingPlanProgresses.value).toContain(progress);
    expect(manager.selectedReadingPlanProgress.value).toBeNull();
  });

  it("startReadingPlan can create multiple progresses for the same plan", async () => {
    const manager = makeManager("user-1");
    await flush();
    const plan = metadataOf(makePlan());

    const a = await manager.startReadingPlan(plan);
    const b = await manager.startReadingPlan(plan);

    expect(a.id).not.toBe(b.id);
    expect(a.planId).toBe(b.planId);
    expect(manager.userReadingPlanProgresses.value).toEqual(
      expect.arrayContaining([a, b])
    );
  });

  it("startReadingPlan throws when signed out", async () => {
    const manager = makeManager(null);
    await flush();
    await expect(
      manager.startReadingPlan(metadataOf(makePlan()))
    ).rejects.toThrow("Not signed in");
  });

  it("createNewReadingPlan saves an empty plan owned by the user and appends it", async () => {
    const manager = makeManager("user-1");
    await flush();
    recordDataMock.mockClear();

    await manager.createNewReadingPlan();

    const plans = manager.userReadingPlans.value;
    expect(plans).toHaveLength(1);
    const plan = plans[0]!;
    expect(plan.authorUserId).toBe("user-1");
    expect(plan.recordName).toBe("user-1");
    expect(plan.address).toMatch(/^plan_/);
    // The list holds metadata only — `sessions` live on the full-plan cache.
    expect(plan).not.toHaveProperty("sessions");
    expect(manager.fullReadingPlans.value[0]!.sessions).toEqual([]);

    // saveReadingPlan persists the full plan and the metadata separately
    const markers = recordDataMock.mock.calls.map((c) => c[3]?.marker);
    expect(markers).toEqual(
      expect.arrayContaining([
        "publicRead:readingPlan",
        "publicRead:readingPlanMetadata",
      ])
    );

    const firstCall = recordDataMock.mock.calls[0]!;
    expect(firstCall[0]).toBe("user-1"); // recordName
    expect(firstCall[1]).toMatch(/^plan_/); // address

    const secondCall = recordDataMock.mock.calls[1]!;
    expect(secondCall[0]).toBe("user-1"); // recordName
    expect(secondCall[1]).toMatch(/^plan_.*_metadata$/); // address

    expect(recordDataMock).toHaveBeenCalledTimes(2);
  });

  it("createNewReadingPlan applies provided metadata and returns the plan", async () => {
    const manager = makeManager("user-1");
    await flush();

    const plan = await manager.createNewReadingPlan({
      title: "Bible in a Year",
      description: "One year daily plan",
      locale: "es-MX",
    });

    expect(plan.title).toBe("Bible in a Year");
    expect(plan.description).toBe("One year daily plan");
    expect(plan.locale).toBe("es-MX");
    expect(plan.sessions).toEqual([]);
    expect(manager.userReadingPlans.value).toContainEqual(metadataOf(plan));
    expect(manager.fullReadingPlans.value).toContainEqual(plan);
  });

  it("createNewReadingPlan writes a plan and all its sessions in one save", async () => {
    const manager = makeManager("user-1");
    await flush();
    recordDataMock.mockClear();
    getDataMock.mockClear();

    const sessions = [
      { id: "s1", readings: [reading("r1")] },
      { id: "s2", readings: [reading("r2"), reading("r3")] },
    ];
    const plan = await manager.createNewReadingPlan({
      title: "Three readings",
      durationDays: 30,
      sessions,
    });
    await flush();

    expect(plan.sessions).toEqual(sessions);

    // One saveReadingPlan == 2 records (full + metadata), regardless of how
    // many sessions the plan has. A per-session save would multiply this.
    expect(recordDataMock).toHaveBeenCalledTimes(2);
    const saved = recordDataMock.mock.calls.find(
      (c) => c[3]?.marker === "publicRead:readingPlan"
    )!;
    expect((saved[2] as ReadingPlan).sessions).toEqual(sessions);

    // The full-plan cache is seeded from what was just saved, so the sync
    // effect has nothing to fetch.
    expect(manager.fullReadingPlans.value).toEqual([plan]);
    expect(getDataMock).not.toHaveBeenCalled();
  });

  it("appending a session doesn't refetch the user's other plans", async () => {
    const planA = makePlan({ address: "plan-a" });
    const planB = makePlan({ address: "plan-b" });
    const byAddress: Record<string, ReadingPlan> = {
      "plan-a": planA,
      "plan-b": planB,
    };
    setListData({
      "publicRead:readingPlanMetadata": [
        [
          { address: "plan-a_metadata", data: metadataOf(planA) },
          { address: "plan-b_metadata", data: metadataOf(planB) },
        ],
      ],
    });
    getDataMock.mockImplementation(async (_record: string, address: string) => {
      const found = byAddress[address];
      return found ? { success: true, data: found } : { success: false };
    });
    const manager = makeManager("user-1");
    await flush();

    // The initial sync loads both listed plans.
    expect(manager.fullReadingPlans.value).toHaveLength(2);
    expect(getDataMock).toHaveBeenCalledTimes(2);
    getDataMock.mockClear();

    const updated = await manager.addSessionToReadingPlan(planA, {
      id: "s-new",
      readings: [reading("r-new")],
    });
    await flush();

    // The appended-to plan is updated in the cache in place, and the untouched
    // plan is reused from cache — neither is re-read over the network.
    expect(getDataMock).not.toHaveBeenCalled();
    expect(manager.fullReadingPlans.value).toEqual([updated, planB]);
  });

  it("the draft survives so the reader can add to the plan being authored", async () => {
    const manager = makeManager("user-1");
    await flush();

    // Nothing being authored → the verse toolbar has nowhere to put a passage.
    expect(manager.editingReadingPlan.value).toBeNull();

    manager.startEditingReadingPlan();
    expect(manager.editingReadingPlan.value).not.toBeNull();

    manager.updateEditingReadingPlan({ title: "Psalms", selectedDay: 2 });
    manager.addReadingToEditingPlan({
      type: "bible-verse",
      ref: { bookId: "PSA", chapter: 23 },
    });
    // A text item — plans take any playlist item type, not just scripture.
    manager.addReadingToEditingPlan({
      type: "html",
      title: "Intro",
      html: "<p>Hi</p>",
    });

    const draft = manager.editingReadingPlan.value!;
    expect(draft.title).toBe("Psalms");
    expect(draft.readingsByDay[2]).toHaveLength(2);
    expect(draft.readingsByDay[2]!.map((r) => r.item.type)).toEqual([
      "bible-verse",
      "html",
    ]);
    expect(draftReadingCount(draft)).toBe(2);

    manager.cancelEditingReadingPlan();
    expect(manager.editingReadingPlan.value).toBeNull();
  });

  it("addReadingToEditingPlan clamps the target day into range", async () => {
    const manager = makeManager("user-1");
    await flush();
    manager.startEditingReadingPlan();
    manager.setEditingPlanDuration(3);

    manager.addReadingToEditingPlan(
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 1 } },
      99
    );

    // Clamped to the last in-range day rather than stranded out of range.
    expect(
      Object.keys(manager.editingReadingPlan.value!.readingsByDay)
    ).toEqual(["2"]);
  });

  it("removeReadingFromEditingPlan drops the reading and empties the day", async () => {
    const manager = makeManager("user-1");
    await flush();
    manager.startEditingReadingPlan();
    manager.addReadingToEditingPlan({
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 1 },
    });
    const readingId =
      manager.editingReadingPlan.value!.readingsByDay[0]![0]!.id;

    manager.removeReadingFromEditingPlan(0, readingId);

    expect(manager.editingReadingPlan.value!.readingsByDay).toEqual({});
  });

  it("saveEditingReadingPlan writes the draft once and clears it", async () => {
    const manager = makeManager("user-1");
    await flush();
    recordDataMock.mockClear();

    manager.startEditingReadingPlan();
    manager.updateEditingReadingPlan({
      title: "  Psalms Journey  ",
      planType: "scheduled",
      startDateMs: START_MS,
    });
    manager.setEditingPlanDuration(3);
    manager.addReadingToEditingPlan(
      { type: "bible-verse", ref: { bookId: "PSA", chapter: 1 } },
      0
    );
    manager.addReadingToEditingPlan(
      { type: "link", title: "Commentary", url: "https://example.com/psalms" },
      2
    );

    const plan = await manager.saveEditingReadingPlan();

    expect(plan).not.toBeNull();
    expect(plan!.title).toBe("Psalms Journey"); // trimmed
    expect(plan!.planType).toBe("scheduled");
    expect(plan!.durationDays).toBe(3);
    expect(plan!.suggestedStartDateMs).toBe(START_MS);
    // One session per day that has readings, in day order.
    expect(plan!.sessions).toHaveLength(2);
    expect(plan!.sessions.map((s) => s.readings[0]!.item.type)).toEqual([
      "bible-verse",
      "link",
    ]);
    // A single save (full plan + metadata), not one write per day.
    expect(recordDataMock).toHaveBeenCalledTimes(2);
    expect(manager.editingReadingPlan.value).toBeNull();
  });

  it("saveEditingReadingPlan is a no-op without a draft or readings", async () => {
    const manager = makeManager("user-1");
    await flush();
    recordDataMock.mockClear();

    expect(await manager.saveEditingReadingPlan()).toBeNull();

    manager.startEditingReadingPlan();
    expect(await manager.saveEditingReadingPlan()).toBeNull();

    expect(recordDataMock).not.toHaveBeenCalled();
    expect(manager.editingReadingPlan.value).not.toBeNull(); // draft kept
  });

  it("a suggested start date is only kept for a scheduled plan", async () => {
    const manager = makeManager("user-1");
    await flush();
    manager.startEditingReadingPlan();
    manager.updateEditingReadingPlan({
      planType: "flexible",
      startDateMs: START_MS,
    });
    manager.addReadingToEditingPlan({
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 1 },
    });

    const plan = await manager.saveEditingReadingPlan();

    expect(plan!.suggestedStartDateMs).toBeNull();
  });

  it("createNewReadingPlan throws when signed out", async () => {
    const manager = makeManager(null);
    await flush();
    await expect(manager.createNewReadingPlan()).rejects.toThrow(
      "Not signed in"
    );
  });

  it("canEditSelectedPlan is true only when the user authored the selected plan", async () => {
    // no plan selected → cannot edit
    const manager = makeManager("user-1");
    await flush();
    expect(manager.canEditSelectedPlan.value).toBe(false);

    // selected plan authored by the user → can edit
    const own = makePlan({ authorUserId: "user-1" });
    getDataMock.mockResolvedValue({ success: true, data: own });
    await manager.selectReadingPlan(metadataOf(own));
    expect(manager.canEditSelectedPlan.value).toBe(true);

    // selected plan authored by someone else → cannot edit
    const other = makePlan({ authorUserId: "author-x" });
    getDataMock.mockResolvedValue({ success: true, data: other });
    await manager.selectReadingPlan(metadataOf(other));
    expect(manager.canEditSelectedPlan.value).toBe(false);
  });

  it("addSessionToReadingPlan appends the session, bumps updatedAtMs, and saves", async () => {
    const manager = makeManager("user-1");
    await flush();
    const plan = makePlan({
      sessions: [{ id: "s1", readings: [reading("r1")] }],
      updatedAtMs: START_MS,
    });
    const newSession = { id: "s2", readings: [reading("r2")] };
    recordDataMock.mockClear();
    const NOW = START_MS + 60_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(NOW);

    const updated = await manager.addSessionToReadingPlan(plan, newSession);
    nowSpy.mockRestore();

    expect(updated.sessions.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(updated.sessions[1]).toEqual(newSession);
    expect(updated.updatedAtMs).toBe(NOW);
    expect(plan.sessions).toHaveLength(1); // input not mutated

    // persisted via saveReadingPlan (full plan + metadata)
    const markers = recordDataMock.mock.calls.map((c) => c[3]?.marker);
    expect(markers).toEqual(
      expect.arrayContaining([
        "publicRead:readingPlan",
        "publicRead:readingPlanMetadata",
      ])
    );

    const firstCall = recordDataMock.mock.calls[0]!;
    expect(firstCall[0]).toBe("record-1"); // recordName
    expect(firstCall[1]).toMatch(/^plan/); // address

    const secondCall = recordDataMock.mock.calls[1]!;
    expect(secondCall[0]).toBe("record-1"); // recordName
    expect(secondCall[1]).toMatch(/^plan.*_metadata$/); // address

    expect(recordDataMock).toHaveBeenCalledTimes(2);
    const fullPlanCall = recordDataMock.mock.calls.find(
      (c) => c[3]?.marker === "publicRead:readingPlan"
    )!;
    expect((fullPlanCall[2] as ReadingPlan).sessions).toHaveLength(2);
  });

  it("addSessionToReadingPlan syncs the selected plan when it matches", async () => {
    const plan = makePlan({ authorUserId: "user-1", sessions: [] });
    getDataMock.mockResolvedValue({ success: true, data: plan });
    const manager = makeManager("user-1");
    await flush();
    await manager.selectReadingPlan(metadataOf(plan));

    await manager.addSessionToReadingPlan(plan, {
      id: "s1",
      readings: [reading("r1")],
    });

    expect(
      manager.selectedReadingPlan.value!.sessions.map((s) => s.id)
    ).toEqual(["s1"]);
  });

  it("addSessionToReadingPlan refreshes the matching userReadingPlans entry", async () => {
    const plan = makePlan({ updatedAtMs: START_MS });
    setListData({
      "publicRead:readingPlanMetadata": [
        [{ address: plan.address, data: metadataOf(plan) }],
      ],
    });
    const manager = makeManager("user-1");
    await flush();
    expect(manager.userReadingPlans.value).toHaveLength(1);
    const NOW = START_MS + 60_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(NOW);

    await manager.addSessionToReadingPlan(plan, {
      id: "s9",
      readings: [reading("r9")],
    });
    nowSpy.mockRestore();

    const entry = manager.userReadingPlans.value.find(
      (p) => p.address === plan.address
    )!;
    expect(entry.updatedAtMs).toBe(NOW);
    expect(entry).not.toHaveProperty("sessions");
  });

  it("recomputes progress stats after marking, against the selected plan", async () => {
    const plan = makePlan(); // 3 sessions / 3 readings; planId matches makeProgress
    getDataMock.mockResolvedValue({ success: true, data: plan });
    const manager = makeManager("user-1");
    await flush();
    await manager.selectReadingPlan(metadataOf(plan));
    await manager.selectReadingPlanProgress(makeProgress());
    recordDataMock.mockClear();

    await manager.markSessionComplete({ id: "s1", readings: [reading("r1")] });

    const progress = manager.selectedReadingPlanProgress.value!;
    expect(progress.totalSessions).toBe(3);
    expect(progress.totalReadings).toBe(3);
    expect(progress.percentComplete).toBeCloseTo(1 / 3, 10);

    const saved = recordDataMock.mock.calls.at(-1)![2] as ReadingPlanProgress;
    expect(saved.percentComplete).toBeCloseTo(1 / 3, 10);
    expect(saved.totalReadings).toBe(3);
  });
});

describe("progress updates", () => {
  const NOW = START_MS + 5 * 86_400_000;
  const single = { id: "s1", readings: [reading("r1")] };
  const multi = { id: "s2", readings: [reading("r2a"), reading("r2b")] };

  it("marks a single-reading session complete (and doesn't mutate the input)", () => {
    const progress = makeProgress();
    const next = markReadingCompleteInProgress(progress, single, "r1", NOW);

    expect(next).not.toBe(progress);
    expect(progress.sessions).toEqual([]); // input untouched
    const sp = next.sessions.find((s) => s.sessionId === "s1")!;
    expect(sp.completedReadingIds).toEqual(["r1"]);
    expect(sp.completedAtMs).toBe(NOW);
    expect(isSessionComplete(single, sp)).toBe(true);
    expect(next.updatedAtMs).toBe(NOW);
  });

  it("keeps a multi-reading session incomplete until all readings are marked", () => {
    let progress = markReadingCompleteInProgress(
      makeProgress(),
      multi,
      "r2a",
      NOW
    );
    let sp = progress.sessions.find((s) => s.sessionId === "s2")!;
    expect(sp.completedReadingIds).toEqual(["r2a"]);
    expect(sp.completedAtMs).toBeNull();
    expect(isSessionComplete(multi, sp)).toBe(false);

    progress = markReadingCompleteInProgress(progress, multi, "r2b", NOW + 10);
    sp = progress.sessions.find((s) => s.sessionId === "s2")!;
    expect(sp.completedReadingIds).toEqual(["r2a", "r2b"]);
    expect(sp.completedAtMs).toBe(NOW + 10);
    expect(isSessionComplete(multi, sp)).toBe(true);
  });

  it("does not duplicate ids and ignores unknown readings", () => {
    let progress = markReadingCompleteInProgress(
      makeProgress(),
      multi,
      "r2a",
      NOW
    );
    progress = markReadingCompleteInProgress(progress, multi, "r2a", NOW);
    expect(
      progress.sessions.find((s) => s.sessionId === "s2")!.completedReadingIds
    ).toEqual(["r2a"]);

    const unchanged = markReadingCompleteInProgress(
      progress,
      multi,
      "nope",
      NOW
    );
    expect(unchanged).toBe(progress);
  });

  it("markSessionCompleteInProgress fills all readings and a timestamp", () => {
    const next = markSessionCompleteInProgress(makeProgress(), multi, NOW);
    const sp = next.sessions.find((s) => s.sessionId === "s2")!;
    expect(sp.completedReadingIds).toEqual(["r2a", "r2b"]);
    expect(sp.completedAtMs).toBe(NOW);
    expect(isSessionComplete(multi, sp)).toBe(true);
  });

  it("markDayCompleteInProgress completes every session on the day", () => {
    const plan = makePlan({ sessions: [single, multi] });
    const progress = makeProgress({
      customCadence: {
        segments: [{ type: "read", days: 1, sessionsPerDay: 2 }],
      },
      timeZone: ZONE,
    });
    const day = getReadingCalendar(
      plan,
      progress,
      START_MS
    )[0] as CalendarReadingDay;
    expect(day.sessions).toHaveLength(2);

    const next = markDayCompleteInProgress(progress, day, NOW);

    expect(
      isSessionComplete(
        single,
        next.sessions.find((s) => s.sessionId === "s1")
      )
    ).toBe(true);
    expect(
      isSessionComplete(
        multi,
        next.sessions.find((s) => s.sessionId === "s2")
      )
    ).toBe(true);
    expect(next.updatedAtMs).toBe(NOW);
  });

  it("marks a reading incomplete, clearing the session completion time", () => {
    let progress = markSessionCompleteInProgress(makeProgress(), multi, NOW);
    expect(
      progress.sessions.find((s) => s.sessionId === "s2")!.completedAtMs
    ).toBe(NOW);

    progress = markReadingCompleteInProgress(
      progress,
      multi,
      "r2a",
      NOW + 10,
      false
    );
    const sp = progress.sessions.find((s) => s.sessionId === "s2")!;
    expect(sp.completedReadingIds).toEqual(["r2b"]);
    expect(sp.completedAtMs).toBeNull();
    expect(isSessionComplete(multi, sp)).toBe(false);
    expect(progress.updatedAtMs).toBe(NOW + 10);
  });

  it("marking incomplete is a no-op when there's nothing to undo", () => {
    const progress = makeProgress();
    expect(
      markReadingCompleteInProgress(progress, multi, "r2a", NOW, false)
    ).toBe(progress);
    expect(markSessionCompleteInProgress(progress, multi, NOW, false)).toBe(
      progress
    );
  });

  it("markSessionCompleteInProgress(false) clears all readings and the time", () => {
    const completed = markSessionCompleteInProgress(makeProgress(), multi, NOW);
    const next = markSessionCompleteInProgress(
      completed,
      multi,
      NOW + 5,
      false
    );
    const sp = next.sessions.find((s) => s.sessionId === "s2")!;
    expect(sp.completedReadingIds).toEqual([]);
    expect(sp.completedAtMs).toBeNull();
    expect(next.updatedAtMs).toBe(NOW + 5);
  });

  it("markDayCompleteInProgress(false) clears every session on the day", () => {
    const plan = makePlan({ sessions: [single, multi] });
    const progress = makeProgress({
      customCadence: {
        segments: [{ type: "read", days: 1, sessionsPerDay: 2 }],
      },
      timeZone: ZONE,
    });
    const day = getReadingCalendar(
      plan,
      progress,
      START_MS
    )[0] as CalendarReadingDay;

    const completed = markDayCompleteInProgress(progress, day, NOW);
    const cleared = markDayCompleteInProgress(completed, day, NOW + 5, false);

    expect(
      isSessionComplete(
        single,
        cleared.sessions.find((s) => s.sessionId === "s1")
      )
    ).toBe(false);
    expect(
      isSessionComplete(
        multi,
        cleared.sessions.find((s) => s.sessionId === "s2")
      )
    ).toBe(false);
    cleared.sessions.forEach((sp) => {
      expect(sp.completedReadingIds).toEqual([]);
      expect(sp.completedAtMs).toBeNull();
    });
  });
});

describe("createReadingPlanProgress", () => {
  it("builds a fresh progress anchored to the user", () => {
    const progress = createReadingPlanProgress(
      makePlan(),
      "user-9",
      "prog-1",
      START_MS
    );

    expect(progress.id).toBe("prog-1");
    expect(progress.planId).toBe("rp_record-1_plan-1");
    expect(progress.recordName).toBe("user-9");
    expect(progress.userId).toBe("user-9");
    expect(progress.sessions).toEqual([]);
    expect(progress.startedAtMs).toBe(START_MS);
    expect(progress.createdAtMs).toBe(START_MS);
    expect(progress.updatedAtMs).toBe(START_MS);
    // defaults: plan default cadence, no override, no zone
    expect(progress.selectedCadenceId).toBe("daily");
    expect(progress.customCadence ?? null).toBeNull();
    expect(progress.timeZone ?? null).toBeNull();
  });

  it("honors explicit cadence and timezone options", () => {
    const custom: Cadence = {
      segments: [{ type: "read", days: 1, sessionsPerDay: 2 }],
    };
    const progress = createReadingPlanProgress(
      makePlan(),
      "user-9",
      "prog-2",
      START_MS,
      {
        cadenceId: "every-other-day",
        customCadence: custom,
        timeZone: "America/New_York",
      }
    );

    expect(progress.selectedCadenceId).toBe("every-other-day");
    expect(progress.customCadence).toEqual(custom);
    expect(progress.timeZone).toBe("America/New_York");
  });

  it("falls back to the first cadence option when there's no default", () => {
    const progress = createReadingPlanProgress(
      makePlan({ defaultCadenceId: null }),
      "user-9",
      "prog-3",
      START_MS
    );
    expect(progress.selectedCadenceId).toBe("daily"); // first option's id
  });

  it("starts with zeroed progress stats", () => {
    const progress = createReadingPlanProgress(
      makePlan(),
      "user-9",
      "prog-4",
      START_MS
    );
    expect(progress.percentComplete).toBe(0);
    expect(progress.totalSessions).toBe(0);
    expect(progress.totalReadings).toBe(0);
  });
});

describe("withProgressStats", () => {
  it("defaults the derived stats to 0 and rejects out-of-range percentages", () => {
    const progress = makeProgress();
    expect(progress.percentComplete).toBe(0);
    expect(progress.totalSessions).toBe(0);
    expect(progress.totalReadings).toBe(0);

    expect(() =>
      ReadingPlanProgressSchema.parse({ ...progress, percentComplete: 1.5 })
    ).toThrow();
    expect(() =>
      ReadingPlanProgressSchema.parse({ ...progress, percentComplete: -0.1 })
    ).toThrow();
  });

  it("sets plan totals and percent (by readings)", () => {
    const plan = makePlan(); // 3 sessions, 3 readings

    const none = withProgressStats(plan, makeProgress());
    expect(none.totalSessions).toBe(3);
    expect(none.totalReadings).toBe(3);
    expect(none.percentComplete).toBe(0);

    const all = withProgressStats(
      plan,
      makeProgress({
        sessions: [
          { sessionId: "s1", completedReadingIds: ["r1"] },
          { sessionId: "s2", completedReadingIds: ["r2"] },
          { sessionId: "s3", completedReadingIds: ["r3"] },
        ],
      })
    );
    expect(all.percentComplete).toBe(1);
  });

  it("computes a partial fraction across readings", () => {
    const plan = makePlan({
      sessions: [
        { id: "s1", readings: [reading("r1a"), reading("r1b")] },
        { id: "s2", readings: [reading("r2a"), reading("r2b")] },
      ],
    });
    const next = withProgressStats(
      plan,
      makeProgress({
        sessions: [{ sessionId: "s1", completedReadingIds: ["r1a"] }],
      })
    );
    expect(next.totalSessions).toBe(2);
    expect(next.totalReadings).toBe(4);
    expect(next.percentComplete).toBe(0.25);
  });

  it("is 0 for an empty plan", () => {
    const next = withProgressStats(makePlan({ sessions: [] }), makeProgress());
    expect(next.totalSessions).toBe(0);
    expect(next.totalReadings).toBe(0);
    expect(next.percentComplete).toBe(0);
  });
});

describe("createReadingPlan", () => {
  it("creates an empty plan with sensible defaults", () => {
    const plan = createReadingPlan("record-9", "author-9", "plan-9", START_MS);

    // round-trips through the schema
    expect(() => ReadingPlanSchema.parse(plan)).not.toThrow();
    expect(plan.address).toBe("plan-9");
    expect(plan.recordName).toBe("record-9");
    expect(plan.authorUserId).toBe("author-9");
    expect(plan.sessions).toEqual([]);
    expect(plan.locale).toBe("en");
    expect(plan.title).toBeNull();
    expect(plan.description).toBeNull();
    expect(plan.schemaVersion).toBe(1);
    expect(plan.createdAtMs).toBe(START_MS);
    expect(plan.updatedAtMs).toBe(START_MS);
    // a plan must offer at least one cadence; defaults to daily
    expect(plan.cadenceOptions).toHaveLength(1);
    expect(plan.cadenceOptions[0]!.id).toBe("daily");
    expect(plan.defaultCadenceId).toBe("daily");
  });

  it("honors provided title, locale, and cadence options", () => {
    const cadenceOptions = [
      {
        id: "weekly",
        label: "Weekly",
        cadence: {
          segments: [
            { type: "read" as const, days: 1 },
            { type: "skip" as const, days: 6 },
          ],
        },
      },
    ];
    const plan = createReadingPlan("record-9", "author-9", "plan-9", START_MS, {
      locale: "es-MX",
      title: "My Plan",
      description: "A custom plan",
      cadenceOptions,
    });

    expect(plan.locale).toBe("es-MX");
    expect(plan.title).toBe("My Plan");
    expect(plan.description).toBe("A custom plan");
    expect(plan.cadenceOptions).toEqual(cadenceOptions);
    expect(plan.defaultCadenceId).toBe("weekly"); // first provided option
  });
});
