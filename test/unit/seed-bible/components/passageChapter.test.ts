import { passageChapter } from "@packages/seed-bible/seed-bible/components/PlaylistCompareStep/passageChapter";
import type {
  ChapterContent,
  TranslationBookChapter,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

const verse = (number: number): ChapterContent => ({
  type: "verse",
  number,
  content: [`Verse ${number}.`],
});

function chapter(content: ChapterContent[]): TranslationBookChapter {
  return {
    book: { id: "PSA" },
    numberOfVerses: content.filter((entry) => entry.type === "verse").length,
    chapter: { number: 23, content, footnotes: [] },
  } as unknown as TranslationBookChapter;
}

/** What's left, as headings' text and verse numbers. */
const shown = (result: TranslationBookChapter) =>
  result.chapter.content.map((entry) =>
    entry.type === "verse"
      ? entry.number
      : entry.type === "heading"
        ? entry.content.join(" ")
        : entry.type
  );

describe("passageChapter", () => {
  const PSALM = chapter([
    { type: "heading", content: ["The Shepherd"] },
    verse(1),
    verse(2),
    { type: "heading", content: ["The Table"] },
    { type: "line_break" },
    verse(3),
    verse(4),
    verse(5),
  ]);

  it("keeps only the passage's verses, with the heading right above it", () => {
    expect(
      shown(
        passageChapter(PSALM, {
          bookId: "PSA",
          chapter: 23,
          verse: 3,
          endVerse: 4,
        })
      )
    ).toEqual(["The Table", "line_break", 3, 4]);
  });

  it("keeps a heading inside the passage", () => {
    expect(
      shown(
        passageChapter(PSALM, {
          bookId: "PSA",
          chapter: 23,
          verse: 2,
          endVerse: 3,
        })
      )
    ).toEqual([2, "The Table", "line_break", 3]);
  });

  it("runs a passage that continues into the next chapter to this one's end", () => {
    expect(
      shown(
        passageChapter(PSALM, {
          bookId: "PSA",
          chapter: 23,
          verse: 4,
          endChapter: 24,
          endVerse: 2,
        })
      )
    ).toEqual([4, 5]);
  });

  it("keeps the whole chapter for a whole-chapter passage", () => {
    expect(passageChapter(PSALM, { bookId: "PSA", chapter: 23 })).toBe(PSALM);
  });

  it("shows nothing of a chapter the passage isn't in, as while it loads", () => {
    expect(shown(passageChapter(PSALM, { bookId: "JHN", chapter: 1 }))).toEqual(
      []
    );
  });
});
