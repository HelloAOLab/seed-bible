import { z } from "zod";
import type { LoginManager } from "./LoginManager";
import { type CivilDate } from "./civilDate";
import { CasualOSManager } from "./OsManager";
export declare const CadenceSegmentSchema: z.ZodDiscriminatedUnion<
  [
    z.ZodObject<
      {
        type: z.ZodLiteral<"read">;
        days: z.ZodNumber;
        sessionsPerDay: z.ZodOptional<z.ZodNumber>;
        segmentLabels: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
      },
      z.core.$strip
    >,
    z.ZodObject<
      {
        type: z.ZodLiteral<"skip">;
        days: z.ZodNumber;
      },
      z.core.$strip
    >,
  ],
  "type"
>;
export type CadenceSegment = z.infer<typeof CadenceSegmentSchema>;
export declare const CadenceSchema: z.ZodObject<
  {
    segments: z.ZodArray<
      z.ZodDiscriminatedUnion<
        [
          z.ZodObject<
            {
              type: z.ZodLiteral<"read">;
              days: z.ZodNumber;
              sessionsPerDay: z.ZodOptional<z.ZodNumber>;
              segmentLabels: z.ZodOptional<
                z.ZodNullable<z.ZodArray<z.ZodString>>
              >;
            },
            z.core.$strip
          >,
          z.ZodObject<
            {
              type: z.ZodLiteral<"skip">;
              days: z.ZodNumber;
            },
            z.core.$strip
          >,
        ],
        "type"
      >
    >;
  },
  z.core.$strip
>;
export type Cadence = z.infer<typeof CadenceSchema>;
export declare const CadenceOptionSchema: z.ZodObject<
  {
    id: z.ZodString;
    label: z.ZodString;
    cadence: z.ZodObject<
      {
        segments: z.ZodArray<
          z.ZodDiscriminatedUnion<
            [
              z.ZodObject<
                {
                  type: z.ZodLiteral<"read">;
                  days: z.ZodNumber;
                  sessionsPerDay: z.ZodOptional<z.ZodNumber>;
                  segmentLabels: z.ZodOptional<
                    z.ZodNullable<z.ZodArray<z.ZodString>>
                  >;
                },
                z.core.$strip
              >,
              z.ZodObject<
                {
                  type: z.ZodLiteral<"skip">;
                  days: z.ZodNumber;
                },
                z.core.$strip
              >,
            ],
            "type"
          >
        >;
      },
      z.core.$strip
    >;
  },
  z.core.$strip
>;
export type CadenceOption = z.infer<typeof CadenceOptionSchema>;
export declare const PlanReadingSchema: z.ZodObject<
  {
    id: z.ZodString;
    item: z.ZodDiscriminatedUnion<
      [
        z.ZodObject<
          {
            type: z.ZodLiteral<"bible-verse">;
            ref: z.ZodObject<
              {
                bookId: z.ZodString;
                chapter: z.ZodNumber;
                endChapter: z.ZodOptional<z.ZodNumber>;
                verse: z.ZodOptional<z.ZodNumber>;
                endVerse: z.ZodOptional<z.ZodNumber>;
                toEndOfChapter: z.ZodOptional<z.ZodBoolean>;
              },
              z.core.$strip
            >;
            translationId: z.ZodOptional<z.ZodString>;
          },
          z.core.$strip
        >,
        z.ZodObject<
          {
            type: z.ZodLiteral<"html">;
            title: z.ZodOptional<z.ZodString>;
            html: z.ZodString;
          },
          z.core.$strip
        >,
        z.ZodObject<
          {
            type: z.ZodLiteral<"link">;
            title: z.ZodOptional<z.ZodString>;
            url: z.ZodURL;
            embed: z.ZodOptional<z.ZodBoolean>;
          },
          z.core.$strip
        >,
      ],
      "type"
    >;
  },
  z.core.$strip
