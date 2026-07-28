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
      chapter: 3,
    });
  });

  it("parses the 4-segment form (lang/translation/book/chapter)", () => {
    expect(parseReadingPath("/es/spa_onbv/john/3", "")).toEqual({
      language: "es",
      translationId: "spa_onbv",
      bookId: "JHN",
      chapter: 3,
    });
  });

  it("strips the deployment basePath before parsing", () => {
    expect(
      parseReadingPath("/b/some-branch/AAB/john/3", "/b/some-branch")
    ).toEqual({
      language: null,
      translationId: "AAB",
      bookId: "JHN",
      chapter: 3,
    });
  });

  it("decodes a percent-encoded translation id (custom-endpoint URL)", () => {
    const customUrl = "https://alt.example/api/NIV/books.json";
    const path = `/en/${encodeURIComponent(customUrl)}/john/3`;
    expect(parseReadingPath(path, "")).toEqual({
      language: "en",
      translationId: customUrl,
      bookId: "JHN",
      chapter: 3,
    });
  });

  it("returns null for the prior 2-segment /{book}/{chapter} shape", () => {
    expect(parseReadingPath("/john/3", "")).toBeNull();
  });

  it("returns null for a bare root", () => {
    expect(parseReadingPath("/", "")).toBeNull();
  });

  it("returns null when the book segment isn't recognized", () => {
    expect(parseReadingPath("/AAB/notabook/3", "")).toBeNull();
  });

  it("returns null when the chapter segment isn't a positive integer", () => {
    expect(parseReadingPath("/AAB/john/0", "")).toBeNull();
    expect(parseReadingPath("/AAB/john/abc", "")).toBeNull();
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
});
