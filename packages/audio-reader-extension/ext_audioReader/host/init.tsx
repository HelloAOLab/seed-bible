import {
  computed,
  effect,
  signal,
  untracked,
  type Signal,
} from "@preact/signals";
import { debounce } from "es-toolkit";
import { registerExtension, type SeedBibleState } from "seed-bible";
import { LANG_META } from "seed-bible/i18n";
import {
  bibleLanguageToUiLocale,
  extractContentText,
  type AudioPlaybackController,
  type AudioPlaybackManager,
  type PlaybackVerse,
  type PlaybackVerseMark,
  type BibleReadingState,
  type ChapterVerse,
  type QuickToolContext,
  type SpeechVerse,
  type TextToSpeechManager,
  type TranslationBookChapter,
} from "seed-bible/managers";

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

/**
 * How long the Listen control waits out a burst of presses before acting, so a
 * double-press toggles once rather than playing and immediately stopping.
 */
const TOGGLE_DEBOUNCE_MS = 300;

/** Lazily-created shared audio element and the URL currently loaded into it. */
let audioEl: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

/**
 * Set for as long as the extension is installed. The recorder writes through
 * this rather than holding onto the manager, because the audio element outlives
 * any one install and an uninstalled extension must stop recording.
 */
let saveListeningSpan: SaveListeningSpan | null = null;

/**
 * The reader's playback UI, for as long as the extension is installed. Held
 * the same way as `saveListeningSpan`, for the same reason.
 */
let audioPlayback: AudioPlaybackManager | null = null;

/** The browser's speech synthesiser, for as long as the extension is installed. */
let textToSpeech: TextToSpeechManager | null = null;

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

  /** Reads how far playback has got and writes it, whenever we get the chance. */
  const flushProgress = () => {
    observePosition();
    save();
  };

  el.addEventListener("play", begin);
  el.addEventListener("timeupdate", onTimeUpdate);
  el.addEventListener("seeked", onSeeked);
  el.addEventListener("pause", finish);
  el.addEventListener("ended", finish);
  // Every moment the page might be about to stop running, plus the one where
  // it starts again. A page put to sleep behind a locked screen can be thrown
  // away without ever waking, taking an unwritten stretch of listening with it,
  // so take each of these as the last chance it may be.
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", flushProgress);
    document.addEventListener("freeze", flushProgress);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flushProgress);
  }

  return () => {
    el.removeEventListener("play", begin);
    el.removeEventListener("timeupdate", onTimeUpdate);
    el.removeEventListener("seeked", onSeeked);
    el.removeEventListener("pause", finish);
    el.removeEventListener("ended", finish);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", flushProgress);
      document.removeEventListener("freeze", flushProgress);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", flushProgress);
    }
  };
}

/**
 * The verse-timing data driving the "now reading" highlight for a recording
 * session's chapter.
 */
