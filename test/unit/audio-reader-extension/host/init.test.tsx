import { signal } from "@preact/signals";
import {
  attachListeningRecorder,
  chapterVerseNumbers,
  isAudioPlayToolVisible,
  type ListeningTarget,
  verseHighlightDurationMs,
  verseIndexForTime,
} from "@packages/audio-reader-extension/ext_audioReader/host/init";
import type { QuickToolContext } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import type { TranslationBookChapter } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

function createContext(overrides: {
  surface: QuickToolContext["surface"];
  isMobile: boolean;
  hasAudio?: boolean;
  playing?: unknown;
}): QuickToolContext {
  return {
    readingState: {
      chapterData: signal(
        // An audio-less chapter carries an empty map, not null — the API type
        // makes `thisChapterAudioLinks` non-nullable.
        overrides.hasAudio === false
          ? { thisChapterAudioLinks: {} }
          : { thisChapterAudioLinks: { reader: "https://example.com/a.mp3" } }
      ),
    } as any,
    playlists: {
      playing: signal(overrides.playing ?? null),
      isMobile: signal(overrides.isMobile),
    } as any,
    annotations: {} as any,
    features: {} as any,
    surface: overrides.surface,
  };
}

describe("isAudioPlayToolVisible (#1607)", () => {
  it("is hidden on the quick-toolbar surface on mobile", () => {
    const ctx = createContext({ surface: "quick-toolbar", isMobile: true });
    expect(isAudioPlayToolVisible(ctx)).toBe(false);
  });

  it("is visible on the mobile-navigation-bar surface on mobile", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
    });
    expect(isAudioPlayToolVisible(ctx)).toBe(true);
  });

  it("is visible on the quick-toolbar surface on desktop", () => {
    const ctx = createContext({ surface: "quick-toolbar", isMobile: false });
    expect(isAudioPlayToolVisible(ctx)).toBe(true);
  });

  it("is hidden when the chapter has no audio", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
    });
    expect(isAudioPlayToolVisible(ctx)).toBe(false);
  });

  it("is hidden while a playlist is playing, regardless of surface", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: false,
      playing: { id: "playing" },
    });
    expect(isAudioPlayToolVisible(ctx)).toBe(false);
  });
});

/** Enough of an audio element to drive the recorder without real playback. */
class FakeAudio extends EventTarget {
  currentTime = 0;
  paused = true;

  play() {
    this.paused = false;
    this.dispatchEvent(new Event("play"));
  }

  pause() {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }
}

const START_MS = 1_700_000_000_000;
const START_SECONDS = 1_700_000_000;
const PSALM_23: ListeningTarget = { bookId: "psalms", chapter: 23 };

function setup(target: ListeningTarget | null = PSALM_23) {
  const el = new FakeAudio();
  const saveSpan = vi.fn();
  let nowMs = START_MS;

  const detach = attachListeningRecorder(el as unknown as HTMLAudioElement, {
    getTarget: () => target,
    saveSpan,
    now: () => nowMs,
  });

  return {
    el,
    saveSpan,
    detach,
    /** Ordinary foreground playback: both clocks run, the element reports in. */
    listen(seconds: number) {
      nowMs += seconds * 1000;
      el.currentTime += seconds;
      el.dispatchEvent(new Event("timeupdate"));
    },
    /** A locked screen: audio plays on, but the frozen page fires no events. */
    listenWhileFrozen(seconds: number) {
      nowMs += seconds * 1000;
      el.currentTime += seconds;
    },
    /** Wall time passing with nothing playing. */
    wait(seconds: number) {
      nowMs += seconds * 1000;
    },
    /** The media controls jumping the audio ahead, with no time passing. */
    skipAhead(seconds: number) {
      el.currentTime += seconds;
    },
    /** The screen going off or coming back on — the same event either way. */
    visibilityChanged() {
      document.dispatchEvent(new Event("visibilitychange"));
    },
  };
}

