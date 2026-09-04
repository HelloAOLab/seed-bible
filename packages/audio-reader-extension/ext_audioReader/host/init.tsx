import { computed, effect, signal } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import type {
  BibleReadingState,
  ChapterVerse,
  QuickToolContext,
  TranslationBookChapter,
} from "seed-bible/managers";

/** Drives the icon swap between play and pause. Shared across the tool. */
const isPlaying = signal(false);

/**
 * How far ahead of a verse's actual start time its highlight is triggered, in
 * seconds. The "diminish" decoration fades in over a CSS transition rather
 * than snapping on, so starting it exactly at the verse's start time would
 * make the highlight visibly lag the narration; starting it slightly early
 * lands the transition right as the verse begins. The outgoing verse's own
 * fade-out isn't shifted — see {@link verseHighlightDurationMs} — so the two
 * verses briefly overlap (new one fading in, old one still fully lit) instead
 * of one flickering hole opening up between them.
 */
const VERSE_HIGHLIGHT_LEAD_IN_SECONDS = 0.3;

/** Lazily-created shared audio element and the URL currently loaded into it. */
let audioEl: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

/**
 * The verse-timing data driving the "now reading" highlight for whatever
 * chapter/reader is currently loaded into `audioEl`, or null when nothing is
 * tracked — either nothing is playing, or the chapter has no timing data for
 * the reader in use.
 */
interface VerseTimingTrack {
  readingState: BibleReadingState;
  bookId: string;
  chapterNumber: number;
  /** Verse numbers in reading order, aligned index-for-index with `startTimes`. */
  verseNumbers: number[];
  /** Cumulative seconds (from the start of the audio) at which each verse starts. */
  startTimes: number[];
  /** The verse most recently highlighted, so the same verse isn't re-flashed every tick. */
  lastVerse: number | null;
  /** `startTimes`/`verseNumbers` index of `lastVerse`, so pause/resume can recompute its fade-out. */
  verseIndex: number | null;
  /**
   * The id of `lastVerse`'s decoration, or null when nothing is currently
   * shown (e.g. paused — see `pauseVerseHighlight`). Tracked so pausing knows
   * which decoration to remove, and so resuming knows whether to create a
   * fresh one or update the one already on screen.
   */
  currentDecorationId: string | null;
}
let verseTrack: VerseTimingTrack | null = null;
/**
 * Bumped every time `verseTrack` is invalidated (a fresh play, a new chapter)
 * so an in-flight `loadVerseTrack` fetch that resolves after the fact can
 * tell its answer is stale and skip clobbering whatever came after it.
 */
let verseTrackToken = 0;

/**
 * The verse being read at `currentTime`, as an index into `startTimes` (and
 * therefore `verseNumbers`) — the last verse whose start time has already
 * passed, or -1 before the first verse's start time (e.g. a lead-in before
 * the reading begins).
 */
export function verseIndexForTime(
  startTimes: number[],
  currentTime: number
): number {
  for (let index = startTimes.length - 1; index >= 0; index--) {
    const startTime = startTimes[index];
    if (startTime !== undefined && currentTime >= startTime) {
      return index;
    }
  }
  return -1;
}

/**
 * How long the verse at `startTimes[index]` should stay highlighted from
 * `currentTime`, in milliseconds: until the next verse actually starts, or —
 * for the last verse — until the audio ends. Measured from `currentTime`
 * rather than `startTimes[index]` itself so it stays correct regardless of
 * when the highlight was actually triggered — in particular, {@link
 * VERSE_HIGHLIGHT_LEAD_IN_SECONDS} early. Null when neither a next verse nor
 * the audio's duration is known, so the caller leaves the highlight in place
 * rather than guessing.
 */
export function verseHighlightDurationMs(
  startTimes: number[],
  index: number,
  currentTime: number,
  audioDurationSeconds: number | undefined
): number | null {
  const nextStartTime = startTimes[index + 1];
  const endTime =
    nextStartTime !== undefined
      ? nextStartTime
      : Number.isFinite(audioDurationSeconds)
        ? audioDurationSeconds
        : undefined;
  if (endTime === undefined) return null;

  return Math.max(0, (endTime - currentTime) * 1000);
}

/** Verse numbers in reading order, extracted from a chapter's content. */
export function chapterVerseNumbers(chapter: TranslationBookChapter): number[] {
  return chapter.chapter.content
    .filter((item): item is ChapterVerse => item.type === "verse")
    .map((verse) => verse.number);
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "none";
    audioEl.onplay = () => {
      isPlaying.value = true;
      if (audioEl) resumeVerseHighlight(audioEl.currentTime);
    };
    audioEl.onpause = () => {
      isPlaying.value = false;
      // The end of a chapter fires `pause` immediately before `ended` (per the
      // media spec) — that's the highlight finishing on schedule, not a user
      // pause, so it should fade out as already arranged rather than freeze.
      if (!audioEl?.ended) pauseVerseHighlight();
    };
    audioEl.onended = () => {
      isPlaying.value = false;
      if (audioEl) audioEl.currentTime = 0;
      // A replay should fetch timings and highlight from verse one again, not
      // resume mid-track from whatever verse was last read.
      verseTrack = null;
      verseTrackToken++;
    };
    audioEl.ontimeupdate = () => {
      if (audioEl) highlightVerseForTime(audioEl.currentTime);
    };
  }
  return audioEl;
}

