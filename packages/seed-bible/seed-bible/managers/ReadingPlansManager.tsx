import { computed, effect, signal } from "@preact/signals";
import { PlaylistItem } from "./PlaylistManager";
import { z } from "zod";
import type { LoginManager } from "./LoginManager";

// ---------------------------------------------------------------------------
// Cadence
//
// A cadence is a repeating, fully general read/skip pattern. It is an ordered
// list of segments that repeats indefinitely to cover the plan:
//   - "read N sessions per day, for D consecutive days"
//   - "skip D days" (no reading)
// Any rhythm is representable by composing segments. Examples:
//   every day:        [{ read, days: 1, sessionsPerDay: 1 }]
//   twice a day:      [{ read, days: 1, sessionsPerDay: 2 }]
//   every other day:  [{ read, days: 1 }, { skip, days: 1 }]
//   once a week:      [{ read, days: 1 }, { skip, days: 6 }]
//   3x a week:        [{ read,1 },{ skip,1 },{ read,1 },{ skip,1 },{ read,1 },{ skip,2 }]
//   Bible in 1 vs 2 years: same content, denser vs sparser skip segments.
// ---------------------------------------------------------------------------

export const CadenceSegmentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("read"),
    days: z.number().int().positive(),
    // Omitted means 1 session per day (see `patternDays`).
    sessionsPerDay: z.number().int().positive().optional(),
    segmentLabels: z.array(z.string()).nullable().optional(), // e.g. "Morning", "Evening" for multiple sessions per day
  }),
  z.object({
    type: z.literal("skip"),
    days: z.number().int().positive(),
  }),
]);
export type CadenceSegment = z.infer<typeof CadenceSegmentSchema>;

export const CadenceSchema = z.object({
  // Repeats indefinitely to cover all of the plan's sessions.
  segments: z.array(CadenceSegmentSchema).min(1),
});
export type Cadence = z.infer<typeof CadenceSchema>;

// An author-offered cadence the user can select (or override with their own).
export const CadenceOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  cadence: CadenceSchema,
});
export type CadenceOption = z.infer<typeof CadenceOptionSchema>;

// ---------------------------------------------------------------------------
// Content
//
// Content is a flat, ordered, cadence-agnostic list of sessions. A session is
// one sitting's worth of reading. Sessions carry no calendar/day information —
// the cadence assigns them to dates. Stable ids let progress target both a
// session and each reading within it.
// ---------------------------------------------------------------------------

// Wraps the existing PlaylistItem union with a stable id (for per-item progress).
export const PlanReadingSchema = z.object({
  id: z.string(),
  item: PlaylistItem,
});
export type PlanReading = z.infer<typeof PlanReadingSchema>;

export const ReadingPlanSessionSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  readings: z.array(PlanReadingSchema).min(1),
});
export type ReadingPlanSession = z.infer<typeof ReadingPlanSessionSchema>;

export const ReadingPlanMetadataSchema = z.object({
  address: z.string(),
  recordName: z.string(),
  authorUserId: z.string(),
  locale: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  cadenceOptions: z.array(CadenceOptionSchema).min(1),
  defaultCadenceId: z.string().nullable().optional(),
  schemaVersion: z.number().int().default(1),
  createdAtMs: z.number().positive(),
  updatedAtMs: z.number().positive(),
});
export type ReadingPlanMetadata = z.infer<typeof ReadingPlanMetadataSchema>;

export const ReadingPlanSchema = ReadingPlanMetadataSchema.extend({
  sessions: z.array(ReadingPlanSessionSchema),
});
export type ReadingPlan = z.infer<typeof ReadingPlanSchema>;

// ---------------------------------------------------------------------------
// Progress
//
// Tracks the user's chosen/overridden cadence, the start anchor (start-any-time),
// and granular completion — per session and per reading within the session.
// ---------------------------------------------------------------------------

export const SessionProgressSchema = z.object({
  sessionId: z.string(),
  completedReadingIds: z.array(z.string()),
  completedAtMs: z.number().positive().nullable().optional(),
});
export type SessionProgress = z.infer<typeof SessionProgressSchema>;

