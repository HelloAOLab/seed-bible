import {
  DEFAULT_UI_LANGUAGE,
  buildReadingPath,
  parseReadingPath,
} from "@packages/seed-bible/seed-bible/managers/ReadingUrlPath";

describe("parseReadingPath", () => {
  it("parses the 3-segment form (translation/book/chapter), implying the default language", () => {
    expect(parseReadingPath("/AAB/john/3", "")).toEqual({
      language: null,
      translationId: "AAB",
      bookId: "JHN",
      rawBookSegment: "john",
      chapter: 3,
      bookMatch: "exact",
    });
  });

  // Regression for the infinite-redirect loop fixed in 6e6e7b60: apocrypha
  // books had no `BOOK_ID_MAP` entry, so their own canonical slug resolved
  // only via the fuzzy fallback and every one of their URLs redirected to
  // itself forever.
  it.each(["tob", "jdt", "wis", "sir", "1ma", "lao"])(
    "treats the apocrypha slug %s as an exact match, not fuzzy",
    (slug) => {
      const parsed = parseReadingPath(`/AAB/${slug}/1`, "");
      expect(parsed?.bookMatch).toBe("exact");
      expect(parsed?.bookId).toBe(slug.toUpperCase());
    }
  );

  it("parses the 4-segment form (lang/translation/book/chapter)", () => {
    expect(parseReadingPath("/es/spa_onbv/john/3", "")).toEqual({
      language: "es",
      translationId: "spa_onbv",
      bookId: "JHN",
      rawBookSegment: "john",
      chapter: 3,
      bookMatch: "exact",
    });
  });

  it("strips the deployment basePath before parsing", () => {
    expect(
      parseReadingPath("/b/some-branch/AAB/john/3", "/b/some-branch")
    ).toEqual({
      language: null,
      translationId: "AAB",
      bookId: "JHN",
      rawBookSegment: "john",
      chapter: 3,
      bookMatch: "exact",
    });
  });

  it("decodes a percent-encoded translation id (custom-endpoint URL)", () => {
    const customUrl = "https://alt.example/api/NIV/books.json";
    const path = `/en/${encodeURIComponent(customUrl)}/john/3`;
    expect(parseReadingPath(path, "")).toEqual({
      language: "en",
      translationId: customUrl,
      bookId: "JHN",
      rawBookSegment: "john",
      chapter: 3,
      bookMatch: "exact",
    });
  });

  it("returns null for the prior 2-segment /{book}/{chapter} shape", () => {
    expect(parseReadingPath("/john/3", "")).toBeNull();
  });

  it("returns null for a bare root", () => {
    expect(parseReadingPath("/", "")).toBeNull();
  });

  it("returns null when the chapter segment isn't a positive integer", () => {
    expect(parseReadingPath("/AAB/john/0", "")).toBeNull();
    expect(parseReadingPath("/AAB/john/abc", "")).toBeNull();
  });

  it("fuzzy-matches a close typo of the book segment", () => {
    // "senesis" doesn't share getBookId's alias prefixes ("gen", "genesis"),
    // so this only resolves via the fuzzy fallback, not the exact/prefix path.
    const result = parseReadingPath("/AAB/senesis/1", "");
    expect(result).toEqual({
      language: null,
      translationId: "AAB",
      bookId: "GEN",
      rawBookSegment: "senesis",
      chapter: 1,
      bookMatch: "fuzzy",
    });
  });

  it("marks a truly unrecognized book as unresolved rather than returning null", () => {
    const result = parseReadingPath("/AAB/notabook/3", "");
    expect(result).toEqual({
      language: null,
      translationId: "AAB",
      bookId: null,
      rawBookSegment: "notabook",
      chapter: 3,
      bookMatch: "unresolved",
    });
  });

  it("still resolves language/translation/chapter correctly for an unresolved book", () => {
    const result = parseReadingPath("/es/spa_onbv/notabook/3", "");
    expect(result?.bookMatch).toBe("unresolved");
    expect(result?.language).toBe("es");
    expect(result?.translationId).toBe("spa_onbv");
    expect(result?.chapter).toBe(3);
  });
});

describe("buildReadingPath", () => {
  it("always includes the language segment, even for the default language and translation", () => {
    expect(
      buildReadingPath({
        language: DEFAULT_UI_LANGUAGE,
        translationId: "AAB",
        bookId: "JHN",
        chapter: 3,
      })
    ).toBe("/en/AAB/john/3");
  });

  it("includes the language segment for a non-default translation", () => {
    expect(
      buildReadingPath({
        language: DEFAULT_UI_LANGUAGE,
        translationId: "ARBNAV",
        bookId: "JHN",
        chapter: 3,
      })
    ).toBe("/en/ARBNAV/john/3");
  });

  it("includes the language segment for a non-default language", () => {
    expect(
      buildReadingPath({
        language: "es",
        translationId: "spa_onbv",
        bookId: "JHN",
        chapter: 3,
      })
    ).toBe("/es/spa_onbv/john/3");
  });

  it("encodes a custom-endpoint translation URL as a single path segment", () => {
    const customUrl = "https://alt.example/api/NIV/books.json";
    const path = buildReadingPath({
      language: "en",
      translationId: customUrl,
      bookId: "JHN",
      chapter: 3,
    });
    expect(path).toBe(`/en/${encodeURIComponent(customUrl)}/john/3`);
  });
});
