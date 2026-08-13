import {
  isReadingChapterComplete,
  readingChapters,
  type PlanReading,
  type ReadingPlanSession,
  type SessionProgress,
} from "../../managers/ReadingPlansManager";
import { expandCrossChapterItem } from "../../managers/PlaylistManager";

/** One of a day's readings, paired with the session it came from. */
export interface DayReading {
  session: ReadingPlanSession;
  reading: PlanReading;
}

/** Progress lookups the start position depends on. */
export interface PlanQueueProgress {
  /** Whether the whole reading is finished. */
  isReadingDone: (sessionId: string, readingId: string) => boolean;
  /** The stored progress for a session, if the user has any. */
  sessionProgressFor: (sessionId: string) => SessionProgress | undefined;
}

/**
 * Where playback should start when a day is read straight through.
 *
 * The reader's queue holds one step per *chapter*, not one per reading — a
 * five-chapter reading becomes five steps (see `expandCrossChapterItem`). So the
 * position has to be counted in those steps: add up the steps of every finished
 * reading, then skip the chapters already read inside the first unfinished one.
 * Counting readings instead lands somewhere in the middle of an earlier reading
 * as soon as the day contains a multi-chapter one.
 *
 * A day that is already fully read starts over from the top rather than at its
 * last chapter.
 */
export function planQueueStartIndex(
  readings: DayReading[],
  progress: PlanQueueProgress
): number {
  const firstUnread = readings.findIndex(
    ({ session, reading }) => !progress.isReadingDone(session.id, reading.id)
  );
  if (firstUnread < 0) {
    return 0;
  }

  let startIndex = readings
    .slice(0, firstUnread)
    .reduce(
      (steps, { reading }) =>
        steps + expandCrossChapterItem(reading.item).length,
      0
    );

  const { session, reading } = readings[firstUnread]!;
  const sessionProgress = progress.sessionProgressFor(session.id);
  const unreadChapter = readingChapters(reading).findIndex(
    (chapter) => !isReadingChapterComplete(sessionProgress, reading.id, chapter)
  );
  // Clamped to the reading's own steps: a text or link reading is a single step
  // with no chapters, and a corrupt chapter range can report more chapters than
  // the queue expands to. `-1` (no unread chapter — a text reading, or a
  // scripture reading whose chapters are all recorded even though the reading
  // itself isn't marked complete) falls back to the reading's first step.
  const steps = expandCrossChapterItem(reading.item).length;
  startIndex += Math.min(Math.max(unreadChapter, 0), steps - 1);

  return startIndex;
}