describe("attachListeningRecorder", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("records listening that happened while the page was frozen", () => {
    const h = setup();

    h.el.play();
    h.listen(30);
    h.saveSpan.mockClear();

    // Phone goes in a pocket for six minutes of narration.
    h.listenWhileFrozen(360);
    h.visibilityChanged();

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 390
    );
  });

  it("records a listen locked before any foreground tick landed", () => {
    const h = setup();

    // Press play and lock the phone within a second or two: no `timeupdate`
    // fires while the page is awake, and the reader's own five-second tick
    // never lands, so nothing else has recorded this chapter at all.
    h.el.play();
    h.listenWhileFrozen(2);
    h.visibilityChanged();
    h.saveSpan.mockClear();

    // Ten minutes of narration through a locked screen, then it comes back.
    h.listenWhileFrozen(600);
    h.visibilityChanged();

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 602
    );
  });

  it("credits only the time the audio actually advanced", () => {
    const h = setup();

    h.el.play();
    h.listenWhileFrozen(120);
    // Playback stopped at the end of the chapter; the phone stayed locked.
    h.wait(600);
    h.visibilityChanged();

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 120
    );
  });

  it("never credits more time than has passed on the wall clock", () => {
    const h = setup();

    h.el.play();
    // Two minutes of audio played back at double speed takes one real minute.
    h.el.currentTime += 120;
    h.wait(60);
    h.visibilityChanged();

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 60
    );
  });

  it("records the last stretch even when the element is rewound before the pause lands", () => {
    const h = setup();

    h.el.play();
    h.listen(300);
    h.saveSpan.mockClear();

    // What switching chapters does: rewind, then the pause event arrives.
    h.el.currentTime = 0;
    h.el.pause();

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 300
    );
  });

  it("saves repeatedly through a long listen, not just when it ends", () => {
    const h = setup();

    h.el.play();
    // Five minutes of narration, reported the way an element really reports
    // it: many small steps rather than one leap.
    for (let i = 0; i < 60; i++) {
      h.listen(5);
    }

    const ends = h.saveSpan.mock.calls.map(([, , , to]) => to as number);
    expect(ends.length).toBeGreaterThan(1);
    for (let i = 1; i < ends.length; i++) {
      expect(ends[i]!).toBeGreaterThan(ends[i - 1]!);
    }
    expect(ends.at(-1)).toBe(START_SECONDS + 300);
  });

  it("writes what has played when the page is told it may be discarded", () => {
    const h = setup();

    h.el.play();
    h.listenWhileFrozen(120);

    // The page is going away without ever coming back to the foreground.
    window.dispatchEvent(new Event("pagehide"));

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 120
    );
  });

  it("credits a skip forward with only what was heard before it", () => {
    const h = setup();

    h.el.play();
    h.listen(60);
    h.saveSpan.mockClear();

    h.el.currentTime += 600;
    h.el.dispatchEvent(new Event("seeked"));

    expect(h.saveSpan).toHaveBeenCalledTimes(1);
    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 60
    );
  });

  it("closes the open stretch when playback restarts without a pause", () => {
    const h = setup();

    h.el.play();
    h.listen(60);
    h.saveSpan.mockClear();

    h.el.dispatchEvent(new Event("play"));

    expect(h.saveSpan).toHaveBeenCalledWith(
      "psalms",
      23,
      START_SECONDS,
      START_SECONDS + 60
    );
  });

  it("caps a skip forward at the time that really passed, before any re-anchor", () => {
    const h = setup();

    h.el.play();
    h.listen(60);
    h.saveSpan.mockClear();

    // Twenty seconds pass, and in them the media controls jump ten minutes
    // ahead. The element reports its new position before the seek itself is
    // delivered, so the wall clock is the only thing holding the credit down.
    h.wait(20);
    h.skipAhead(600);
    h.el.dispatchEvent(new Event("timeupdate"));

    expect(h.saveSpan).toHaveBeenCalled();
    for (const [, , from, to] of h.saveSpan.mock.calls) {
      expect(to - from).toBeLessThanOrEqual(80);
    }
  });

  it("leaves out the gap when playback is paused and resumed later", () => {
    const h = setup();

    h.el.play();
    h.listen(60);
    h.saveSpan.mockClear();

    // The lock-screen media controls pause it. Nothing registers Media Session
    // handlers, so the browser pauses the element itself and this arrives as
    // the same `pause` the in-app button would raise.
    h.el.pause();
    const [, , pausedFrom, pausedTo] = h.saveSpan.mock.calls.at(-1)!;
    expect(pausedTo - pausedFrom).toBe(60);

    // Five minutes with nothing playing, then resumed from those same
    // controls.
    h.wait(300);
    h.saveSpan.mockClear();
    h.el.play();
    h.listen(30);

    expect(h.saveSpan).toHaveBeenCalled();
    for (const [, , from, to] of h.saveSpan.mock.calls) {
      // The second stretch begins where playback resumed, so the five minutes
      // of silence belong to neither of them.
      expect(from).toBeGreaterThanOrEqual(START_SECONDS + 360);
      expect(to - from).toBeLessThanOrEqual(30);
    }
  });

  it("records nothing when the chapter being played is unknown", () => {
    const h = setup(null);

    h.el.play();
    h.listenWhileFrozen(300);
    h.visibilityChanged();
    h.el.pause();

    expect(h.saveSpan).not.toHaveBeenCalled();
  });

  it("stops recording once detached", () => {
    const h = setup();

    h.el.play();
    h.detach();
    h.listen(300);
    h.visibilityChanged();
    h.el.pause();

    expect(h.saveSpan).not.toHaveBeenCalled();
  });
});

