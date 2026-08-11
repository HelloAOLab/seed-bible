import { planQueueStartIndex } from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/planQueue";
import type { DayReading } from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/planQueue";
import type {
  PlanReading,
  ReadingPlanSession,
  SessionProgress,
} from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import { describe, expect, it } from "vitest";

/** A scripture reading covering `chapter`, or `chapter`..`endChapter`. */
function scripture(
  id: string,
  chapter: number,
  endChapter?: number
): PlanReading {
  return {
    id,
    item: {
      type: "bible-verse",
      ref: { bookId: "GEN", chapter, ...(endChapter ? { endChapter } : {}) },
    },
  } as PlanReading;
}

/** A non-scripture reading — one queue step, no chapters. */
function note(id: string): PlanReading {
  return {
    id,
    item: { type: "html", html: "<p>Reflect.</p>" },
  } as PlanReading;
}

/** Puts a day's readings in one session, as `ReadingPlanDetail` hands them over. */
function day(...readings: PlanReading[]): DayReading[] {
  const session = { id: "session-1", readings } as ReadingPlanSession;
  return readings.map((reading) => ({ session, reading }));
}

/**
 * Progress lookups over a fixture: `doneReadingIds` are finished outright,
 * `partialChapters` records individual chapters read within a reading.
 */
function progress(options: {
  doneReadingIds?: string[];
  partialChapters?: { readingId: string; chapters: number[] }[];
}) {
  const sessionProgress = {
    sessionId: "session-1",
    completedReadingIds: options.doneReadingIds ?? [],
    partialChapters: options.partialChapters ?? [],
    completedAtMs: null,
  } as unknown as SessionProgress;
  return {
    isReadingDone: (_sessionId: string, readingId: string) =>
      (options.doneReadingIds ?? []).includes(readingId),
    sessionProgressFor: () => sessionProgress,
  };
}

describe("planQueueStartIndex", () => {
  it("starts at the top when nothing has been read", () => {
    const readings = day(scripture("r1", 1, 3), scripture("r2", 10));
    expect(planQueueStartIndex(readings, progress({}))).toBe(0);
  });

  it("counts a finished multi-chapter reading as one step per chapter", () => {
    // Genesis 1-3 is three queue steps, so the next reading starts at step 3 —
    // counting readings would have started playback at Genesis 2.
    const readings = day(scripture("r1", 1, 3), scripture("r2", 10));
    expect(
      planQueueStartIndex(readings, progress({ doneReadingIds: ["r1"] }))
    ).toBe(3);
  });

  it("resumes inside a part-read reading at its first unread chapter", () => {
    // Six chapters of a ten-chapter reading are read, so playback picks up at
    // chapter seven — step 6.
    const readings = day(scripture("r1", 1, 10));
    expect(
      planQueueStartIndex(
        readings,
        progress({
          partialChapters: [{ readingId: "r1", chapters: [1, 2, 3, 4, 5, 6] }],
        })
      )
    ).toBe(6);
  });

  it("adds up several finished readings before a part-read one", () => {
    const readings = day(
      scripture("r1", 1, 2), // 2 steps
      note("r2"), // 1 step
      scripture("r3", 5, 8) // 4 steps, partly read
    );
    expect(
      planQueueStartIndex(
        readings,
        progress({
          doneReadingIds: ["r1", "r2"],
          partialChapters: [{ readingId: "r3", chapters: [5] }],
        })
      )
    ).toBe(4); // 2 + 1, then one chapter into r3
  });

  it("treats a non-scripture reading as a single step", () => {
    const readings = day(note("r1"), scripture("r2", 4));
    expect(
      planQueueStartIndex(readings, progress({ doneReadingIds: ["r1"] }))
    ).toBe(1);
  });

  it("starts a fully-read day over from the top", () => {
    const readings = day(scripture("r1", 1, 3), note("r2"));
    expect(
      planQueueStartIndex(readings, progress({ doneReadingIds: ["r1", "r2"] }))
    ).toBe(0);
  });

  it("starts a reading at its first step when it has no unread chapter", () => {
    // An inconsistent state that shouldn't arise — the manager promotes a
    // reading to complete (and clears its partials) once every chapter is
    // recorded — so this just documents the safe fallback: the reading's own
    // beginning, never past it into the following reading.
    const readings = day(scripture("r1", 1, 3), scripture("r2", 9));
    expect(
      planQueueStartIndex(
        readings,
        progress({
          partialChapters: [{ readingId: "r1", chapters: [1, 2, 3] }],
        })
      )
    ).toBe(0);
  });

  it("returns 0 for an empty day", () => {
    expect(planQueueStartIndex([], progress({}))).toBe(0);
  });
});
