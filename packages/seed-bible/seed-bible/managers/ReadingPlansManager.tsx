import { batch, computed, effect, signal, untracked } from "@preact/signals";
import { PlaylistItem, type PlaylistItemData } from "./PlaylistManager";
import { z } from "zod";
import type { LoginManager } from "./LoginManager";
import { omit } from "es-toolkit";
import {
  addCivilDays,
  civilDateInZone,
  civilDaysBetween,
  civilToDayNumber,
  type CivilDate,
} from "./civilDate";
import { CasualOSManager } from "./OsManager";
import { v4 as uuid } from "uuid";

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
  // Optional author reflection/prompt shown on the day (the "Reflect" card).
  note: z.string().nullable().optional(),
  // May be empty: a session exists in the authoring wizard from the moment it
  // is added, before the author has put anything in it. Empty sessions are
  // pruned when the plan is finished (see `finishEditingReadingPlan`).
  readings: z.array(PlanReadingSchema),
});
export type ReadingPlanSession = z.infer<typeof ReadingPlanSessionSchema>;

// Where a plan is in its authoring lifecycle. A "draft" is still being built in
// the create wizard — it is saved to the user's account after every change so
// nothing is lost if they leave, but it is kept out of the normal plan lists
// until they finish, at which point it becomes "complete". Defaulted (rather
// than required) so plans written before this field existed still parse, and
// read as finished plans.
export const ReadingPlanStatusSchema = z.enum(["draft", "complete"]);
export type ReadingPlanStatus = z.infer<typeof ReadingPlanStatusSchema>;

export const ReadingPlanMetadataSchema = z.object({
  address: z.string(),
  recordName: z.string(),
  authorUserId: z.string(),
  locale: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  // Every pace the author offers for reading this plan. A plan has no single
  // duration — how long it takes follows from whichever cadence the reader
  // picks (see `cadenceDurationDays`).
  cadenceOptions: z.array(CadenceOptionSchema).min(1),
  defaultCadenceId: z.string().nullable().optional(),
  status: ReadingPlanStatusSchema.default("complete"),
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

/**
 * Chapters already read inside a scripture reading that covers several of them.
 * "John 1–10" is read a chapter at a time, so finishing it has to be recorded a
 * chapter at a time too — otherwise the only way to record any of it is to
 * claim all ten. Once every chapter is listed here the reading moves to the
 * session's `completedReadingIds` and this entry is dropped, so it only ever
 * holds readings that are part-way through.
 */
export const ReadingChapterProgressSchema = z.object({
  readingId: z.string(),
  chapters: z.array(z.number().int().positive()),
});
export type ReadingChapterProgress = z.infer<
  typeof ReadingChapterProgressSchema
>;

export const SessionProgressSchema = z.object({
  sessionId: z.string(),
  completedReadingIds: z.array(z.string()),
  // Sparse — only readings that are part-way through. Defaulted so progress
  // records written before per-chapter tracking existed still parse.
  partialChapters: z.array(ReadingChapterProgressSchema).default([]),
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
  // The reader chose "at my own pace" instead of one of the plan's cadences.
  // Sessions are still ordered one per day internally (so completion and the
  // calendar keep working), but nothing is presented as due on a date and the
  // reader is never shown as behind. Defaulted for records written before it.
  selfPaced: z.boolean().default(false),
  startedAtMs: z.number().positive(),
  timeZone: z.string().nullable().optional(),
  // Sparse — only sessions that have some progress recorded.
  sessions: z.array(SessionProgressSchema),
  // Derived stats, kept in sync as completion changes (see `withProgressStats`).
  percentComplete: z.number().min(0).max(1).default(0), // fraction of readings done
  totalSessions: z.number().int().nonnegative().default(0),
  totalReadings: z.number().int().nonnegative().default(0),
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
    /** Read at the reader's own pace, ignoring the plan's cadences. */
    selfPaced?: boolean;
  } = {}
): ReadingPlanProgress {
  // Reading at your own pace still needs an ordering for the sessions, so it
  // pins a one-session-a-day cadence of its own rather than inheriting whatever
  // rhythm the author happened to list first. `selfPaced` then tells the UI not
  // to present any of it as a schedule.
  const selfPaced = options.selfPaced ?? false;
  return ReadingPlanProgressSchema.parse({
    id,
    planId: formatReadingPlanId(plan.recordName, plan.address),
    recordName: userId,
    userId,
    selectedCadenceId: selfPaced
      ? null
      : (options.cadenceId ??
        plan.defaultCadenceId ??
        plan.cadenceOptions[0]?.id ??
        null),
    customCadence: selfPaced
      ? SELF_PACED_CADENCE
      : (options.customCadence ?? null),
    selfPaced,
    startedAtMs: nowMs,
    timeZone: options.timeZone ?? null,
    sessions: [],
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  });
}

/** Ids of the built-in cadences a plan author can offer (see `DEFAULT_CADENCE_OPTIONS`). */
export const CADENCE_ONCE_DAILY = "once-daily";
export const CADENCE_TWICE_DAILY = "twice-daily";
export const CADENCE_THREE_TIMES_DAILY = "three-times-daily";
export const CADENCE_EVERY_OTHER_DAY = "every-other-day";

/**
 * The cadences the create wizard offers out of the box. An author checks the
 * ones their plan should support; a reader picks one (or opts out entirely and
 * reads at their own pace) when they start the plan. The `label` here is the
 * English fallback stored on the record — the UI translates by id where it can
 * (see `cadenceOptionLabel`), so a plan shared across languages still reads
 * correctly.
 */
export const DEFAULT_CADENCE_OPTIONS: CadenceOption[] = [
  {
    id: CADENCE_ONCE_DAILY,
    label: "One session a day",
    cadence: { segments: [{ type: "read", days: 1, sessionsPerDay: 1 }] },
  },
  {
    id: CADENCE_TWICE_DAILY,
    label: "Two sessions a day",
    cadence: { segments: [{ type: "read", days: 1, sessionsPerDay: 2 }] },
  },
  {
    id: CADENCE_THREE_TIMES_DAILY,
    label: "Three sessions a day",
    cadence: { segments: [{ type: "read", days: 1, sessionsPerDay: 3 }] },
  },
  {
    id: CADENCE_EVERY_OTHER_DAY,
    label: "One session every other day",
    cadence: {
      segments: [
        { type: "read", days: 1, sessionsPerDay: 1 },
        { type: "skip", days: 1 },
      ],
    },
  },
];

/** The ordering used for a self-paced read: one session at a time, in order. */
const SELF_PACED_CADENCE: Cadence = {
  segments: [{ type: "read", days: 1, sessionsPerDay: 1 }],
};

/** The built-in cadence option with the given id, if there is one. */
export function findDefaultCadenceOption(id: string): CadenceOption | null {
  return DEFAULT_CADENCE_OPTIONS.find((option) => option.id === id) ?? null;
}

/**
 * Creates a new reading plan — empty unless `options.sessions` supplies its
 * content up front. `address` and `nowMs` are passed in so this stays
 * deterministic. Defaults to the one-session-a-day cadence (a plan must offer
 * at least one), an "en" locale, and a finished (`"complete"`) status; all of
 * these can be overridden via `options`.
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
    status?: ReadingPlanStatus;
    /** Initial sessions, in reading order. Defaults to an empty plan. */
    sessions?: ReadingPlanSession[];
  } = {}
): ReadingPlan {
  const cadenceOptions = options.cadenceOptions?.length
    ? options.cadenceOptions
    : [DEFAULT_CADENCE_OPTIONS[0]!];
  return ReadingPlanSchema.parse({
    address,
    recordName,
    authorUserId,
    locale: options.locale ?? "en",
    title: options.title ?? null,
    description: options.description ?? null,
    cadenceOptions,
    defaultCadenceId: options.defaultCadenceId ?? cadenceOptions[0]?.id ?? null,
    status: options.status ?? "complete",
    sessions: options.sessions ?? [],
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  });
}

