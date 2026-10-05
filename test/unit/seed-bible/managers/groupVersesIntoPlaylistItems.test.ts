import { groupVersesIntoPlaylistItems } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

function verse(bookId: string, chapter: number, verseNumber: number) {
  return { bookId, chapter, verse: verseNumber };
}

function chapter(bookId: string, chapterNumber: number) {
  return { bookId, chapter: chapterNumber };
}

describe("groupVersesIntoPlaylistItems", () => {
  it("returns an empty list when nothing is selected", () => {
    expect(groupVersesIntoPlaylistItems([])).toEqual([]);
  });

  it("keeps a single verse as one item without an end verse", () => {
    expect(groupVersesIntoPlaylistItems([verse("GEN", 1, 1)])).toEqual([
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 1, verse: 1 } },
    ]);
  });

  it("collapses consecutive verses in one chapter into a single range", () => {
    expect(
      groupVersesIntoPlaylistItems([
        verse("EXO", 26, 1),
        verse("EXO", 26, 2),
        verse("EXO", 26, 3),
        verse("EXO", 26, 4),
        verse("EXO", 26, 5),
        verse("EXO", 26, 6),
        verse("EXO", 26, 7),
        verse("EXO", 26, 8),
        verse("EXO", 26, 9),
        verse("EXO", 26, 10),
        verse("EXO", 26, 11),
      ])
    ).toEqual([
      {
        type: "bible-verse",
        ref: { bookId: "EXO", chapter: 26, verse: 1, endVerse: 11 },
      },
    ]);
  });

  it("splits a gapped selection into one item per contiguous run", () => {
    expect(
      groupVersesIntoPlaylistItems([
        verse("EXO", 26, 1),
        verse("EXO", 26, 2),
        verse("EXO", 26, 3),
        verse("EXO", 26, 4),
        verse("EXO", 26, 9),
        verse("EXO", 26, 10),
      ])
    ).toEqual([
      {
        type: "bible-verse",
        ref: { bookId: "EXO", chapter: 26, verse: 1, endVerse: 4 },
      },
      {
        type: "bible-verse",
        ref: { bookId: "EXO", chapter: 26, verse: 9, endVerse: 10 },
      },
    ]);
  });

  it("adds two items for Exodus 26:1-11 and 15-17", () => {
    const verses = [
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => verse("EXO", 26, n)),
      ...[15, 16, 17].map((n) => verse("EXO", 26, n)),
    ];

    expect(groupVersesIntoPlaylistItems(verses)).toEqual([
      {
        type: "bible-verse",
        ref: { bookId: "EXO", chapter: 26, verse: 1, endVerse: 11 },
      },
      {
        type: "bible-verse",
        ref: { bookId: "EXO", chapter: 26, verse: 15, endVerse: 17 },
      },
    ]);
  });

  it("sorts an unsorted selection before grouping", () => {
    expect(
      groupVersesIntoPlaylistItems([
        verse("EXO", 26, 10),
        verse("EXO", 26, 1),
        verse("EXO", 26, 9),
        verse("EXO", 26, 2),
      ])
    ).toEqual([
      {
        type: "bible-verse",
        ref: { bookId: "EXO", chapter: 26, verse: 1, endVerse: 2 },
      },
      {
        type: "bible-verse",
        ref: { bookId: "EXO", chapter: 26, verse: 9, endVerse: 10 },
      },
    ]);
  });

  it("drops duplicate verses", () => {
    expect(
      groupVersesIntoPlaylistItems([
        verse("GEN", 1, 1),
        verse("GEN", 1, 2),
        verse("GEN", 1, 1),
      ])
    ).toEqual([
      {
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 1, verse: 1, endVerse: 2 },
      },
    ]);
  });

  it("sorts different books into canonical order and does not merge them", () => {
    expect(
      groupVersesIntoPlaylistItems([
        verse("JHN", 3, 16),
        verse("GEN", 1, 1),
        verse("GEN", 1, 2),
        verse("EXO", 1, 1),
      ])
    ).toEqual([
      {
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 1, verse: 1, endVerse: 2 },
      },
      { type: "bible-verse", ref: { bookId: "EXO", chapter: 1, verse: 1 } },
      { type: "bible-verse", ref: { bookId: "JHN", chapter: 3, verse: 16 } },
    ]);
  });

  it("does not join the same verse number across different chapters", () => {
    expect(
      groupVersesIntoPlaylistItems([verse("GEN", 1, 1), verse("GEN", 2, 1)])
    ).toEqual([
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 1, verse: 1 } },
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 2, verse: 1 } },
    ]);
  });

  it("joins a chapter-boundary run when the previous chapter's last verse is known", () => {
    expect(
      groupVersesIntoPlaylistItems(
        [verse("GEN", 1, 31), verse("GEN", 2, 1), verse("GEN", 2, 2)],
        (bookId, chapterNumber) =>
          bookId === "GEN" && chapterNumber === 1 ? 31 : undefined
      )
    ).toEqual([
      {
        type: "bible-verse",
        ref: {
          bookId: "GEN",
          chapter: 1,
          verse: 31,
          endChapter: 2,
          endVerse: 2,
        },
      },
    ]);
  });

  it("does not join across chapters when the previous verse is not the last", () => {
    expect(
      groupVersesIntoPlaylistItems(
        [verse("GEN", 1, 5), verse("GEN", 2, 1)],
        (bookId, chapterNumber) =>
          bookId === "GEN" && chapterNumber === 1 ? 31 : undefined
      )
    ).toEqual([
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 1, verse: 5 } },
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 2, verse: 1 } },
    ]);
  });

  it("collapses consecutive whole chapters into one chapter-range item", () => {
    expect(
      groupVersesIntoPlaylistItems([
        chapter("JHN", 1),
        chapter("JHN", 2),
        chapter("JHN", 3),
      ])
    ).toEqual([
      {
        type: "bible-verse",
        ref: { bookId: "JHN", chapter: 1, endChapter: 3 },
      },
    ]);
  });

  it("keeps a gap between whole chapters as separate items", () => {
    expect(
      groupVersesIntoPlaylistItems([chapter("JHN", 1), chapter("JHN", 3)])
    ).toEqual([
      { type: "bible-verse", ref: { bookId: "JHN", chapter: 1 } },
      { type: "bible-verse", ref: { bookId: "JHN", chapter: 3 } },
    ]);
  });

  it("does not mix a whole-chapter selection with verses in that chapter", () => {
    expect(
      groupVersesIntoPlaylistItems([
        chapter("GEN", 1),
        verse("GEN", 1, 1),
        verse("GEN", 1, 2),
      ])
    ).toEqual([
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 1 } },
      {
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 1, verse: 1, endVerse: 2 },
      },
    ]);
  });

  it("sorts unknown book ids after canonical books, then alphabetically", () => {
    expect(
      groupVersesIntoPlaylistItems([
        verse("ZZZ", 1, 1),
        verse("AAA", 1, 1),
        verse("GEN", 1, 1),
      ])
    ).toEqual([
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 1, verse: 1 } },
      { type: "bible-verse", ref: { bookId: "AAA", chapter: 1, verse: 1 } },
      { type: "bible-verse", ref: { bookId: "ZZZ", chapter: 1, verse: 1 } },
    ]);
  });

  describe("Psalms", () => {
    it("collapses consecutive verses in one psalm into a single range", () => {
      expect(
        groupVersesIntoPlaylistItems([
          verse("PSA", 23, 1),
          verse("PSA", 23, 2),
          verse("PSA", 23, 3),
          verse("PSA", 23, 4),
        ])
      ).toEqual([
        {
          type: "bible-verse",
          ref: { bookId: "PSA", chapter: 23, verse: 1, endVerse: 4 },
        },
      ]);
    });

    it("still groups a psalm range when verses were selected out of order", () => {
      expect(
        groupVersesIntoPlaylistItems([
          verse("PSA", 23, 4),
          verse("PSA", 23, 1),
          verse("PSA", 23, 3),
          verse("PSA", 23, 2),
        ])
      ).toEqual([
        {
          type: "bible-verse",
          ref: { bookId: "PSA", chapter: 23, verse: 1, endVerse: 4 },
        },
      ]);
    });

    it("keeps gapped verses in a long psalm as separate items", () => {
      expect(
        groupVersesIntoPlaylistItems([
          verse("PSA", 119, 1),
          verse("PSA", 119, 2),
          verse("PSA", 119, 175),
          verse("PSA", 119, 176),
        ])
      ).toEqual([
        {
          type: "bible-verse",
          ref: { bookId: "PSA", chapter: 119, verse: 1, endVerse: 2 },
        },
        {
          type: "bible-verse",
          ref: { bookId: "PSA", chapter: 119, verse: 175, endVerse: 176 },
        },
      ]);
    });

    it("groups every verse of a two-verse psalm into one item", () => {
      expect(
        groupVersesIntoPlaylistItems([
          verse("PSA", 117, 2),
          verse("PSA", 117, 1),
        ])
      ).toEqual([
        {
          type: "bible-verse",
          ref: { bookId: "PSA", chapter: 117, verse: 1, endVerse: 2 },
        },
      ]);
    });

    it("does not merge the same verse number from different psalms", () => {
      expect(
        groupVersesIntoPlaylistItems([verse("PSA", 2, 1), verse("PSA", 1, 1)])
      ).toEqual([
        { type: "bible-verse", ref: { bookId: "PSA", chapter: 1, verse: 1 } },
        { type: "bible-verse", ref: { bookId: "PSA", chapter: 2, verse: 1 } },
      ]);
    });

    it("does not treat verse numbers as continuous across psalm chapters", () => {
      // Psalm 23:1 then Psalm 24:2 look like 1, 2 if chapter is ignored.
      expect(
        groupVersesIntoPlaylistItems([verse("PSA", 23, 1), verse("PSA", 24, 2)])
      ).toEqual([
        { type: "bible-verse", ref: { bookId: "PSA", chapter: 23, verse: 1 } },
        { type: "bible-verse", ref: { bookId: "PSA", chapter: 24, verse: 2 } },
      ]);
    });

    it("does not join the last verse of one psalm to verse 1 of the next without a verse count", () => {
      expect(
        groupVersesIntoPlaylistItems([verse("PSA", 1, 6), verse("PSA", 2, 1)])
      ).toEqual([
        { type: "bible-verse", ref: { bookId: "PSA", chapter: 1, verse: 6 } },
        { type: "bible-verse", ref: { bookId: "PSA", chapter: 2, verse: 1 } },
      ]);
    });

    it("joins adjacent psalms only when the first psalm's last verse is known", () => {
      expect(
        groupVersesIntoPlaylistItems(
          [verse("PSA", 1, 6), verse("PSA", 2, 1), verse("PSA", 2, 2)],
          (bookId, chapterNumber) =>
            bookId === "PSA" && chapterNumber === 1 ? 6 : undefined
        )
      ).toEqual([
        {
          type: "bible-verse",
          ref: {
            bookId: "PSA",
            chapter: 1,
            verse: 6,
            endChapter: 2,
            endVerse: 2,
          },
        },
      ]);
    });

    it("does not join Psalm 1:3 to Psalm 2:1 even when Psalm 1 has 6 verses", () => {
      expect(
        groupVersesIntoPlaylistItems(
          [verse("PSA", 1, 3), verse("PSA", 2, 1)],
          (bookId, chapterNumber) =>
            bookId === "PSA" && chapterNumber === 1 ? 6 : undefined
        )
      ).toEqual([
        { type: "bible-verse", ref: { bookId: "PSA", chapter: 1, verse: 3 } },
        { type: "bible-verse", ref: { bookId: "PSA", chapter: 2, verse: 1 } },
      ]);
    });
  });

  describe("must not merge (false positives)", () => {
    it("does not merge a one-verse gap into a single range", () => {
      expect(
        groupVersesIntoPlaylistItems([
          verse("GEN", 1, 1),
          verse("GEN", 1, 2),
          verse("GEN", 1, 4),
        ])
      ).toEqual([
        {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 1, verse: 1, endVerse: 2 },
        },
        { type: "bible-verse", ref: { bookId: "GEN", chapter: 1, verse: 4 } },
      ]);
    });

    it("does not merge the same verse number across different books", () => {
      expect(
        groupVersesIntoPlaylistItems([
          verse("GEN", 1, 1),
          verse("EXO", 1, 1),
          verse("PSA", 1, 1),
        ])
      ).toEqual([
        { type: "bible-verse", ref: { bookId: "GEN", chapter: 1, verse: 1 } },
        { type: "bible-verse", ref: { bookId: "EXO", chapter: 1, verse: 1 } },
        { type: "bible-verse", ref: { bookId: "PSA", chapter: 1, verse: 1 } },
      ]);
    });

    it("does not merge 1 John and 2 John even with matching chapter and verse", () => {
      expect(
        groupVersesIntoPlaylistItems([verse("2JN", 1, 1), verse("1JN", 1, 1)])
      ).toEqual([
        { type: "bible-verse", ref: { bookId: "1JN", chapter: 1, verse: 1 } },
        { type: "bible-verse", ref: { bookId: "2JN", chapter: 1, verse: 1 } },
      ]);
    });

    it("does not merge the last verse of one book into the next book", () => {
      expect(
        groupVersesIntoPlaylistItems(
          [verse("MAL", 4, 6), verse("MAT", 1, 1)],
          (bookId, chapterNumber) =>
            bookId === "MAL" && chapterNumber === 4 ? 6 : undefined
        )
      ).toEqual([
        { type: "bible-verse", ref: { bookId: "MAL", chapter: 4, verse: 6 } },
        { type: "bible-verse", ref: { bookId: "MAT", chapter: 1, verse: 1 } },
      ]);
    });

    it("does not join across chapters when the verse count belongs to a different chapter", () => {
      expect(
        groupVersesIntoPlaylistItems(
          [verse("GEN", 1, 31), verse("GEN", 2, 1)],
          (bookId, chapterNumber) =>
            bookId === "GEN" && chapterNumber === 2 ? 25 : undefined
        )
      ).toEqual([
        { type: "bible-verse", ref: { bookId: "GEN", chapter: 1, verse: 31 } },
        { type: "bible-verse", ref: { bookId: "GEN", chapter: 2, verse: 1 } },
      ]);
    });

    it("does not join when sorting by verse number alone would look consecutive", () => {
      // Genesis 2:1 then Genesis 1:2 is 1, 2 if chapter is ignored.
      expect(
        groupVersesIntoPlaylistItems([verse("GEN", 2, 1), verse("GEN", 1, 2)])
      ).toEqual([
        { type: "bible-verse", ref: { bookId: "GEN", chapter: 1, verse: 2 } },
        { type: "bible-verse", ref: { bookId: "GEN", chapter: 2, verse: 1 } },
      ]);
    });
  });

  describe("must merge (false negatives)", () => {
    it("groups a reverse-selected run instead of leaving one item per verse", () => {
      expect(
        groupVersesIntoPlaylistItems([
          verse("GEN", 1, 4),
          verse("GEN", 1, 3),
          verse("GEN", 1, 2),
          verse("GEN", 1, 1),
        ])
      ).toEqual([
        {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 1, verse: 1, endVerse: 4 },
        },
      ]);
    });

    it("groups consecutive verses in a single-chapter book", () => {
      expect(
        groupVersesIntoPlaylistItems([
          verse("JUD", 1, 3),
          verse("JUD", 1, 1),
          verse("JUD", 1, 2),
        ])
      ).toEqual([
        {
          type: "bible-verse",
          ref: { bookId: "JUD", chapter: 1, verse: 1, endVerse: 3 },
        },
      ]);
    });

    it("keeps a lone verse between two ranges as its own item, without breaking the ranges", () => {
      expect(
        groupVersesIntoPlaylistItems([
          verse("GEN", 1, 1),
          verse("GEN", 1, 2),
          verse("GEN", 1, 3),
          verse("GEN", 1, 5),
          verse("GEN", 1, 7),
          verse("GEN", 1, 8),
          verse("GEN", 1, 9),
        ])
      ).toEqual([
        {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 1, verse: 1, endVerse: 3 },
        },
        { type: "bible-verse", ref: { bookId: "GEN", chapter: 1, verse: 5 } },
        {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 1, verse: 7, endVerse: 9 },
        },
      ]);
    });
  });
});
