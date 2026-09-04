import { signal } from "@preact/signals";
import {
  chapterVerseNumbers,
  isAudioPlayToolVisible,
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
