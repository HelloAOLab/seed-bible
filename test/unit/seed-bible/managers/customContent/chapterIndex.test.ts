import {
  affectedChapterKeys,
  buildChapterRecord,
  CHAPTER_ENTRY_DESCRIPTION_LENGTH,
  chapterCoverage,
  countPublishedChapters,
  paginateChapterRecord,
  publishedChapterKeys,
  sliceReferenceByChapter,
} from "@packages/seed-bible/seed-bible/managers/customContent/chapterIndex";
import {
  contentChapterAddress,
  parseContentChapterAddress,
  type ContentItem,
  type ContentReference,
} from "@packages/seed-bible/seed-bible/managers/customContent/schema";

function ref(
  reference: Omit<ContentReference, "source" | "confidence">
): ContentReference {
  return { ...reference, source: "owner", confidence: 1 };
}

function item(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: "item-1",
    url: "https://example.org/sermons/good-shepherd",
    status: "published",
    title: "The Good Shepherd",
    description: "A sermon on John 10.",
    categoryIds: ["sermons"],
    references: [ref({ book: "JHN", chapter: 10, verse: 1, endVerse: 18 })],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("sliceReferenceByChapter", () => {
  it("lists the verses of a range within one chapter", () => {
    expect(
      sliceReferenceByChapter({
        book: "JHN",
        chapter: 3,
        verse: 16,
        endVerse: 18,
      })
    ).toEqual([{ book: "JHN", chapter: 3, verses: [16, 17, 18] }]);
  });

  it("treats a reference with no verse as the whole chapter", () => {
    expect(sliceReferenceByChapter({ book: "ACT", chapter: 2 })).toEqual([
      { book: "ACT", chapter: 2, verses: [] },
    ]);
  });

  it("splits a range across chapters, clipping the verses to each one", () => {
    // Acts 1 has 26 verses.
    const slices = sliceReferenceByChapter({
      book: "ACT",
      chapter: 1,
      verse: 13,
      endChapter: 3,
      endVerse: 4,
    });
    expect(slices).toEqual([
      {
        book: "ACT",
        chapter: 1,
        verses: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
      },
      { book: "ACT", chapter: 2, verses: [] },
      { book: "ACT", chapter: 3, verses: [1, 2, 3, 4] },
    ]);
  });

  it("covers every chapter of a chapter range as whole chapters", () => {
    expect(
      sliceReferenceByChapter({ book: "GEN", chapter: 6, endChapter: 9 })
    ).toEqual([
      { book: "GEN", chapter: 6, verses: [] },
      { book: "GEN", chapter: 7, verses: [] },
      { book: "GEN", chapter: 8, verses: [] },
      { book: "GEN", chapter: 9, verses: [] },
    ]);
  });

  it("stops a range at the book's last chapter", () => {
    // Jude has one chapter; a typo'd end chapter must not create Jude 2–99.
    expect(
      sliceReferenceByChapter({ book: "JUD", chapter: 1, endChapter: 99 })
    ).toEqual([{ book: "JUD", chapter: 1, verses: [] }]);
  });
});

describe("buildChapterRecord", () => {
  it("returns null when nothing published is on the chapter", () => {
    expect(buildChapterRecord([item()], "JHN", 11, 5)).toBeNull();
    expect(
      buildChapterRecord([item({ status: "draft" })], "JHN", 10, 5)
    ).toBeNull();
  });

  it("gives an item one entry even when several of its references land in the chapter", () => {
    const record = buildChapterRecord(
      [
        item({
          references: [
            ref({ book: "JHN", chapter: 10, verse: 11 }),
            ref({ book: "JHN", chapter: 10, verse: 1, endVerse: 3 }),
          ],
        }),
      ],
      "JHN",
      10,
      5
    );
    expect(record?.entries).toHaveLength(1);
    expect(record?.entries[0]?.verses).toEqual([1, 2, 3, 11]);
    expect(record?.entries[0]?.reference).toEqual({
      book: "JHN",
      chapter: 10,
      verse: 1,
      endVerse: 11,
    });
  });

  it("lets a whole-chapter reference win over a verse range for the same item", () => {
    const record = buildChapterRecord(
      [
        item({
          references: [
            ref({ book: "PSA", chapter: 23, verse: 1 }),
            ref({ book: "PSA", chapter: 23 }),
          ],
        }),
      ],
      "PSA",
      23,
      5
    );
    expect(record?.entries[0]?.verses).toEqual([]);
    expect(record?.entries[0]?.reference).toEqual({ book: "PSA", chapter: 23 });
  });

  it("clips the reference to the chapter, so Discover keeps it on that chapter", () => {
    const record = buildChapterRecord(
      [
        item({
          references: [
            ref({
              book: "ACT",
              chapter: 1,
              verse: 13,
              endChapter: 2,
              endVerse: 4,
            }),
          ],
        }),
      ],
      "ACT",
      2,
      5
    );
    expect(record?.entries[0]?.reference).toEqual({
      book: "ACT",
      chapter: 2,
      verse: 1,
      endVerse: 4,
    });
  });

  it("shortens long descriptions and records how the link opens", () => {
    const record = buildChapterRecord(
      [
        item({
          url: "https://www.youtube.com/watch?v=1e5paRyGr0A",
          description: "x".repeat(1000),
        }),
      ],
      "JHN",
      10,
      5
    );
    const entry = record?.entries[0];
    expect(entry?.description).toHaveLength(CHAPTER_ENTRY_DESCRIPTION_LENGTH);
    expect(entry?.description.endsWith("…")).toBe(true);
    expect(entry?.mediaKind).toBe("embed");
  });

  it("orders whole-chapter items first, then by starting verse", () => {
    const record = buildChapterRecord(
      [
        item({
          id: "late",
          title: "Late",
          references: [ref({ book: "JHN", chapter: 10, verse: 30 })],
        }),
        item({
          id: "whole",
          title: "Whole",
          references: [ref({ book: "JHN", chapter: 10 })],
        }),
        item({
          id: "early",
          title: "Early",
          references: [ref({ book: "JHN", chapter: 10, verse: 2 })],
        }),
      ],
      "JHN",
      10,
      5
    );
    expect(record?.entries.map((entry) => entry.itemId)).toEqual([
      "whole",
      "early",
      "late",
    ]);
  });
});

describe("affectedChapterKeys", () => {
  it("includes the chapters an edit moved an item away from", () => {
    const before = item({ references: [ref({ book: "JHN", chapter: 3 })] });
    const after = item({ references: [ref({ book: "JHN", chapter: 4 })] });
    expect([...affectedChapterKeys(before, after)].sort()).toEqual([
      "JHN.3",
      "JHN.4",
    ]);
  });

  it("includes the old chapters when an item is unpublished or deleted", () => {
    const before = item();
    expect([
      ...affectedChapterKeys(before, { ...before, status: "draft" }),
    ]).toEqual(["JHN.10"]);
    expect([...affectedChapterKeys(before, undefined)]).toEqual(["JHN.10"]);
  });

  it("ignores drafts, which were never on any chapter", () => {
    expect(publishedChapterKeys(item({ status: "draft" })).size).toBe(0);
  });
});

describe("countPublishedChapters", () => {
  it("counts each published item once per chapter it appears on", () => {
    expect(
      countPublishedChapters([
        item({ id: "a" }),
        item({
          id: "b",
          references: [
            ref({ book: "JHN", chapter: 10, verse: 11 }),
            ref({ book: "JHN", chapter: 10, verse: 14 }),
            ref({ book: "PSA", chapter: 23 }),
          ],
        }),
        item({ id: "c", status: "draft" }),
      ])
    ).toEqual({ "JHN.10": 2, "PSA.23": 1 });
  });
});

describe("paginateChapterRecord", () => {
  const items = Array.from({ length: 30 }, (_, i) =>
    item({ id: `item-${i}`, title: `Sermon ${String(i).padStart(2, "0")}` })
  );
  const record = buildChapterRecord(items, "JHN", 10, 5)!;

  it("keeps a chapter that fits in one page as it is", () => {
    expect(paginateChapterRecord(record)).toEqual([record]);
  });

  it("splits a big chapter into pages under the size limit, in order", () => {
    const maxBytes = 2000;
    const pages = paginateChapterRecord(record, maxBytes);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      expect(JSON.stringify(page).length).toBeLessThanOrEqual(maxBytes);
      expect(page).toMatchObject({ book: "JHN", chapter: 10, updatedAt: 5 });
    }
    expect(pages.flatMap((page) => page.entries)).toEqual(record.entries);
  });

  it("gives an entry bigger than the limit a page of its own rather than dropping it", () => {
    const pages = paginateChapterRecord(record, 10);
    expect(pages).toHaveLength(30);
  });
});