export const ReadingPlanProgressSchema = z.object({
  id: z.string(), // unique per progress; used as the record address
  planId: z.string(),
  recordName: z.string(),
  userId: z.string(),
  selectedCadenceId: z.string().nullable().optional(),
  customCadence: CadenceSchema.nullable().optional(),
  startedAtMs: z.number().positive(),
  timeZone: z.string().nullable().optional(),
  // Sparse — only sessions that have some progress recorded.
  sessions: z.array(SessionProgressSchema),
  createdAtMs: z.number().positive(),
  updatedAtMs: z.number().positive(),
});
export type ReadingPlanProgress = z.infer<typeof ReadingPlanProgressSchema>;

export function formatReadingPlanId(
  recordName: string,
  address: string
): string {
  return `rp_${recordName}_${address}`;
}

/**
 * Creates a fresh progress record for a user starting a plan. `id` (unique) and
 * `nowMs` are passed in so this stays deterministic; the manager supplies them.
 * Stored in the user's record (`recordName = userId`) so it round-trips with
 * `loadReadingProgress`. The selected cadence falls back: explicit option →
 * plan default → first option → none.
 */
export function createReadingPlanProgress(
  plan: ReadingPlanMetadata,
  userId: string,
  id: string,
  nowMs: number,
  options: {
    cadenceId?: string | null;
    customCadence?: Cadence | null;
    timeZone?: string | null;
  } = {}
): ReadingPlanProgress {
  return ReadingPlanProgressSchema.parse({
    id,
    planId: formatReadingPlanId(plan.recordName, plan.address),
    recordName: userId,
    userId,
    selectedCadenceId:
      options.cadenceId ??
      plan.defaultCadenceId ??
      plan.cadenceOptions[0]?.id ??
      null,
    customCadence: options.customCadence ?? null,
    startedAtMs: nowMs,
    timeZone: options.timeZone ?? null,
    sessions: [],
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  });
}

/** Default cadence offered by a brand-new plan: read once every day. */
const DEFAULT_CADENCE_OPTIONS: CadenceOption[] = [
  {
    id: "daily",
    label: "Daily",
    cadence: { segments: [{ type: "read", days: 1 }] },
  },
];

/**
 * Creates a new, empty reading plan (no sessions). `address` and `nowMs` are
 * passed in so this stays deterministic. Defaults to a single daily cadence
 * option (a plan must offer at least one) and an "en" locale; all of these can
 * be overridden via `options`.
 */
export function createReadingPlan(
  recordName: string,
  authorUserId: string,
  address: string,
  nowMs: number,
  options: {
    locale?: string;
    title?: string | null;
    description?: string | null;
    cadenceOptions?: CadenceOption[];
    defaultCadenceId?: string | null;
  } = {}
): ReadingPlan {
  const cadenceOptions = options.cadenceOptions?.length
    ? options.cadenceOptions
    : DEFAULT_CADENCE_OPTIONS;
  return ReadingPlanSchema.parse({
    address,
    recordName,
    authorUserId,
    locale: options.locale ?? "en",
    title: options.title ?? null,
    description: options.description ?? null,
    cadenceOptions,
    defaultCadenceId: options.defaultCadenceId ?? cadenceOptions[0]?.id ?? null,
    sessions: [],
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  });
}

// ---------------------------------------------------------------------------
// Scheduling / progress helpers (pure)
//
// Calendar math is done in UTC day-buckets so it is deterministic and DST-safe.
// `timeZone` on progress is reserved for future local-day-boundary handling.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

/** A single scheduled reading slot. `sessionIndex` is the global session ordinal. */
export interface PlanSlot {
  /** Calendar date (UTC midnight) the session is due on. */
  date: Date;
  /** Whole-day offset from the start date. */
  dayOffset: number;
  /** 0-based ordinal of this session within its day (for multiple-per-day). */
  sessionOfDay: number;
}

