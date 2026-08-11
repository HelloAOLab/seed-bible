import type { ChapterContent } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  buildChapterExcerpt,
  extractContentText,
  truncateForMeta,
} from "@packages/seed-bible/seed-bible/managers/ChapterText";

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Counts what a reader sees as one character, matching the helper's budget. */
function graphemeCount(text: string): number {
  return [...GRAPHEMES.segment(text)].length;
}

/** Every code-unit offset in `text` that a cut may legally land on. */
function graphemeBoundaries(text: string): number[] {
  const boundaries = [0];
  let offset = 0;
  for (const { segment } of GRAPHEMES.segment(text)) {
    offset += segment.length;
    boundaries.push(offset);
  }
  return boundaries;
}

describe("extractContentText", () => {
  it("joins plain strings and formatted text", () => {
    expect(
      extractContentText([
        "In the beginning",
        { text: "God created" },
        "the heavens.",
      ])
    ).toBe("In the beginning God created the heavens.");
  });

  it("preserves the words-of-Jesus and poem formatting variants as plain text", () => {
    expect(
      extractContentText([
        { text: "Let there be light", wordsOfJesus: true },
        { text: "and there was light.", poem: 1 },
      ])
    ).toBe("Let there be light and there was light.");
  });

  it("drops inline headings, line breaks, and footnote references", () => {
    // None of these carry a `text` field, which is exactly why they vanish.
    expect(
      extractContentText([
        "The earth was formless",
        { heading: "The Creation" },
        { lineBreak: true },
        { noteId: 12 },
        "and void.",
      ])
    ).toBe("The earth was formless and void.");
  });

  it("collapses runs of whitespace and closes the space before punctuation", () => {
    expect(
      extractContentText(["Now  the\nearth", "was formless ,", "void ."])
    ).toBe("Now the earth was formless, void.");
  });

  it("returns an empty string for content with nothing quotable", () => {
    expect(extractContentText([{ lineBreak: true }, { noteId: 1 }])).toBe("");
  });

  // A verse's content array is split by every footnote reference, inline
  // heading, line break and words-of-Jesus span, so a space-less script hits
  // this constantly — red-letter Gospel text most of all.
  it("does not insert a space between parts of a space-less script", () => {
    expect(
      extractContentText(["起初神创造天地", { noteId: 1 }, "地是空虚混沌"])
    ).toBe("起初神创造天地地是空虚混沌");

    expect(
      extractContentText([
        "起初神创造天地",
        { text: "地是空虚混沌", wordsOfJesus: true },
      ])
    ).toBe("起初神创造天地地是空虚混沌");

    expect(
      extractContentText(["ในเริ่มแรก", { lineBreak: true }, "นั้นพระเจ้า"])
    ).toBe("ในเริ่มแรกนั้นพระเจ้า");
  });

  it("still spaces parts of a space-separated script", () => {
    expect(
      extractContentText(["In the beginning", { noteId: 1 }, "God created"])
    ).toBe("In the beginning God created");
  });
});

describe("buildChapterExcerpt", () => {
  it("joins verses in order without emitting verse numbers", () => {
    const content: ChapterContent[] = [
      { type: "verse", number: 1, content: ["In the beginning"] },
      { type: "verse", number: 2, content: ["the earth was formless"] },
      { type: "verse", number: 3, content: ["and God said"] },
    ];

    const excerpt = buildChapterExcerpt(content, 155);

    expect(excerpt).toBe(
      "In the beginning the earth was formless and God said"
    );
    expect(excerpt).not.toMatch(/\d/);
  });

  it("skips headings, Hebrew subtitles, and line breaks", () => {
    const content: ChapterContent[] = [
      { type: "heading", content: ["The Creation"] },
      { type: "hebrew_subtitle", content: ["A Psalm of David."] },
      { type: "line_break" },
      { type: "verse", number: 1, content: ["Have mercy on me, O God."] },
    ];

    expect(buildChapterExcerpt(content, 155)).toBe("Have mercy on me, O God.");
  });

  it("joins space-less scripts flush, without inserting a space", () => {
    const content: ChapterContent[] = [
      { type: "verse", number: 1, content: ["起初神创造天地。"] },
      { type: "verse", number: 2, content: ["地是空虚混沌，"] },
    ];

    expect(buildChapterExcerpt(content, 155)).toBe(
      "起初神创造天地。地是空虚混沌，"
    );
  });

  it("stops reading once the budget is met", () => {
    // Psalm 119 is ~5,000 characters and a snippet can use ~155. Reading the
    // whole thing to throw it away is the regression this guards.
    const content: ChapterContent[] = Array.from({ length: 200 }, (_, i) => ({
      type: "verse" as const,
      number: i + 1,
      content: [`This is verse number ${i + 1} of the chapter.`],
    }));

    const excerpt = buildChapterExcerpt(content, 155);

    expect(excerpt).toContain("verse number 1 ");
    expect(excerpt).not.toContain("verse number 200");
    // Enough to satisfy the budget, but nowhere near all 200 verses.
    expect(graphemeCount(excerpt)).toBeGreaterThanOrEqual(155);
    expect(graphemeCount(excerpt)).toBeLessThan(400);
  });

  it("returns an empty string when there are no verses", () => {
    expect(buildChapterExcerpt([{ type: "line_break" }], 155)).toBe("");
    expect(buildChapterExcerpt([], 155)).toBe("");
  });

  it("tolerates chapter data with no content array", () => {
    // Real fixtures (and older cached payloads) can omit it entirely.
    expect(buildChapterExcerpt(undefined, 155)).toBe("");
  });
});