interface VerseTimingTrack {
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

/**
 * The heading that opens each verse's section, keyed by verse number — the
 * nearest one, when a section carries more than one.
 *
 * Headings come in two shapes, and both count:
 * - an entry of their own between verses, skipping any line breaks between it
 *   and the verse (anything else in between, and it isn't this verse's);
 * - embedded in a verse's own text. One with more of the verse after it
 *   belongs to that verse. One left at the very end, with nothing after it,
 *   opens the section the *next* verse starts.
 */
export function chapterVerseHeadings(
  chapter: TranslationBookChapter
): Map<number, string> {
  const headings = new Map<number, string>();
  let pending: string | null = null;
  for (const item of chapter.chapter.content) {
    if (item.type === "heading") {
      pending = item.content
        .filter((part) => typeof part === "string")
        .join(" ");
      continue;
    }
    if (item.type === "line_break") continue;
    if (item.type !== "verse") {
      pending = null;
      continue;
    }

    let own: string | null = pending;
    let trailing: string | null = null;
    for (const part of item.content) {
      if (typeof part === "object" && "heading" in part) {
        trailing = part.heading;
      } else if (isVerseText(part) && trailing !== null) {
        own = trailing;
        trailing = null;
      }
    }
    if (own) headings.set(item.number, own);
    pending = trailing;
  }
  return headings;
}

/** Whether a piece of a verse's content is words that are read out. */
function isVerseText(part: ChapterVerse["content"][number]): boolean {
  if (typeof part === "string") return part.trim().length > 0;
  return "text" in part && part.text.trim().length > 0;
}

/**
 * A chapter's verses as speakable prose, in reading order.
 *
 * Headings and Hebrew subtitles are left out — they're publisher apparatus
 * rather than scripture, and there's no verse to highlight while one is being
 * read. `extractContentText` drops footnote markers and line breaks for the
 * same reason, so what comes back is only what a narrator would actually say.
 */
export function chapterSpeechVerses(
  chapter: TranslationBookChapter
): SpeechVerse[] {
  return chapter.chapter.content
    .filter((item): item is ChapterVerse => item.type === "verse")
    .map((verse) => ({
      number: verse.number,
      text: extractContentText(verse.content),
    }))
    .filter((verse) => verse.text.length > 0);
}

/**
 * Listening started in one tab and not yet stopped: where it has got to,
 * whether it's playing, and the controls the reader shows for it.
 *
 * Each tab (each reading state) keeps its own, so switching tabs neither
 * stops the one playing nor loses the place in one that was paused. The audio
 * element and the speech synthesiser are shared, though, so only one session
 * is heard at a time — see {@link audible}.
 */
interface SessionBase {
  readingState: BibleReadingState;
  bookId: string;
  chapterNumber: number;
  isPlaying: Signal<boolean>;
  /** Seconds into a recording, or the index of the verse being spoken. */
  position: Signal<number>;
  /** The recording's length in seconds, or how many verses are spoken. */
  duration: Signal<number | null>;
  /** See {@link chapterVerseHeadings}. */
  headings: Map<number, string>;
  controller: AudioPlaybackController;
  /** Takes the session's controls down and stops watching its tab. */
  teardown: () => void;
  ended: boolean;
}

/** A tab listening to its chapter's recorded narration. */
interface RecordingSession extends SessionBase {
  kind: "recording";
  url: string;
  /** The chapter's verse timings, once fetched. */
  track: VerseTimingTrack | null;
}

/** A tab having its chapter read aloud by the browser's voice. */
interface SpeechSession extends SessionBase {
  kind: "speech";
  verses: SpeechVerse[];
  lang: string;
  /** The decoration lighting the spoken verse, or null when none is lit. */
  decorationId: string | null;
}

type ListeningSession = RecordingSession | SpeechSession;

const sessions = new Map<BibleReadingState, ListeningSession>();

/**
 * The session the speakers belong to. Starting another pauses this one first
 * (keeping its place), since there's only one audio element and one voice.
 */
let audible: ListeningSession | null = null;

/**
 * Where a recording was asked to pick up from after the element switched to
 * it, until the element gets there. Loading a new source winds the element
 * back to 0 first, and the `timeupdate` that announces it would otherwise
 * drag the session's place — and the highlight and scroll — back to the
 * start of the chapter for a moment.
 */
let resumeAt: number | null = null;

/** The recording session the audio element is playing for, if any. */
function heardRecording(): RecordingSession | null {
  return audible?.kind === "recording" ? audible : null;
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!audioEl) {
    const el = new Audio();
    audioEl = el;
    el.preload = "none";
    // Never detached: the element is a singleton that lives as long as the
    // page, and `saveListeningSpan` is what an uninstall clears.
    attachListeningRecorder(el, {
      getTarget: () => {
        const session = heardRecording();
        return session
          ? { bookId: session.bookId, chapter: session.chapterNumber }
          : null;
      },
      saveSpan: (bookId, chapter, startTimeSeconds, endTimeSeconds) =>
        saveListeningSpan?.(bookId, chapter, startTimeSeconds, endTimeSeconds),
    });
    el.onplay = () => {
      const session = heardRecording();
      if (!session) return;
      session.isPlaying.value = true;
      resumeVerseHighlight(session, el.currentTime);
    };
    el.onpause = () => {
      const session = heardRecording();
      if (!session) return;
      session.isPlaying.value = false;
      // The end of a chapter fires `pause` immediately before `ended` (per the
      // media spec) — that's the highlight finishing on schedule, not a user
      // pause, so it should fade out as already arranged rather than freeze.
      if (!el.ended) pauseVerseHighlight(session);
    };
    el.onended = () => {
      const session = heardRecording();
      // Finishing the chapter ends the session. The last verse's highlight is
      // left to fade on its own schedule.
      if (session) endSession(session, { keepHighlight: true });
    };
    el.onloadedmetadata = () => {
      resumeAt = null;
    };
    el.ontimeupdate = () => {
      const session = heardRecording();
      if (!session) return;
      if (resumeAt !== null) {
        if (Math.abs(el.currentTime - resumeAt) > 0.5) return;
        resumeAt = null;
      }
      session.position.value = el.currentTime;
      highlightVerseForTime(session, el.currentTime);
    };
    el.ondurationchange = () => {
      const session = heardRecording();
      const duration = el.duration;
      // A new source reports "unknown" before its real length; the session
      // already knows its length from before, so that isn't news.
      if (session && Number.isFinite(duration) && duration > 0) {
        session.duration.value = duration;
      }
    };
  }
  return audioEl;
}