/**
 * Diminishes the rest of the chapter to spotlight the verse being read at
 * `currentTime`, using the same "diminish" flash `emphasizeVerses` (in
 * `BibleReadingManager`) uses for cross-reference/search-result jumps. Reused
 * here rather than duplicated so a verse-boundary crossing flashes the same
 * way a manual jump does. Unlike those callers' fixed 3s fade, this one fades
 * out exactly when the next verse actually starts — or, for the last verse,
 * when the audio ends — so the highlight tracks the actual reading instead of
 * an arbitrary timeout. The new verse itself is triggered
 * {@link VERSE_HIGHLIGHT_LEAD_IN_SECONDS} early so its fade-in lands on time,
 * while the verse it's replacing keeps its own fade-out anchored to the real
 * boundary, so the two overlap rather than leaving a gap.
 */
function highlightVerseForTime(currentTime: number): void {
  if (!verseTrack || !Number.isFinite(currentTime)) return;
  const { readingState, bookId, chapterNumber, verseNumbers, startTimes } =
    verseTrack;
  if (startTimes.length === 0) return;

  const index = verseIndexForTime(
    startTimes,
    currentTime + VERSE_HIGHLIGHT_LEAD_IN_SECONDS
  );
  const verseNumber = verseNumbers[index];
  if (verseNumber === undefined || verseNumber === verseTrack.lastVerse) {
    return;
  }
  verseTrack.lastVerse = verseNumber;
  verseTrack.verseIndex = index;

  const durationMs = verseHighlightDurationMs(
    startTimes,
    index,
    currentTime,
    audioEl?.duration
  );

  verseTrack.currentDecorationId = readingState.decorateVerses(
    bookId,
    chapterNumber,
    [verseNumber],
    {
      className: "sb-verse-decoration-diminish",
      containerClassName: "sb-chapter-decoration-diminish",
      ...(durationMs !== null ? { removeAfterMs: durationMs } : {}),
    }
  );
}

/**
 * Clears the current verse's highlight when playback is paused, rather than
 * leaving it lit (which would otherwise fade out on a wall-clock timer that
 * keeps running while the audio doesn't — see `resumeVerseHighlight`).
 *
 * There's no "stop" affordance yet distinct from "pause", so this is the only
 * option that doesn't leave a highlight stuck on screen indefinitely if the
 * user pauses and never resumes. Once the player grows real transport
 * controls, pausing should instead freeze the highlight in place (re-issuing
 * the same decoration id with no `removeAfterMs`, the way `resumeVerseHighlight`
 * already re-arms it) and only a "stop" should clear it.
 */
function pauseVerseHighlight(): void {
  if (!verseTrack || verseTrack.currentDecorationId === null) return;
  verseTrack.readingState.removeDecoration(verseTrack.currentDecorationId);
  verseTrack.currentDecorationId = null;
}

/**
 * Re-lights the current verse when playback resumes — `pauseVerseHighlight`
 * clears it on pause, so without this the reader would sit unhighlighted
 * until the *next* verse starts. Schedules its fade-out from `currentTime`
 * (the position playback resumed from) rather than the verse's original start
 * time, so it still fades out when the next verse actually starts rather than
 * however long after resuming that the verse's full duration would imply.
 */
function resumeVerseHighlight(currentTime: number): void {
  if (
    !verseTrack ||
    verseTrack.lastVerse === null ||
    verseTrack.verseIndex === null ||
    !Number.isFinite(currentTime)
  ) {
    return;
  }
  const {
    readingState,
    bookId,
    chapterNumber,
    lastVerse,
    verseIndex,
    startTimes,
    currentDecorationId,
  } = verseTrack;

  const durationMs = verseHighlightDurationMs(
    startTimes,
    verseIndex,
    currentTime,
    audioEl?.duration
  );

  verseTrack.currentDecorationId = readingState.decorateVerses(
    bookId,
    chapterNumber,
    [lastVerse],
    {
      className: "sb-verse-decoration-diminish",
      containerClassName: "sb-chapter-decoration-diminish",
      ...(durationMs !== null ? { removeAfterMs: durationMs } : {}),
    },
    currentDecorationId ?? undefined
  );
}

/**
 * Fetches the reader's per-verse timings for the chapter currently loaded
 * into `readingState` and starts tracking them, so subsequent `timeupdate`
 * ticks can highlight along. Does nothing (leaves `verseTrack` null) when the
 * chapter has no timing link for this reader — an older translation, or an
 * offline-downloaded chapter, which carries no such link — so playback still
 * works, just without the highlight.
 */