describe("truncateForMeta", () => {
  const GENESIS_1 =
    "In the beginning God created the heavens and the earth. Now the earth was formless and void, and darkness was over the surface of the deep, and the Spirit of God was hovering over the surface of the waters.";

  it("returns short text unchanged, with no ellipsis", () => {
    expect(truncateForMeta("Verse 1 Verse 2", 155)).toBe("Verse 1 Verse 2");
  });

  it("cuts long text on a word boundary and marks it with an ellipsis", () => {
    const result = truncateForMeta(GENESIS_1, 155);

    expect(result.endsWith("…")).toBe(true);
    expect(graphemeCount(result)).toBeLessThanOrEqual(155);
    // The cut lands between words, so no partial word survives.
    const withoutEllipsis = result.slice(0, -1);
    expect(GENESIS_1.startsWith(withoutEllipsis)).toBe(true);
    expect(GENESIS_1[withoutEllipsis.length]).toBe(" ");
  });

  it("never exceeds the budget, across a spread of budgets", () => {
    for (const budget of [1, 2, 5, 20, 47, 100, 155, 204]) {
      expect(
        graphemeCount(truncateForMeta(GENESIS_1, budget))
      ).toBeLessThanOrEqual(budget);
    }
  });

  it("omits the ellipsis when the cut already ends a sentence", () => {
    const text =
      "In the beginning God created the heavens and the earth. Now the earth was formless.";

    // 55 graphemes lands exactly on the first period.
    expect(truncateForMeta(text, 56)).toBe(
      "In the beginning God created the heavens and the earth."
    );
  });

  it("breaks Chinese on dictionary word boundaries rather than returning nothing", () => {
    const zh =
      "起初神创造天地。地是空虚混沌，渊面黑暗；神的灵运行在水面上。神说：要有光，就有了光。神看光是好的，就把光暗分开了。";

    const result = truncateForMeta(zh, 30);

    expect(result).not.toBe("");
    expect(graphemeCount(result)).toBeLessThanOrEqual(30);
    expect(graphemeCount(result)).toBeGreaterThan(20);
  });

  it("breaks Thai on dictionary word boundaries rather than returning nothing", () => {
    const th =
      "ในเริ่มแรกนั้นพระเจ้าทรงเนรมิตสร้างฟ้าและแผ่นดินโลกแผ่นดินโลกนั้นก็ปราศจากรูปร่างและว่างเปล่าอยู่";

    const result = truncateForMeta(th, 30);

    expect(result).not.toBe("");
    expect(graphemeCount(result)).toBeLessThanOrEqual(30);
    expect(graphemeCount(result)).toBeGreaterThan(20);
  });

  it("cuts mid-token rather than returning almost nothing for one huge word", () => {
    // A dictionary miss or a URL-shaped string: honoring the only word
    // boundary available would throw the entire snippet away.
    const text = `a ${"x".repeat(300)}`;

    const result = truncateForMeta(text, 50);

    expect(graphemeCount(result)).toBeLessThanOrEqual(50);
    expect(graphemeCount(result)).toBeGreaterThan(40);
  });

  it("cuts pointed Hebrew only at grapheme boundaries", () => {
    // Not asserted via a trailing-combining-mark check: a correct cut normally
    // *does* end on a mark, because the mark belongs to the letter before it.
    // What must never happen is a cut landing inside a cluster, which would
    // strip a letter's vowel points or leave them attached to the ellipsis.
    const hebrew =
      "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ וְהָאָרֶץ הָיְתָה תֹהוּ וָבֹהוּ";

    for (const budget of [5, 8, 12, 17, 21, 30]) {
      const result = truncateForMeta(hebrew, budget);
      const body = result.replace(/…$/, "");

      expect(hebrew.startsWith(body)).toBe(true);
      expect(graphemeBoundaries(hebrew)).toContain(body.length);
      expect(graphemeCount(result)).toBeLessThanOrEqual(budget);
    }
  });

  it("does not split a surrogate pair", () => {
    const text = `${"word ".repeat(8)}𝕏𝕏𝕏𝕏 ${"more ".repeat(8)}`;

    for (const budget of [40, 41, 42, 43, 44, 45, 46]) {
      const result = truncateForMeta(text, budget);
      const body = result.replace(/…$/, "");

      expect(result).not.toMatch(/[\uD800-\uDBFF]$/);
      expect(graphemeBoundaries(text)).toContain(body.length);
    }
  });

  it("trims a dangling comma before the ellipsis", () => {
    expect(
      truncateForMeta("over the surface of the deep, and the Spirit", 30)
    ).toBe("over the surface of the deep…");
  });

  it("handles a zero or negative budget without throwing", () => {
    expect(truncateForMeta(GENESIS_1, 0)).toBe("");
    expect(truncateForMeta(GENESIS_1, -5)).toBe("");
  });
});
