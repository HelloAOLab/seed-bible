import { computeSuggestions } from "@packages/seed-bible/seed-bible/components/ScriptureItemInput/scriptureSuggestions";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

function book(
  id: string,
  commonName: string,
  name = commonName,
  numberOfChapters = 50
): TranslationBook {
  return {
    id,
    name,
    commonName,
    title: null,
    order: 1,
    numberOfChapters,
    firstChapterNumber: 1,
  } as TranslationBook;
}

const BOOKS: TranslationBook[] = [
  book("GEN", "Genesis", "Genesis", 50),
  book("JHN", "John", "John", 21),
  book("PHP", "Philippians", "Philippians", 4),
  book("PHM", "Philemon", "Philemon", 1),
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

  it("narrows to the matching chapter once a chapter is typed", () => {
    // Only Philippians has a chapter 2, so Philemon drops out.
    expect(shape("Phil 2")).toEqual([{ id: "PHP", labels: ["2"] }]);
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

  it("returns nothing for empty input or an unknown book", () => {
    expect(computeSuggestions("", BOOKS)).toEqual([]);
    expect(computeSuggestions("   ", BOOKS)).toEqual([]);
    expect(computeSuggestions("Nope", BOOKS)).toEqual([]);
    expect(computeSuggestions("Nope 1", BOOKS)).toEqual([]);
  });
});