// ---------------------------------------------------------------------------
// Draft (authoring)
//
// A plan being built in the create wizard. The draft is a real `ReadingPlan`
// carrying `status: "draft"`, saved to the author's account after every change
// so nothing is lost if they close the pane, navigate away, or lose the tab —
// they can pick it back up from the plans list. It lives on the manager rather
// than inside the wizard component so it survives the plans pane being closed,
// which is what lets the reader's verse toolbar add the current selection to
// the plan the user is in the middle of authoring.
// ---------------------------------------------------------------------------

/** A reading plan being authored, plus the editor state that goes with it. */
export interface ReadingPlanDraft {
  /** The plan being edited — `status: "draft"` unless it was already published. */
  plan: ReadingPlan;
  /** Index of the session a new reading is added to. */
  selectedSessionIndex: number;
  /** True once this draft has been written to the author's account. */
  persisted: boolean;
  /**
   * True while the plan is still being brought into existence — a new draft, or
   * a saved one picked back up. False when an already-published plan is being
   * edited, which is what stops "discard" from deleting a plan people may
   * already be reading: backing out of an edit throws away nothing.
   */
  isNew: boolean;
}

/** An empty session, ready for the author to fill in. */
export function createDraftSession(id: string): ReadingPlanSession {
  return { id, title: null, readings: [] };
}

/** Total number of readings across every session of the draft. */
export function draftReadingCount(draft: ReadingPlanDraft): number {
  return draft.plan.sessions.reduce(
    (sum, session) => sum + session.readings.length,
    0
  );
}

/**
 * The sessions a draft would actually save: empty ones are dropped, because a
 * session the author added but never filled is nothing to read. Returns them in
 * authoring order.
 */
