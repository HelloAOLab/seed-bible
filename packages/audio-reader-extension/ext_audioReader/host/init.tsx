import { computed, effect, signal } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import type { BibleReadingState, QuickToolContext } from "seed-bible/managers";

/** Drives the icon swap between play and pause. Shared across the tool. */
const isPlaying = signal(false);

/** Lazily-created shared audio element and the URL currently loaded into it. */
let audioEl: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

/** The chapter whose narration is loaded into that element, if any. */
let currentChapter: ListeningTarget | null = null;

/**
 * Set for as long as the extension is installed. The recorder writes through
 * this rather than holding onto the manager, because the audio element outlives
 * any one install and an uninstalled extension must stop recording.
 */
let saveListeningSpan: SaveListeningSpan | null = null;

/** The chapter a stretch of listening is credited to. */
export interface ListeningTarget {
  bookId: string;
  chapter: number;
}

/** Credits `[startTimeSeconds, endTimeSeconds]` of listening to a chapter. */
export type SaveListeningSpan = (
  bookId: string,
  chapter: number,
  startTimeSeconds: number,
  endTimeSeconds: number
) => void;

/** An uninterrupted stretch of playback, anchored to both clocks at its start. */
interface ListeningRun {
  target: ListeningTarget;
  /** The wall clock, in ms, when the stretch began. */
  startWallMs: number;
  /** Where the audio element's own clock, in seconds, stood at that moment. */
  startAudioSeconds: number;
}

/** How much wall time may pass between saves during continuous playback. */
const SAVE_INTERVAL_MS = 15_000;

export interface ListeningRecorderOptions {
  /** The chapter currently loaded into the element, or null if unknown. */
  getTarget: () => ListeningTarget | null;
  saveSpan: SaveListeningSpan;
  /** The clock to measure against. Injectable so tests can drive it. */
  now?: () => number;
}

/**
 * Credits time spent listening to a chapter towards reading history.
 *
 * The app's own reading-history recorder runs on a timer, and a timer is the
 * one thing a phone stops running when its screen locks — so listening through
 * headphones while the phone sat in a pocket used to record almost nothing.
 * This measures listening by the audio element's own clock, which keeps
 * advancing while the page is frozen, and writes what it finds at every moment
 * the page is awake enough to write: periodically during playback, when
 * playback stops, and the instant the page returns to the foreground.
 *
 * Returns a function that detaches every listener.
 */
export function attachListeningRecorder(
  el: HTMLAudioElement,
  options: ListeningRecorderOptions
): () => void {
  const now = options.now ?? (() => Date.now());
  let run: ListeningRun | null = null;
  /**
   * The furthest this run has been seen to reach on the audio clock. Read
   * instead of `currentTime` because by the time a save runs the element may
   * already have been rewound underneath it: `pause` is delivered a task after
   * the `pause()` call that caused it, and the `ended` handler below resets the
   * position outright.
   */
  let furthestAudioSeconds = 0;
  let lastSaveMs = 0;

  const save = () => {
    if (!run) return;
    const playedMs = (furthestAudioSeconds - run.startAudioSeconds) * 1000;
    if (playedMs <= 0) return;
    // Wall time is the ceiling: playing at double speed advances the audio
    // clock twice as fast as the real one, and that is time nobody spent.
    const endWallMs = Math.min(run.startWallMs + playedMs, now());
    // A clock pushed backwards mid-stretch would otherwise write an event that
    // ends before it starts, which reads as negative time in every total.
    if (endWallMs <= run.startWallMs) return;
    lastSaveMs = now();
    options.saveSpan(
      run.target.bookId,
      run.target.chapter,
      Math.floor(run.startWallMs / 1000),
      Math.floor(endWallMs / 1000)
    );
  };

  const finish = () => {
    save();
    run = null;
  };

  const observePosition = () => {
    if (el.currentTime > furthestAudioSeconds) {
      furthestAudioSeconds = el.currentTime;
    }
  };

  const begin = () => {
    // Anything still open belongs to the stretch before this one, whether or
    // not a new one can start.
    finish();
    const target = options.getTarget();
    if (!target) return;
    run = { target, startWallMs: now(), startAudioSeconds: el.currentTime };
    furthestAudioSeconds = el.currentTime;
    lastSaveMs = now();
  };

  const onTimeUpdate = () => {
    observePosition();
    if (run && now() - lastSaveMs >= SAVE_INTERVAL_MS) {
      save();
    }
  };

  /** A seek makes the audio clock a liar about wall time, so re-anchor to it. */
  const onSeeked = () => {
    if (!run) return;
    // `begin` closes the stretch that ended at the seek before opening the next.
    if (el.paused) finish();
    else begin();
  };

  const onVisibilityChange = () => {
    observePosition();
    save();
  };

  el.addEventListener("play", begin);
  el.addEventListener("timeupdate", onTimeUpdate);
  el.addEventListener("seeked", onSeeked);
  el.addEventListener("pause", finish);
  el.addEventListener("ended", finish);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  return () => {
    el.removeEventListener("play", begin);
    el.removeEventListener("timeupdate", onTimeUpdate);
    el.removeEventListener("seeked", onSeeked);
    el.removeEventListener("pause", finish);
    el.removeEventListener("ended", finish);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "none";
    // Never detached: the element is a singleton that lives as long as the
    // page, and `saveListeningSpan` is what an uninstall clears.
    attachListeningRecorder(audioEl, {
      getTarget: () => currentChapter,
      saveSpan: (bookId, chapter, startTimeSeconds, endTimeSeconds) =>
        saveListeningSpan?.(bookId, chapter, startTimeSeconds, endTimeSeconds),
    });
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
  }
  return audioEl;
}

/**
 * First available reader's mp3 URL for the chapter in view, or null. The
 * Bible API exposes `thisChapterAudioLinks` as a `{ reader: url }` map
 * (e.g. gilbert / hays / souer); we just take the first non-empty entry.
 */
function chapterAudioUrl(readingState: BibleReadingState): string | null {
  const links = readingState.chapterData.value?.thisChapterAudioLinks;
  if (!links) return null;
  return Object.values(links).find((url) => !!url) ?? null;
}

/** The chapter in view, in the shape reading history records it. */
function chapterTarget(
  readingState: BibleReadingState
): ListeningTarget | null {
  const chapter = readingState.chapterData.value;
  if (!chapter) return null;
  return { bookId: chapter.book.id, chapter: chapter.chapter.number };
}

/**
 * Hidden from the quick toolbar on mobile since the mobile nav bar
 * (BibleReaderToolbar) is its home there.
 */
export function isAudioPlayToolVisible(ctx: QuickToolContext): boolean {
  return (
    !ctx.playlists.playing.value &&
    chapterAudioUrl(ctx.readingState) !== null &&
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
      saveListeningSpan = (bookId, chapter, startTimeSeconds, endTimeSeconds) =>
        context.readingHistory.saveReadingSpan(
          bookId,
          chapter,
          startTimeSeconds,
          endTimeSeconds
        );
      yield () => {
        saveListeningSpan = null;
      };

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
          const url = chapterAudioUrl(ctx.readingState);
          if (!url) {
            context.app.toast("No audio is available for this chapter.");
            return;
          }
          const el = ensureAudio();
          if (!el) return;
          if (currentUrl !== url) {
            el.src = url;
            currentUrl = url;
          }
          currentChapter = chapterTarget(ctx.readingState);
          if (el.paused) {
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
      });
    },
  });
}
