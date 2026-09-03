import { signal } from "@preact/signals";
import {
  chapterVerseNumbers,
  isAudioPlayToolVisible,
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
