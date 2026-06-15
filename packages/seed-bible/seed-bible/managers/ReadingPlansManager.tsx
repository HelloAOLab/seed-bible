import { PlaylistItem } from "./PlaylistManager";
import { z } from "zod";

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
  // e.g. "Morning" / "Evening" — distinguishes multiple sessions on one date.
  label: z.string().nullable().optional(),
  readings: z.array(PlanReadingSchema).min(1),
});
export type ReadingPlanSession = z.infer<typeof ReadingPlanSessionSchema>;

export const ReadingPlanSchema = z.object({
  address: z.string(),
  recordName: z.string(),
  authorUserId: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  cadenceOptions: z.array(CadenceOptionSchema).min(1),
  defaultCadenceId: z.string().nullable().optional(),
  sessions: z.array(ReadingPlanSessionSchema),
  schemaVersion: z.number().int().default(1),
  createdAtMs: z.number().positive(),
  updatedAtMs: z.number().positive(),
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

/**
 * Expands a cadence into a per-day array describing how many sessions occur on
 * each day of one full pattern cycle (0 = skip day). The array repeats.
 */
function patternDays(cadence: Cadence): number[] {
  const days: number[] = [];
  for (const seg of cadence.segments) {
    const sessions = seg.type === "read" ? (seg.sessionsPerDay ?? 1) : 0;
    for (let i = 0; i < seg.days; i++) {
      days.push(sessions);
    }
  }
  return days;
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
 * Returns null if the cadence never reads.
 */
export function dateForSession(
  cadence: Cadence,
  startedAtMs: number,
  sessionIndex: number
): Date | null {
  if (sessionIndex < 0) {
    return null;
  }
  const pattern = patternDays(cadence);
  const period = sessionsPerCycle(pattern);
  if (period === 0) {
    return null;
  }
  const startMidnight = utcMidnight(startedAtMs);
  const fullCycles = Math.floor(sessionIndex / period);
  let remaining = sessionIndex % period;
  let dayOffset = fullCycles * pattern.length;
  for (let i = 0; i < pattern.length; i++) {
    const sessions = pattern[i]!;
    if (remaining < sessions) {
      return new Date(startMidnight + dayOffset * MS_PER_DAY);
    }
    remaining -= sessions;
    dayOffset++;
  }
  return null; // unreachable: remaining < period always resolves above
}

/**
 * The global session indices due on a given calendar date. Empty for skip days
 * or dates before the start. Inverse of `dateForSession`.
 */
export function sessionsForDate(
  cadence: Cadence,
  startedAtMs: number,
  dateMs: number
): number[] {
  const pattern = patternDays(cadence);
  const period = sessionsPerCycle(pattern);
  if (period === 0) {
    return [];
  }
  const startMidnight = utcMidnight(startedAtMs);
  const target = utcMidnight(dateMs);
  const dayOffset = Math.round((target - startMidnight) / MS_PER_DAY);
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
