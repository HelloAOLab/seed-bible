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
  const defaultTranslationId = "AAB";

  it("omits the language segment in the fully-default state", () => {
    expect(
      buildReadingPath({
        language: DEFAULT_UI_LANGUAGE,
        translationId: "AAB",
        bookId: "JHN",
        chapter: 3,
        defaultTranslationId,
      })
    ).toBe("/AAB/john/3");
  });

  it("includes the language segment when the translation isn't the default, even for the default language", () => {
    expect(
      buildReadingPath({
        language: DEFAULT_UI_LANGUAGE,
        translationId: "ARBNAV",
        bookId: "JHN",
        chapter: 3,
        defaultTranslationId,
      })
    ).toBe("/en/ARBNAV/john/3");
  });

  it("includes the language segment when the language isn't the default, even for that language's own default translation", () => {
    expect(
      buildReadingPath({
        language: "es",
        translationId: "spa_onbv",
        bookId: "JHN",
        chapter: 3,
        defaultTranslationId,
      })
    ).toBe("/es/spa_onbv/john/3");
  });

  it("includes the language segment for a non-default language", () => {
    expect(
      buildReadingPath({
        language: "ar",
        translationId: "ARBNAV",
        bookId: "JHN",
        chapter: 3,
        defaultTranslationId,
      })
    ).toBe("/ar/ARBNAV/john/3");
  });

  it("encodes a custom-endpoint translation URL as a single path segment", () => {
    const customUrl = "https://alt.example/api/NIV/books.json";
    const path = buildReadingPath({
      language: "en",
      translationId: customUrl,
      bookId: "JHN",
      chapter: 3,
      defaultTranslationId,
    });
    expect(path).toBe(`/en/${encodeURIComponent(customUrl)}/john/3`);
  });

  it("forceExplicitLanguage includes the language segment even in the fully-default state", () => {
    expect(
      buildReadingPath({
        language: DEFAULT_UI_LANGUAGE,
        translationId: "AAB",
        bookId: "JHN",
        chapter: 3,
        defaultTranslationId,
        forceExplicitLanguage: true,
      })
    ).toBe("/en/AAB/john/3");
  });

  it("forceExplicitLanguage is a no-op when the segment would already be shown", () => {
    expect(
      buildReadingPath({
        language: "es",
        translationId: "spa_onbv",
        bookId: "JHN",
        chapter: 3,
        defaultTranslationId,
        forceExplicitLanguage: true,
      })
    ).toBe("/es/spa_onbv/john/3");
  });
});