export function sessionsFromDraft(
  draft: ReadingPlanDraft
): ReadingPlanSession[] {
  return draft.plan.sessions.filter((session) => session.readings.length > 0);
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
 * How many calendar days it takes to read `sessionCount` sessions at this
 * cadence — this is where a plan's length comes from. A plan has no duration of
 * its own: the same content read one session a day takes twice as long as read
 * two a day, which is exactly the point of offering several cadences.
 *
 * Counts up to and including the day the last session falls on, so trailing
 * skip days don't inflate it. Returns 0 when there is nothing to read or the
 * cadence never reads.
 */
export function cadenceDurationDays(
  cadence: Cadence,
  sessionCount: number
): number {
  if (sessionCount <= 0) {
    return 0;
  }
  const pattern = patternDays(cadence);
  const period = sessionsPerCycle(pattern);
  if (period === 0) {
    return 0;
  }
  const fullCycles = Math.floor(sessionCount / period);
  let remaining = sessionCount % period;
  let days = fullCycles * pattern.length;
  if (remaining === 0) {
    // The last full cycle ended on its final reading day; any skip days after
    // it are trailing and don't count toward the plan's length.
    let trailingSkips = 0;
    for (let i = pattern.length - 1; i >= 0 && pattern[i] === 0; i--) {
      trailingSkips++;
    }
    return days - trailingSkips;
  }
  for (const sessions of pattern) {
    days++;
    if (remaining <= sessions) {
      break;
    }
    remaining -= sessions;
  }
  return days;
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
): CivilDate | null {
  if (sessionIndex < 0) {
    return null;
  }
  const pattern = patternDays(cadence);
  const period = sessionsPerCycle(pattern);
  if (period === 0) {
    return null;
  }
  const start = civilDateInZone(startedAtMs, timeZone);
  const fullCycles = Math.floor(sessionIndex / period);
  let remaining = sessionIndex % period;
  let dayOffset = fullCycles * pattern.length;
  for (let i = 0; i < pattern.length; i++) {
    const sessions = pattern[i]!;
    if (remaining < sessions) {
      return addCivilDays(start, dayOffset);
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
  const start = civilDateInZone(startedAtMs, timeZone);
  const target = civilDateInZone(dateMs, timeZone);
  const dayOffset = civilDaysBetween(start, target);
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

/** No book of the Bible (Psalms, the longest) has more than 150 chapters. */
const MAX_CHAPTER_NUMBER = 150;

/**
 * The chapters a reading covers, in order. A scripture reading spanning
 * `chapter`–`endChapter` covers every chapter between them; one without an
 * `endChapter` covers its single chapter. Non-scripture readings (text, links)
 * have no chapters and return an empty list — they are read in one go.
 */
export function readingChapters(reading: PlanReading): number[] {
  const item = reading.item;
  if (item.type !== "bible-verse") {
    return [];
  }
  const start = item.ref.chapter;
  const end = Math.min(item.ref.endChapter ?? start, MAX_CHAPTER_NUMBER);
  if (end <= start) {
    return [start];
  }
  const chapters: number[] = [];
  for (let chapter = start; chapter <= end; chapter++) {
    chapters.push(chapter);
  }
  return chapters;
}

/**
 * How many separate pieces a reading breaks into — one per chapter for
 * scripture, one for everything else. This is the unit progress is measured in,
 * so a ten-chapter reading counts for ten times as much as a one-chapter one
 * and the progress bar moves as each chapter is read.
 */
export function readingUnits(reading: PlanReading): number {
  return Math.max(1, readingChapters(reading).length);
}

/** The chapters of `readingId` recorded as read, when it is part-way through. */
function partialChaptersFor(
  sessionProgress: SessionProgress | undefined,
  readingId: string
): number[] {
  return (
    sessionProgress?.partialChapters.find((p) => p.readingId === readingId)
      ?.chapters ?? []
  );
}

/** True when the whole reading has been completed. */
export function isReadingComplete(
  sessionProgress: SessionProgress | undefined,
  readingId: string
): boolean {
  return sessionProgress?.completedReadingIds.includes(readingId) ?? false;
}

/** True when this one chapter of a reading has been read. */
export function isReadingChapterComplete(
  sessionProgress: SessionProgress | undefined,
  readingId: string,
  chapter: number
): boolean {
  return (
    isReadingComplete(sessionProgress, readingId) ||
    partialChaptersFor(sessionProgress, readingId).includes(chapter)
  );
}

/**
 * How much of a reading is done, in chapters (or 1/1 for a text or link
 * reading). Drives the "3 of 10 chapters" line on a multi-chapter reading.
 */
export function readingCompletion(
  reading: PlanReading,
  sessionProgress: SessionProgress | undefined
): { done: number; total: number } {
  const total = readingUnits(reading);
  if (isReadingComplete(sessionProgress, reading.id)) {
    return { done: total, total };
  }
  const chapters = readingChapters(reading);
  if (chapters.length === 0) {
    return { done: 0, total };
  }
  const read = new Set(partialChaptersFor(sessionProgress, reading.id));
  return { done: chapters.filter((c) => read.has(c)).length, total };
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

/**
 * Aggregate completion counts across the whole plan. Readings are counted both
 * whole (`doneReadings`) and in chapters (`doneUnits`) — the chapter counts are
 * what the progress bar uses, so reading 3 chapters of a 10-chapter reading
 * shows as progress instead of nothing.
 */
export function planCompletion(
  plan: ReadingPlan,
  progress: ReadingPlanProgress
): {
  doneSessions: number;
  totalSessions: number;
  doneReadings: number;
  totalReadings: number;
  doneUnits: number;
  totalUnits: number;
} {
  const progressBySession = new Map(
    progress.sessions.map((s) => [s.sessionId, s])
  );
  let doneSessions = 0;
  let doneReadings = 0;
  let totalReadings = 0;
  let doneUnits = 0;
  let totalUnits = 0;
  for (const session of plan.sessions) {
    totalReadings += session.readings.length;
    const sp = progressBySession.get(session.id);
    let completed = 0;
    for (const reading of session.readings) {
      const { done, total } = readingCompletion(reading, sp);
      totalUnits += total;
      doneUnits += done;
      if (done === total) {
        completed++;
      }
    }
    doneReadings += completed;
    // `sp` is required: without any recorded progress there is nothing done,
    // and a session with no readings must not count itself finished.
    if (sp && completed === session.readings.length) {
      doneSessions++;
    }
  }
  return {
    doneSessions,
    totalSessions: plan.sessions.length,
    doneReadings,
    totalReadings,
    doneUnits,
    totalUnits,
  };
}

/**
 * True when a session contains at least one bible-verse reading that covers the
 * given passage (book + chapter). A reading's `endChapter` (when present) makes
 * it span a chapter range; a chapter falls inside `[chapter, endChapter]`.
 */
export function sessionMatchesPassage(
  session: ReadingPlanSession,
  bookId: string,
  chapter: number
): boolean {
  return session.readings.some((reading) => {
    const item = reading.item;
    if (item.type !== "bible-verse") {
      return false;
    }
    const ref = item.ref;
    if (ref.bookId !== bookId) {
      return false;
    }
    const endChapter = ref.endChapter ?? ref.chapter;
    return chapter >= ref.chapter && chapter <= endChapter;
  });
}

/**
 * Recomputes the derived stats (`percentComplete`, plus the plan's
 * `totalSessions`/`totalReadings`) onto the progress so consumers can show
 * progress without loading the plan. The percentage is measured in chapters
 * rather than whole readings, so a reader part-way through a ten-chapter
 * reading sees the bar move. Purely derived — leaves `updatedAtMs`.
 */
export function withProgressStats(
  plan: ReadingPlan,
  progress: ReadingPlanProgress
): ReadingPlanProgress {
  const { totalReadings, totalSessions, doneUnits, totalUnits } =
    planCompletion(plan, progress);
  return {
    ...progress,
    totalSessions,
    totalReadings,
    percentComplete: totalUnits > 0 ? doneUnits / totalUnits : 0,
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
  const next = update(
    existing ?? { sessionId, completedReadingIds: [], partialChapters: [] }
  );
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
      const next: SessionProgress = {
        ...sp,
        completedReadingIds,
        // Whole-reading completion supersedes any part-way chapter record —
        // either every chapter is done or none of them are.
        partialChapters: sp.partialChapters.filter(
          (p) => p.readingId !== readingId
        ),
      };
      next.completedAtMs = isSessionComplete(session, next)
        ? (sp.completedAtMs ?? nowMs)
        : null;
      return next;
    },
    nowMs
  );
}

/**
 * Marks one chapter of a reading read (`complete`, default) or unread. This is
 * what the reader's "this reading belongs to" card uses: a reader who finishes
 * John 4 gets credit for John 4, not for the whole "John 1–10" reading it sits
 * inside.
 *
 * Reading the last outstanding chapter completes the reading itself (and, if it
 * was the session's last, the session). Marking a chapter unread on an
 * already-complete reading leaves the reading's other chapters intact. A
 * `readingId` that doesn't belong to the session, a chapter the reading doesn't
 * cover, or a non-scripture reading is a no-op.
 */
export function markReadingChapterCompleteInProgress(
  progress: ReadingPlanProgress,
  session: ReadingPlanSession,
  readingId: string,
  chapter: number,
  nowMs: number,
  complete = true
): ReadingPlanProgress {
  const reading = session.readings.find((r) => r.id === readingId);
  if (!reading) {
    return progress;
  }
  const chapters = readingChapters(reading);
  if (!chapters.includes(chapter)) {
    return progress;
  }
  // A single-chapter reading has nothing to track part-way through: reading its
  // one chapter is reading all of it.
  if (chapters.length === 1) {
    return markReadingCompleteInProgress(
      progress,
      session,
      readingId,
      nowMs,
      complete
    );
  }

  const existing = progress.sessions.find((s) => s.sessionId === session.id);
  const alreadyRead = new Set(
    isReadingComplete(existing, readingId)
      ? chapters
      : partialChaptersFor(existing, readingId)
  );
  if (alreadyRead.has(chapter) === complete) {
    return progress; // nothing to change
  }
  if (complete) {
    alreadyRead.add(chapter);
  } else {
    alreadyRead.delete(chapter);
  }
  const readChapters = chapters.filter((c) => alreadyRead.has(c));
  const nowWholeReading = readChapters.length === chapters.length;

  return withSessionProgress(
    progress,
    session.id,
    (sp) => {
      const withoutThis = sp.partialChapters.filter(
        (p) => p.readingId !== readingId
      );
      const next: SessionProgress = {
        ...sp,
        completedReadingIds: nowWholeReading
          ? sp.completedReadingIds.includes(readingId)
            ? sp.completedReadingIds
            : [...sp.completedReadingIds, readingId]
          : sp.completedReadingIds.filter((id) => id !== readingId),
        // Only part-way readings are recorded here; a finished (or untouched)
        // one carries no chapter list.
        partialChapters:
          nowWholeReading || readChapters.length === 0
            ? withoutThis
            : [...withoutThis, { readingId, chapters: readChapters }],
      };
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
      // Either way nothing is left part-way through.
      partialChapters: [],
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
  /** The calendar date, as seen in the plan progress's time zone. */
  date: CivilDate;
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
  /** The first skipped day, as seen in the plan progress's time zone. */
  startDate: CivilDate;
  /** The last (inclusive) skipped day, in the same time zone. */
  endDate: CivilDate;
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

  const zone = progress.timeZone;
  const start = civilDateInZone(progress.startedAtMs, zone);
  const today = civilDateInZone(nowMs, zone);
  const todayOffset = civilDaysBetween(start, today);

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
      startDate: addCivilDays(start, pendingSkipStart),
      endDate: addCivilDays(start, endExclusive - 1),
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
        date: addCivilDays(start, dayOffset),
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

/** Verses a typical reader gets through in a minute (~200 words a minute). */
const VERSES_PER_MINUTE = 8;

/** Verses in a chapter when the book's own figures aren't available. */
const FALLBACK_VERSES_PER_CHAPTER = 24;

/** Just enough of a book to work out its average chapter length. */
export interface BookLength {
  numberOfChapters: number;
  totalNumberOfVerses: number;
}

/**
 * Rough reading-time estimate in minutes for a set of readings, counted in
 * verses rather than chapters so a long chapter reads as longer than a short
 * one. An explicit verse range is counted exactly; a whole chapter is counted
 * at the book's average chapter length, which `resolveBook` supplies (Psalms
 * averages far shorter chapters than Isaiah). Without it, every chapter falls
 * back to a typical length — the same flat estimate as before.
 *
 * It remains an estimate: the average can't tell Psalm 119 from Psalm 117.
 * Getting that exact would mean knowing each chapter's verse count, which is
 * only available once the chapter itself has been loaded.
 */
export function estimateReadingMinutes(
  readings: PlanReading[],
  resolveBook?: (bookId: string) => BookLength | null | undefined
): number {
  let verses = 0;
  for (const reading of readings) {
    const item = reading.item;
    if (item.type !== "bible-verse") {
      verses += FALLBACK_VERSES_PER_CHAPTER;
      continue;
    }
    const ref = item.ref;
    const book = resolveBook?.(ref.bookId);
    const perChapter =
      book && book.numberOfChapters > 0
        ? book.totalNumberOfVerses / book.numberOfChapters
        : FALLBACK_VERSES_PER_CHAPTER;
    const chapters = Math.max(
      1,
      (ref.endChapter ?? ref.chapter) - ref.chapter + 1
    );
    // A verse range inside a single chapter is the one case we can count
    // exactly; anything spanning chapters falls back to the average.
    if (chapters === 1 && ref.verse != null && ref.endVerse != null) {
      verses += Math.max(1, ref.endVerse - ref.verse + 1);
    } else if (chapters === 1 && ref.verse != null && !ref.toEndOfChapter) {
      verses += 1;
    } else {
      verses += chapters * perChapter;
    }
  }
  return Math.max(1, Math.round(verses / VERSES_PER_MINUTE));
}

/** Derived, at-a-glance stats about a user's progress through a plan's calendar. */
export interface CalendarSummary {
  /** The reading days (skip ranges removed), in order. */
  readingDays: CalendarReadingDay[];
  totalDays: number;
  doneDays: number;
  /** Consecutive completed days ending at today (today may still be pending). */
  streak: number;
  /** Count of strictly-past reading days that were never completed. */
  behind: number;
  /** The reading day that contains "now", if any. */
  today: CalendarReadingDay | null;
  /** The earliest not-yet-completed reading day. */
  next: CalendarReadingDay | null;
  /** 1-based ordinal of `next` among reading days. */
  nextDayNumber: number | null;
  lastDay: CalendarReadingDay | null;
}

/**
 * Summarizes a reading calendar (from `getReadingCalendar`) into the stats the
 * plans list and detail views show: totals, streak, how far behind, and the
 * next day to read. Pure — `nowMs` is passed so it stays deterministic.
 *
 * `timeZone` must be the same zone the calendar days were built in (the
 * progress's time zone). Using the device zone instead would put the
 * behind/streak boundary a day out for anyone reading a plan anchored to a
 * zone other than their own.
 */
export function summarizeCalendar(
  entries: ReadingCalendarEntry[],
  nowMs: number,
  timeZone?: string | null
): CalendarSummary {
  const readingDays = entries.filter(
    (entry): entry is CalendarReadingDay => entry.type === "reading"
  );
  const totalDays = readingDays.length;
  const todayNumber = civilToDayNumber(civilDateInZone(nowMs, timeZone));

  let doneDays = 0;
  let behind = 0;
  for (const day of readingDays) {
    if (day.completedAtMs != null) {
      doneDays++;
    }
    const isStrictlyPast =
      !day.containsNow && civilToDayNumber(day.date) < todayNumber;
    if (isStrictlyPast && day.completedAtMs == null) {
      behind++;
    }
  }

  const dueDays = readingDays.filter(
    (day) => day.containsNow || civilToDayNumber(day.date) <= todayNumber
  );
  let streak = 0;
  for (let i = dueDays.length - 1; i >= 0; i--) {
    if (dueDays[i]!.completedAtMs != null) {
      streak++;
    } else if (i === dueDays.length - 1) {
      // The most recent due day (usually today) can still be pending without
      // breaking a streak built on the days before it.
      continue;
    } else {
      break;
    }
  }

  const nextIndex = readingDays.findIndex((day) => day.completedAtMs == null);
  return {
    readingDays,
    totalDays,
    doneDays,
    streak,
    behind,
    today: readingDays.find((day) => day.containsNow) ?? null,
    next: nextIndex >= 0 ? readingDays[nextIndex]! : null,
    nextDayNumber: nextIndex >= 0 ? nextIndex + 1 : null,
    lastDay: readingDays[readingDays.length - 1] ?? null,
  };
}

export function createReadingPlansManager(
  os: CasualOSManager,
  login: LoginManager
) {
  const userReadingPlanProgresses = signal<ReadingPlanProgress[]>([]);
  const userReadingPlans = signal<ReadingPlanMetadata[]>([]);
  // Fully-loaded plans (with `sessions`) for the user's own plans. Needed to
  // match the current passage against readings; `userReadingPlans` is metadata
  // only. Kept in sync by an effect that follows `userReadingPlans`.
  const fullReadingPlans = signal<ReadingPlan[]>([]);
  const selectedReadingPlan = signal<ReadingPlan | null>(null);
  const selectedReadingPlanProgress = signal<ReadingPlanProgress | null>(null);
  const canEditSelectedPlan = computed(() => {
    return selectedReadingPlan.value?.authorUserId === login.userId.value;
  });

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
    const result = await os.listAllDataByMarker(
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

  // A plan lives in two records: the plan itself and a `_metadata` companion
  // the list reads so it can render without loading every plan's contents.
  // They are written one after the other rather than together, so a failure
  // can only ever leave the metadata *behind* the plan, never ahead of it —
  // the list may briefly describe the previous version, but it can't advertise
  // a plan (say, as "complete") that the content record doesn't back up.
  const saveReadingPlan = async (plan: ReadingPlan) => {
    const metadata = omit(plan, ["sessions"]);
    await os.recordData(plan.recordName, plan.address, plan, {
      marker: "publicRead:readingPlan",
    });
    await os.recordData(plan.recordName, `${plan.address}_metadata`, metadata, {
      marker: "publicRead:readingPlanMetadata",
    });
  };

  const saveReadingPlanProgress = async (progress: ReadingPlanProgress) => {
    const parsed = ReadingPlanProgressSchema.parse(progress);
    await os.recordData(parsed.recordName, parsed.id, parsed, {
      marker: "publicRead:readingPlanProgress",
    });
  };

  const loadReadingProgress = async (recordName: string) => {
    const result = await os.listAllDataByMarker(
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

  // Guards against an older in-flight sync overwriting a newer one's result.
  let fullPlanSyncToken = 0;

  // Loads the full plan (with sessions) for each metadata entry so consumers can
  // match passages against readings. Plans already cached at (or ahead of) the
  // listed `updatedAtMs` are reused rather than refetched, so a local metadata
  // mutation — creating a plan, appending a session — costs no network reads.
  // Skips any that fail to load.
  const syncFullReadingPlans = async () => {
    const metas = userReadingPlans.value;
    if (!login.userId.value || metas.length === 0) {
      fullReadingPlans.value = [];
      return;
    }
    // Read the cache untracked: this runs inside an effect that must follow
    // `userReadingPlans` only. Subscribing to the signal it writes would loop.
    const cached = untracked(
      () =>
        new Map(
          fullReadingPlans.value.map((plan) => [
            formatReadingPlanId(plan.recordName, plan.address),
            plan,
          ])
        )
    );
    const entries = metas.map((meta) => {
      const hit = cached.get(
        formatReadingPlanId(meta.recordName, meta.address)
      );
      return {
        meta,
        fresh: hit && hit.updatedAtMs >= meta.updatedAtMs ? hit : null,
      };
    });
    // Every listed plan is cached at its current version and nothing has been
    // removed from the list — the cache already matches, so don't touch it.
    if (entries.every((entry) => entry.fresh) && cached.size === metas.length) {
      return;
    }
    const token = ++fullPlanSyncToken;
    try {
      const loaded = await Promise.all(
        entries.map(
          (entry) =>
            entry.fresh ??
            getReadingPlan(entry.meta.recordName, entry.meta.address).catch(
              () => null
            )
        )
      );
      if (token !== fullPlanSyncToken) {
        return; // a newer sync started while this one was in flight
      }
      fullReadingPlans.value = loaded.filter(
        (plan): plan is ReadingPlan => plan !== null
      );
    } catch (error) {
      console.error("Failed to load full reading plans:", error);
    }
  };

  /**
   * Opens a plan. When the full plan is already cached at the listed version
   * it is shown straight away and nothing is fetched — opening a plan you can
   * already see in the list should be instant, not a network round trip.
   * Otherwise it is loaded, and a failure is re-thrown so the caller can keep
   * the user on the list with an error rather than dropping them on an empty
   * screen titled "Untitled plan".
   */
  const selectReadingPlan = async (
    plan: ReadingPlanMetadata | null
  ): Promise<ReadingPlan | null> => {
    if (!plan) {
      selectedReadingPlan.value = null;
      return null;
    }

    const cached = fullReadingPlans.value.find(
      (p) => p.recordName === plan.recordName && p.address === plan.address
    );
    if (cached && cached.updatedAtMs >= plan.updatedAtMs) {
      selectedReadingPlan.value = cached;
      return cached;
    }

    try {
      const fullPlan = await getReadingPlan(plan.recordName, plan.address);
      selectedReadingPlan.value = fullPlan;
      return fullPlan;
    } catch (error) {
      console.error("Failed to load selected reading plan:", error);
      selectedReadingPlan.value = null;
      throw error;
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

  // Applies an updated progress to the selected-plan signals and persists it,
  // recomputing the derived stats against the selected plan when it matches.
  const updateSelectedProgress = async (updated: ReadingPlanProgress) => {
    const plan = selectedReadingPlan.value;
    const next =
      plan &&
      formatReadingPlanId(plan.recordName, plan.address) === updated.planId
        ? withProgressStats(plan, updated)
        : updated;
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

  /** Marks one chapter of one reading complete/incomplete and saves. */
  const markReadingChapterComplete = async (
    session: ReadingPlanSession,
    readingId: string,
    chapter: number,
    complete = true
  ) => {
    const current = requireSelectedProgress();
    await updateSelectedProgress(
      markReadingChapterCompleteInProgress(
        current,
        session,
        readingId,
        chapter,
        Date.now(),
        complete
      )
    );
  };

  /**
   * Applies an updated progress that isn't necessarily the selected one:
   * recomputes derived stats against the matching full plan when it's cached,
   * updates in-memory state (list + the selected progress if it matches), and
   * persists.
   */
  const applyProgressUpdate = async (updated: ReadingPlanProgress) => {
    const plan = fullReadingPlans.value.find(
      (p) => formatReadingPlanId(p.recordName, p.address) === updated.planId
    );
    const next = plan ? withProgressStats(plan, updated) : updated;
    userReadingPlanProgresses.value = userReadingPlanProgresses.value.map(
      (p) => (p.id === next.id ? next : p)
    );
    if (selectedReadingPlanProgress.value?.id === next.id) {
      selectedReadingPlanProgress.value = next;
    }
    await saveReadingPlanProgress(next);
  };

  /**
   * Marks a session complete/incomplete for a specific progress (by id), not
   * necessarily the currently-selected one. No-op when the progress isn't found.
   */
  const setSessionCompleteForProgress = async (
    progressId: string,
    session: ReadingPlanSession,
    complete: boolean
  ) => {
    const current = userReadingPlanProgresses.value.find(
      (p) => p.id === progressId
    );
    if (!current) {
      return;
    }
    await applyProgressUpdate(
      markSessionCompleteInProgress(current, session, Date.now(), complete)
    );
  };

  /**
   * Marks every reading in `session` that covers `chapter` of `bookId` read (or
   * unread) for a specific progress. Used by the in-reader "this reading
   * belongs to" card: the reader has finished the chapter in front of them, so
   * that is exactly what gets credited — a reading of John 1–10 advances by one
   * chapter rather than being ticked off whole, and the text and link readings
   * that happen to share the session (and aren't reachable from the reader at
   * all) are left alone. No-op when the progress isn't found.
   */
  const setPassageCompleteForProgress = async (
    progressId: string,
    session: ReadingPlanSession,
    bookId: string,
    chapter: number,
    complete: boolean
  ) => {
    const current = userReadingPlanProgresses.value.find(
      (p) => p.id === progressId
    );
    if (!current) {
      return;
    }
    const nowMs = Date.now();
    let updated = current;
    for (const reading of session.readings) {
      const item = reading.item;
      if (item.type !== "bible-verse" || item.ref.bookId !== bookId) {
        continue;
      }
      if (!readingChapters(reading).includes(chapter)) {
        continue;
      }
      updated = markReadingChapterCompleteInProgress(
        updated,
        session,
        reading.id,
        chapter,
        nowMs,
        complete
      );
    }
    if (updated === current) {
      return;
    }
    await applyProgressUpdate(updated);
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
      selfPaced?: boolean;
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

  // -------------------------------------------------------------------------
  // Draft authoring
  //
  // Held here rather than in the wizard so the draft outlives the plans pane:
  // the user can open the wizard, go read, add the passage they're looking at
  // via the verse toolbar's "Add to plan", and come back to it still there.
  // -------------------------------------------------------------------------

  const editingReadingPlan = signal<ReadingPlanDraft | null>(null);
  // Set while a draft save is in flight or scheduled, so the wizard can show
  // that the user's work is being kept without them having to press anything.
  const editingReadingPlanSaving = signal(false);
  const editingReadingPlanSaveError = signal(false);

  /** How long to wait after the last edit before writing the draft. */
  const DRAFT_SAVE_DEBOUNCE_MS = 700;
  let draftSaveTimer: ReturnType<typeof setTimeout> | null = null;
  // Serializes draft writes so two saves can't race and land out of order.
  let draftSaveChain: Promise<void> = Promise.resolve();

  const writeDraft = async (draft: ReadingPlanDraft) => {
    try {
      await saveReadingPlan(draft.plan);
      const current = editingReadingPlan.peek();
      // Only mark the draft persisted if it's still the one being edited —
      // the user may have finished or discarded it while the write was in
      // flight, in which case there is nothing left to flag.
      if (current && current.plan.address === draft.plan.address) {
        editingReadingPlan.value = { ...current, persisted: true };
      }
      // The plan's own record is the draft's home, but the list reads metadata,
      // so keep both caches current or the draft won't show up to resume.
      const metadata = omit(draft.plan, ["sessions"]);
      const isDraft = (p: { recordName: string; address: string }) =>
        p.recordName === draft.plan.recordName &&
        p.address === draft.plan.address;
      batch(() => {
        fullReadingPlans.value = fullReadingPlans.value.some(isDraft)
          ? fullReadingPlans.value.map((p) => (isDraft(p) ? draft.plan : p))
          : [...fullReadingPlans.value, draft.plan];
        userReadingPlans.value = userReadingPlans.value.some(isDraft)
          ? userReadingPlans.value.map((p) => (isDraft(p) ? metadata : p))
          : [...userReadingPlans.value, metadata];
      });
      editingReadingPlanSaveError.value = false;
    } catch (error) {
      console.error("Failed to save reading plan draft:", error);
      editingReadingPlanSaveError.value = true;
    }
  };

  /** Queues a debounced save of the current draft. */
  const scheduleDraftSave = () => {
    if (draftSaveTimer !== null) {
      clearTimeout(draftSaveTimer);
    }
    editingReadingPlanSaving.value = true;
    draftSaveTimer = setTimeout(() => {
      draftSaveTimer = null;
      void flushDraftSave();
    }, DRAFT_SAVE_DEBOUNCE_MS);
  };

  /** Writes any pending draft change immediately. Resolves once it has landed. */
  const flushDraftSave = async (): Promise<void> => {
    if (draftSaveTimer !== null) {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = null;
    }
    const draft = editingReadingPlan.peek();
    if (!draft) {
      editingReadingPlanSaving.value = false;
      return;
    }
    // `writeDraft` swallows its own failures, so the chain always settles —
    // one failed autosave must not reject every save queued behind it.
    draftSaveChain = draftSaveChain.then(() => writeDraft(draft));
    await draftSaveChain;
    // Another edit may have queued a fresh save while this one was writing;
    // leave the indicator on for it rather than flicking it off and back.
    if (draftSaveTimer === null) {
      editingReadingPlanSaving.value = false;
    }
  };

  /** Replaces the draft's plan and queues a save of the change. */
  const mutateDraft = (
    update: (plan: ReadingPlan) => ReadingPlan,
    patch: Partial<Omit<ReadingPlanDraft, "plan">> = {}
  ) => {
    const current = editingReadingPlan.peek();
    if (!current) {
      return;
    }
    editingReadingPlan.value = {
      ...current,
      ...patch,
      plan: { ...update(current.plan), updatedAtMs: Date.now() },
    };
    scheduleDraftSave();
  };

  /**
   * Opens a fresh draft with one empty session and the everyday cadence
   * pre-selected. Nothing is written yet — the first actual edit persists it,
   * so opening the wizard and immediately backing out leaves no empty plan
   * behind in the user's account.
   */
  const startEditingReadingPlan = () => {
    const userId = login.userId.value ?? "";
    const now = Date.now();
    editingReadingPlan.value = {
      plan: createReadingPlan(userId, userId, `plan_${uuid()}`, now, {
        status: "draft",
        cadenceOptions: [DEFAULT_CADENCE_OPTIONS[0]!],
        sessions: [createDraftSession(uuid())],
      }),
      selectedSessionIndex: 0,
      persisted: false,
      isNew: true,
    };
    editingReadingPlanSaveError.value = false;
  };

  /** Reopens a saved draft so the author can carry on where they left off. */
  const resumeEditingReadingPlan = (plan: ReadingPlan) => {
    editingReadingPlan.value = {
      plan:
        plan.sessions.length > 0
          ? plan
          : { ...plan, sessions: [createDraftSession(uuid())] },
      selectedSessionIndex: Math.max(0, plan.sessions.length - 1),
      persisted: true,
      isNew: true,
    };
    editingReadingPlanSaveError.value = false;
  };

  /**
   * Opens an already-published plan in the same editor used to create one, so
   * there is one screen for both. Edits autosave exactly as a draft's do, and
   * the plan keeps its `"complete"` status throughout so it never drops out of
   * the reader's list mid-edit.
   */
  const editExistingReadingPlan = (plan: ReadingPlan) => {
    editingReadingPlan.value = {
      plan:
        plan.sessions.length > 0
          ? plan
          : { ...plan, sessions: [createDraftSession(uuid())] },
      selectedSessionIndex: Math.max(0, plan.sessions.length - 1),
      persisted: true,
      isNew: false,
    };
    editingReadingPlanSaveError.value = false;
  };

  /**
   * Steps out of the wizard, flushing any pending change first. The draft
   * itself is kept — that is the whole point of drafts — and stays in the
   * plans list to be resumed or discarded.
   */
  const cancelEditingReadingPlan = () => {
    const draft = editingReadingPlan.peek();
    if (draft && (draft.persisted || draftSaveTimer !== null)) {
      void flushDraftSave().then(() => {
        editingReadingPlan.value = null;
      });
      return;
    }
    editingReadingPlan.value = null;
  };

  /** Merges a title/description change into the draft. */
  const updateEditingReadingPlan = (
    patch: Partial<Pick<ReadingPlan, "title" | "description">>
  ) => {
    mutateDraft((plan) => ({ ...plan, ...patch }));
  };

  /** Points new readings at a session of the draft. */
  const selectEditingPlanSession = (index: number) => {
    const current = editingReadingPlan.peek();
    if (!current) {
      return;
    }
    editingReadingPlan.value = {
      ...current,
      selectedSessionIndex: Math.min(
        Math.max(0, index),
        Math.max(0, current.plan.sessions.length - 1)
      ),
    };
  };

  /**
   * Sets which cadences the plan offers its readers. Order follows
   * `DEFAULT_CADENCE_OPTIONS` so the list reads the same however it was built.
   * A plan must offer at least one cadence, so an empty selection is ignored.
   */
  const setEditingPlanCadenceOptions = (optionIds: string[]) => {
    const options = DEFAULT_CADENCE_OPTIONS.filter((option) =>
      optionIds.includes(option.id)
    );
    if (options.length === 0) {
      return;
    }
    mutateDraft((plan) => ({
      ...plan,
      cadenceOptions: options,
      defaultCadenceId: options[0]!.id,
    }));
  };

  /** Adds an empty session to the end of the draft and selects it. */
  const addSessionToEditingPlan = () => {
    const current = editingReadingPlan.peek();
    if (!current) {
      return;
    }
    mutateDraft(
      (plan) => ({
        ...plan,
        sessions: [...plan.sessions, createDraftSession(uuid())],
      }),
      { selectedSessionIndex: current.plan.sessions.length }
    );
  };

  /**
   * Removes a session (and everything in it) from the draft. The last session
   * is emptied rather than removed, so the editor always has somewhere to put
   * the next reading.
   */
  const removeSessionFromEditingPlan = (index: number) => {
    const current = editingReadingPlan.peek();
    if (!current || index < 0 || index >= current.plan.sessions.length) {
      return;
    }
    const sessions =
      current.plan.sessions.length === 1
        ? [createDraftSession(uuid())]
        : current.plan.sessions.filter((_, i) => i !== index);
    // Removing a session *before* the selected one shifts every later session
    // down by one, so the selection has to move with it. Clamping the old index
    // alone would silently leave the user pointed at the session that took the
    // selected one's place — and send their next reading there.
    let selected = current.selectedSessionIndex;
    if (index < selected) {
      selected -= 1;
    }
    mutateDraft((plan) => ({ ...plan, sessions }), {
      selectedSessionIndex: Math.min(
        Math.max(0, selected),
        sessions.length - 1
      ),
    });
  };

  /**
   * Appends a reading to the draft's selected session (or `sessionIndex`, when
   * given). Any playlist item type is accepted — scripture, text, or a link.
   * Used both by the wizard's item input and by the reader's "Add to plan"
   * verse action.
   */
  const addReadingToEditingPlan = (
    item: PlaylistItemData,
    sessionIndex?: number
  ) => {
    const current = editingReadingPlan.peek();
    if (!current) {
      return;
    }
    const target = Math.min(
      Math.max(0, sessionIndex ?? current.selectedSessionIndex),
      current.plan.sessions.length - 1
    );
    const reading: PlanReading = { id: uuid(), item };
    mutateDraft((plan) => ({
      ...plan,
      sessions: plan.sessions.map((session, i) =>
        i === target
          ? { ...session, readings: [...session.readings, reading] }
          : session
      ),
    }));
  };

  /** Removes a reading from a session of the draft. */
  const removeReadingFromEditingPlan = (
    sessionIndex: number,
    readingId: string
  ) => {
    mutateDraft((plan) => ({
      ...plan,
      sessions: plan.sessions.map((session, i) =>
        i === sessionIndex
          ? {
              ...session,
              readings: session.readings.filter((r) => r.id !== readingId),
            }
          : session
      ),
    }));
  };

  /**
   * Finishes the draft: drops sessions the author never filled, flips it to
   * `"complete"`, writes it, and closes the wizard. Returns null when there is
   * no draft or it has no readings.
   */
  const finishEditingReadingPlan = async (): Promise<ReadingPlan | null> => {
    const draft = editingReadingPlan.peek();
    if (!draft || draftReadingCount(draft) === 0) {
      return null;
    }
    if (draftSaveTimer !== null) {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = null;
    }
    const plan: ReadingPlan = {
      ...draft.plan,
      title: draft.plan.title?.trim() || null,
      status: "complete",
      sessions: sessionsFromDraft(draft),
      updatedAtMs: Date.now(),
    };
    // Write through the shared chain so it can't land before an earlier
    // in-flight draft save and get overwritten by it. A failure here is the
    // user's to see (the wizard reports it and stays open), so it propagates —
    // but the chain is reset first, or every later save would inherit the
    // rejection and never run.
    const write = draftSaveChain.then(() => saveReadingPlan(plan));
    draftSaveChain = write.catch(() => undefined);
    await write;
    const isPlan = (p: { recordName: string; address: string }) =>
      p.recordName === plan.recordName && p.address === plan.address;
    const metadata = omit(plan, ["sessions"]);
    batch(() => {
      fullReadingPlans.value = fullReadingPlans.value.some(isPlan)
        ? fullReadingPlans.value.map((p) => (isPlan(p) ? plan : p))
        : [...fullReadingPlans.value, plan];
      userReadingPlans.value = userReadingPlans.value.some(isPlan)
        ? userReadingPlans.value.map((p) => (isPlan(p) ? metadata : p))
        : [...userReadingPlans.value, metadata];
      // Editing an already-open plan should leave the detail view showing what
      // was just saved, not the version it was opened with.
      if (selectedReadingPlan.value && isPlan(selectedReadingPlan.value)) {
        selectedReadingPlan.value = plan;
      }
    });
    editingReadingPlan.value = null;
    editingReadingPlanSaving.value = false;
    return plan;
  };

  /**
   * Deletes a plan — its content record, its metadata companion, and the
   * reader's own progress through it — and drops all three from the in-memory
   * caches. Progress goes too: a progress record that points at a plan which no
   * longer exists is unreadable, and would otherwise sit in the account forever.
   * Used both to throw away a draft and to delete a finished plan.
   */
  const deleteReadingPlan = async (plan: {
    recordName: string;
    address: string;
  }) => {
    const planId = formatReadingPlanId(plan.recordName, plan.address);
    const ownProgresses = userReadingPlanProgresses.value.filter(
      (p) => p.planId === planId
    );
    await os.eraseData(plan.recordName, `${plan.address}_metadata`);
    await os.eraseData(plan.recordName, plan.address);
    // Best effort: a progress that fails to erase leaves nothing broken behind
    // (it simply stops matching a plan), so it must not fail the delete.
    await Promise.all(
      ownProgresses.map((progress) =>
        os
          .eraseData(progress.recordName, progress.id)
          .catch((error: unknown) =>
            console.error("Failed to erase reading plan progress:", error)
          )
      )
    );
    const isPlan = (p: { recordName: string; address: string }) =>
      p.recordName === plan.recordName && p.address === plan.address;
    batch(() => {
      fullReadingPlans.value = fullReadingPlans.value.filter((p) => !isPlan(p));
      userReadingPlans.value = userReadingPlans.value.filter((p) => !isPlan(p));
      userReadingPlanProgresses.value = userReadingPlanProgresses.value.filter(
        (p) => p.planId !== planId
      );
      if (
        selectedReadingPlan.value &&
        isPlan(selectedReadingPlan.value) === true
      ) {
        selectedReadingPlan.value = null;
        selectedReadingPlanProgress.value = null;
      }
    });
  };

  /**
   * Throws the current edit away. For a plan still being created that means
   * deleting it; for an edit of an already-published plan it means stepping out
   * and leaving the plan alone.
   */
  const discardEditingReadingPlan = async () => {
    const draft = editingReadingPlan.peek();
    if (draftSaveTimer !== null) {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = null;
    }
    editingReadingPlan.value = null;
    editingReadingPlanSaving.value = false;
    if (!draft?.persisted || !draft.isNew) {
      return;
    }
    try {
      await deleteReadingPlan(draft.plan);
    } catch (error) {
      console.error("Failed to discard reading plan draft:", error);
    }
  };

  effect(() => {
    void syncReadingPlanProgresses();
    void syncReadingPlans();
  });

  // Follows `userReadingPlans` (read via `.value` inside `syncFullReadingPlans`)
  // to keep the full-plan cache current after plans are created or edited.
  effect(() => {
    void syncFullReadingPlans();
  });

  return {
    fullReadingPlans,
    setSessionCompleteForProgress,
    setPassageCompleteForProgress,
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
    markReadingChapterComplete,
    markSessionComplete,
    markDayComplete,
    deleteReadingPlan,
    canEditSelectedPlan,
    editingReadingPlan,
    editingReadingPlanSaving,
    editingReadingPlanSaveError,
    startEditingReadingPlan,
    resumeEditingReadingPlan,
    editExistingReadingPlan,
    cancelEditingReadingPlan,
    discardEditingReadingPlan,
    updateEditingReadingPlan,
    selectEditingPlanSession,
    setEditingPlanCadenceOptions,
    addSessionToEditingPlan,
    removeSessionFromEditingPlan,
    addReadingToEditingPlan,
    removeReadingFromEditingPlan,
    finishEditingReadingPlan,
  };
}

export type ReadingPlansManager = ReturnType<typeof createReadingPlansManager>;
