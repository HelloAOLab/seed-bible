import { computeSuggestions } from "@packages/seed-bible/seed-bible/components/ScriptureItemInput/scriptureSuggestions";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

function book(
  id: string,
  commonName: string,
  name = commonName,
  numberOfChapters = 50,
  totalNumberOfVerses = 1000
): TranslationBook {
  return {
    id,
    name,
    commonName,
    title: null,
    order: 1,
    numberOfChapters,
    firstChapterNumber: 1,
    totalNumberOfVerses,
  } as TranslationBook;
}

const BOOKS: TranslationBook[] = [
  book("GEN", "Genesis", "Genesis", 50, 1533),
  book("JHN", "John", "John", 21, 879),
  book("PHP", "Philippians", "Philippians", 4, 104),
  book("PHM", "Philemon", "Philemon", 1, 25),
  book("JDG", "Judges", "Judges", 21, 618),
  book("JUD", "Jude", "Jude", 1, 25),
];

/** Collapses suggestions to a compact shape for readable assertions. */
function shape(input: string) {
  return computeSuggestions(input, BOOKS).map((s) => ({
    id: s.book.id,
    labels: s.options.map((o) => o.label),
  }));
}

describe("computeSuggestions", () => {
  it("lists every chapter of each prefix-matched book when no chapter is typed", () => {
    // The example from the feature request: "Phil" -> Philippians (1-4) and
    // Philemon (1).
    expect(shape("Phil")).toEqual([
      { id: "PHP", labels: ["1", "2", "3", "4"] },
      { id: "PHM", labels: ["1"] },
    ]);
  });

  it("narrows to matching chapters (multi-chapter) and verses (single-chapter)", () => {
    // Philippians (4 chapters) matches chapter 2 by prefix; Philemon (one
    // chapter) reads "2" as verse 2 -> 1:2.
    expect(shape("Phil 2")).toEqual([
      { id: "PHP", labels: ["2"] },
      { id: "PHM", labels: ["1:2"] },
    ]);
  });

  it("prefix-matches chapters for a multi-chapter book", () => {
    // Judges has 21 chapters, so typing "2" surfaces 2, 20 and 21.
    expect(shape("Judg 2")).toEqual([{ id: "JDG", labels: ["2", "20", "21"] }]);
  });

  it("attaches the exact ref (with chapter) to each option", () => {
    const [philippians] = computeSuggestions("Phil 2", BOOKS);
    expect(philippians?.options[0]?.ref).toEqual({
      bookId: "PHP",
      chapter: 2,
    });
  });

  it("matches by book id prefix", () => {
    expect(shape("phm")).toEqual([{ id: "PHM", labels: ["1"] }]);
  });

  it("keeps a typed verse on the option and shows it in the label", () => {
    const [john] = computeSuggestions("John 3:16", BOOKS);
    expect(john?.book.id).toBe("JHN");
    expect(john?.options).toEqual([
      { label: "3:16", ref: { bookId: "JHN", chapter: 3, verse: 16 } },
    ]);
  });

  it("applies single-chapter verse shorthand", () => {
    // Philemon has one chapter, so "Philemon 2" means verse 2 (labelled 1:2).
    expect(computeSuggestions("Philemon 2", BOOKS)).toEqual([
      {
        book: BOOKS[3],
        options: [
          { label: "1:2", ref: { bookId: "PHM", chapter: 1, verse: 2 } },
        ],
      },
    ]);
  });

  it("mixes multi-chapter prefixing with single-chapter verses across matches", () => {
    // "Jud" prefixes both Judges (21 chapters) and Jude (one chapter, 25
    // verses). "Jud 2" -> Judges 2/20/21 as chapters and Jude 1:2 as a verse.
    expect(shape("Jud 2")).toEqual([
      { id: "JDG", labels: ["2", "20", "21"] },
      { id: "JUD", labels: ["1:2"] },
    ]);
    const [, jude] = computeSuggestions("Jud 2", BOOKS);
    expect(jude?.options[0]?.ref).toEqual({
      bookId: "JUD",
      chapter: 1,
      verse: 2,
    });
  });

  it("validates single-chapter verses against totalNumberOfVerses", () => {
    // Jude has 25 verses, so verse 22 is valid...
    expect(shape("Jude 22")).toEqual([{ id: "JUD", labels: ["1:22"] }]);
    // ...but 26 is past the end, so Jude offers nothing (and "Jud 26" also has
    // no Judges chapter starting with "26").
    expect(shape("Jud 26")).toEqual([]);
  });

  it("returns nothing for empty input or an unknown book", () => {
    expect(computeSuggestions("", BOOKS)).toEqual([]);
    expect(computeSuggestions("   ", BOOKS)).toEqual([]);
    expect(computeSuggestions("Nope", BOOKS)).toEqual([]);
    expect(computeSuggestions("Nope 1", BOOKS)).toEqual([]);
  });
});
