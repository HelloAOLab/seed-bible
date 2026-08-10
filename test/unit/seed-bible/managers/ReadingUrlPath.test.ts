import {
  DEFAULT_UI_LANGUAGE,
  buildReadingPath,
  buildReadingUrl,
  hasReadingUrlPosition,
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

  // Regression for the review at #1547: decodeURIComponent throws a
  // URIError on a malformed percent-escape rather than returning a
  // best-effort string. A malformed book segment must still come out
  // "unresolved" (so callers fall through to their existing 404 handling)
  // instead of the whole parse throwing or silently returning null (which
  // would be mistaken for "not a reading path at all" and fall through to a
  // default render instead of a 404).
  it.each(["%", "%E0", "100%off"])(
    "treats a malformed percent-escape (%s) in the book segment as unresolved, not a thrown error",
    (malformed) => {
      expect(() => parseReadingPath(`/AAB/${malformed}/1`, "")).not.toThrow();
      const parsed = parseReadingPath(`/AAB/${malformed}/1`, "");
      expect(parsed?.bookMatch).toBe("unresolved");
      expect(parsed?.bookId).toBeNull();
      expect(parsed?.rawBookSegment).toBe(malformed);
    }
  );

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

describe("buildReadingUrl", () => {
  const at = (href: string) => new URL(href);

  it("replaces the reading position while keeping the origin", () => {
    expect(
      buildReadingUrl({
        currentUrl: at("https://seedbible.org/en/AAB/genesis/1"),
        basePath: "",
        translationId: "AAB",
        bookId: "JHN",
        chapter: 3,
      }).toString()
    ).toBe("https://seedbible.org/en/AAB/john/3");
  });

  it("keeps the language the current URL is already using", () => {
    expect(
      buildReadingUrl({
        currentUrl: at("https://seedbible.org/es/spa_onbv/genesis/1"),
        basePath: "",
        translationId: "spa_onbv",
        bookId: "JHN",
        chapter: 3,
      }).pathname
    ).toBe("/es/spa_onbv/john/3");
  });

  it("normalises a shouted language segment", () => {
    expect(
      buildReadingUrl({
        currentUrl: at("https://seedbible.org/ES/spa_onbv/genesis/1"),
        basePath: "",
        translationId: "spa_onbv",
        bookId: "JHN",
        chapter: 3,
      }).pathname
    ).toBe("/es/spa_onbv/john/3");
  });

  // The whole point of the helper: a link that carried these alongside a path
  // saying something else opened the path's position, because that is what the
  // app reads first.
  it("strips legacy position params that would contradict the path", () => {
    const url = buildReadingUrl({
      currentUrl: at(
        "https://seedbible.org/en/AAB/genesis/1?book=EXO&chapter=9&translation=NIV&translationId=NIV&lang=de"
      ),
      basePath: "",
      translationId: "AAB",
      bookId: "JHN",
      chapter: 3,
    });

    expect(url.pathname).toBe("/en/AAB/john/3");
    expect(url.search).toBe("");
  });

  it("leaves unrelated query params alone", () => {
    const url = buildReadingUrl({
      currentUrl: at(
        "https://seedbible.org/en/AAB/genesis/1?sessionId=abc&verse=4"
      ),
      basePath: "",
      translationId: "AAB",
      bookId: "JHN",
      chapter: 3,
    });

    expect(url.searchParams.get("sessionId")).toBe("abc");
    expect(url.searchParams.get("verse")).toBe("4");
  });

  it("preserves the deployment prefix", () => {
    expect(
      buildReadingUrl({
        currentUrl: at(
          "https://alpha.seedbible.org/b/branch-x/en/AAB/genesis/1"
        ),
        basePath: "/b/branch-x",
        translationId: "AAB",
        bookId: "JHN",
        chapter: 3,
      }).pathname
    ).toBe("/b/branch-x/en/AAB/john/3");
  });

  describe("when the current URL has no language to inherit", () => {
    const bareRoot = "https://seedbible.org/";

    it("uses the caller's fallback language", () => {
      expect(
        buildReadingUrl({
          currentUrl: at(bareRoot),
          basePath: "",
          translationId: "spa_onbv",
          bookId: "JHN",
          chapter: 3,
          fallbackLanguage: "es",
        }).pathname
      ).toBe("/es/spa_onbv/john/3");
    });

    it("defaults to English when the caller has no better guess", () => {
      expect(
        buildReadingUrl({
          currentUrl: at(bareRoot),
          basePath: "",
          translationId: "NIV",
          bookId: "JHN",
          chapter: 3,
        }).pathname
      ).toBe("/en/NIV/john/3");
    });

    it("never emits the 3-segment form, which is only a redirect entry point", () => {
      const url = buildReadingUrl({
        currentUrl: at(bareRoot),
        basePath: "",
        translationId: "AAB",
        bookId: "GEN",
        chapter: 1,
      });
      expect(url.pathname).toBe("/en/AAB/genesis/1");
      expect(url.pathname.split("/").filter(Boolean)).toHaveLength(4);
    });
  });
});

describe("hasReadingUrlPosition", () => {
  const at = (href: string) => new URL(href);

  it("is true for the 4-segment canonical path", () => {
    expect(
      hasReadingUrlPosition(at("https://seedbible.org/en/AAB/john/3"), "")
    ).toBe(true);
  });

  it("is true for the 3-segment path (default language implied)", () => {
    expect(
      hasReadingUrlPosition(at("https://seedbible.org/AAB/john/3"), "")
    ).toBe(true);
  });

  it("is false for a bare root", () => {
    expect(hasReadingUrlPosition(at("https://seedbible.org/"), "")).toBe(false);
  });

  it("is false for legacy query params with no path — those never reach app code, since entry-ssr.tsx redirects them onto the canonical path first", () => {
    expect(
      hasReadingUrlPosition(at("https://seedbible.org/?book=GEN&chapter=1"), "")
    ).toBe(false);
  });

  it("strips the deployment basePath before checking", () => {
    expect(
      hasReadingUrlPosition(
        at("https://seedbible.org/b/some-branch/AAB/john/3"),
        "/b/some-branch"
      )
    ).toBe(true);
  });
});