describe("parseContentChapterAddress", () => {
  it("reads the chapter and page back from an address", () => {
    expect(parseContentChapterAddress(contentChapterAddress("1JN", 2))).toEqual(
      { key: "1JN.2", page: 1 }
    );
    expect(
      parseContentChapterAddress(contentChapterAddress("JHN", 3, 4))
    ).toEqual({ key: "JHN.3", page: 4 });
    expect(parseContentChapterAddress("item.abc")).toBeNull();
    expect(parseContentChapterAddress("ch.JHN.p2")).toBeNull();
  });
});

describe("chapterCoverage", () => {
  it("counts covered chapters out of the whole Bible, book by book", () => {
    const coverage = chapterCoverage({ "JHN.3": 4, "JHN.10": 1, "PSA.23": 2 });
    expect(coverage).toMatchObject({ covered: 3, total: 1189 });
    expect(coverage.books).toHaveLength(66);
    const john = coverage.books.find((book) => book.book === "JHN")!;
    expect(john.covered).toBe(2);
    expect(john.items).toHaveLength(21);
    expect(john.items[2]).toBe(4);
    expect(john.items[9]).toBe(1);
  });

  it("leaves out chapters outside the 66-book canon", () => {
    expect(chapterCoverage({ "TOB.1": 3 }).covered).toBe(0);
  });
});
