import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers";
import {
  CadenceSchema,
  DEFAULT_CADENCE_OPTIONS,
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
  isReadingChapterComplete,
  readingChapters,
  readingCompletion,
  readingUnits,
  planCompletion,
  withProgressStats,
  getReadingCalendar,
  markReadingCompleteInProgress,
  markReadingChapterCompleteInProgress,
  markSessionCompleteInProgress,
  markDayCompleteInProgress,
  createReadingPlanProgress,
  createReadingPlan,
  cadenceDurationDays,
  createDraftSession,
  createReadingPlansManager,
  draftReadingCount,
  sessionsFromDraft,
  type Cadence,
  type ReadingPlanDraft,
  type ReadingPlan,
  type ReadingPlanProgress,
  type ReadingCalendarEntry,
  type CalendarReadingDay,
  type CalendarSkipRange,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import { signal } from "@preact/signals";
import {
  addCivilDays,
  civilDateInZone,
  civilDateToISO,
  civilDaysBetween,
  type CivilDate,
} from "@packages/seed-bible/seed-bible/managers/civilDate";
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
const START_DAY = civilDateInZone(START_MS, ZONE);
const dayOffsetOf = (date: CivilDate) => civilDaysBetween(START_DAY, date);
// The instant `hours` into `date`. Valid because ZONE above is UTC, so a
// calendar date and a UTC timestamp line up exactly.
const msAt = (date: CivilDate, hours = 0) =>
  Date.UTC(date.year, date.month - 1, date.day, hours);

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
          sessionsForDate(c.cadence, START_MS, msAt(date!), ZONE)
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

describe("per-chapter completion", () => {
  const spanning = (id: string, chapter: number, endChapter?: number) =>
    PlanReadingSchema.parse({
      id,
      item: {
        type: "bible-verse",
        ref: endChapter
          ? { bookId: "JHN", chapter, endChapter }
          : { bookId: "JHN", chapter },
      },
    });
  const textReading = (id: string) =>
    PlanReadingSchema.parse({
      id,
      item: { type: "html", title: "Intro", html: "<p>Hi</p>" },
    });

  it("readingChapters lists every chapter a reading covers", () => {
    expect(readingChapters(spanning("r1", 1, 10))).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(readingChapters(spanning("r1", 4))).toEqual([4]);
    // Text and link readings aren't read a chapter at a time.
    expect(readingChapters(textReading("r1"))).toEqual([]);
    expect(readingUnits(textReading("r1"))).toBe(1);
    expect(readingUnits(spanning("r1", 1, 10))).toBe(10);
  });

  it("credits one chapter of a multi-chapter reading without completing it", () => {
    const session = { id: "s1", readings: [spanning("r1", 1, 10)] };
    const progress = markReadingChapterCompleteInProgress(
      makeProgress(),
      session,
      "r1",
      4,
      START_MS
    );
    const sp = progress.sessions.find((s) => s.sessionId === "s1")!;

    // John 4 is read; the other nine chapters are not, so the reading — and
    // the session — are still open.
    expect(isReadingChapterComplete(sp, "r1", 4)).toBe(true);
    expect(isReadingChapterComplete(sp, "r1", 5)).toBe(false);
    expect(sp.completedReadingIds).toEqual([]);
    expect(sp.completedAtMs).toBeNull();
    expect(readingCompletion(session.readings[0]!, sp)).toEqual({
      done: 1,
      total: 10,
    });
  });

  it("completes the reading once its last chapter is read", () => {
    const session = { id: "s1", readings: [spanning("r1", 1, 3)] };
    let progress = makeProgress();
    for (const chapter of [1, 2, 3]) {
      progress = markReadingChapterCompleteInProgress(
        progress,
        session,
        "r1",
        chapter,
        START_MS
      );
    }
    const sp = progress.sessions.find((s) => s.sessionId === "s1")!;
    expect(sp.completedReadingIds).toEqual(["r1"]);
    // Finished readings carry no part-way chapter list.
    expect(sp.partialChapters).toEqual([]);
    expect(sp.completedAtMs).toBe(START_MS);
    expect(isSessionComplete(session, sp)).toBe(true);
  });

  it("un-reading one chapter of a complete reading leaves the rest read", () => {
    const session = { id: "s1", readings: [spanning("r1", 1, 3)] };
    const complete = markReadingCompleteInProgress(
      makeProgress(),
      session,
      "r1",
      START_MS
    );
    const undone = markReadingChapterCompleteInProgress(
      complete,
      session,
      "r1",
      2,
      START_MS,
      false
    );
    const sp = undone.sessions.find((s) => s.sessionId === "s1")!;
    expect(sp.completedReadingIds).toEqual([]);
    expect(readingCompletion(session.readings[0]!, sp)).toEqual({
      done: 2,
      total: 3,
    });
    expect(isReadingChapterComplete(sp, "r1", 2)).toBe(false);
    expect(isReadingChapterComplete(sp, "r1", 3)).toBe(true);
  });

  it("treats a single-chapter reading as all-or-nothing", () => {
    const session = { id: "s1", readings: [spanning("r1", 4)] };
    const progress = markReadingChapterCompleteInProgress(
      makeProgress(),
      session,
      "r1",
      4,
      START_MS
    );
    const sp = progress.sessions.find((s) => s.sessionId === "s1")!;
    expect(sp.completedReadingIds).toEqual(["r1"]);
    expect(sp.partialChapters).toEqual([]);
  });

  it("ignores chapters and readings the session doesn't have", () => {
    const session = { id: "s1", readings: [spanning("r1", 1, 3)] };
    const base = makeProgress();
    // A chapter outside the reading's range, a reading that isn't in the
    // session, and a reading that has no chapters at all.
    expect(
      markReadingChapterCompleteInProgress(base, session, "r1", 9, START_MS)
    ).toBe(base);
    expect(
      markReadingChapterCompleteInProgress(base, session, "nope", 1, START_MS)
    ).toBe(base);
    expect(
      markReadingChapterCompleteInProgress(
        base,
        { id: "s1", readings: [textReading("r1")] },
        "r1",
        1,
        START_MS
      )
    ).toBe(base);
  });

  it("marking the whole session complete clears part-way chapters", () => {
    const session = { id: "s1", readings: [spanning("r1", 1, 10)] };
    const partial = markReadingChapterCompleteInProgress(
      makeProgress(),
      session,
      "r1",
      4,
      START_MS
    );
    const done = markSessionCompleteInProgress(partial, session, START_MS);
    const sp = done.sessions.find((s) => s.sessionId === "s1")!;
    expect(sp.completedReadingIds).toEqual(["r1"]);
    expect(sp.partialChapters).toEqual([]);
  });

  it("counts progress in chapters, so a part-read reading moves the bar", () => {
    const plan = makePlan({
      sessions: [{ id: "s1", readings: [spanning("r1", 1, 10)] }],
    });
    const partial = markReadingChapterCompleteInProgress(
      makeProgress(),
      plan.sessions[0]!,
      "r1",
      1,
      START_MS
    );
    // Whole readings: 0 of 1 done. Chapters: 1 of 10 — which is what a reader
    // who has finished John 1 should see.
    expect(planCompletion(plan, partial)).toEqual({
      doneSessions: 0,
      totalSessions: 1,
      doneReadings: 0,
      totalReadings: 1,
      doneUnits: 1,
      totalUnits: 10,
    });
    expect(withProgressStats(plan, partial).percentComplete).toBeCloseTo(0.1);
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
        partialChapters: [],
      })
    ).toBe(false);
    expect(
      isSessionComplete(session, {
        sessionId: "s1",
        completedReadingIds: ["r1", "r2"],
        partialChapters: [],
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
        { sessionId: "s1", completedReadingIds: ["r1"], partialChapters: [] },
        { sessionId: "s2", completedReadingIds: ["r3"], partialChapters: [] },
      ],
    });
    expect(planCompletion(plan, progress)).toEqual({
      doneSessions: 1,
      totalSessions: 2,
      doneReadings: 2,
      totalReadings: 3,
      // Every reading here is a single chapter, so units track readings 1:1.
      doneUnits: 2,
      totalUnits: 3,
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
    msAt(addCivilDays(START_DAY, days), hours);

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
          {
            sessionId: "s0",
            completedReadingIds: ["s0"],
            partialChapters: [],
            completedAtMs: 100,
          },
          {
            sessionId: "s1",
            completedReadingIds: ["s1"],
            partialChapters: [],
            completedAtMs: 200,
          },
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
          {
            sessionId: "s0",
            completedReadingIds: ["s0"],
            partialChapters: [],
            completedAtMs: 100,
          },
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
  const draftOf = (sessions: ReadingPlan["sessions"]): ReadingPlanDraft => ({
    plan: createReadingPlan("user-1", "user-1", "plan-1", START_MS, {
      status: "draft",
      sessions,
    }),
    selectedSessionIndex: 0,
    persisted: false,
    isNew: true,
  });

  it("counts every reading across the draft's sessions", () => {
    const draft = draftOf([
      { id: "s1", readings: [draftReading("r1", 1), draftReading("r2", 2)] },
      { id: "s2", readings: [draftReading("r3", 3)] },
    ]);

    expect(draftReadingCount(draft)).toBe(3);
  });

  it("a new session starts empty", () => {
    const session = createDraftSession("s1");

    expect(session).toEqual({ id: "s1", title: null, readings: [] });
    expect(draftReadingCount(draftOf([session]))).toBe(0);
  });

  it("drops sessions the author never filled, keeping the rest in order", () => {
    const draft = draftOf([
      { id: "s1", readings: [draftReading("r1", 1)] },
      { id: "s2", readings: [] },
      { id: "s3", readings: [draftReading("r2", 2)] },
    ]);

    expect(sessionsFromDraft(draft).map((s) => s.id)).toEqual(["s1", "s3"]);
  });
});

describe("cadenceDurationDays", () => {
  const cadence = (id: string) =>
    DEFAULT_CADENCE_OPTIONS.find((o) => o.id === id)!.cadence;

  it("is the session count when reading once a day", () => {
    expect(cadenceDurationDays(cadence("once-daily"), 10)).toBe(10);
  });

  it("halves (rounding up) when reading twice a day", () => {
    expect(cadenceDurationDays(cadence("twice-daily"), 10)).toBe(5);
    expect(cadenceDurationDays(cadence("twice-daily"), 9)).toBe(5);
  });

  it("thirds (rounding up) when reading three times a day", () => {
    expect(cadenceDurationDays(cadence("three-times-daily"), 9)).toBe(3);
    expect(cadenceDurationDays(cadence("three-times-daily"), 10)).toBe(4);
  });

  it("stops on the last reading day, not on a trailing skip day", () => {
    // Read, skip, read, skip, ... — 3 sessions land on days 1, 3 and 5.
    expect(cadenceDurationDays(cadence("every-other-day"), 3)).toBe(5);
    expect(cadenceDurationDays(cadence("every-other-day"), 1)).toBe(1);
  });

  it("is zero when there is nothing to read or the cadence never reads", () => {
    expect(cadenceDurationDays(cadence("once-daily"), 0)).toBe(0);
    expect(
      cadenceDurationDays({ segments: [{ type: "skip", days: 2 }] }, 5)
    ).toBe(0);
  });
});

describe("summarizeCalendar", () => {
  const ZONED_START: CivilDate = { year: 2026, month: 6, day: 17 };

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
      const date = addCivilDays(ZONED_START, dayOffset);
      return {
        type: "reading",
        date,
        dayOffset,
        sessions: [],
        startSessionIndex: dayOffset,
        endSessionIndex: dayOffset,
        completedAtMs: isDone ? msAt(date, 8) : null,
        containsNow: dayOffset === nowOffset,
      };
    });

  const nowAt = (dayOffset: number, hours = 9) =>
    msAt(addCivilDays(ZONED_START, dayOffset), hours);

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
      nowAt(nowOffset),
      ZONE
    );
    expect(summary.streak).toBe(streak);
    expect(summary.behind).toBe(behind);
    expect(summary.totalDays).toBe(total);
    expect(summary.doneDays).toBe(done.length);
  });

  it("reports today, the next unread day, and the last day", () => {
    const summary = summarizeCalendar(calendar(5, [0, 1], 2), nowAt(2), ZONE);

    expect(summary.today?.dayOffset).toBe(2);
    expect(summary.next?.dayOffset).toBe(2);
    expect(summary.nextDayNumber).toBe(3); // 1-based ordinal
    expect(summary.lastDay?.dayOffset).toBe(4);
  });

  it("has no next day once every day is complete", () => {
    const summary = summarizeCalendar(
      calendar(3, [0, 1, 2], 2),
      nowAt(2),
      ZONE
    );

    expect(summary.next).toBeNull();
    expect(summary.nextDayNumber).toBeNull();
    expect(summary.doneDays).toBe(3);
  });

  it("drops skip ranges and returns zeroed stats for an empty calendar", () => {
    const skip: CalendarSkipRange = {
      type: "skip",
      startDate: ZONED_START,
      endDate: addCivilDays(ZONED_START, 1),
      startDayOffset: 0,
      days: 2,
      containsNow: false,
    };
    const mixed = [skip, ...calendar(1, [0], 0)];

    expect(summarizeCalendar(mixed, nowAt(0), ZONE).readingDays).toHaveLength(
      1
    );
    expect(summarizeCalendar([], nowAt(0), ZONE)).toMatchObject({
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
    const tokyoStart: CivilDate = { year: 2026, month: 6, day: 17 };
    const days: ReadingCalendarEntry[] = [0, 1].map(
      (dayOffset): CalendarReadingDay => ({
        type: "reading",
        date: addCivilDays(tokyoStart, dayOffset),
        dayOffset,
        sessions: [],
        startSessionIndex: dayOffset,
        endSessionIndex: dayOffset,
        completedAtMs: null,
        containsNow: dayOffset === 1,
      })
    );
    // 2026-06-18T09:00 in Tokyo (UTC+9) is 2026-06-18T00:00 UTC.
    const nowMs = Date.UTC(2026, 5, 18, 0, 0, 0);

    expect(civilDateInZone(nowMs, "America/Los_Angeles").day).toBe(17);
    expect(summarizeCalendar(days, nowMs, "Asia/Tokyo").behind).toBe(1);
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

  it("charges a whole chapter at a typical chapter's length", () => {
    // 24 verses at 8 verses a minute.
    expect(
      estimateReadingMinutes([
        verseReading("r1", { bookId: "GEN", chapter: 1 }),
      ])
    ).toBe(3);
  });

  it("counts an explicit verse range exactly, not as a whole chapter", () => {
    // 5 verses is under a minute, and the floor keeps it at one.
    expect(
      estimateReadingMinutes([
        verseReading("r1", {
          bookId: "GEN",
          chapter: 1,
          verse: 1,
          endVerse: 5,
        }),
      ])
    ).toBe(1);
    // 40 verses at 8 a minute.
    expect(
      estimateReadingMinutes([
        verseReading("r1", {
          bookId: "GEN",
          chapter: 1,
          verse: 1,
          endVerse: 40,
        }),
      ])
    ).toBe(5);
  });

  it("uses the book's own average chapter length when it is known", () => {
    const psalms = { numberOfChapters: 150, totalNumberOfVerses: 2461 };
    const isaiah = { numberOfChapters: 66, totalNumberOfVerses: 1292 };
    const resolve = (bookId: string) =>
      bookId === "PSA" ? psalms : bookId === "ISA" ? isaiah : null;

    // Psalms averages ~16 verses a chapter, Isaiah ~20 — so a chapter of
    // Isaiah reads as longer than a chapter of Psalms.
    const psalm = estimateReadingMinutes(
      [verseReading("r1", { bookId: "PSA", chapter: 23 })],
      resolve
    );
    const isaiahChapter = estimateReadingMinutes(
      [verseReading("r2", { bookId: "ISA", chapter: 40 })],
      resolve
    );
    expect(psalm).toBe(2);
    expect(isaiahChapter).toBe(2);
    expect(
      estimateReadingMinutes(
        [verseReading("r3", { bookId: "ISA", chapter: 1, endChapter: 10 })],
        resolve
      )
    ).toBe(24);
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
  let eraseDataMock: Mock;
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
      eraseData: eraseDataMock,
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
    eraseDataMock = vi.fn().mockResolvedValue({ success: true });
    getDataMock = vi.fn().mockResolvedValue({ success: false });
    listDataByMarkerMock = vi
      .fn()
      .mockResolvedValue({ success: true, items: [] });
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    // Draft saves are debounced, so some tests drive them with fake timers.
    // Restore real ones here too: a leaked fake clock makes every later test
    // that awaits `flush()` (a real setTimeout) hang until it times out.
    vi.useRealTimers();
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

  it("selectReadingPlan rejects (and selects nothing) when loading fails", async () => {
    getDataMock.mockResolvedValue({ success: false, errorCode: "not_found" });
    const manager = makeManager("user-1");

    // The failure has to reach the caller: a plan that can't be loaded must
    // leave the user on the list with an error, not on a blank detail view.
    await expect(
      manager.selectReadingPlan(metadataOf(makePlan()))
    ).rejects.toThrow(/not_found/);

    expect(manager.selectedReadingPlan.value).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("selectReadingPlan serves an already-cached plan without refetching", async () => {
    const plan = makePlan({ updatedAtMs: START_MS });
    setListData({
      "publicRead:readingPlanMetadata": [
        [{ address: `${plan.address}_metadata`, data: metadataOf(plan) }],
      ],
    });
    getDataMock.mockResolvedValue({ success: true, data: plan });
    const manager = makeManager("user-1");
    await flush();
    // The initial full-plan sync has it in hand; opening it is a cache hit.
    expect(manager.fullReadingPlans.value).toHaveLength(1);
    getDataMock.mockClear();

    const opened = await manager.selectReadingPlan(metadataOf(plan));

    expect(opened).toEqual(plan);
    expect(manager.selectedReadingPlan.value).toEqual(plan);
    expect(getDataMock).not.toHaveBeenCalled();
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

  it("the draft survives so the reader can add to the plan being authored", async () => {
    const manager = makeManager("user-1");
    await flush();

    // Nothing being authored -> the verse toolbar has nowhere to put a passage.
    expect(manager.editingReadingPlan.value).toBeNull();

    manager.startEditingReadingPlan();
    const started = manager.editingReadingPlan.value!;
    expect(started.plan.status).toBe("draft");
    expect(started.plan.sessions).toHaveLength(1); // one empty session ready
    expect(started.persisted).toBe(false); // nothing written until an edit

    manager.updateEditingReadingPlan({ title: "Psalms" });
    manager.addReadingToEditingPlan({
      type: "bible-verse",
      ref: { bookId: "PSA", chapter: 23 },
    });
    // A text item - plans take any playlist item type, not just scripture.
    manager.addReadingToEditingPlan({
      type: "html",
      title: "Intro",
      html: "<p>Hi</p>",
    });

    const draft = manager.editingReadingPlan.value!;
    expect(draft.plan.title).toBe("Psalms");
    expect(draft.plan.sessions[0]!.readings).toHaveLength(2);
    expect(draft.plan.sessions[0]!.readings.map((r) => r.item.type)).toEqual([
      "bible-verse",
      "html",
    ]);
    expect(draftReadingCount(draft)).toBe(2);
  });

  it("saves the draft to the user's account after a change", async () => {
    const manager = makeManager("user-1");
    await flush();
    recordDataMock.mockClear();
    // Fake timers only from here: `flush()` above awaits a real setTimeout.
    vi.useFakeTimers();
    try {
      manager.startEditingReadingPlan();
      // Opening the wizard alone writes nothing - backing straight out must
      // not leave an empty plan behind in the user's account.
      await vi.advanceTimersByTimeAsync(2000);
      expect(recordDataMock).not.toHaveBeenCalled();

      manager.updateEditingReadingPlan({ title: "Psalms" });
      await vi.advanceTimersByTimeAsync(2000);

      // Saved as a draft: the full plan plus its metadata.
      expect(recordDataMock).toHaveBeenCalledTimes(2);
      const saved = recordDataMock.mock.calls.find(
        (c) => c[3]?.marker === "publicRead:readingPlan"
      )!;
      expect((saved[2] as ReadingPlan).status).toBe("draft");
      expect(manager.editingReadingPlan.value!.persisted).toBe(true);
      // The draft shows up in the plans list so it can be resumed.
      expect(manager.userReadingPlans.value).toHaveLength(1);
      expect(manager.userReadingPlans.value[0]!.status).toBe("draft");
    } finally {
      vi.useRealTimers();
    }
  });

  it("rapid edits collapse into a single save", async () => {
    const manager = makeManager("user-1");
    await flush();
    recordDataMock.mockClear();
    vi.useFakeTimers();
    try {
      manager.startEditingReadingPlan();
      manager.updateEditingReadingPlan({ title: "P" });
      manager.updateEditingReadingPlan({ title: "Ps" });
      manager.updateEditingReadingPlan({ title: "Psa" });
      await vi.advanceTimersByTimeAsync(2000);

      expect(recordDataMock).toHaveBeenCalledTimes(2); // one save, two records
      const saved = recordDataMock.mock.calls.find(
        (c) => c[3]?.marker === "publicRead:readingPlan"
      )!;
      expect((saved[2] as ReadingPlan).title).toBe("Psa");
    } finally {
      vi.useRealTimers();
    }
  });

  it("sessions can be added and removed, and the last one is only emptied", async () => {
    const manager = makeManager("user-1");
    await flush();
    manager.startEditingReadingPlan();

    manager.addSessionToEditingPlan();
    expect(manager.editingReadingPlan.value!.plan.sessions).toHaveLength(2);
    // A new session is where the next reading goes.
    expect(manager.editingReadingPlan.value!.selectedSessionIndex).toBe(1);

    manager.addReadingToEditingPlan({
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 1 },
    });
    expect(
      manager.editingReadingPlan.value!.plan.sessions[1]!.readings
    ).toHaveLength(1);

    manager.removeSessionFromEditingPlan(1);
    expect(manager.editingReadingPlan.value!.plan.sessions).toHaveLength(1);
    expect(manager.editingReadingPlan.value!.selectedSessionIndex).toBe(0);

    // Removing the only session leaves an empty one, so there is always
    // somewhere for the next reading to land.
    manager.removeSessionFromEditingPlan(0);
    expect(manager.editingReadingPlan.value!.plan.sessions).toHaveLength(1);
    expect(
      manager.editingReadingPlan.value!.plan.sessions[0]!.readings
    ).toEqual([]);
  });

  it("removing a session before the selected one keeps the same session selected", async () => {
    const manager = makeManager("user-1");
    await flush();
    manager.startEditingReadingPlan();
    // Four sessions: A(0) B(1) C(2) D(3).
    manager.addSessionToEditingPlan();
    manager.addSessionToEditingPlan();
    manager.addSessionToEditingPlan();
    const ids = manager.editingReadingPlan.value!.plan.sessions.map(
      (s) => s.id
    );
    manager.selectEditingPlanSession(2); // C
    expect(manager.editingReadingPlan.value!.selectedSessionIndex).toBe(2);

    manager.removeSessionFromEditingPlan(0); // drop A -> [B, C, D]

    // C shifted down to index 1. Clamping the old index instead would leave
    // the selection on D while the UI still showed C, and quietly send the
    // next reading there.
    const draft = manager.editingReadingPlan.value!;
    expect(draft.selectedSessionIndex).toBe(1);
    expect(draft.plan.sessions[draft.selectedSessionIndex]!.id).toBe(ids[2]);

    manager.addReadingToEditingPlan({
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 1 },
    });
    const after = manager.editingReadingPlan.value!.plan.sessions;
    expect(after.find((s) => s.id === ids[2])!.readings).toHaveLength(1);
    expect(after.find((s) => s.id === ids[3])!.readings).toEqual([]);
  });

  it("addReadingToEditingPlan clamps the target session into range", async () => {
    const manager = makeManager("user-1");
    await flush();
    manager.startEditingReadingPlan();
    manager.addSessionToEditingPlan(); // two sessions: 0 and 1

    manager.addReadingToEditingPlan(
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 1 } },
      99
    );

    const sessions = manager.editingReadingPlan.value!.plan.sessions;
    expect(sessions[1]!.readings).toHaveLength(1);
    expect(sessions[0]!.readings).toEqual([]);
  });

  it("removeReadingFromEditingPlan drops the reading but keeps the session", async () => {
    const manager = makeManager("user-1");
    await flush();
    manager.startEditingReadingPlan();
    manager.addReadingToEditingPlan({
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 1 },
    });
    const readingId =
      manager.editingReadingPlan.value!.plan.sessions[0]!.readings[0]!.id;

    manager.removeReadingFromEditingPlan(0, readingId);

    const sessions = manager.editingReadingPlan.value!.plan.sessions;
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.readings).toEqual([]);
  });

  it("the plan offers whichever cadences the author checked, and never none", async () => {
    const manager = makeManager("user-1");
    await flush();
    manager.startEditingReadingPlan();

    manager.setEditingPlanCadenceOptions(["twice-daily", "once-daily"]);

    // Listed in the built-in order, whatever order they were checked in.
    expect(
      manager.editingReadingPlan.value!.plan.cadenceOptions.map((o) => o.id)
    ).toEqual(["once-daily", "twice-daily"]);
    expect(manager.editingReadingPlan.value!.plan.defaultCadenceId).toBe(
      "once-daily"
    );

    // A plan has to offer at least one pace, so clearing them all is ignored.
    manager.setEditingPlanCadenceOptions([]);
    expect(manager.editingReadingPlan.value!.plan.cadenceOptions).toHaveLength(
      2
    );
  });

  it("finishEditingReadingPlan completes the plan, pruning empty sessions", async () => {
    const manager = makeManager("user-1");
    await flush();

    manager.startEditingReadingPlan();
    manager.updateEditingReadingPlan({ title: "  Psalms Journey  " });
    manager.setEditingPlanCadenceOptions(["once-daily", "every-other-day"]);
    manager.addReadingToEditingPlan({
      type: "bible-verse",
      ref: { bookId: "PSA", chapter: 1 },
    });
    manager.addSessionToEditingPlan();
    manager.addReadingToEditingPlan({
      type: "link",
      title: "Commentary",
      url: "https://example.com/psalms",
    });
    manager.addSessionToEditingPlan(); // left empty on purpose
    recordDataMock.mockClear();

    const plan = await manager.finishEditingReadingPlan();

    expect(plan).not.toBeNull();
    expect(plan!.title).toBe("Psalms Journey"); // trimmed
    expect(plan!.status).toBe("complete");
    expect(plan!.cadenceOptions.map((o) => o.id)).toEqual([
      "once-daily",
      "every-other-day",
    ]);
    // The session the author never filled is dropped.
    expect(plan!.sessions).toHaveLength(2);
    expect(plan!.sessions.map((s) => s.readings[0]!.item.type)).toEqual([
      "bible-verse",
      "link",
    ]);
    // A single save (full plan + metadata), not one write per session.
    expect(recordDataMock).toHaveBeenCalledTimes(2);
    expect(manager.editingReadingPlan.value).toBeNull();
    // The finished plan replaces the draft in the list rather than doubling it.
    expect(manager.userReadingPlans.value).toHaveLength(1);
    expect(manager.userReadingPlans.value[0]!.status).toBe("complete");
  });

  it("finishEditingReadingPlan is a no-op without a draft or readings", async () => {
    const manager = makeManager("user-1");
    await flush();
    recordDataMock.mockClear();

    expect(await manager.finishEditingReadingPlan()).toBeNull();

    manager.startEditingReadingPlan();
    expect(await manager.finishEditingReadingPlan()).toBeNull();

    expect(recordDataMock).not.toHaveBeenCalled();
    expect(manager.editingReadingPlan.value).not.toBeNull(); // draft kept
  });

  it("a saved draft can be resumed, and discarding it erases the record", async () => {
    const manager = makeManager("user-1");
    await flush();
    vi.useFakeTimers();
    try {
      manager.startEditingReadingPlan();
      manager.updateEditingReadingPlan({ title: "Half-built" });
      await vi.advanceTimersByTimeAsync(2000);
      const address = manager.editingReadingPlan.value!.plan.address;

      // Stepping out of the wizard keeps the draft - that's the point of it.
      manager.cancelEditingReadingPlan();
      await vi.advanceTimersByTimeAsync(2000);
      expect(manager.editingReadingPlan.value).toBeNull();
      expect(manager.userReadingPlans.value).toHaveLength(1);

      const saved = manager.fullReadingPlans.value[0]!;
      manager.resumeEditingReadingPlan(saved);
      expect(manager.editingReadingPlan.value!.plan.title).toBe("Half-built");
      expect(manager.editingReadingPlan.value!.persisted).toBe(true);

      await manager.discardEditingReadingPlan();

      expect(manager.editingReadingPlan.value).toBeNull();
      expect(manager.userReadingPlans.value).toEqual([]);
      expect(eraseDataMock).toHaveBeenCalledWith("user-1", address);
      expect(eraseDataMock).toHaveBeenCalledWith(
        "user-1",
        `${address}_metadata`
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("editing a published plan keeps it, so backing out changes nothing", async () => {
    const plan = makePlan({
      authorUserId: "user-1",
      recordName: "user-1",
      status: "complete",
    });
    getDataMock.mockResolvedValue({ success: true, data: plan });
    const manager = makeManager("user-1");
    await flush();

    manager.editExistingReadingPlan(plan);
    const draft = manager.editingReadingPlan.value!;
    // Not "new": it is already out in the world, so discard must not delete it
    // and the plan keeps its published status while being edited.
    expect(draft.isNew).toBe(false);
    expect(draft.persisted).toBe(true);
    expect(draft.plan.status).toBe("complete");

    eraseDataMock.mockClear();
    await manager.discardEditingReadingPlan();

    expect(manager.editingReadingPlan.value).toBeNull();
    expect(eraseDataMock).not.toHaveBeenCalled();
  });

  it("deleting a plan erases its records and the user's progress through it", async () => {
    const plan = makePlan({ recordName: "user-1", address: "plan-1" });
    const progress = makeProgress({
      id: "progress-1",
      recordName: "user-1",
      planId: "rp_user-1_plan-1",
    });
    setListData({
      "publicRead:readingPlanMetadata": [
        [{ address: "plan-1_metadata", data: metadataOf(plan) }],
      ],
      "publicRead:readingPlanProgress": [
        [{ address: "progress-1", data: progress }],
      ],
    });
    getDataMock.mockResolvedValue({ success: true, data: plan });
    const manager = makeManager("user-1");
    await flush();
    expect(manager.userReadingPlanProgresses.value).toHaveLength(1);
    eraseDataMock.mockClear();

    await manager.deleteReadingPlan(plan);

    expect(eraseDataMock).toHaveBeenCalledWith("user-1", "plan-1");
    expect(eraseDataMock).toHaveBeenCalledWith("user-1", "plan-1_metadata");
    // Progress that points at a plan which no longer exists is unreadable, so
    // it goes too rather than sitting in the account forever.
    expect(eraseDataMock).toHaveBeenCalledWith("user-1", "progress-1");
    expect(manager.userReadingPlans.value).toEqual([]);
    expect(manager.fullReadingPlans.value).toEqual([]);
    expect(manager.userReadingPlanProgresses.value).toEqual([]);
  });

  it("setPassageCompleteForProgress credits only the chapter that was read", async () => {
    const session = ReadingPlanSessionSchema.parse({
      id: "s1",
      readings: [
        {
          id: "r-scripture",
          item: {
            type: "bible-verse",
            ref: { bookId: "JHN", chapter: 1, endChapter: 10 },
          },
        },
        {
          id: "r-text",
          item: { type: "html", title: "Intro", html: "<p>Hi</p>" },
        },
      ],
    });
    const plan = makePlan({
      recordName: "user-1",
      address: "plan-1",
      sessions: [session],
    });
    const progress = makeProgress({
      id: "progress-1",
      recordName: "user-1",
      planId: "rp_user-1_plan-1",
    });
    setListData({
      "publicRead:readingPlanMetadata": [
        [{ address: "plan-1_metadata", data: metadataOf(plan) }],
      ],
      "publicRead:readingPlanProgress": [
        [{ address: "progress-1", data: progress }],
      ],
    });
    getDataMock.mockResolvedValue({ success: true, data: plan });
    const manager = makeManager("user-1");
    await flush();

    // The reader finished John 4 and tapped the plan in the "belongs to" card.
    await manager.setPassageCompleteForProgress(
      "progress-1",
      session,
      "JHN",
      4,
      true
    );

    const sp = manager.userReadingPlanProgresses.value[0]!.sessions.find(
      (s) => s.sessionId === "s1"
    )!;
    // John 4 only — not the other nine chapters, and not the text reading,
    // which isn't reachable from the reader at all.
    expect(sp.partialChapters).toEqual([
      { readingId: "r-scripture", chapters: [4] },
    ]);
    expect(sp.completedReadingIds).toEqual([]);
    expect(manager.userReadingPlanProgresses.value[0]!.percentComplete).toBe(
      1 / 11
    );
  });

  it("starting a plan at your own pace records no cadence to keep to", async () => {
    const manager = makeManager("user-1");
    await flush();
    const plan = makePlan({
      cadenceOptions: [DEFAULT_CADENCE_OPTIONS[1]!], // twice a day
    });

    const progress = await manager.startReadingPlan(metadataOf(plan), {
      selfPaced: true,
    });

    expect(progress.selfPaced).toBe(true);
    expect(progress.selectedCadenceId).toBeNull();
    // One session at a time, rather than inheriting the plan's twice-a-day
    // rhythm just because it happens to be listed first.
    expect(progress.customCadence).toEqual({
      segments: [{ type: "read", days: 1, sessionsPerDay: 1 }],
    });
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

  describe("analytics", () => {
    let mockPosthogCapture: Mock;

    beforeEach(() => {
      mockPosthogCapture = vi.fn();
      (globalThis as any).posthog = { capture: mockPosthogCapture };
    });

    afterEach(() => {
      delete (globalThis as any).posthog;
    });

    it("finishEditingReadingPlan captures reading_plan_created for a new draft", async () => {
      const manager = makeManager("user-1");
      await flush();
      manager.startEditingReadingPlan();
      manager.addReadingToEditingPlan({
        type: "bible-verse",
        ref: { bookId: "PSA", chapter: 1 },
      });

      const plan = await manager.finishEditingReadingPlan();

      expect(mockPosthogCapture).toHaveBeenCalledWith("reading_plan_created", {
        planId: `rp_${plan!.recordName}_${plan!.address}`,
        totalSessions: 1,
        totalReadings: 1,
      });
      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        "reading_plan_updated",
        expect.anything()
      );
    });

    it("finishEditingReadingPlan captures reading_plan_updated for an existing plan", async () => {
      const plan = makePlan({ authorUserId: "user-1", recordName: "user-1" });
      getDataMock.mockResolvedValue({ success: true, data: plan });
      const manager = makeManager("user-1");
      await flush();
      manager.editExistingReadingPlan(plan);
      mockPosthogCapture.mockClear();

      await manager.finishEditingReadingPlan();

      expect(mockPosthogCapture).toHaveBeenCalledWith("reading_plan_updated", {
        planId: "rp_user-1_plan-1",
        totalSessions: 3,
        totalReadings: 3,
      });
      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        "reading_plan_created",
        expect.anything()
      );
    });

    it("deleteReadingPlan captures reading_plan_deleted", async () => {
      const plan = makePlan({ recordName: "user-1", address: "plan-1" });
      const manager = makeManager("user-1");
      await flush();

      await manager.deleteReadingPlan(plan);

      expect(mockPosthogCapture).toHaveBeenCalledWith("reading_plan_deleted", {
        planId: "rp_user-1_plan-1",
      });
    });

    it("discarding a never-finished draft captures reading_plan_draft_discarded, not reading_plan_deleted", async () => {
      const manager = makeManager("user-1");
      await flush();
      vi.useFakeTimers();
      try {
        manager.startEditingReadingPlan();
        manager.addReadingToEditingPlan({
          type: "bible-verse",
          ref: { bookId: "PSA", chapter: 1 },
        });
        // Let the debounced autosave persist the draft (status stays "draft"
        // since finishEditingReadingPlan was never called).
        await vi.advanceTimersByTimeAsync(2000);
        expect(manager.editingReadingPlan.value!.persisted).toBe(true);
        const plan = manager.editingReadingPlan.value!.plan;
        mockPosthogCapture.mockClear();

        await manager.discardEditingReadingPlan();

        expect(mockPosthogCapture).toHaveBeenCalledWith(
          "reading_plan_draft_discarded",
          {
            planId: `rp_${plan.recordName}_${plan.address}`,
            totalSessions: 1,
            totalReadings: 1,
          }
        );
        // A draft that was never finished never fired reading_plan_created,
        // so discarding it must not look like a delete either.
        expect(mockPosthogCapture).not.toHaveBeenCalledWith(
          "reading_plan_deleted",
          expect.anything()
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("cancelEditingReadingPlan keeps the draft and does not capture reading_plan_draft_discarded", async () => {
      const manager = makeManager("user-1");
      await flush();
      vi.useFakeTimers();
      try {
        manager.startEditingReadingPlan();
        manager.addReadingToEditingPlan({
          type: "bible-verse",
          ref: { bookId: "PSA", chapter: 1 },
        });
        await vi.advanceTimersByTimeAsync(2000);
        mockPosthogCapture.mockClear();

        manager.cancelEditingReadingPlan();
        await vi.advanceTimersByTimeAsync(2000);

        expect(mockPosthogCapture).not.toHaveBeenCalledWith(
          "reading_plan_draft_discarded",
          expect.anything()
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("autosaving a new draft captures reading_plan_draft_created on the first save, reading_plan_draft_updated after", async () => {
      const manager = makeManager("user-1");
      await flush();
      vi.useFakeTimers();
      try {
        manager.startEditingReadingPlan();
        manager.addReadingToEditingPlan({
          type: "bible-verse",
          ref: { bookId: "PSA", chapter: 1 },
        });
        await vi.advanceTimersByTimeAsync(2000);
        const plan = manager.editingReadingPlan.value!.plan;

        expect(mockPosthogCapture).toHaveBeenCalledWith(
          "reading_plan_draft_created",
          {
            planId: `rp_${plan.recordName}_${plan.address}`,
            totalSessions: 1,
            totalReadings: 1,
          }
        );
        expect(mockPosthogCapture).not.toHaveBeenCalledWith(
          "reading_plan_draft_updated",
          expect.anything()
        );

        mockPosthogCapture.mockClear();
        manager.updateEditingReadingPlan({ title: "Psalms" });
        await vi.advanceTimersByTimeAsync(2000);

        expect(mockPosthogCapture).toHaveBeenCalledWith(
          "reading_plan_draft_updated",
          {
            planId: `rp_${plan.recordName}_${plan.address}`,
            totalSessions: 1,
            totalReadings: 1,
          }
        );
        expect(mockPosthogCapture).not.toHaveBeenCalledWith(
          "reading_plan_draft_created",
          expect.anything()
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("resuming a saved draft and editing it captures reading_plan_draft_updated, not created", async () => {
      const draftPlan = makePlan({
        status: "draft",
        recordName: "user-1",
        address: "draft-1",
      });
      const manager = makeManager("user-1");
      await flush();
      vi.useFakeTimers();
      try {
        manager.resumeEditingReadingPlan(draftPlan);
        manager.updateEditingReadingPlan({ title: "Resumed" });
        await vi.advanceTimersByTimeAsync(2000);

        expect(mockPosthogCapture).toHaveBeenCalledWith(
          "reading_plan_draft_updated",
          {
            planId: "rp_user-1_draft-1",
            totalSessions: 3,
            totalReadings: 3,
          }
        );
        expect(mockPosthogCapture).not.toHaveBeenCalledWith(
          "reading_plan_draft_created",
          expect.anything()
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("editing an already-published plan does not capture any draft event", async () => {
      const plan = makePlan({ authorUserId: "user-1", recordName: "user-1" });
      getDataMock.mockResolvedValue({ success: true, data: plan });
      const manager = makeManager("user-1");
      await flush();
      vi.useFakeTimers();
      try {
        manager.editExistingReadingPlan(plan);
        manager.updateEditingReadingPlan({ title: "Retitled" });
        await vi.advanceTimersByTimeAsync(2000);

        expect(mockPosthogCapture).not.toHaveBeenCalledWith(
          "reading_plan_draft_created",
          expect.anything()
        );
        expect(mockPosthogCapture).not.toHaveBeenCalledWith(
          "reading_plan_draft_updated",
          expect.anything()
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it("startReadingPlan captures reading_plan_started", async () => {
      const manager = makeManager("user-1");
      await flush();

      const progress = await manager.startReadingPlan(metadataOf(makePlan()), {
        cadenceId: "every-other-day",
        selfPaced: false,
      });

      expect(mockPosthogCapture).toHaveBeenCalledWith("reading_plan_started", {
        planId: progress.planId,
        progressId: progress.id,
        selfPaced: false,
        cadenceId: "every-other-day",
      });
    });

    it("startReadingPlan captures reading_plan_started with a null cadenceId for a self-paced plan", async () => {
      const manager = makeManager("user-1");
      await flush();

      const progress = await manager.startReadingPlan(metadataOf(makePlan()), {
        selfPaced: true,
      });

      expect(mockPosthogCapture).toHaveBeenCalledWith("reading_plan_started", {
        planId: progress.planId,
        progressId: progress.id,
        selfPaced: true,
        cadenceId: null,
      });
    });

    it("markSessionComplete captures reading_plan_session_finished exactly once, and doesn't refire when already complete", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.selectReadingPlanProgress(makeProgress());

      await manager.markSessionComplete({
        id: "s1",
        readings: [reading("r1")],
      });

      expect(mockPosthogCapture).toHaveBeenCalledWith(
        "reading_plan_session_finished",
        {
          planId: "rp_record-1_plan-1",
          progressId: "progress-1",
          sessionId: "s1",
        }
      );
      expect(mockPosthogCapture).toHaveBeenCalledTimes(1);

      mockPosthogCapture.mockClear();
      await manager.markSessionComplete({
        id: "s1",
        readings: [reading("r1")],
      });
      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        "reading_plan_session_finished",
        expect.anything()
      );
    });

    it("completing a session's last reading also captures reading_plan_session_finished", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.selectReadingPlanProgress(makeProgress());
      const session = { id: "s2", readings: [reading("r2a"), reading("r2b")] };

      await manager.markReadingComplete(session, "r2a");
      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        "reading_plan_session_finished",
        expect.anything()
      );

      await manager.markReadingComplete(session, "r2b");
      expect(mockPosthogCapture).toHaveBeenCalledWith(
        "reading_plan_session_finished",
        {
          planId: "rp_record-1_plan-1",
          progressId: "progress-1",
          sessionId: "s2",
        }
      );
    });

    it("un-marking a session does not capture reading_plan_session_finished", async () => {
      const manager = makeManager("user-1");
      await flush();
      await manager.selectReadingPlanProgress(makeProgress());
      const session = { id: "s1", readings: [reading("r1")] };
      await manager.markSessionComplete(session);
      mockPosthogCapture.mockClear();

      await manager.markSessionComplete(session, false);

      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        "reading_plan_session_finished",
        expect.anything()
      );
    });

    it("markDayComplete captures reading_plan_day_finished only once every session on the day is complete", async () => {
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

      expect(mockPosthogCapture).toHaveBeenCalledWith(
        "reading_plan_day_finished",
        {
          planId: "rp_record-1_plan-1",
          progressId: "progress-1",
          dayOffset: day.dayOffset,
        }
      );
      // The day's two sessions both just completed too - one
      // reading_plan_session_finished per session, plus the one day event.
      expect(
        mockPosthogCapture.mock.calls.filter(
          (c) => c[0] === "reading_plan_session_finished"
        )
      ).toHaveLength(2);
      expect(mockPosthogCapture).toHaveBeenCalledTimes(3);

      // Marking an already-complete day complete again must not re-fire.
      mockPosthogCapture.mockClear();
      await manager.markDayComplete(day);
      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        "reading_plan_day_finished",
        expect.anything()
      );

      mockPosthogCapture.mockClear();
      await manager.markDayComplete(day, false);
      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        "reading_plan_day_finished",
        expect.anything()
      );
    });

    it("completing the plan's last remaining session captures reading_plan_finished", async () => {
      const plan = makePlan(); // 3 sessions, 1 reading each
      getDataMock.mockResolvedValue({ success: true, data: plan });
      const manager = makeManager("user-1");
      await flush();
      await manager.selectReadingPlan(metadataOf(plan));
      await manager.selectReadingPlanProgress(makeProgress());

      await manager.markSessionComplete({
        id: "s1",
        readings: [reading("r1")],
      });
      await manager.markSessionComplete({
        id: "s2",
        readings: [reading("r2")],
      });
      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        "reading_plan_finished",
        expect.anything()
      );

      await manager.markSessionComplete({
        id: "s3",
        readings: [reading("r3")],
      });

      expect(mockPosthogCapture).toHaveBeenCalledWith("reading_plan_finished", {
        planId: "rp_record-1_plan-1",
        progressId: "progress-1",
        totalSessions: 3,
        totalReadings: 3,
      });

      mockPosthogCapture.mockClear();
      // Already at 100% - re-saving must not re-fire.
      await manager.markSessionComplete({
        id: "s3",
        readings: [reading("r3")],
      });
      expect(mockPosthogCapture).not.toHaveBeenCalledWith(
        "reading_plan_finished",
        expect.anything()
      );
    });
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
          { sessionId: "s1", completedReadingIds: ["r1"], partialChapters: [] },
          { sessionId: "s2", completedReadingIds: ["r2"], partialChapters: [] },
          { sessionId: "s3", completedReadingIds: ["r3"], partialChapters: [] },
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
        sessions: [
          {
            sessionId: "s1",
            completedReadingIds: ["r1a"],
            partialChapters: [],
          },
        ],
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
    // a plan must offer at least one cadence; defaults to one session a day
    expect(plan.cadenceOptions).toHaveLength(1);
    expect(plan.cadenceOptions[0]!.id).toBe("once-daily");
    expect(plan.defaultCadenceId).toBe("once-daily");
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

describe("time-zone-aware day boundaries", () => {
  const DAILY: Cadence = { segments: [{ type: "read", days: 1 }] };

  // Plans schedule by calendar day, not by elapsed milliseconds, so a run of
  // days that crosses a clock change must still be one day apart. Doing this
  // arithmetic on timestamps would drift by an hour each way.
  it("counts a spring-forward day as one day (America/New_York)", () => {
    // 2026-03-08 is when US clocks jump forward, making the local day 23h long.
    const startMs = Date.UTC(2026, 2, 6, 17, 0, 0); // 2026-03-06 12:00 EST
    const zone = "America/New_York";

    const dates = [0, 1, 2, 3, 4].map(
      (i) => dateForSession(DAILY, startMs, i, zone)!
    );

    expect(dates.map((d) => civilDateToISO(d))).toEqual([
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
    ]);
  });

  it("counts a fall-back day as one day (America/New_York)", () => {
    // 2026-11-01 is when US clocks go back, making the local day 25h long.
    const startMs = Date.UTC(2026, 9, 30, 16, 0, 0); // 2026-10-30 12:00 EDT
    const zone = "America/New_York";

    const dates = [0, 1, 2, 3, 4].map(
      (i) => dateForSession(DAILY, startMs, i, zone)!
    );

    expect(dates.map((d) => civilDateToISO(d))).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
  });

  it("resolves the day in the plan's zone, not the machine's", () => {
    // 2026-06-17 03:30 UTC is still the 16th in New York and already the 17th
    // in Kolkata (UTC+05:30) — a zone whose offset is not a whole hour.
    const ms = Date.UTC(2026, 5, 17, 3, 30, 0);

    expect(civilDateToISO(civilDateInZone(ms, "America/New_York"))).toBe(
      "2026-06-16"
    );
    expect(civilDateToISO(civilDateInZone(ms, "Asia/Kolkata"))).toBe(
      "2026-06-17"
    );
    expect(civilDateToISO(civilDateInZone(ms, "utc"))).toBe("2026-06-17");
  });

  it("keeps sessionsForDate the inverse of dateForSession across a DST change", () => {
    const startMs = Date.UTC(2026, 2, 6, 17, 0, 0);
    const zone = "America/New_York";

    for (let i = 0; i < 6; i++) {
      const date = dateForSession(DAILY, startMs, i, zone)!;
      // Midday local time on that date, in both offsets the week spans.
      const middayMs = Date.UTC(date.year, date.month - 1, date.day, 16, 0, 0);
      expect(sessionsForDate(DAILY, startMs, middayMs, zone)).toContain(i);
    }
  });

  it("advances the calendar correctly across a month and a leap day", () => {
    expect(
      civilDateToISO(addCivilDays({ year: 2028, month: 2, day: 28 }, 1))
    ).toBe("2028-02-29");
    expect(
      civilDateToISO(addCivilDays({ year: 2026, month: 2, day: 28 }, 1))
    ).toBe("2026-03-01");
    expect(
      civilDateToISO(addCivilDays({ year: 2026, month: 12, day: 31 }, 1))
    ).toBe("2027-01-01");
    expect(
      civilDaysBetween(
        { year: 2026, month: 1, day: 1 },
        { year: 2027, month: 1, day: 1 }
      )
    ).toBe(365);
    expect(
      civilDaysBetween(
        { year: 2028, month: 1, day: 1 },
        { year: 2029, month: 1, day: 1 }
      )
    ).toBe(366);
  });
});