/** Pauses whichever tab is being heard, keeping its place. */
function silenceAudible(): void {
  const session = audible;
  if (!session) return;
  if (session.kind === "recording") {
    if (audioEl && !audioEl.paused) audioEl.pause();
    // Marked now rather than when `pause` arrives: by then the element will
    // belong to the next session.
    session.isPlaying.value = false;
    pauseVerseHighlight(session);
  } else {
    // The synthesiser's effects mark the session paused and clear its
    // highlight, while it is still the audible one.
    textToSpeech?.stop();
  }
}

/** Hands the speakers to `session`, pausing whichever tab had them. */
function makeAudible(session: ListeningSession): void {
  if (audible === session) return;
  silenceAudible();
  audible = session;
  if (session.kind !== "recording") return;

  const el = ensureAudio();
  if (!el) return;
  if (currentUrl !== session.url) {
    el.src = session.url;
    currentUrl = session.url;
  } else if (Number.isFinite(el.duration) && el.duration > 0) {
    // The recording is already loaded — played again after a stop, or the
    // same chapter open in another tab — so the element won't announce its
    // length again, and the scrubber would sit at "--:--" without it.
    session.duration.value = el.duration;
  }
  const start = session.position.peek();
  resumeAt = start > 0 ? start : null;
  el.currentTime = start;
}

/**
 * Starts listening in `session`'s tab: shows its controls, and ends it as soon
 * as the tab moves to another chapter — narration for a chapter no longer on
 * screen has nothing left to follow.
 */
function beginSession(session: ListeningSession): void {
  const { readingState } = session;
  sessions.set(readingState, session);
  const hide = audioPlayback?.show(readingState, session.controller);

  const chapterKey = () =>
    `${readingState.translationId.value}|${readingState.bookId.value}|${readingState.chapterNumber.value}`;
  const opened = untracked(chapterKey);
  const stopWatching = effect(() => {
    if (chapterKey() !== opened) untracked(() => endSession(session));
  });

  session.teardown = () => {
    hide?.();
    stopWatching();
  };
}

/**
 * Ends a tab's listening completely: silences it if it's the one being heard,
 * clears its highlight, and takes its controls down.
 */
function endSession(
  session: ListeningSession,
  options: { keepHighlight?: boolean } = {}
): void {
  if (session.ended) return;
  session.ended = true;
  if (sessions.get(session.readingState) === session) {
    sessions.delete(session.readingState);
  }

  if (audible === session) {
    if (session.kind === "recording") {
      if (audioEl) {
        if (!audioEl.paused) audioEl.pause();
        audioEl.currentTime = 0;
      }
      resumeAt = null;
    } else {
      textToSpeech?.stop();
    }
    audible = null;
  }

  session.isPlaying.value = false;
  session.position.value = 0;
  if (session.kind === "recording") {
    if (!options.keepHighlight) pauseVerseHighlight(session);
  } else {
    highlightSpokenVerse(session, null);
  }
  session.readingState.readAlongVerse.value = null;
  session.teardown();
}

/** Ends every tab's listening, as an uninstall must. */
function endAllSessions(): void {
  for (const session of [...sessions.values()]) endSession(session);
}