async function loadVerseTrack(
  bibleData: SeedBibleState["bibleData"],
  readingState: BibleReadingState,
  reader: string
): Promise<void> {
  const chapterData = readingState.chapterData.value;
  const timingsLink = chapterData?.thisChapterAudioTimings[reader];
  if (!chapterData || !timingsLink) return;

  const token = ++verseTrackToken;
  let timings;
  try {
    timings = await bibleData.getAudioTimings(
      readingState.translationId.value,
      timingsLink
    );
  } catch {
    return;
  }

  // Something else (a new chapter, a fresh play) invalidated tracking while
  // this fetch was in flight — don't let a stale response clobber it.
  if (token !== verseTrackToken) return;

  verseTrack = {
    readingState,
    bookId: chapterData.book.id,
    chapterNumber: chapterData.chapter.number,
    verseNumbers: chapterVerseNumbers(chapterData),
    startTimes: timings.verses,
    lastVerse: null,
    verseIndex: null,
    currentDecorationId: null,
  };
}

/**
 * First available reader for the chapter in view, or null. The Bible API
 * exposes `thisChapterAudioLinks` as a `{ reader: url }` map (e.g. gilbert /
 * hays / souer); we just take the first non-empty entry, and look up that
 * same reader's timings (if any) under the matching key.
 */
function chapterAudioReader(
  readingState: BibleReadingState
): { reader: string; url: string } | null {
  const links = readingState.chapterData.value?.thisChapterAudioLinks;
  if (!links) return null;
  const entry = Object.entries(links).find(([, url]) => !!url);
  return entry ? { reader: entry[0], url: entry[1] } : null;
}

/**
 * Hidden from the quick toolbar on mobile since the mobile nav bar
 * (BibleReaderToolbar) is its home there.
 */
export function isAudioPlayToolVisible(ctx: QuickToolContext): boolean {
  return (
    !ctx.playlists.playing.value &&
    chapterAudioReader(ctx.readingState) !== null &&
    (ctx.surface !== "quick-toolbar" || !ctx.playlists.isMobile.value)
  );
}

function PlayIcon() {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx={18}
        cy={18}
        r={18}
        fill="#e07b4c"
        style={{ fill: "var(--sb-primary-color, #e07b4c)" }}
      />
      <path
        d="M14 25V11L25 18L14 25Z"
        fill="#fff"
        style={{ fill: "var(--sb-primary-font-color, #fff)" }}
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx={18}
        cy={18}
        r={18}
        fill="#e07b4c"
        style={{ fill: "var(--sb-primary-color, #e07b4c)" }}
      />
      <rect
        x={13}
        y={11}
        width={3.5}
        height={14}
        rx={1}
        fill="#fff"
        style={{ fill: "var(--sb-primary-font-color, #fff)" }}
      />
      <rect
        x={19.5}
        y={11}
        width={3.5}
        height={14}
        rx={1}
        fill="#fff"
        style={{ fill: "var(--sb-primary-font-color, #fff)" }}
      />
    </svg>
  );
}

export default function initAudioReaderExtension() {
  registerExtension({
    id: "ext_audioReader",
    init: function* (context: SeedBibleState) {
      yield context.tools.registerQuickTool({
        id: "ext_audioReader-play",
        priority: 250,
        title: {
          key: "toolbarTitle",
          defaultValue: "Listen",
          ns: "ext_audioReader",
        },
        icon: () => (isPlaying.value ? <PauseIcon /> : <PlayIcon />),
        isVisible: (ctx) => computed(() => isAudioPlayToolVisible(ctx)),
        onSelect: (ctx) => {
          const chapterAudio = chapterAudioReader(ctx.readingState);
          if (!chapterAudio) {
            context.app.toast("No audio is available for this chapter.");
            return;
          }
          const el = ensureAudio();
          if (!el) return;
          if (currentUrl !== chapterAudio.url) {
            el.src = chapterAudio.url;
            currentUrl = chapterAudio.url;
            verseTrack = null;
            verseTrackToken++;
          }
          if (el.paused) {
            if (!verseTrack) {
              void loadVerseTrack(
                context.bibleData,
                ctx.readingState,
                chapterAudio.reader
              );
            }
            void el.play();
          } else {
            el.pause();
          }
        },
      });

      // Stop and rewind whenever the active chapter changes so a previous
      // chapter's narration never keeps playing under a new one.
      yield effect(() => {
        // Reading `.value` subscribes this effect to chapter navigation.
        void context.app.currentReadingState.value;
        if (audioEl && !audioEl.paused) {
          audioEl.pause();
          audioEl.currentTime = 0;
        }
        isPlaying.value = false;
        verseTrack = null;
        verseTrackToken++;
      });
    },
  });
}
