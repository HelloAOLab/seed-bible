/**
 * Who may follow whom in a shared session, chosen by the host.
 *
 * - `everyone`: anyone can follow anyone. Nobody is followed on join.
 * - `hosts-only`: anyone can follow a host or co-host. Nobody is followed on join.
 * - `auto-host`: same as `everyone`, and each person follows the host when they join.
 * - `off`: following is unavailable.
 */
export const FOLLOW_MODES = [
  "everyone",
  "hosts-only",
  "auto-host",
  "off",
] as const;

export type FollowMode = (typeof FOLLOW_MODES)[number];

export const DEFAULT_FOLLOW_MODE: FollowMode = "everyone";

/** How long a scroll must stay outside the leader's verses before follow lets go. */
export const FOLLOW_DETACH_MS = 200;

/**
 * Ignore untrusted scroll events for this long after we move the reader
 * ourselves. A follow alignment fires a scroll event; treating that as the
 * user leaving would detach them from the person they just caught up to.
 */
export const FOLLOW_SCROLL_IGNORE_MS = 400;

export function parseFollowMode(value: unknown): FollowMode {
  return typeof value === "string" &&
    (FOLLOW_MODES as readonly string[]).includes(value)
    ? (value as FollowMode)
    : DEFAULT_FOLLOW_MODE;
}

export interface VerseSpan {
  first: number;
  last: number;
}

/** True when the two spans share at least one verse. */
export function verseSpansOverlap(left: VerseSpan, right: VerseSpan): boolean {
  return left.last >= right.first && left.first <= right.last;
}

/**
 * The verse a follower should pin to the top of their screen.
 *
 * Starts as the leader's first visible verse. A verse the follower has
 * already chosen stays put while it is still inside the leader's span, so a
 * reader who can see fewer verses than the leader is not snapped back to the
 * top of that span on every update. `reset` drops the choice — a new chapter,
 * or resume — and pins to the leader's first verse again.
 *
 * No span yet (the leader has only reported a chapter) keeps the previous
 * choice, unless this is a reset, in which case there is nothing to pin to.
 */
export function followAnchorForLeader(
  span: VerseSpan | null,
  anchorVerse: number | null,
  reset: boolean
): number | null {
  if (!span) {
    return reset ? null : anchorVerse;
  }
  if (
    !reset &&
    anchorVerse !== null &&
    anchorVerse >= span.first &&
    anchorVerse <= span.last
  ) {
    return anchorVerse;
  }
  return span.first;
}

export function canFollowParticipant(input: {
  mode: FollowMode;
  isSelf: boolean;
  targetIsHost: boolean;
}): boolean {
  if (input.isSelf || input.mode === "off") {
    return false;
  }
  if (input.mode === "hosts-only") {
    return input.targetIsHost;
  }
  return true;
}

export interface LeaderReadingPosition {
  bookId: string;
  chapterNumber: number;
  firstVerse?: number;
  lastVerse?: number;
}

export function leaderVerseSpan(
  position: LeaderReadingPosition
): VerseSpan | null {
  const { firstVerse, lastVerse } = position;
  if (
    firstVerse === undefined ||
    lastVerse === undefined ||
    lastVerse < firstVerse
  ) {
    return null;
  }
  return { first: firstVerse, last: lastVerse };
}

export type FollowScrollDecision =
  | { action: "keep"; anchorVerse: number | null }
  | { action: "pause" };

/**
 * What a hand scroll does to an active follow.
 *
 * Overlap keeps the follow. When the follower's top verse sits inside the
 * leader's span, that verse becomes the anchor. When the follower can see
 * the leader's first verse plus verses above it, the anchor stays on the
 * leader's first verse — seeing more than them is not leaving.
 *
 * No overlap, or a different book or chapter, pauses. A missing range does
 * not: the reader is between measurements, which happens on every chapter
 * change, and that must not look like the user walked away.
 */
export function followAfterUserScroll(input: {
  anchorVerse: number | null;
  leader: LeaderReadingPosition | null;
  localBookId: string | null;
  localChapter: number;
  localRange: VerseSpan | null;
}): FollowScrollDecision {
  const { leader, localBookId, localChapter, localRange, anchorVerse } = input;
  if (!leader) {
    return { action: "keep", anchorVerse };
  }
  if (localBookId !== leader.bookId || localChapter !== leader.chapterNumber) {
    return { action: "pause" };
  }
  const span = leaderVerseSpan(leader);
  if (!span || !localRange) {
    return { action: "keep", anchorVerse };
  }
  if (!verseSpansOverlap(localRange, span)) {
    return { action: "pause" };
  }
  if (localRange.first >= span.first && localRange.first <= span.last) {
    return { action: "keep", anchorVerse: localRange.first };
  }
  return { action: "keep", anchorVerse: span.first };
}
