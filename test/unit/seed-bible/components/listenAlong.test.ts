import { signal } from "@preact/signals";
import {
  narrationStartFor,
  passageNarrated,
} from "@packages/seed-bible/seed-bible/components/BibleReaderToolbar/listenAlong";

/** A recording whose verses start every ten seconds: verse n at (n - 1) * 10. */
const recording = {
  duration: signal<number | null>(50),
  verseAt: (position: number) => ({
    number: Math.floor(position / 10) + 1,
    heading: null,
  }),
  verseMarks: () =>
    [1, 2, 3, 4, 5].map((number) => ({
      position: (number - 1) * 10,
      startsSection: false,
    })),
};

describe("narrationStartFor", () => {
  it("finds where the passage's first verse starts in the recording", () => {
    expect(narrationStartFor(recording, { verse: 3 })).toBe(20);
  });

  it("plays from the start for a whole chapter or a passage starting at verse 1", () => {
    expect(narrationStartFor(recording, {})).toBeNull();
    expect(narrationStartFor(recording, { verse: 1 })).toBeNull();
  });

  it("plays from the start when the recording can't say where verses are", () => {
    expect(
      narrationStartFor(
        { verseAt: undefined, verseMarks: undefined },
        { verse: 3 }
      )
    ).toBeNull();
  });
});

describe("passageNarrated", () => {
  it("is done once the verse being read is past the passage's last verse", () => {
    const ref = { verse: 2, endVerse: 3 };
    expect(passageNarrated(recording, ref, 25)).toBe(false);
    expect(passageNarrated(recording, ref, 30)).toBe(true);
  });

  it("treats a single verse as its own end", () => {
    expect(passageNarrated(recording, { verse: 2 }, 15)).toBe(false);
    expect(passageNarrated(recording, { verse: 2 }, 20)).toBe(true);
  });

  it("is done for a whole chapter only when the recording runs out", () => {
    expect(passageNarrated(recording, {}, 45)).toBe(false);
    expect(passageNarrated(recording, {}, 50)).toBe(true);
    expect(
      passageNarrated(recording, { verse: 2, toEndOfChapter: true }, 45)
    ).toBe(false);
  });
});
