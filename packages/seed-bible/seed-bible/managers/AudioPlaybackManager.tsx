import { signal, type ReadonlySignal } from "@preact/signals";
import type { BibleReadingState } from "./BibleReadingManager";

/**
 * One piece of audio the reader can show progress for and control, such as a
 * chapter's recorded narration.
 *
 * Whoever owns the audio (the audio-reader extension, today) implements this
 * and hands it to {@link AudioPlaybackManager.show}; the reader's toolbars only
 * ever read and drive it through this interface, so they never touch the
 * `<audio>` element itself.
 */
export interface AudioPlaybackController {
  /**
   * What `currentTime` and `duration` count.
   *
   * `"seconds"` for a recording. `"verses"` for speech whose timing can't be
   * known ahead of time (the browser's own voice): the position is then the
   * index of the verse being read, the length is how many verses there are,
   * and seeking moves a whole verse at a time.
   */
  unit: "seconds" | "verses";

  /** Whether the audio is currently advancing. */
  isPlaying: ReadonlySignal<boolean>;

  /** The playback position, in `unit`s. */
  currentTime: ReadonlySignal<number>;

  /** The total length, in `unit`s, or null until the audio has reported it. */
  duration: ReadonlySignal<number | null>;

  play: () => void;
  pause: () => void;

  /** Moves playback to `position`, without changing whether it is playing. */
  seek: (position: number) => void;

  /**
   * Ends playback outright: rewinds, and removes this controller from the
   * reader so its progress UI goes away.
   */
  stop: () => void;

  /**
   * The verse playback would be in at `position`, and the heading directly
   * above it if it starts a section — what the scrubber previews while being
   * dragged. Null (or left out) when there's no telling, such as before a
   * recording's verse timings have loaded.
   */
  verseAt?: (position: number) => PlaybackVerse | null;

  /**
   * Where each verse starts, in `unit`s, for the tick marks the scrubber shows
   * while being dragged. Empty (or left out) when there's no telling.
   */
  verseMarks?: () => PlaybackVerseMark[];
}

/** One verse's start, as a tick on the scrubber. */
export interface PlaybackVerseMark {
  position: number;
  /** Whether a heading sits directly above the verse; drawn thicker. */
  startsSection: boolean;
}

/** A verse as the scrubber's preview names it. */
export interface PlaybackVerse {
  number: number;
  /** The heading directly above the verse, or null when it doesn't start a section. */
  heading: string | null;
}

export interface AudioPlaybackManager {
  /**
   * The playback started in the tab reading `readingState`, or null for none.
   *
   * Each tab keeps its own, so a tab that was paused still has its place when
   * the reader comes back to it, and the reader's controls always show the
   * tab in view rather than whichever one last made a sound.
   */
  controllerFor: (
    readingState: BibleReadingState
  ) => AudioPlaybackController | null;

  /**
   * Shows `controller` as the playback for `readingState`'s tab, replacing
   * any other there.
   *
   * Returns a function that removes it again. Calling that after something
   * else has taken over does nothing, so an owner can always call it on its
   * way out without checking first.
   */
  show: (
    readingState: BibleReadingState,
    controller: AudioPlaybackController
  ) => () => void;
}

export function createAudioPlaybackManager(): AudioPlaybackManager {
  const controllers = signal<
    ReadonlyMap<BibleReadingState, AudioPlaybackController>
  >(new Map());

  const controllerFor = (readingState: BibleReadingState) =>
    controllers.value.get(readingState) ?? null;

  const show = (
    readingState: BibleReadingState,
    controller: AudioPlaybackController
  ) => {
    controllers.value = new Map(controllers.peek()).set(
      readingState,
      controller
    );
    return () => {
      if (controllers.peek().get(readingState) !== controller) return;
      const next = new Map(controllers.peek());
      next.delete(readingState);
      controllers.value = next;
    };
  };

  return { controllerFor, show };
}

/**
 * Formats a playback position as `m:ss`, or `h:mm:ss` once it passes an hour.
 * Negative and non-finite values read as zero, so a not-yet-loaded duration
 * never shows up as "NaN:NaN".
 */
export function formatPlaybackTime(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${secs}`;
  }
  return `${minutes}:${secs}`;
}
