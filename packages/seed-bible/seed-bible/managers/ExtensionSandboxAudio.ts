import {
  effect,
  signal,
  untracked,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type {
  AudioPlaybackController,
  AudioPlaybackManager,
  PlaybackVerse,
  PlaybackVerseMark,
} from "./AudioPlaybackManager";
import type { TextToSpeechManager } from "./TextToSpeechManager";
import type { BibleDataManager, BookId } from "./BibleDataManager";
import type { BibleReadingState } from "./BibleReadingManager";
import { bibleLanguageToUiLocale } from "./BibleReadingManager";
import type { ChapterVerse, TranslationBookChapter } from "./FreeUseBibleAPI";
import { extractContentText } from "./ChapterText";
import type { SandboxPlayback } from "../extensions/protocol";

/** What a sandboxed extension's audio reaches in the app. */
export interface SandboxAudioContext {
  audioPlayback: Pick<AudioPlaybackManager, "show" | "controllerFor">;
  textToSpeech: Pick<
    TextToSpeechManager,
    "isSupported" | "currentVerse" | "speak" | "stop"
  >;
  bibleData: Pick<
    BibleDataManager,
    "getTranslationBookChapter" | "getAudioTimings"
  >;
  tabs: {
    tabs: ReadonlySignal<readonly { readingState: BibleReadingState }[]>;
  };
}

/** Why a playback call was refused, for the broker to pass on. */
export class SandboxAudioError extends Error {
  constructor(
    readonly code: "invalid_request" | "unavailable" | "not_found",
    message: string
  ) {
    super(message);
  }
}

export interface ChapterRef {
  translationId: string;
  bookId: string;
  chapter: number;
}

export interface SandboxAudio {
  /** What's playing for this extension, for its frames. Reads signals. */
  playback: () => SandboxPlayback | null;
  /** An audio file. `url` must already be checked against the network hosts. */
  playFile: (
    url: string,
    readingState: BibleReadingState
  ) => Promise<{ finished: boolean }>;
  /** The app's recorded narration of a chapter. */
  playNarration: (
    ref: ChapterRef & { reader?: string },
    readingState: BibleReadingState
  ) => Promise<{ finished: boolean }>;
  /** Who has recorded narration for a chapter. */
  narrators: (ref: ChapterRef) => Promise<string[]>;
  /** The app's text-to-speech. */
  readAloud: (
    ref: ChapterRef & { fromVerse?: number; toVerse?: number },
    readingState: BibleReadingState
  ) => Promise<{ finished: boolean }>;
  pause: () => void;
  resume: () => void;
  seek: (position: number) => void;
  stop: () => void;
  dispose: () => void;
}

/** One thing this extension is playing, and its controls in the reader. */
interface Playback {
  kind: SandboxPlayback["kind"];
  isPlaying: Signal<boolean>;
  position: Signal<number>;
  duration: Signal<number | null>;
  controller: AudioPlaybackController;
  play: () => void;
  pause: () => void;
  seek: (position: number) => void;
  /** Silences it for good. */
  halt: () => void;
  /** Settles the extension's call. */
  settle: (finished: boolean) => void;
  /** Takes its controls down and stops watching the app. */
  teardown: () => void;
}

function chapterVerses(chapter: TranslationBookChapter) {
  return chapter.chapter.content
    .filter((item): item is ChapterVerse => item.type === "verse")
    .map((verse) => ({
      number: verse.number,
      text: extractContentText(verse.content),
    }));
}

/**
 * One sandboxed extension's audio. Everything it plays goes through the
 * app's own player: it shows in the reader's playback controls for the tab
 * it started in, where the user can pause, scrub and stop it like the app's
 * own narration, and it's heard on its own, pausing whatever else was
 * playing. It ends when the user starts something else there, closes that
 * tab, or the extension stops.
 */
export function createSandboxAudio(context: SandboxAudioContext): SandboxAudio {
  // A signal, so the frames' state follows what starts and stops.
  const active = signal<Playback | null>(null);
  let element: HTMLAudioElement | null = null;

  const end = (playback: Playback, finished: boolean) => {
    if (active.peek() !== playback) {
      return;
    }
    active.value = null;
    playback.halt();
    playback.isPlaying.value = false;
    playback.teardown();
    playback.settle(finished);
  };

  /** Pauses everything else the app is playing, in every tab. */
  const silenceOthers = () => {
    for (const tab of context.tabs.tabs.peek()) {
      const other = context.audioPlayback.controllerFor(tab.readingState);
      if (
        other &&
        other !== active.peek()?.controller &&
        other.isPlaying.peek()
      ) {
        other.pause();
      }
    }
  };

  /**
   * Shows `playback` in `readingState`'s tab, and ends it when it's
   * replaced there or the tab closes: with no controls left on screen, the
   * user would have no way to stop it.
   */
  const begin = (
    playback: Playback,
    readingState: BibleReadingState
  ): Promise<{ finished: boolean }> => {
    const previous = active.peek();
    if (previous) {
      end(previous, false);
    }
    silenceOthers();
    active.value = playback;
    const result = new Promise<{ finished: boolean }>((resolve) => {
      playback.settle = (finished) => resolve({ finished });
    });
    const hide = context.audioPlayback.show(readingState, playback.controller);
    const stopWatching = effect(() => {
      const shown = context.audioPlayback.controllerFor(readingState);
      const open = context.tabs.tabs.value.some(
        (tab) => tab.readingState === readingState
      );
      if (shown !== playback.controller || !open) {
        untracked(() => end(playback, false));
      }
    });
    playback.teardown = () => {
      stopWatching();
      hide();
    };
    playback.play();
    return result;
  };

  const newPlayback = (
    kind: SandboxPlayback["kind"],
    unit: AudioPlaybackController["unit"],
    controls: Pick<Playback, "play" | "pause" | "seek" | "halt">,
    extras: Pick<AudioPlaybackController, "verseAt" | "verseMarks"> = {}
  ): Playback => {
    const playback: Playback = {
      kind,
      isPlaying: signal(false),
      position: signal(0),
      duration: signal<number | null>(null),
      controller: undefined as unknown as AudioPlaybackController,
      ...controls,
      settle: () => {},
      teardown: () => {},
    };
    playback.controller = {
      unit,
      isPlaying: playback.isPlaying,
      currentTime: playback.position,
      duration: playback.duration,
      play: () => {
        if (active.peek() === playback) {
          silenceOthers();
          playback.play();
        }
      },
      pause: () => {
        if (active.peek() === playback) playback.pause();
      },
      seek: (position) => {
        if (active.peek() === playback && Number.isFinite(position)) {
          playback.seek(position);
        }
      },
      stop: () => end(playback, false),
      ...extras,
    };
    return playback;
  };

  const audioElement = () => {
    element ??= new Audio();
    return element;
  };

  const playUrl = (
    kind: "file" | "narration",
    url: string,
    readingState: BibleReadingState,
    extras: Pick<AudioPlaybackController, "verseAt" | "verseMarks"> = {}
  ) => {
    const el = audioElement();
    let playback: Playback;
    const mine = () => active.peek() === playback;
    playback = newPlayback(
      kind,
      "seconds",
      {
        // A pause before playback starts rejects `play()`; that's the user
        // getting what they asked for. (jsdom returns nothing at all.)
        play: () => void el.play()?.catch(() => undefined),
        pause: () => el.pause(),
        seek: (seconds) => {
          const duration = playback.duration.peek();
          const target = Math.max(
            0,
            duration !== null ? Math.min(seconds, duration) : seconds
          );
          el.currentTime = target;
          playback.position.value = target;
        },
        halt: () => {
          el.pause();
          el.removeAttribute("src");
        },
      },
      extras
    );
    el.onplay = () => {
      if (mine()) playback.isPlaying.value = true;
    };
    el.onpause = () => {
      if (mine()) playback.isPlaying.value = false;
    };
    el.ontimeupdate = () => {
      if (mine()) playback.position.value = el.currentTime;
    };
    el.ondurationchange = () => {
      if (mine() && Number.isFinite(el.duration) && el.duration > 0) {
        playback.duration.value = el.duration;
      }
    };
    el.onended = () => end(playback, true);
    el.onerror = () => end(playback, false);
    el.src = url;
    return begin(playback, readingState);
  };

  const loadChapter = async (ref: ChapterRef) => {
    try {
      return await context.bibleData.getTranslationBookChapter(
        ref.translationId,
        ref.bookId as BookId,
        ref.chapter
      );
    } catch {
      throw new SandboxAudioError(
        "unavailable",
        `Couldn't load ${ref.translationId} ${ref.bookId} ${ref.chapter}.`
      );
    }
  };

  const recordings = (chapter: TranslationBookChapter) =>
    Object.entries(chapter.thisChapterAudioLinks ?? {}).filter(
      ([, url]) => !!url
    );

  return {
    playback: () => {
      const current = active.value;
      return current
        ? {
            kind: current.kind,
            unit: current.controller.unit,
            isPlaying: current.isPlaying.value,
            position: current.position.value,
            duration: current.duration.value,
          }
        : null;
    },

    playFile: (url, readingState) => playUrl("file", url, readingState),

    playNarration: async (ref, readingState) => {
      const chapter = await loadChapter(ref);
      const recording = recordings(chapter).find(
        ([reader]) => ref.reader === undefined || reader === ref.reader
      );
      if (!recording) {
        throw new SandboxAudioError(
          "not_found",
          ref.reader === undefined
            ? `${ref.translationId} ${ref.bookId} ${ref.chapter} has no recorded narration.`
            : `There's no narration by '${ref.reader}' for ${ref.translationId} ${ref.bookId} ${ref.chapter}.`
        );
      }
      const [reader, url] = recording;
      const numbers = chapterVerses(chapter).map((verse) => verse.number);
      // The scrubber's verse ticks, once the timings arrive.
      let starts: number[] = [];
      const timingsLink = chapter.thisChapterAudioTimings?.[reader];
      if (timingsLink) {
        context.bibleData
          .getAudioTimings(ref.translationId, timingsLink)
          .then((timings) => {
            starts = timings.verses;
          })
          .catch(() => undefined);
      }
      return playUrl("narration", url, readingState, {
        verseAt: (seconds): PlaybackVerse | null => {
          let index = -1;
          starts.forEach((start, i) => {
            if (seconds >= start) index = i;
          });
          const number = numbers[Math.max(0, index)];
          return starts.length && number !== undefined
            ? { number, heading: null }
            : null;
        },
        verseMarks: (): PlaybackVerseMark[] =>
          starts.map((position) => ({ position, startsSection: false })),
      });
    },

    narrators: async (ref) =>
      recordings(await loadChapter(ref)).map(([reader]) => reader),

    readAloud: async (ref, readingState) => {
      if (!context.textToSpeech.isSupported.peek()) {
        throw new SandboxAudioError(
          "unavailable",
          "This browser can't read aloud."
        );
      }
      const chapter = await loadChapter(ref);
      const verses = chapterVerses(chapter).filter(
        (verse) =>
          verse.text.length > 0 &&
          verse.number >= (ref.fromVerse ?? 1) &&
          verse.number <= (ref.toVerse ?? Infinity)
      );
      if (verses.length === 0) {
        return { finished: true };
      }
      const lang = bibleLanguageToUiLocale(chapter.translation?.language);
      // The run that's speaking; a stopped or replaced one is ignored.
      let run = 0;
      let playback: Playback;
      const speakFrom = (index: number) => {
        const token = ++run;
        playback.position.value = index;
        playback.isPlaying.value = true;
        context.textToSpeech.speak(verses.slice(index), {
          lang,
          onFinished: () => {
            if (token === run) end(playback, true);
          },
          // The user stopped it from elsewhere, or something else spoke.
          onStopped: () => {
            if (token === run) end(playback, false);
          },
        });
      };
      const silence = () => {
        run++;
        context.textToSpeech.stop();
        playback.isPlaying.value = false;
      };
      const indexAt = (position: number) =>
        Math.max(0, Math.min(Math.round(position), verses.length - 1));
      playback = newPlayback(
        "speech",
        "verses",
        {
          play: () => speakFrom(playback.position.peek()),
          pause: silence,
          seek: (position) => {
            if (playback.isPlaying.peek()) {
              speakFrom(indexAt(position));
            } else {
              playback.position.value = indexAt(position);
            }
          },
          halt: () => {
            if (playback.isPlaying.peek()) silence();
          },
        },
        {
          verseAt: (position) => {
            const verse = verses[indexAt(position)];
            return verse ? { number: verse.number, heading: null } : null;
          },
          verseMarks: () =>
            verses.map((_, index) => ({
              position: index,
              startsSection: false,
            })),
        }
      );
      playback.duration.value = verses.length;
      const stopFollowing = effect(() => {
        const verse = context.textToSpeech.currentVerse.value;
        untracked(() => {
          if (active.peek() !== playback || verse === null) return;
          const index = verses.findIndex((v) => v.number === verse);
          if (index >= 0) playback.position.value = index;
        });
      });
      const done = begin(playback, readingState);
      const teardown = playback.teardown;
      playback.teardown = () => {
        stopFollowing();
        teardown();
      };
      return done;
    },

    pause: () => active.peek()?.controller.pause(),
    resume: () => active.peek()?.controller.play(),
    seek: (position) => active.peek()?.controller.seek(position),
    stop: () => active.peek()?.controller.stop(),
    dispose: () => {
      const current = active.peek();
      if (current) end(current, false);
      element = null;
    },
  };
}