>;
export type PlanReading = z.infer<typeof PlanReadingSchema>;
export declare const ReadingPlanSessionSchema: z.ZodObject<
  {
    id: z.ZodString;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    readings: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          item: z.ZodDiscriminatedUnion<
            [
              z.ZodObject<
                {
                  type: z.ZodLiteral<"bible-verse">;
                  ref: z.ZodObject<
                    {
                      bookId: z.ZodString;
                      chapter: z.ZodNumber;
                      endChapter: z.ZodOptional<z.ZodNumber>;
                      verse: z.ZodOptional<z.ZodNumber>;
                      endVerse: z.ZodOptional<z.ZodNumber>;
                      toEndOfChapter: z.ZodOptional<z.ZodBoolean>;
                    },
                    z.core.$strip
                  >;
                  translationId: z.ZodOptional<z.ZodString>;
                },
                z.core.$strip
              >,
              z.ZodObject<
                {
                  type: z.ZodLiteral<"html">;
                  title: z.ZodOptional<z.ZodString>;
                  html: z.ZodString;
                },
                z.core.$strip
              >,
              z.ZodObject<
                {
                  type: z.ZodLiteral<"link">;
                  title: z.ZodOptional<z.ZodString>;
                  url: z.ZodURL;
                  embed: z.ZodOptional<z.ZodBoolean>;
                },
                z.core.$strip
              >,
            ],
            "type"
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export type ReadingPlanSession = z.infer<typeof ReadingPlanSessionSchema>;
export declare const ReadingPlanMetadataSchema: z.ZodObject<
  {
    address: z.ZodString;
    recordName: z.ZodString;
    authorUserId: z.ZodString;
    locale: z.ZodString;
    title: z.ZodNullable<z.ZodString>;
    description: z.ZodNullable<z.ZodString>;
    cadenceOptions: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          label: z.ZodString;
          cadence: z.ZodObject<
            {
              segments: z.ZodArray<
                z.ZodDiscriminatedUnion<
                  [
                    z.ZodObject<
                      {
                        type: z.ZodLiteral<"read">;
                        days: z.ZodNumber;
                        sessionsPerDay: z.ZodOptional<z.ZodNumber>;
                        segmentLabels: z.ZodOptional<
                          z.ZodNullable<z.ZodArray<z.ZodString>>
                        >;
                      },
                      z.core.$strip
                    >,
                    z.ZodObject<
                      {
                        type: z.ZodLiteral<"skip">;
                        days: z.ZodNumber;
                      },
                      z.core.$strip
                    >,
                  ],
                  "type"
                >
              >;
            },
            z.core.$strip
          >;
        },
        z.core.$strip
      >
    >;
    defaultCadenceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    schemaVersion: z.ZodDefault<z.ZodNumber>;
    createdAtMs: z.ZodNumber;
    updatedAtMs: z.ZodNumber;
  },
  z.core.$strip
