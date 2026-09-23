import { signal } from "@preact/signals";
import {
  attachListeningRecorder,
  chapterSpeechLanguages,
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
  hasVerses?: boolean;
  /** The translation's ISO 639-3 code, as the Bible API reports it. */
  language?: string;
  playing?: unknown;
}): QuickToolContext {
  const content =
    overrides.hasVerses === false
      ? [{ type: "heading", content: ["A heading, and nothing to read"] }]
      : [{ type: "verse", number: 1, content: ["In the beginning"] }];
  return {
    readingState: {
      chapterData: signal({
        // An audio-less chapter carries an empty map, not null — the API type
        // makes `thisChapterAudioLinks` non-nullable.
        thisChapterAudioLinks:
          overrides.hasAudio === false
            ? {}
            : { reader: "https://example.com/a.mp3" },
        translation: { language: overrides.language ?? "eng" },
        chapter: { number: 1, content },
      }),
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

/** Stands in for a browser with voices installed for `langs` and no others. */
function voicesFor(...langs: string[]) {
  return (lang: string | null) => !!lang && langs.includes(lang);
}

const NO_VOICES = voicesFor();

describe("isAudioPlayToolVisible (#1607)", () => {
  it("is hidden on the quick-toolbar surface on mobile", () => {
    const ctx = createContext({ surface: "quick-toolbar", isMobile: true });
    expect(isAudioPlayToolVisible(ctx, NO_VOICES)).toBe(false);
  });

  it("is visible on the mobile-navigation-bar surface on mobile", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
    });
    expect(isAudioPlayToolVisible(ctx, NO_VOICES)).toBe(true);
  });

  it("is visible on the quick-toolbar surface on desktop", () => {
    const ctx = createContext({ surface: "quick-toolbar", isMobile: false });
    expect(isAudioPlayToolVisible(ctx, NO_VOICES)).toBe(true);
  });

  it("is hidden when the chapter has no audio and the browser cannot speak", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
    });
    expect(isAudioPlayToolVisible(ctx, NO_VOICES)).toBe(false);
  });

  it("is hidden while a playlist is playing, regardless of surface", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: false,
      playing: { id: "playing" },
    });
    expect(isAudioPlayToolVisible(ctx, NO_VOICES)).toBe(false);
  });
});

describe("isAudioPlayToolVisible speech fallback (#1769)", () => {
  it("is visible without recorded audio when the browser can speak", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
    });
    expect(isAudioPlayToolVisible(ctx, voicesFor("en"))).toBe(true);
  });

  it("stays hidden without recorded audio when there is nothing to read", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
      hasVerses: false,
    });
    expect(isAudioPlayToolVisible(ctx, voicesFor("en"))).toBe(false);
  });

  it("stays hidden on the quick toolbar on mobile, speech or not", () => {
    const ctx = createContext({
      surface: "quick-toolbar",
      isMobile: true,
      hasAudio: false,
    });
    expect(isAudioPlayToolVisible(ctx, voicesFor("en"))).toBe(false);
  });

  it("stays hidden while a playlist is playing, speech or not", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: false,
      hasAudio: false,
      playing: { id: "playing" },
    });
    expect(isAudioPlayToolVisible(ctx, voicesFor("en"))).toBe(false);
  });

  it("stays hidden when no installed voice can read the translation's language", () => {
    // A Greek translation on a machine that only has English voices: speaking
    // it would be an English voice sounding out Greek letters.
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
      language: "ell",
    });
    expect(isAudioPlayToolVisible(ctx, voicesFor("en"))).toBe(false);
    expect(isAudioPlayToolVisible(ctx, voicesFor("el"))).toBe(true);
  });

  it("asks about the translation's language, not the reader's", () => {
    // "spa" is what the Bible API reports; "es" is what voices are labelled
    // with, so the ISO 639-3 code must be mapped before anything is asked.
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
      language: "spa",
    });
    expect(isAudioPlayToolVisible(ctx, voicesFor("es"))).toBe(true);
    expect(isAudioPlayToolVisible(ctx, voicesFor("fr"))).toBe(false);
  });

  it("reaches languages the UI ships no locale for", () => {
    // Hausa is outside `UI_TO_BIBLE_LANGUAGE_CODES` entirely, but CLDR knows
    // "hau" is the language voices label "ha".
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
      language: "hau",
    });
    expect(isAudioPlayToolVisible(ctx, voicesFor("ha"))).toBe(true);
    expect(isAudioPlayToolVisible(ctx, voicesFor("en"))).toBe(false);
  });

  it("keeps a language that has no two-letter form as it is", () => {
    // "haw" is already the tag a Hawaiian voice carries; there's nothing to
    // shorten it to, and inventing something would match nothing.
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
      language: "haw",
    });
    expect(isAudioPlayToolVisible(ctx, voicesFor("haw"))).toBe(true);
    expect(isAudioPlayToolVisible(ctx, voicesFor("en"))).toBe(false);
  });

  it("lets a related language stand in only when the script matches", () => {
    // Marathi and Hindi are both Devanagari, so a Hindi voice can at least
    // sound the letters out. `LANG_META` already pairs them.
    const marathi = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
      language: "mar",
    });
    expect(isAudioPlayToolVisible(marathi, voicesFor("hi"))).toBe(true);

    // Gujarati is paired with Hindi too, but writes in a different script —
    // a Hindi voice has no glyphs for it, so the button stays hidden.
    const gujarati = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
      language: "guj",
    });
    expect(isAudioPlayToolVisible(gujarati, voicesFor("hi"))).toBe(false);
    expect(isAudioPlayToolVisible(gujarati, voicesFor("gu"))).toBe(true);
  });

  it("prefers the real language over its stand-in when both have voices", () => {
    const marathi = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
      language: "mar",
    });
    // Every way of naming Marathi comes before the Hindi stand-in, so a
    // Marathi voice is always taken over borrowing one.
    expect(
      chapterSpeechLanguages(marathi.readingState.chapterData.value!)
    ).toEqual(["mr", "mar", "hi"]);
  });

  it("admits same-script pairs that only look alike (a known limitation)", () => {
    // German falls back to English and both are Latin, so an English voice is
    // offered for a German chapter. It reads badly — but this tier only fires
    // when the machine has no German voice at all, so the alternative is no
    // Listen button rather than a better one.
    const german = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
      language: "deu",
    });
    expect(isAudioPlayToolVisible(german, voicesFor("en"))).toBe(true);
    expect(isAudioPlayToolVisible(german, voicesFor("de"))).toBe(true);
  });

  it("accepts whichever tag has a voice when the two sources disagree", () => {
    // Indonesian: the curated map leaves "ind" alone (it's the UI locale key),
    // while voices say "id" — CLDR is the one that's right here.
    const indonesian = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
      language: "ind",
    });
    expect(isAudioPlayToolVisible(indonesian, voicesFor("id"))).toBe(true);

    // Malay: the reverse — CLDR leaves "zlm" alone, while the curated map
    // knows Malay voices are labelled "ms".
    const malay = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      hasAudio: false,
      language: "zlm",
    });
    expect(isAudioPlayToolVisible(malay, voicesFor("ms"))).toBe(true);
  });

  it("still shows recorded audio when no voice can read the language", () => {
    const ctx = createContext({
      surface: "mobile-navigation-bar",
      isMobile: true,
      language: "ell",
    });
    expect(isAudioPlayToolVisible(ctx, NO_VOICES)).toBe(true);
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