describe("verseIndexForTime", () => {
  const startTimes = [3, 6, 9];

  it("is before the first verse during a lead-in before it starts", () => {
    expect(verseIndexForTime(startTimes, 0)).toBe(-1);
    expect(verseIndexForTime(startTimes, 2.999)).toBe(-1);
  });

  it("moves to the first verse exactly at its start time", () => {
    expect(verseIndexForTime(startTimes, 3)).toBe(0);
  });

  it("stays on a verse right up until the next one's start time", () => {
    expect(verseIndexForTime(startTimes, 5.999)).toBe(0);
  });

  it("picks the middle verse partway through it", () => {
    expect(verseIndexForTime(startTimes, 6)).toBe(1);
    expect(verseIndexForTime(startTimes, 8)).toBe(1);
  });

  it("stays on the last verse once playback passes every start time", () => {
    expect(verseIndexForTime(startTimes, 9)).toBe(2);
    expect(verseIndexForTime(startTimes, 1000)).toBe(2);
  });
});

describe("verseHighlightDurationMs", () => {
  const startTimes = [3, 6, 9];

  it("lasts until the next verse's start time", () => {
    expect(verseHighlightDurationMs(startTimes, 0, 3, undefined)).toBe(3000);
    expect(verseHighlightDurationMs(startTimes, 1, 6, undefined)).toBe(3000);
  });

  it("lasts until the audio ends, for the last verse", () => {
    expect(verseHighlightDurationMs(startTimes, 2, 9, 15)).toBe(6000);
  });

  it("is null for the last verse when the audio's duration isn't known yet", () => {
    expect(verseHighlightDurationMs(startTimes, 2, 9, undefined)).toBeNull();
    expect(verseHighlightDurationMs(startTimes, 2, 9, NaN)).toBeNull();
  });

  it("never goes negative, if the audio's reported duration is somehow shorter than the last verse's start", () => {
    expect(verseHighlightDurationMs(startTimes, 2, 9, 5)).toBe(0);
  });

  it("treats an index with no next start time as the last verse, even past the end of the array", () => {
    expect(verseHighlightDurationMs(startTimes, 5, 10, 15)).toBe(5000);
  });

  it("measures from currentTime, not from the verse's own start time — so triggering the highlight early doesn't extend it", () => {
    // The highlight for verse index 0 is triggered a bit before its 3s start
    // time (see VERSE_HIGHLIGHT_LEAD_IN_SECONDS in init.tsx), but it should
    // still fade out exactly at verse 1's real 6s start, not 6s after
    // whenever it happened to be triggered.
    expect(verseHighlightDurationMs(startTimes, 0, 2.7, undefined)).toBe(3300);
  });
});

describe("chapterVerseNumbers", () => {
  it("extracts only verse numbers, in reading order, skipping headings and line breaks", () => {
    const chapter = {
      chapter: {
        number: 1,
        content: [
          { type: "heading", content: ["Creation"] },
          { type: "verse", number: 1, content: ["In the beginning..."] },
          { type: "line_break" },
          { type: "verse", number: 2, content: ["And the earth..."] },
          { type: "hebrew_subtitle", content: ["A subtitle"] },
          { type: "verse", number: 3, content: ["And God said..."] },
        ],
        footnotes: [],
      },
    } as unknown as TranslationBookChapter;

    expect(chapterVerseNumbers(chapter)).toEqual([1, 2, 3]);
  });

  it("returns an empty list for a chapter with no verses", () => {
    const chapter = {
      chapter: {
        number: 1,
        content: [{ type: "heading", content: ["Title only"] }],
        footnotes: [],
      },
    } as unknown as TranslationBookChapter;

    expect(chapterVerseNumbers(chapter)).toEqual([]);
  });
});
