import { chapterVerseHeadings } from "@packages/audio-reader-extension/ext_audioReader/host/init";
import {
  aabBooks,
  makeChapter,
} from "../../seed-bible/managers/testUtils/mockBibleApiData";

const verse = (number: number) => ({
  type: "verse" as const,
  number,
  content: [`Verse ${number}`],
});
const heading = (...content: string[]) => ({
  type: "heading" as const,
  content,
});

describe("chapterVerseHeadings", () => {
  it("pairs each heading with the verse right after it", () => {
    const chapter = makeChapter(aabBooks, "ROM", 7, [
      verse(6),
      heading("God’s Law Is Holy"),
      verse(7),
      verse(8),
    ]);

    expect(chapterVerseHeadings(chapter)).toEqual(
      new Map([[7, "God’s Law Is Holy"]])
    );
  });

  it("joins a heading split into parts with spaces", () => {
    const chapter = makeChapter(aabBooks, "ROM", 7, [
      heading("God’s Law", "Is Holy"),
      verse(7),
    ]);

    expect(chapterVerseHeadings(chapter).get(7)).toBe("God’s Law Is Holy");
  });

  it("keeps the nearest of several headings stacked over one verse", () => {
    const chapter = makeChapter(aabBooks, "PSA", 1, [
      heading("Book One"),
      heading("The Two Ways"),
      verse(1),
    ]);

    expect(chapterVerseHeadings(chapter).get(1)).toBe("The Two Ways");
  });

  it("ignores a heading with something else between it and the verse", () => {
    const chapter = makeChapter(aabBooks, "ROM", 7, [
      heading("God’s Law Is Holy"),
      { type: "line_break" as const },
      verse(7),
    ]);

    expect(chapterVerseHeadings(chapter).size).toBe(0);
  });
});
