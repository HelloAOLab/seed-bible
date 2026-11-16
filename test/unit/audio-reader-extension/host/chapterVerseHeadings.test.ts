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

  it("looks past a line break between the heading and its verse", () => {
    const chapter = makeChapter(aabBooks, "ROM", 7, [
      heading("God’s Law Is Holy"),
      { type: "line_break" as const },
      verse(7),
    ]);

    expect(chapterVerseHeadings(chapter).get(7)).toBe("God’s Law Is Holy");
  });

  it("ignores a heading with other content between it and the verse", () => {
    const chapter = makeChapter(aabBooks, "PSA", 3, [
      heading("Book One"),
      { type: "hebrew_subtitle" as const, content: ["A Psalm of David."] },
      verse(1),
    ]);

    expect(chapterVerseHeadings(chapter).size).toBe(0);
  });

  describe("a heading embedded in a verse's text", () => {
    it("belongs to the verse when it opens it", () => {
      const chapter = makeChapter(aabBooks, "GEN", 39, [
        verse(12),
        {
          type: "verse" as const,
          number: 13,
          content: [{ heading: "Joseph Falsely Imprisoned" }, "When she saw"],
        },
      ]);

      expect(chapterVerseHeadings(chapter)).toEqual(
        new Map([[13, "Joseph Falsely Imprisoned"]])
      );
    });

    it("belongs to the verse when more of it follows", () => {
      const chapter = makeChapter(aabBooks, "GEN", 39, [
        {
          type: "verse" as const,
          number: 13,
          content: [
            "But he left his cloak.",
            { heading: "Joseph Falsely Imprisoned" },
            { text: "When she saw" },
          ],
        },
      ]);

      expect(chapterVerseHeadings(chapter).get(13)).toBe(
        "Joseph Falsely Imprisoned"
      );
    });

    it("opens the next verse when nothing of its own verse follows it", () => {
      const chapter = makeChapter(aabBooks, "GEN", 39, [
        {
          type: "verse" as const,
          number: 12,
          content: [
            "He fled outside.",
            { heading: "Joseph Falsely Imprisoned" },
            { noteId: 1 },
          ],
        },
        verse(13),
      ]);

      expect(chapterVerseHeadings(chapter)).toEqual(
        new Map([[13, "Joseph Falsely Imprisoned"]])
      );
    });
  });
});