/**
 * Asks the reader to keep `verseNumber` on screen, so a listener can read
 * along without scrolling. A new object each time: asking again for the same
 * verse still has to reach the reader if the listener scrolled away from it.
 */
function followVerse(readingState: BibleReadingState, verseNumber: number) {
  readingState.readAlongVerse.value = { verse: verseNumber };
}

/**
 * Moves the "now reading" highlight to match a jump to `currentTime`, and
 * brings the verse it lands in on screen — a jump can land anywhere in the
 * chapter, often well off screen, and a highlight nobody can see doesn't tell
 * the listener where they are.
 *
 * Ordinary playback only ever moves forward a verse at a time, which is what
 * `highlightVerseForTime` is built around; a seek can land anywhere, so the
 * verse lit before it is cleared rather than left to fade out over the new
 * one. While paused nothing is lit — the verse is only remembered, so that
 * resuming lights the one the reader scrubbed to.
 */
function seekVerseHighlight(
  session: RecordingSession,
  currentTime: number
): void {
  const track = session.track;
  if (!track) return;
  pauseVerseHighlight(session);
  track.lastVerse = null;
  track.verseIndex = null;

  const index = verseIndexForTime(
    track.startTimes,
    currentTime + VERSE_HIGHLIGHT_LEAD_IN_SECONDS
  );
  const verseNumber = track.verseNumbers[index];
  if (verseNumber === undefined) return;

  followVerse(session.readingState, verseNumber);

  if (session.isPlaying.peek()) {
    highlightVerseForTime(session, currentTime);
  } else {
    track.lastVerse = verseNumber;
    track.verseIndex = index;
  }
}

/** Starts (or resumes) a recording, pausing any other tab being heard. */
function playRecording(session: RecordingSession): void {
  makeAudible(session);
  // A quick second press pauses before playback has begun, which rejects
  // this promise with AbortError. That's the user getting what they asked
  // for, not a failure worth reporting. (jsdom's element returns nothing at
  // all, hence the guard.)
  void audioEl?.play()?.catch(() => undefined);
}

/**
 * A tab's listening to its chapter's recording. Fetches the chapter's verse
 * timings straight away, so the highlight can follow from the first verse.
 */