>;
export type ReadingPlanMetadata = z.infer<typeof ReadingPlanMetadataSchema>;
export declare const ReadingPlanSchema: z.ZodObject<
  {
    address: z.ZodString;
    recordName: z.ZodString;
    authorUserId: z.ZodString;
    locale: z.ZodString;
    title: z.ZodNullable<z.ZodString>;
    description: z.ZodNullable<z.ZodString>;
    cadenceOptions: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          label: z.ZodString;
          cadence: z.ZodObject<
            {
              segments: z.ZodArray<
                z.ZodDiscriminatedUnion<
                  [
                    z.ZodObject<
                      {
                        type: z.ZodLiteral<"read">;
                        days: z.ZodNumber;
                        sessionsPerDay: z.ZodOptional<z.ZodNumber>;
                        segmentLabels: z.ZodOptional<
                          z.ZodNullable<z.ZodArray<z.ZodString>>
                        >;
                      },
                      z.core.$strip
                    >,
                    z.ZodObject<
                      {
                        type: z.ZodLiteral<"skip">;
                        days: z.ZodNumber;
                      },
                      z.core.$strip
                    >,
                  ],
                  "type"
                >
              >;
            },
            z.core.$strip
          >;
        },
        z.core.$strip
      >
    >;
    defaultCadenceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    schemaVersion: z.ZodDefault<z.ZodNumber>;
    createdAtMs: z.ZodNumber;
    updatedAtMs: z.ZodNumber;
    sessions: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          readings: z.ZodArray<
            z.ZodObject<
              {
                id: z.ZodString;
                item: z.ZodDiscriminatedUnion<
                  [
                    z.ZodObject<
                      {
                        type: z.ZodLiteral<"bible-verse">;
                        ref: z.ZodObject<
                          {
                            bookId: z.ZodString;
                            chapter: z.ZodNumber;
                            endChapter: z.ZodOptional<z.ZodNumber>;
                            verse: z.ZodOptional<z.ZodNumber>;
                            endVerse: z.ZodOptional<z.ZodNumber>;
                            toEndOfChapter: z.ZodOptional<z.ZodBoolean>;
                          },
                          z.core.$strip
                        >;
                        translationId: z.ZodOptional<z.ZodString>;
                      },
                      z.core.$strip
                    >,
                    z.ZodObject<
                      {
                        type: z.ZodLiteral<"html">;
                        title: z.ZodOptional<z.ZodString>;
                        html: z.ZodString;
                      },
                      z.core.$strip
                    >,
                    z.ZodObject<
                      {
                        type: z.ZodLiteral<"link">;
                        title: z.ZodOptional<z.ZodString>;
                        url: z.ZodURL;
                        embed: z.ZodOptional<z.ZodBoolean>;
                      },
                      z.core.$strip
                    >,
                  ],
                  "type"
                >;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export type ReadingPlan = z.infer<typeof ReadingPlanSchema>;
export declare const SessionProgressSchema: z.ZodObject<
  {
    sessionId: z.ZodString;
    completedReadingIds: z.ZodArray<z.ZodString>;
    completedAtMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
  },
  z.core.$strip
>;
export type SessionProgress = z.infer<typeof SessionProgressSchema>;
export declare const ReadingPlanProgressSchema: z.ZodObject<
  {
    id: z.ZodString;
    planId: z.ZodString;
    recordName: z.ZodString;
    userId: z.ZodString;
    selectedCadenceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customCadence: z.ZodOptional<
      z.ZodNullable<
        z.ZodObject<
          {
            segments: z.ZodArray<
              z.ZodDiscriminatedUnion<
                [
                  z.ZodObject<
                    {
                      type: z.ZodLiteral<"read">;
                      days: z.ZodNumber;
                      sessionsPerDay: z.ZodOptional<z.ZodNumber>;
                      segmentLabels: z.ZodOptional<
                        z.ZodNullable<z.ZodArray<z.ZodString>>
                      >;
                    },
                    z.core.$strip
                  >,
                  z.ZodObject<
                    {
                      type: z.ZodLiteral<"skip">;
                      days: z.ZodNumber;
                    },
                    z.core.$strip
                  >,
                ],
                "type"
              >
            >;
          },
          z.core.$strip
        >
      >
    >;
    startedAtMs: z.ZodNumber;
    timeZone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sessions: z.ZodArray<
      z.ZodObject<
        {
          sessionId: z.ZodString;
          completedReadingIds: z.ZodArray<z.ZodString>;
          completedAtMs: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        },
        z.core.$strip
      >
    >;
    percentComplete: z.ZodDefault<z.ZodNumber>;
    totalSessions: z.ZodDefault<z.ZodNumber>;
    totalReadings: z.ZodDefault<z.ZodNumber>;
    createdAtMs: z.ZodNumber;
    updatedAtMs: z.ZodNumber;
  },
  z.core.$strip
>;
export type ReadingPlanProgress = z.infer<typeof ReadingPlanProgressSchema>;
export declare function formatReadingPlanId(
  recordName: string,
  address: string
): string;
/**
 * Creates a fresh progress record for a user starting a plan. `id` (unique) and
 * `nowMs` are passed in so this stays deterministic; the manager supplies them.
 * Stored in the user's record (`recordName = userId`) so it round-trips with
 * `loadReadingProgress`. The selected cadence falls back: explicit option →
 * plan default → first option → none.
 */
export declare function createReadingPlanProgress(
  plan: ReadingPlanMetadata,
  userId: string,
  id: string,
  nowMs: number,
  options?: {
    cadenceId?: string | null;
    customCadence?: Cadence | null;
    timeZone?: string | null;
  }
): ReadingPlanProgress;
/**
 * Creates a new, empty reading plan (no sessions). `address` and `nowMs` are
 * passed in so this stays deterministic. Defaults to a single daily cadence
 * option (a plan must offer at least one) and an "en" locale; all of these can
 * be overridden via `options`.
 */
export declare function createReadingPlan(
  recordName: string,
  authorUserId: string,
  address: string,
  nowMs: number,
  options?: {
    locale?: string;
    title?: string | null;
    description?: string | null;
    cadenceOptions?: CadenceOption[];
    defaultCadenceId?: string | null;
  }
): ReadingPlan;
/** A single scheduled reading slot. `sessionIndex` is the global session ordinal. */
export interface PlanSlot {
  /** Calendar date (UTC midnight) the session is due on. */
  date: Date;
  /** Whole-day offset from the start date. */
  dayOffset: number;
  /** 0-based ordinal of this session within its day (for multiple-per-day). */
  sessionOfDay: number;
}
/**
 * Resolves the cadence that actually applies to a user: a custom override wins,
 * then the user's selected option, then the plan default, then the first option.
 */
export declare function effectiveCadence(
  plan: ReadingPlan,
  progress: ReadingPlanProgress
): Cadence | null;
/**
 * Generates the first `count` calendar slots for a cadence, one slot per session,
 * in order. Returns fewer than `count` only if the cadence never reads (all skips).
 */
export declare function slotsForCadence(
  cadence: Cadence,
  startedAtMs: number,
  count: number
): PlanSlot[];
/**
 * The calendar date the Nth (0-based) session is due, given the cadence and start.
 * Day boundaries are resolved in `timeZone` (defaults to the local zone).
 * Returns null if the cadence never reads.
 */
export declare function dateForSession(
  cadence: Cadence,
  startedAtMs: number,
  sessionIndex: number,
  timeZone?: string | null
): CivilDate | null;
/**
 * The global session indices due on a given calendar date. Empty for skip days
 * or dates before the start. Day boundaries are resolved in `timeZone`
 * (defaults to the local zone). Inverse of `dateForSession`.
 */
export declare function sessionsForDate(
  cadence: Cadence,
  startedAtMs: number,
  dateMs: number,
  timeZone?: string | null
): number[];
/** True when every reading in the session has been completed. */
export declare function isSessionComplete(
  session: ReadingPlanSession,
  sessionProgress: SessionProgress | undefined
): boolean;
/** Aggregate completion counts across the whole plan. */
export declare function planCompletion(
  plan: ReadingPlan,
  progress: ReadingPlanProgress
): {
  doneSessions: number;
  totalSessions: number;
  doneReadings: number;
  totalReadings: number;
};
/**
 * Recomputes the derived stats (`percentComplete` by readings, plus the plan's
 * `totalSessions`/`totalReadings`) onto the progress so consumers can show
 * progress without loading the plan. Purely derived — leaves `updatedAtMs`.
 */
export declare function withProgressStats(
  plan: ReadingPlan,
  progress: ReadingPlanProgress
): ReadingPlanProgress;
/**
 * Marks a single reading (item) within a session complete (`complete`, default)
 * or incomplete. Completing the last reading sets the session's `completedAtMs`
 * (an existing one is preserved); marking any reading incomplete clears it. A
 * `readingId` that doesn't belong to the session — or undoing one that was never
 * complete — is a no-op (returns the same progress).
 */
export declare function markReadingCompleteInProgress(
  progress: ReadingPlanProgress,
  session: ReadingPlanSession,
  readingId: string,
  nowMs: number,
  complete?: boolean
): ReadingPlanProgress;
/**
 * Marks an entire session complete (`complete`, default — every reading plus a
 * completion time) or incomplete (clears every reading and the completion time).
 * Undoing a session that has no recorded progress is a no-op.
 */
export declare function markSessionCompleteInProgress(
  progress: ReadingPlanProgress,
  session: ReadingPlanSession,
  nowMs: number,
  complete?: boolean
): ReadingPlanProgress;
/**
 * Marks every session on a calendar day complete (`complete`, default) or
 * incomplete (clears all sessions and their readings).
 */
export declare function markDayCompleteInProgress(
  progress: ReadingPlanProgress,
  day: CalendarReadingDay,
  nowMs: number,
  complete?: boolean
): ReadingPlanProgress;
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
export declare function getReadingCalendar(
  plan: ReadingPlan,
  progress: ReadingPlanProgress,
  nowMs: number
): ReadingCalendarEntry[];
export declare function createReadingPlansManager(
  os: CasualOSManager,
  login: LoginManager
): {
  userReadingPlanProgresses: import("@preact/signals").Signal<
    {
      id: string;
      planId: string;
      recordName: string;
      userId: string;
      startedAtMs: number;
      sessions: {
        sessionId: string;
        completedReadingIds: string[];
        completedAtMs?: number | null | undefined;
      }[];
      percentComplete: number;
      totalSessions: number;
      totalReadings: number;
      createdAtMs: number;
      updatedAtMs: number;
      selectedCadenceId?: string | null | undefined;
      customCadence?:
        | {
            segments: (
              | {
                  type: "read";
                  days: number;
                  sessionsPerDay?: number | undefined;
                  segmentLabels?: string[] | null | undefined;
                }
              | {
                  type: "skip";
                  days: number;
                }
            )[];
          }
        | null
        | undefined;
      timeZone?: string | null | undefined;
    }[]
  >;
  userReadingPlans: import("@preact/signals").Signal<
    {
      address: string;
      recordName: string;
      authorUserId: string;
      locale: string;
      title: string | null;
      description: string | null;
      cadenceOptions: {
        id: string;
        label: string;
        cadence: {
          segments: (
            | {
                type: "read";
                days: number;
                sessionsPerDay?: number | undefined;
                segmentLabels?: string[] | null | undefined;
              }
            | {
                type: "skip";
                days: number;
              }
          )[];
        };
      }[];
      schemaVersion: number;
      createdAtMs: number;
      updatedAtMs: number;
      defaultCadenceId?: string | null | undefined;
    }[]
  >;
  selectedReadingPlan: import("@preact/signals").Signal<{
    address: string;
    recordName: string;
    authorUserId: string;
    locale: string;
    title: string | null;
    description: string | null;
    cadenceOptions: {
      id: string;
      label: string;
      cadence: {
        segments: (
          | {
              type: "read";
              days: number;
              sessionsPerDay?: number | undefined;
              segmentLabels?: string[] | null | undefined;
            }
          | {
              type: "skip";
              days: number;
            }
        )[];
      };
    }[];
    schemaVersion: number;
    createdAtMs: number;
    updatedAtMs: number;
    sessions: {
      id: string;
      readings: {
        id: string;
        item:
          | {
              type: "bible-verse";
              ref: {
                bookId: string;
                chapter: number;
                endChapter?: number | undefined;
                verse?: number | undefined;
                endVerse?: number | undefined;
                toEndOfChapter?: boolean | undefined;
              };
              translationId?: string | undefined;
            }
          | {
              type: "html";
              html: string;
              title?: string | undefined;
            }
          | {
              type: "link";
              url: string;
              title?: string | undefined;
              embed?: boolean | undefined;
            };
      }[];
      title?: string | null | undefined;
    }[];
    defaultCadenceId?: string | null | undefined;
  } | null>;
  selectReadingPlan: (plan: ReadingPlanMetadata | null) => Promise<void>;
  saveReadingPlan: (plan: ReadingPlan) => Promise<void>;
  selectedReadingPlanProgress: import("@preact/signals").Signal<{
    id: string;
    planId: string;
    recordName: string;
    userId: string;
    startedAtMs: number;
    sessions: {
      sessionId: string;
      completedReadingIds: string[];
      completedAtMs?: number | null | undefined;
    }[];
    percentComplete: number;
    totalSessions: number;
    totalReadings: number;
    createdAtMs: number;
    updatedAtMs: number;
    selectedCadenceId?: string | null | undefined;
    customCadence?:
      | {
          segments: (
            | {
                type: "read";
                days: number;
                sessionsPerDay?: number | undefined;
                segmentLabels?: string[] | null | undefined;
              }
            | {
                type: "skip";
                days: number;
              }
          )[];
        }
      | null
      | undefined;
    timeZone?: string | null | undefined;
  } | null>;
  selectReadingPlanProgress: (
    progress: ReadingPlanProgress | null
  ) => Promise<void>;
  selectedReadingPlanProgressCalendar: import("@preact/signals").ReadonlySignal<
    ReadingCalendarEntry[]
  >;
  startReadingPlan: (
    plan: ReadingPlanMetadata,
    options?: {
      cadenceId?: string | null;
      customCadence?: Cadence | null;
      timeZone?: string | null;
    }
  ) => Promise<ReadingPlanProgress>;
  markReadingComplete: (
    session: ReadingPlanSession,
    readingId: string,
    complete?: boolean
  ) => Promise<void>;
  markSessionComplete: (
    session: ReadingPlanSession,
    complete?: boolean
  ) => Promise<void>;
  markDayComplete: (
    day: CalendarReadingDay,
    complete?: boolean
  ) => Promise<void>;
  createNewReadingPlan: (options?: {
    title?: string | null;
    description?: string | null;
    locale?: string;
    cadenceOptions?: CadenceOption[];
    defaultCadenceId?: string | null;
  }) => Promise<ReadingPlan>;
  addSessionToReadingPlan: (
    plan: ReadingPlan,
    session: ReadingPlanSession
  ) => Promise<ReadingPlan>;
  canEditSelectedPlan: import("@preact/signals").ReadonlySignal<boolean>;
};
export type ReadingPlansManager = ReturnType<typeof createReadingPlansManager>;
