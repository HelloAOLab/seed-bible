import {
  discoveredContent,
  findDiscoveredContentForChapter,
  referenceCoversChapter,
  type DiscoveredContentItem,
} from "@packages/default-content-extension/ext_DefaultContent/discoveredContent";

describe("referenceCoversChapter", () => {
  it("matches a single-chapter reference for the same book and chapter", () => {
    expect(
      referenceCoversChapter(
        { book: "GEN", chapter: 28 },
        { book: "GEN", chapter: 28 }
      )
    ).toBe(true);
  });

  it("does not match a different book", () => {
    expect(
      referenceCoversChapter(
        { book: "GEN", chapter: 28 },
        { book: "JOS", chapter: 28 }
      )
    ).toBe(false);
  });

  it("does not match a different chapter when there is no range", () => {
    expect(
      referenceCoversChapter(
        { book: "GEN", chapter: 28 },
        { book: "GEN", chapter: 29 }
      )
    ).toBe(false);
  });

  it("matches any chapter within an endChapter range", () => {
    const reference = { book: "JOS", chapter: 7, endChapter: 8 };
    expect(referenceCoversChapter(reference, { book: "JOS", chapter: 7 })).toBe(
      true
    );
    expect(referenceCoversChapter(reference, { book: "JOS", chapter: 8 })).toBe(
      true
    );
  });

  it("does not match a chapter outside an endChapter range", () => {
    const reference = { book: "JOS", chapter: 7, endChapter: 8 };
    expect(referenceCoversChapter(reference, { book: "JOS", chapter: 9 })).toBe(
      false
    );
  });
});

describe("findDiscoveredContentForChapter", () => {
  const bethel: DiscoveredContentItem = {
    id: "bethel",
    title: "BETHEL: Where Jacob Met God",
    author: "Expedition Bible",
    description: "Description",
    url: "https://example.com/bethel",
    references: [{ book: "GEN", chapter: 28 }],
  };

  const problemOfAi: DiscoveredContentItem = {
    id: "problem-of-ai",
    title: "The Problem of Joshua's Ai...SOLVED!",
    author: "Expedition Bible",
    description: "Description",
    url: "https://example.com/ai",
    references: [
      { book: "JOS", chapter: 7, verse: 1, endVerse: 15 },
      { book: "JOS", chapter: 8, verse: 1, endVerse: 29 },
    ],
  };

  const items = [bethel, problemOfAi];

  it("returns items whose reference covers the given book/chapter", () => {
    const matches = findDiscoveredContentForChapter(
      { book: "GEN", chapter: 28 },
      items
    );

    expect(matches).toEqual([
      { item: bethel, reference: bethel.references[0] },
    ]);
  });

  it("matches the specific reference that covers the chapter for a multi-reference item", () => {
    expect(
      findDiscoveredContentForChapter({ book: "JOS", chapter: 7 }, items)
    ).toEqual([{ item: problemOfAi, reference: problemOfAi.references[0] }]);

    expect(
      findDiscoveredContentForChapter({ book: "JOS", chapter: 8 }, items)
    ).toEqual([{ item: problemOfAi, reference: problemOfAi.references[1] }]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(
      findDiscoveredContentForChapter({ book: "EXO", chapter: 1 }, items)
    ).toEqual([]);
  });

  it("defaults to the bundled discoveredContent.json data", () => {
    expect(Array.isArray(discoveredContent)).toBe(true);
    for (const item of discoveredContent) {
      expect(typeof item.id).toBe("string");
      expect(typeof item.title).toBe("string");
      expect(Array.isArray(item.references)).toBe(true);
      expect(item.references.length).toBeGreaterThan(0);
    }
  });
});