function createRecordingSession(
  bibleData: SeedBibleState["bibleData"],
  readingState: BibleReadingState,
  chapter: TranslationBookChapter,
  chapterAudio: { reader: string; url: string }
): RecordingSession {
  const session: RecordingSession = {
    kind: "recording",
    readingState,
    bookId: chapter.book.id,
    chapterNumber: chapter.chapter.number,
    url: chapterAudio.url,
    track: null,
    isPlaying: signal(false),
    position: signal(0),
    duration: signal<number | null>(null),
    headings: chapterVerseHeadings(chapter),
    teardown: () => undefined,
    ended: false,
    controller: undefined as unknown as AudioPlaybackController,
  };

  session.controller = {
    unit: "seconds",
    isPlaying: session.isPlaying,
    currentTime: session.position,
    duration: session.duration,
    play: () => playRecording(session),
    pause: () => {
      if (audible === session) audioEl?.pause();
    },
    seek: (seconds) => {
      if (!Number.isFinite(seconds)) return;
      const duration = session.duration.peek();
      const target = Math.max(
        0,
        duration !== null ? Math.min(seconds, duration) : seconds
      );
      // A tab paused in the background just remembers where to pick up.
      if (audible === session && audioEl) {
        audioEl.currentTime = target;
        resumeAt = null;
      }
      // Updated now rather than on the next `timeupdate`, so the handle
      // doesn't snap back to the old position for a moment after being let go.
      session.position.value = target;
      seekVerseHighlight(session, target);
    },
    stop: () => endSession(session),
    verseAt: (seconds): PlaybackVerse | null => {
      const track = session.track;
      if (!track || track.startTimes.length === 0) return null;
      // Matched to the highlight a seek there would light, lead-in and all. A
      // spot in the opening before the first verse plays on into it.
      const index = Math.max(
        0,
        verseIndexForTime(
          track.startTimes,
          seconds + VERSE_HIGHLIGHT_LEAD_IN_SECONDS
        )
      );
      const number = track.verseNumbers[index];
      if (number === undefined) return null;
      return { number, heading: session.headings.get(number) ?? null };
    },
    verseMarks: (): PlaybackVerseMark[] => {
      const track = session.track;
      if (!track) return [];
      return track.startTimes.flatMap((position, index) => {
        const number = track.verseNumbers[index];
        return number === undefined
          ? []
          : [{ position, startsSection: session.headings.has(number) }];
      });
    },
  };

  void loadVerseTrack(bibleData, session, chapter, chapterAudio.reader);
  return session;
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
function highlightVerseForTime(
  session: RecordingSession,
  currentTime: number
): void {
  const track = session.track;
  if (!track || !Number.isFinite(currentTime)) return;
  const { verseNumbers, startTimes } = track;
  if (startTimes.length === 0) return;

  const index = verseIndexForTime(
    startTimes,
    currentTime + VERSE_HIGHLIGHT_LEAD_IN_SECONDS
  );
  const verseNumber = verseNumbers[index];
  if (verseNumber === undefined || verseNumber === track.lastVerse) {
    return;
  }
  track.lastVerse = verseNumber;
  track.verseIndex = index;
  followVerse(session.readingState, verseNumber);

  const durationMs = verseHighlightDurationMs(
    startTimes,
    index,
    currentTime,
    session.duration.peek() ?? undefined
  );

  track.currentDecorationId = session.readingState.decorateVerses(
    session.bookId,
    session.chapterNumber,
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
 * Only desktop offers a "stop" distinct from "pause" — the phone layout has
 * just the one button — so this is the only option that doesn't leave a
 * highlight stuck on screen indefinitely if the user pauses and never resumes.
 * If every layout gains a stop, pausing could instead freeze the highlight in
 * place (re-issuing the same decoration id with no `removeAfterMs`, the way
 * `resumeVerseHighlight` already re-arms it) and leave clearing it to "stop".
 */
function pauseVerseHighlight(session: RecordingSession): void {
  const track = session.track;
  if (!track || track.currentDecorationId === null) return;
  session.readingState.removeDecoration(track.currentDecorationId);
  track.currentDecorationId = null;
}

/**
 * Re-lights the current verse when playback resumes — `pauseVerseHighlight`
 * clears it on pause, so without this the reader would sit unhighlighted
 * until the *next* verse starts. Schedules its fade-out from `currentTime`
 * (the position playback resumed from) rather than the verse's original start
 * time, so it still fades out when the next verse actually starts rather than
 * however long after resuming that the verse's full duration would imply.
 */
function resumeVerseHighlight(
  session: RecordingSession,
  currentTime: number
): void {
  const track = session.track;
  if (
    !track ||
    track.lastVerse === null ||
    track.verseIndex === null ||
    !Number.isFinite(currentTime)
  ) {
    return;
  }
  const { lastVerse, verseIndex, startTimes, currentDecorationId } = track;

  const durationMs = verseHighlightDurationMs(
    startTimes,
    verseIndex,
    currentTime,
    session.duration.peek() ?? undefined
  );

  track.currentDecorationId = session.readingState.decorateVerses(
    session.bookId,
    session.chapterNumber,
    [lastVerse],
    {
      className: "sb-verse-decoration-diminish",
      containerClassName: "sb-chapter-decoration-diminish",
      ...(durationMs !== null ? { removeAfterMs: durationMs } : {}),
    },
    currentDecorationId ?? undefined
  );
  // The listener may have scrolled away while it was paused.
  followVerse(session.readingState, lastVerse);
}

/**
 * Moves the "now reading" spotlight to `verseNumber` as the synthesiser
 * reaches it, or clears it when `verseNumber` is null.
 *
 * Reuses the same "diminish" decoration recorded narration uses, so a spoken
 * chapter looks no different from a narrated one. Unlike that path there's no
 * `removeAfterMs`: a verse's spoken length isn't known ahead of time, and the
 * next verse's `start` event replaces the highlight anyway.
 */
function highlightSpokenVerse(
  session: SpeechSession,
  verseNumber: number | null
): void {
  const { readingState, decorationId } = session;

  if (verseNumber === null) {
    if (decorationId !== null) {
      readingState.removeDecoration(decorationId);
      session.decorationId = null;
    }
    readingState.readAlongVerse.value = null;
    return;
  }

  followVerse(readingState, verseNumber);

  session.decorationId = readingState.decorateVerses(
    session.bookId,
    session.chapterNumber,
    [verseNumber],
    {
      className: "sb-verse-decoration-diminish",
      containerClassName: "sb-chapter-decoration-diminish",
    },
    decorationId ?? undefined
  );
}

/**
 * A tab's chapter read aloud by the browser's speech synthesiser, for the
 * translations that ship no recorded narration. Null, after telling the
 * listener, when there's nothing the browser can read.
 */
function createSpeechSession(
  context: SeedBibleState,
  readingState: BibleReadingState,
  chapter: TranslationBookChapter
): SpeechSession | null {
  const lang = speakableChapterLanguage(
    chapter,
    context.textToSpeech.canSpeakLanguage
  );
  const verses = chapterSpeechVerses(chapter);
  if (verses.length === 0 || !lang) {
    context.app.toast(
      context.i18n.t("no-audio", {
        defaultValue: "No audio is available for this chapter.",
        ns: "ext_audioReader",
      })
    );
    return null;
  }

  const session: SpeechSession = {
    kind: "speech",
    readingState,
    bookId: chapter.book.id,
    chapterNumber: chapter.chapter.number,
    verses,
    lang,
    decorationId: null,
    isPlaying: signal(false),
    position: signal(0),
    duration: signal<number | null>(verses.length),
    headings: chapterVerseHeadings(chapter),
    teardown: () => undefined,
    ended: false,
    controller: undefined as unknown as AudioPlaybackController,
  };

  session.controller = {
    unit: "verses",
    isPlaying: session.isPlaying,
    currentTime: session.position,
    duration: session.duration,
    play: () => speakFrom(session, session.position.peek()),
    pause: () => {
      if (audible === session) textToSpeech?.stop();
    },
    seek: (position) => {
      if (!Number.isFinite(position)) return;
      const index = speechIndexAt(position, verses.length);
      if (session.isPlaying.peek()) {
        speakFrom(session, index);
      } else {
        session.position.value = index;
      }
      const verse = verses[index];
      if (verse) followVerse(readingState, verse.number);
    },
    stop: () => endSession(session),
    verseAt: (position): PlaybackVerse | null => {
      const verse = verses[speechIndexAt(position, verses.length)];
      if (!verse) return null;
      return {
        number: verse.number,
        heading: session.headings.get(verse.number) ?? null,
      };
    },
    verseMarks: (): PlaybackVerseMark[] =>
      verses.map((verse, index) => ({
        position: index,
        startsSection: session.headings.has(verse.number),
      })),
  };
  return session;
}

/**
 * Reads `session`'s chapter aloud from its `index`th verse to the end,
 * pausing any other tab being heard.
 */
function speakFrom(session: SpeechSession, index: number): void {
  if (!textToSpeech) return;
  makeAudible(session);
  session.position.value = index;
  textToSpeech.speak(session.verses.slice(index), {
    lang: session.lang,
    onFinished: () => endSession(session),
  });
}

/** The whole verse, within a chapter of `count` verses, nearest `position`. */
function speechIndexAt(position: number, count: number): number {
  return Math.max(0, Math.min(Math.round(position), count - 1));
}

/**
 * Fetches the reader's per-verse timings for `session`'s chapter, so
 * `timeupdate` ticks can highlight along. Leaves `track` null when the
 * chapter has no timing link for this reader — an older translation, or an
 * offline-downloaded chapter, which carries no such link — so playback still
 * works, just without the highlight.
 */
async function loadVerseTrack(
  bibleData: SeedBibleState["bibleData"],
  session: RecordingSession,
  chapter: TranslationBookChapter,
  reader: string
): Promise<void> {
  const timingsLink = chapter.thisChapterAudioTimings[reader];
  if (!timingsLink) return;

  let timings;
  try {
    timings = await bibleData.getAudioTimings(
      session.readingState.translationId.peek(),
      timingsLink
    );
  } catch {
    return;
  }

  // Stopped (or moved to another chapter) while the fetch was in flight.
  if (session.ended) return;

  session.track = {
    verseNumbers: chapterVerseNumbers(chapter),
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
 * `language` as CLDR canonicalises it, or null if this runtime can't say.
 *
 * CLDR knows the alias from most ISO 639-3 codes to the two-letter tag voices
 * are labelled with — "hau" to "ha", "npi" to "ne" — and correctly leaves the
 * ones with no two-letter form alone ("haw", "yue"). That covers every
 * language it knows rather than only the handful the UI ships a locale for.
 *
 * Guarded the same way `isRightToLeftLanguage` guards its own `Intl` use: a
 * malformed tag makes `getCanonicalLocales` throw rather than return nothing.
 */
function canonicalLanguageTag(language: string): string | null {
  if (
    typeof Intl === "undefined" ||
    typeof Intl.getCanonicalLocales !== "function"
  ) {
    return null;
  }
  try {
    return Intl.getCanonicalLocales(language)[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * The script `tag` is written in ("Deva", "Gujr"), or null when this runtime
 * can't say. `maximize()` fills in the script CLDR treats as the language's
 * default, which is what makes two tags comparable at all.
 */
function scriptForLanguage(tag: string): string | null {
  if (typeof Intl === "undefined" || typeof Intl.Locale !== "function") {
    return null;
  }
  try {
    return new Intl.Locale(tag).maximize().script ?? null;
  } catch {
    return null;
  }
}

/**
 * The stand-in `LANG_META` nominates for `tag`, but only when the two are
 * written in the same script.
 *
 * `fallback` answers "what else can this reader read" — it's how the app picks
 * a Bible text when it has none in the reader's own language — which makes it
 * a poor guide for voices by itself. Gujarati falls back to Hindi, but the two
 * use different scripts, so a Hindi voice handed Gujarati text has no glyphs
 * to sound out and produces nothing usable. Requiring a shared script keeps
 * the pairs whose letters at least map to sounds (Marathi and Hindi are both
 * Devanagari) and drops the rest.
 *
 * A shared script is a floor, not a guarantee of a good reading: it also
 * admits pairs that are merely written alike, such as German falling back to
 * English. That stays tolerable only because this tier is a last resort — it
 * applies solely when nothing can read the language itself, so the choice is
 * between an accented approximation and no Listen button at all.
 */
function sameScriptFallbackLanguage(tag: string): string | null {
  const fallback = LANG_META[tag]?.fallback;
  if (!fallback) return null;
  const script = scriptForLanguage(tag);
  const fallbackScript = scriptForLanguage(fallback);
  if (!script || !fallbackScript || script !== fallbackScript) return null;
  return fallback;
}

/**
 * The tags a chapter might be spoken in, most trustworthy first.
 *
 * The Bible API reports ISO 639-3 ("eng"), which the Web Speech API doesn't
 * accept, so the code has to be translated to the BCP-47 tag voices carry
 * ("en") — and neither source of that translation is right on its own:
 *
 * - `UI_TO_BIBLE_LANGUAGE_CODES` is curated and agrees with the rest of the
 *   app, but it maps UI locales, not voices: it leaves "ind" as "ind" (the key
 *   it happens to use) where voices say "id".
 * - CLDR gets "ind" right, but returns "zlm" unchanged where the curated map
 *   knows Malay voices are labelled "ms".
 *
 * So both are offered, and the caller takes whichever the browser actually has
 * a voice for. The raw code comes last as a floor for runtimes without `Intl`.
 *
 * Anything {@link sameScriptFallbackLanguage} allows is appended after all of
 * those, so a related language is only ever reached for once every way of
 * naming the real one has come up empty.
 */
export function chapterSpeechLanguages(
  chapter: TranslationBookChapter
): string[] {
  const language = chapter.translation.language;
  if (!language) return [];
  const spoken = [
    bibleLanguageToUiLocale(language),
    canonicalLanguageTag(language),
    language,
  ].filter((tag): tag is string => !!tag);
  const fallbacks = spoken
    .map(sameScriptFallbackLanguage)
    .filter((tag): tag is string => !!tag);
  return [...new Set([...spoken, ...fallbacks])];
}

/**
 * The first of a chapter's candidate tags the browser has a voice for, or null
 * when it has none — which is what hides the Listen button.
 */
function speakableChapterLanguage(
  chapter: TranslationBookChapter,
  canSpeakLanguage: (lang: string | null) => boolean
): string | null {
  return (
    chapterSpeechLanguages(chapter).find((tag) => canSpeakLanguage(tag)) ?? null
  );
}

/**
 * Whether the chapter in view can be listened to at all: either it has a
 * recording, or the browser has a voice for its language and there is
 * something to read.
 */
function isChapterListenable(
  readingState: BibleReadingState,
  canSpeakLanguage: (lang: string | null) => boolean
): boolean {
  if (chapterAudioReader(readingState) !== null) return true;
  const chapter = readingState.chapterData.value;
  if (!chapter) return false;
  if (!speakableChapterLanguage(chapter, canSpeakLanguage)) return false;
  return chapterSpeechVerses(chapter).length > 0;
}

/**
 * Hidden from the quick toolbar on mobile since the mobile nav bar
 * (BibleReaderToolbar) is its home there. A partner-site embed uses that
 * same nav, so the quick toolbar stays empty there too.
 *
 * `canSpeakLanguage` is injected rather than read off a manager so this stays
 * a pure function the tests can call directly.
 */
export function isAudioPlayToolVisible(
  ctx: QuickToolContext,
  canSpeakLanguage: (lang: string | null) => boolean
): boolean {
  if (ctx.surface === "quick-toolbar" && ctx.app?.isMinimalEmbed?.value) {
    return false;
  }
  return (
    !ctx.playlists.playing.value &&
    isChapterListenable(ctx.readingState, canSpeakLanguage) &&
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

      audioPlayback = context.audioPlayback;
      const speech = context.textToSpeech;
      textToSpeech = speech;
      // The audio element and the synthesiser outlive the install, but nothing
      // would be left to show or control them, so an uninstall ends every
      // tab's listening outright.
      yield () => {
        endAllSessions();
        audioPlayback = null;
        textToSpeech = null;
      };

      yield context.tools.registerQuickTool({
        id: "ext_audioReader-play",
        showInEmbedded: true,
        priority: 250,
        title: {
          key: "toolbarTitle",
          defaultValue: "Listen",
          ns: "ext_audioReader",
        },
        icon: (ctx) =>
          context.audioPlayback.controllerFor(ctx.readingState)?.isPlaying
            .value ? (
            <PauseIcon />
          ) : (
            <PlayIcon />
          ),
        isVisible: (ctx) =>
          computed(() => isAudioPlayToolVisible(ctx, speech.canSpeakLanguage)),
        onSelect: debounce((ctx: QuickToolContext) => {
          const readingState = ctx.readingState;
          const existing = sessions.get(readingState);
          if (existing) {
            if (existing.isPlaying.peek()) existing.controller.pause();
            else existing.controller.play();
            return;
          }

          const chapter = readingState.chapterData.peek();
          if (!chapter) return;
          const chapterAudio = chapterAudioReader(readingState);
          // No recording for this chapter, so read it aloud instead.
          const session = chapterAudio
            ? createRecordingSession(
                context.bibleData,
                readingState,
                chapter,
                chapterAudio
              )
            : createSpeechSession(context, readingState, chapter);
          if (!session) return;
          beginSession(session);
          session.controller.play();
        }, TOGGLE_DEBOUNCE_MS),
      });

      // Follows the synthesiser from verse to verse, for whichever tab it is
      // reading in. Recorded narration drives its highlight off the audio
      // clock instead — see `highlightVerseForTime`.
      yield effect(() => {
        const verse = speech.currentVerse.value;
        untracked(() => {
          if (audible?.kind !== "speech") return;
          const session = audible;
          highlightSpokenVerse(session, verse);
          if (verse === null) return;
          const index = session.verses.findIndex((v) => v.number === verse);
          if (index >= 0) session.position.value = index;
        });
      });

      yield effect(() => {
        const speaking = speech.isSpeaking.value;
        untracked(() => {
          if (audible?.kind === "speech") audible.isPlaying.value = speaking;
        });
      });

      // A closed tab takes its listening with it, playing or paused.
      yield effect(() => {
        const open = new Set(
          context.tabs.tabs.value.map((tab) => tab.readingState)
        );
        untracked(() => {
          for (const session of [...sessions.values()]) {
            if (!open.has(session.readingState)) endSession(session);
          }
        });
      });
    },
  });
}
