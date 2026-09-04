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
 * How long the verse at `startTimes[index]` should stay highlighted, in
 * milliseconds: until the next verse starts, or — for the last verse — until
 * the audio ends. Null when neither is known (no next verse and the audio's
 * duration hasn't loaded yet), so the caller leaves the highlight in place
 * rather than guessing.
 */
export function verseHighlightDurationMs(
  startTimes: number[],
  index: number,
  audioDurationSeconds: number | undefined
): number | null {
  const startTime = startTimes[index];
  if (startTime === undefined) return null;

  const nextStartTime = startTimes[index + 1];
  const endTime =
    nextStartTime !== undefined
      ? nextStartTime
      : Number.isFinite(audioDurationSeconds)
        ? audioDurationSeconds
        : undefined;
  if (endTime === undefined) return null;

  return Math.max(0, (endTime - startTime) * 1000);
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
    };
    audioEl.onpause = () => {
      isPlaying.value = false;
    };
    audioEl.onended = () => {
      isPlaying.value = false;
      if (audioEl) audioEl.currentTime = 0;
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
 * out exactly when the next verse starts — or, for the last verse, when the
 * audio ends — so the highlight tracks the actual reading instead of an
 * arbitrary timeout.
 */
function highlightVerseForTime(currentTime: number): void {
  if (!verseTrack || !Number.isFinite(currentTime)) return;
  const { readingState, bookId, chapterNumber, verseNumbers, startTimes } =
    verseTrack;
  if (startTimes.length === 0) return;

  const index = verseIndexForTime(startTimes, currentTime);
  const verseNumber = verseNumbers[index];
  if (verseNumber === undefined || verseNumber === verseTrack.lastVerse) {
    return;
  }
  verseTrack.lastVerse = verseNumber;

  const durationMs = verseHighlightDurationMs(
    startTimes,
    index,
    audioEl?.duration
  );

  readingState.decorateVerses(bookId, chapterNumber, [verseNumber], {
    className: "sb-verse-decoration-diminish",
    containerClassName: "sb-chapter-decoration-diminish",
    ...(durationMs !== null ? { removeAfterMs: durationMs } : {}),
  });
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