function utcMidnight(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** One day of an expanded cadence cycle. The cycle repeats to cover the plan. */
interface CycleDay {
  /** Number of reading sessions that day (0 = skip day). */
  sessions: number;
  /** Per-session labels from the originating `read` segment, if any. */
  labels: string[] | null;
}

/**
 * Expands a cadence into a per-day array for one full pattern cycle, retaining
 * the originating segment's labels. The array repeats.
 */
function cyclePattern(cadence: Cadence): CycleDay[] {
  const days: CycleDay[] = [];
  for (const seg of cadence.segments) {
    const day: CycleDay =
      seg.type === "read"
        ? {
            sessions: seg.sessionsPerDay ?? 1,
            labels: seg.segmentLabels ?? null,
          }
        : { sessions: 0, labels: null };
    for (let i = 0; i < seg.days; i++) {
      days.push(day);
    }
  }
  return days;
}

/**
 * Expands a cadence into a per-day array describing how many sessions occur on
 * each day of one full pattern cycle (0 = skip day). The array repeats.
 */
function patternDays(cadence: Cadence): number[] {
  return cyclePattern(cadence).map((d) => d.sessions);
}

/** Number of sessions in one full pattern cycle. */
function sessionsPerCycle(pattern: number[]): number {
  return pattern.reduce((a, b) => a + b, 0);
}

/**
 * Resolves the cadence that actually applies to a user: a custom override wins,
 * then the user's selected option, then the plan default, then the first option.
 */
export function effectiveCadence(
  plan: ReadingPlan,
  progress: ReadingPlanProgress
): Cadence | null {
  if (progress.customCadence) {
    return progress.customCadence;
  }
  const byId = (id: string) =>
    plan.cadenceOptions.find((o) => o.id === id)?.cadence ?? null;
  if (progress.selectedCadenceId) {
    const c = byId(progress.selectedCadenceId);
    if (c) return c;
  }
  if (plan.defaultCadenceId) {
    const c = byId(plan.defaultCadenceId);
    if (c) return c;
  }
  return plan.cadenceOptions[0]?.cadence ?? null;
}

/**
 * Generates the first `count` calendar slots for a cadence, one slot per session,
 * in order. Returns fewer than `count` only if the cadence never reads (all skips).
 */
export function slotsForCadence(
  cadence: Cadence,
  startedAtMs: number,
  count: number
): PlanSlot[] {
  const slots: PlanSlot[] = [];
  if (count <= 0) {
    return slots;
  }
  const pattern = patternDays(cadence);
  if (sessionsPerCycle(pattern) === 0) {
    return slots; // never reads — avoid an infinite loop
  }
  const startMidnight = utcMidnight(startedAtMs);
  let dayOffset = 0;
  while (slots.length < count) {
    const sessions = pattern[dayOffset % pattern.length]!;
    for (let s = 0; s < sessions && slots.length < count; s++) {
      slots.push({
        date: new Date(startMidnight + dayOffset * MS_PER_DAY),
        dayOffset,
        sessionOfDay: s,
      });
    }
    dayOffset++;
  }
  return slots;
}

/**
 * The calendar date the Nth (0-based) session is due, given the cadence and start.
 * Day boundaries are resolved in `timeZone` (defaults to the local zone).
 * Returns null if the cadence never reads.
 */
export function dateForSession(
  cadence: Cadence,
  startedAtMs: number,
  sessionIndex: number,
  timeZone?: string | null
): ReturnType<typeof DateTime.fromMillis> | null {
  if (sessionIndex < 0) {
    return null;
  }
  const pattern = patternDays(cadence);
  const period = sessionsPerCycle(pattern);
  if (period === 0) {
    return null;
  }
  const start = DateTime.fromMillis(startedAtMs, {
    zone: timeZone ?? undefined,
  }).startOf("day");
  const fullCycles = Math.floor(sessionIndex / period);
  let remaining = sessionIndex % period;
  let dayOffset = fullCycles * pattern.length;
  for (let i = 0; i < pattern.length; i++) {
    const sessions = pattern[i]!;
    if (remaining < sessions) {
      return start.plus({ days: dayOffset });
    }
    remaining -= sessions;
    dayOffset++;
  }
  return null; // unreachable: remaining < period always resolves above
}

/**
 * The global session indices due on a given calendar date. Empty for skip days
 * or dates before the start. Day boundaries are resolved in `timeZone`
 * (defaults to the local zone). Inverse of `dateForSession`.
 */
export function sessionsForDate(
  cadence: Cadence,
  startedAtMs: number,
  dateMs: number,
  timeZone?: string | null
): number[] {
  const pattern = patternDays(cadence);
  const period = sessionsPerCycle(pattern);
  if (period === 0) {
    return [];
  }
  const start = DateTime.fromMillis(startedAtMs, {
    zone: timeZone ?? undefined,
  }).startOf("day");
  const target = DateTime.fromMillis(dateMs, {
    zone: timeZone ?? undefined,
  }).startOf("day");
  const dayOffset = Math.round(target.diff(start, "days").days);
  if (dayOffset < 0) {
    return [];
  }
  const idxInPattern = dayOffset % pattern.length;
  const sessionsThatDay = pattern[idxInPattern]!;
  if (sessionsThatDay === 0) {
    return [];
  }
  const fullCycles = Math.floor(dayOffset / pattern.length);
  let before = fullCycles * period;
  for (let i = 0; i < idxInPattern; i++) {
    before += pattern[i]!;
  }
  const result: number[] = [];
  for (let s = 0; s < sessionsThatDay; s++) {
    result.push(before + s);
  }
  return result;
}

/** True when every reading in the session has been completed. */
export function isSessionComplete(
  session: ReadingPlanSession,
  sessionProgress: SessionProgress | undefined
): boolean {
  if (!sessionProgress) {
    return false;
  }
  const done = new Set(sessionProgress.completedReadingIds);
  return session.readings.every((r) => done.has(r.id));
}

/** Aggregate completion counts across the whole plan. */
export function planCompletion(
  plan: ReadingPlan,
  progress: ReadingPlanProgress
): {
  doneSessions: number;
  totalSessions: number;
  doneReadings: number;
  totalReadings: number;
} {
  const progressBySession = new Map(
    progress.sessions.map((s) => [s.sessionId, s])
  );
  let doneSessions = 0;
  let doneReadings = 0;
  let totalReadings = 0;
  for (const session of plan.sessions) {
    totalReadings += session.readings.length;
    const sp = progressBySession.get(session.id);
    if (sp) {
      const done = new Set(sp.completedReadingIds);
      const completed = session.readings.filter((r) => done.has(r.id)).length;
      doneReadings += completed;
      if (completed === session.readings.length) {
        doneSessions++;
      }
    }
  }
  return {
    doneSessions,
    totalSessions: plan.sessions.length,
    doneReadings,
    totalReadings,
  };
}

// ---------------------------------------------------------------------------
// Progress updates (pure)
//
// Each returns a NEW ReadingPlanProgress (inputs are never mutated) and stamps
// `updatedAtMs = nowMs`, so the result can be assigned to a signal and persisted.
// ---------------------------------------------------------------------------

/** Find-or-create a session's progress, apply `update`, return new progress. */
function withSessionProgress(
  progress: ReadingPlanProgress,
  sessionId: string,
  update: (sp: SessionProgress) => SessionProgress,
  nowMs: number
): ReadingPlanProgress {
  const existing = progress.sessions.find((s) => s.sessionId === sessionId);
  const next = update(existing ?? { sessionId, completedReadingIds: [] });
  const sessions = existing
    ? progress.sessions.map((s) => (s.sessionId === sessionId ? next : s))
    : [...progress.sessions, next];
  return { ...progress, sessions, updatedAtMs: nowMs };
}

/**
 * Marks a single reading (item) within a session complete (`complete`, default)
 * or incomplete. Completing the last reading sets the session's `completedAtMs`
 * (an existing one is preserved); marking any reading incomplete clears it. A
 * `readingId` that doesn't belong to the session — or undoing one that was never
 * complete — is a no-op (returns the same progress).
 */
export function markReadingCompleteInProgress(
  progress: ReadingPlanProgress,
  session: ReadingPlanSession,
  readingId: string,
  nowMs: number,
  complete = true
): ReadingPlanProgress {
  if (!session.readings.some((r) => r.id === readingId)) {
    return progress;
  }
  const existing = progress.sessions.find((s) => s.sessionId === session.id);
  if (
    !complete &&
    (!existing || !existing.completedReadingIds.includes(readingId))
  ) {
    return progress; // nothing to undo
  }
  return withSessionProgress(
    progress,
    session.id,
    (sp) => {
      const completedReadingIds = complete
        ? sp.completedReadingIds.includes(readingId)
          ? sp.completedReadingIds
          : [...sp.completedReadingIds, readingId]
        : sp.completedReadingIds.filter((id) => id !== readingId);
      const next: SessionProgress = { ...sp, completedReadingIds };
      next.completedAtMs = isSessionComplete(session, next)
        ? (sp.completedAtMs ?? nowMs)
        : null;
      return next;
    },
    nowMs
  );
}

/**
 * Marks an entire session complete (`complete`, default — every reading plus a
 * completion time) or incomplete (clears every reading and the completion time).
 * Undoing a session that has no recorded progress is a no-op.
 */
export function markSessionCompleteInProgress(
  progress: ReadingPlanProgress,
  session: ReadingPlanSession,
  nowMs: number,
  complete = true
): ReadingPlanProgress {
  if (!complete && !progress.sessions.some((s) => s.sessionId === session.id)) {
    return progress; // nothing to undo
  }
  return withSessionProgress(
    progress,
    session.id,
    (sp) => ({
      ...sp,
      completedReadingIds: complete ? session.readings.map((r) => r.id) : [],
      completedAtMs: complete ? nowMs : null,
    }),
    nowMs
  );
}

/**
 * Marks every session on a calendar day complete (`complete`, default) or
 * incomplete (clears all sessions and their readings).
 */
export function markDayCompleteInProgress(
  progress: ReadingPlanProgress,
  day: CalendarReadingDay,
  nowMs: number,
  complete = true
): ReadingPlanProgress {
  return day.sessions.reduce(
    (acc, cs) =>
      markSessionCompleteInProgress(acc, cs.session, nowMs, complete),
    progress
  );
}

// ---------------------------------------------------------------------------
// Calendar
//
// `getReadingCalendar` derives the day-by-day calendar a user should follow
// from their effective cadence and progress: an ordered list of reading days
// (the sessions due that day, with labels from the cadence) interleaved with
// collapsed ranges of skipped days.
// ---------------------------------------------------------------------------

/** A plan session placed on a calendar day, with its cadence label and status. */
export interface CalendarSession {
  /** Global 0-based session ordinal across the whole plan. */
  index: number;
  session: ReadingPlanSession;
  /** Label from the cadence segment for this session's slot, if any. */
  label: string | null;
  /** True when every reading in the session is complete. */
  isComplete: boolean;
  /** Completion time of the session, or null if not complete / not recorded. */
  completedAtMs: number | null;
}

/** A single day on which one or more sessions are due. */
export interface CalendarReadingDay {
  type: "reading";
  /** Local midnight of the day, in the plan progress's time zone. */
  date: ReturnType<typeof DateTime.fromMillis>;
  /** Whole-day offset from the start date. */
  dayOffset: number;
  sessions: CalendarSession[];
  /** Global index of the first session on this day. */
  startSessionIndex: number;
  /** Global index of the last session on this day. */
  endSessionIndex: number;
  /** Latest session completion time when ALL sessions are complete, else null. */
  completedAtMs: number | null;
  /** True when `nowMs` falls on this day (in the plan's time zone). */
  containsNow: boolean;
}

/** A contiguous run of skipped (non-reading) days. */
export interface CalendarSkipRange {
  type: "skip";
  /** Local midnight of the first skipped day. */
  startDate: ReturnType<typeof DateTime.fromMillis>;
  /** Local midnight of the last (inclusive) skipped day. */
  endDate: ReturnType<typeof DateTime.fromMillis>;
  startDayOffset: number;
  days: number;
  /** True when `nowMs` falls within this range (in the plan's time zone). */
  containsNow: boolean;
}

export type ReadingCalendarEntry = CalendarReadingDay | CalendarSkipRange;

/**
 * Builds the calendar a user should follow to read the plan: an ordered list of
 * reading days and collapsed skip ranges, derived from the user's effective
 * cadence and start date. Leading and in-between skip ranges are included;
 * trailing skip days after the last reading day are omitted.
 *
 * Returns an empty array when the plan has no sessions, there is no resolvable
 * cadence, or the cadence never reads.
 */
export function getReadingCalendar(
  plan: ReadingPlan,
  progress: ReadingPlanProgress,
  nowMs: number
): ReadingCalendarEntry[] {
  const entries: ReadingCalendarEntry[] = [];
  const cadence = effectiveCadence(plan, progress);
  if (!cadence || plan.sessions.length === 0) {
    return entries;
  }

  const cycle = cyclePattern(cadence);
  if (cycle.reduce((a, d) => a + d.sessions, 0) === 0) {
    return entries; // never reads — cannot schedule (avoids an infinite loop)
  }

  const zone = progress.timeZone ?? undefined;
  const start = DateTime.fromMillis(progress.startedAtMs, { zone }).startOf(
    "day"
  );
  const today = DateTime.fromMillis(nowMs, { zone }).startOf("day");
  const todayOffset = Math.round(today.diff(start, "days").days);

  const progressBySession = new Map(
    progress.sessions.map((s) => [s.sessionId, s])
  );

  let dayOffset = 0;
  let sessionIndex = 0;
  let pendingSkipStart: number | null = null;

  const flushSkip = (endExclusive: number) => {
    if (pendingSkipStart === null) {
      return;
    }
    entries.push({
      type: "skip",
      startDate: start.plus({ days: pendingSkipStart }),
      endDate: start.plus({ days: endExclusive - 1 }),
      startDayOffset: pendingSkipStart,
      days: endExclusive - pendingSkipStart,
      containsNow:
        todayOffset >= pendingSkipStart && todayOffset < endExclusive,
    });
    pendingSkipStart = null;
  };

  while (sessionIndex < plan.sessions.length) {
    const cd = cycle[dayOffset % cycle.length]!;
    if (cd.sessions === 0) {
      if (pendingSkipStart === null) {
        pendingSkipStart = dayOffset;
      }
    } else {
      flushSkip(dayOffset);
      const startSessionIndex = sessionIndex;
      const sessions: CalendarSession[] = [];
      for (
        let s = 0;
        s < cd.sessions && sessionIndex < plan.sessions.length;
        s++
      ) {
        const session = plan.sessions[sessionIndex]!;
        const sp = progressBySession.get(session.id);
        const isComplete = isSessionComplete(session, sp);
        sessions.push({
          index: sessionIndex,
          session,
          label: cd.labels?.[s] ?? null,
          isComplete,
          completedAtMs: isComplete ? (sp?.completedAtMs ?? null) : null,
        });
        sessionIndex++;
      }
      const allComplete = sessions.every((cs) => cs.isComplete);
      const completedAtMs = allComplete
        ? sessions.reduce<number | null>(
            (latest, cs) =>
              cs.completedAtMs !== null
                ? Math.max(latest ?? 0, cs.completedAtMs)
                : latest,
            null
          )
        : null;
      entries.push({
        type: "reading",
        date: start.plus({ days: dayOffset }),
        dayOffset,
        sessions,
        startSessionIndex,
        endSessionIndex: sessionIndex - 1,
        completedAtMs,
        containsNow: todayOffset === dayOffset,
      });
    }
    dayOffset++;
  }
  // A pending trailing skip run is intentionally left unflushed.
  return entries;
}

async function listAllDataByMarker(
  recordName: string,
  marker: string
): Promise<{ success: boolean; items: { address: string; data: unknown }[] }> {
  const allItems: { address: string; data: unknown }[] = [];
  let lastAddress: string | undefined;

  while (true) {
    const page = await os.listDataByMarker(recordName, marker, lastAddress);

    if (!page.success) {
      console.error("Error listing data:", page);
      throw new Error(`Error listing data: ${page.errorCode}`);
    }

    if (page.items.length === 0) {
      break;
    }

    for (const item of page.items) {
      allItems.push({ address: item.address, data: item.data });
    }

    lastAddress = page.items[page.items.length - 1]?.address;
  }

  return { success: true, items: allItems };
}

export function createReadingPlansManager(login: LoginManager) {
  const userReadingPlanProgresses = signal<ReadingPlanProgress[]>([]);
  const userReadingPlans = signal<ReadingPlanMetadata[]>([]);
  const selectedReadingPlan = signal<ReadingPlan | null>(null);
  const selectedReadingPlanProgress = signal<ReadingPlanProgress | null>(null);

  const selectedReadingPlanProgressCalendar = computed(() => {
    if (!selectedReadingPlan.value || !selectedReadingPlanProgress.value) {
      return [];
    }
    return getReadingCalendar(
      selectedReadingPlan.value,
      selectedReadingPlanProgress.value,
      Date.now()
    );
  });

  const listReadingPlans = async (recordName: string) => {
    const result = await listAllDataByMarker(
      recordName,
      "publicRead:readingPlanMetadata"
    );
    const plans = [];
    for (const item of result.items) {
      const parsed = ReadingPlanMetadataSchema.safeParse(item.data);
      if (!parsed.success) {
        console.warn("Skipping invalid reading plan record:", parsed.error);
        continue;
      }
      plans.push(parsed.data);
    }

    return plans;
  };

  const getReadingPlan = async (recordName: string, address: string) => {
    const plan = await os.getData(recordName, address);

    if (!plan.success) {
      console.error("Error loading reading plan:", plan);
      throw new Error(`Error loading reading plan: ${plan.errorCode}`);
    }

    const parsed = ReadingPlanSchema.safeParse(plan.data);
    if (!parsed.success) {
      console.error("Error parsing reading plan:", parsed.error);
      throw new Error(`Error parsing reading plan: ${parsed.error}`);
    }

    return parsed.data;
  };

  const saveReadingPlan = async (plan: ReadingPlan) => {
    const { sessions, ...metadata } = plan;
    await Promise.all([
      os.recordData(plan.recordName, plan.address, plan, {
        markers: ["publicRead:readingPlan"],
      }),
      os.recordData(plan.recordName, plan.address, metadata, {
        markers: ["publicRead:readingPlanMetadata"],
      }),
    ]);
  };

  const saveReadingPlanProgress = async (progress: ReadingPlanProgress) => {
    const parsed = ReadingPlanProgressSchema.parse(progress);
    await os.recordData(parsed.recordName, parsed.id, parsed, {
      markers: ["publicRead:readingPlanProgress"],
    });
  };

  const loadReadingProgress = async (recordName: string) => {
    const result = await listAllDataByMarker(
      recordName,
      "publicRead:readingPlanProgress"
    );
    const readings = result.items
      .map((record) => ReadingPlanProgressSchema.safeParse(record.data))
      .filter((r) => r.success)
      .map((r) => r.data);
    return readings;
  };

  const syncReadingPlanProgresses = async () => {
    if (!login.userId.value) {
      userReadingPlanProgresses.value = [];
      return;
    }

    try {
      const progresses = await loadReadingProgress(login.userId.value);
      userReadingPlanProgresses.value = progresses;
    } catch (error) {
      console.error("Failed to sync reading plans:", error);
    }
  };

  const syncReadingPlans = async () => {
    if (!login.userId.value) {
      userReadingPlans.value = [];
      return;
    }

    try {
      const plans = await listReadingPlans(login.userId.value);
      userReadingPlans.value = plans;
    } catch (error) {
      console.error("Failed to sync reading plans:", error);
    }
  };

  const selectReadingPlan = async (plan: ReadingPlanMetadata | null) => {
    if (!plan) {
      selectedReadingPlan.value = null;
      return;
    }

    try {
      const fullPlan = await getReadingPlan(plan.recordName, plan.address);
      selectedReadingPlan.value = fullPlan;
    } catch (error) {
      console.error("Failed to load selected reading plan:", error);
    }
  };

  const selectReadingPlanProgress = async (
    progress: ReadingPlanProgress | null
  ) => {
    if (!progress) {
      selectedReadingPlanProgress.value = null;
      return;
    }

    selectedReadingPlanProgress.value = progress;
  };

  // Applies an updated progress to the selected-plan signals and persists it.
  const updateSelectedProgress = async (next: ReadingPlanProgress) => {
    selectedReadingPlanProgress.value = next;
    userReadingPlanProgresses.value = userReadingPlanProgresses.value.map(
      (p) => (p.id === next.id ? next : p)
    );
    await saveReadingPlanProgress(next);
  };

  const requireSelectedProgress = () => {
    const current = selectedReadingPlanProgress.value;
    if (!current) {
      throw new Error("No reading plan progress selected");
    }
    return current;
  };

  /** Marks a single reading (item) within a session complete/incomplete and saves. */
  const markReadingComplete = async (
    session: ReadingPlanSession,
    readingId: string,
    complete = true
  ) => {
    const current = requireSelectedProgress();
    await updateSelectedProgress(
      markReadingCompleteInProgress(
        current,
        session,
        readingId,
        Date.now(),
        complete
      )
    );
  };

  /** Marks an entire session (all readings) complete/incomplete and saves. */
  const markSessionComplete = async (
    session: ReadingPlanSession,
    complete = true
  ) => {
    const current = requireSelectedProgress();
    await updateSelectedProgress(
      markSessionCompleteInProgress(current, session, Date.now(), complete)
    );
  };

  /** Marks an entire calendar day (all sessions and readings) complete/incomplete and saves. */
  const markDayComplete = async (day: CalendarReadingDay, complete = true) => {
    const current = requireSelectedProgress();
    await updateSelectedProgress(
      markDayCompleteInProgress(current, day, Date.now(), complete)
    );
  };

  /**
   * Starts a plan for the signed-in user: creates a fresh progress, persists it,
   * and adds it to the list. Always creates a new record (a user may have more
   * than one progress for the same plan). Does not select/activate the plan.
   */
  const startReadingPlan = async (
    plan: ReadingPlanMetadata,
    options?: {
      cadenceId?: string | null;
      customCadence?: Cadence | null;
      timeZone?: string | null;
    }
  ): Promise<ReadingPlanProgress> => {
    const userId = login.userId.value;
    if (!userId) {
      throw new Error("Not signed in");
    }
    const progress = createReadingPlanProgress(
      plan,
      userId,
      uuid(),
      Date.now(),
      options
    );
    await saveReadingPlanProgress(progress);
    userReadingPlanProgresses.value = [
      ...userReadingPlanProgresses.value,
      progress,
    ];
    return progress;
  };

  const createNewReadingPlan = async () => {
    if (!login.userId.value) {
      throw new Error("Not signed in");
    }
    const plan = createReadingPlan(
      login.userId.value,
      login.userId.value,
      `plan_${uuid()}`,
      Date.now()
    );
    await saveReadingPlan(plan);
    userReadingPlans.value = [...userReadingPlans.value, plan];
  };

  effect(() => {
    void syncReadingPlanProgresses();
    void syncReadingPlans();
  });

  return {
    userReadingPlanProgresses,
    userReadingPlans,
    selectedReadingPlan,
    selectReadingPlan,
    saveReadingPlan,
    selectedReadingPlanProgress,
    selectReadingPlanProgress,
    selectedReadingPlanProgressCalendar,
    startReadingPlan,
    markReadingComplete,
    markSessionComplete,
    markDayComplete,
    createNewReadingPlan,
  };
}
