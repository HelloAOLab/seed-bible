import { signal, type ReadonlySignal } from "@preact/signals";

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
}

export interface AudioPlaybackManager {
  /** The playback the reader is showing controls for, or null for none. */
  active: ReadonlySignal<AudioPlaybackController | null>;

  /**
   * Makes `controller` the active playback, replacing any other.
   *
   * Returns a function that removes it again. Calling that after something
   * else has taken over does nothing, so an owner can always call it on its
   * way out without checking first.
   */
  show: (controller: AudioPlaybackController) => () => void;
}

export function createAudioPlaybackManager(): AudioPlaybackManager {
  const active = signal<AudioPlaybackController | null>(null);

  const show = (controller: AudioPlaybackController) => {
    active.value = controller;
    return () => {
      if (active.peek() === controller) {
        active.value = null;
      }
    };
  };

  return { active, show };
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
