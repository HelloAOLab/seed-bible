import {
  bibleLanguageToUiLocale,
  buildBibleLanguageToUiLocale,
  buildChapterUrl,
  buildTranslationParam,
  chapterUrlsForTranslation,
  chunk,
  escapeXml,
  renderSitemapIndex,
  renderUrlset,
  sanitizeSitemapName,
  trimTrailingSlash,
  uniqueSitemapName,
  MAX_URLS_PER_SITEMAP,
  type BookChapters,
} from "../../../../script/lib/sitemap";
import {
  acceptLanguageRedirect,
  legacyReadingUrlRedirect,
} from "../../../../standalone/entry-ssr";

const ORIGIN = "https://seedbible.org";

describe("bibleLanguageToUiLocale", () => {
  it("maps common Bible languages to their UI locale", () => {
    expect(bibleLanguageToUiLocale("spa")).toBe("es");
    expect(bibleLanguageToUiLocale("eng")).toBe("en");
    expect(bibleLanguageToUiLocale("fra")).toBe("fr");
    expect(bibleLanguageToUiLocale("por")).toBe("pt");
  });

  it("is case-insensitive on the input code", () => {
    expect(bibleLanguageToUiLocale("SPA")).toBe("es");
    expect(bibleLanguageToUiLocale("Eng")).toBe("en");
  });

  it("resolves alias codes to the same UI locale", () => {
    // German is exposed as both deu and ger by the API.
    expect(bibleLanguageToUiLocale("deu")).toBe("de");
    expect(bibleLanguageToUiLocale("ger")).toBe("de");
    // Chinese: cmn and zho.
    expect(bibleLanguageToUiLocale("cmn")).toBe("zh");
    expect(bibleLanguageToUiLocale("zho")).toBe("zh");
  });

  it("resolves collisions deterministically to the canonical locale", () => {
    // he/iw both map to heb; the canonical two-letter he wins.
    expect(bibleLanguageToUiLocale("heb")).toBe("he");
    // fil/tl both map to tgl; fil wins (first in insertion order).
    expect(bibleLanguageToUiLocale("tgl")).toBe("fil");
  });

  it("returns null for unknown or empty languages", () => {
    expect(bibleLanguageToUiLocale("xyz")).toBeNull();
    expect(bibleLanguageToUiLocale("")).toBeNull();
    expect(bibleLanguageToUiLocale(null)).toBeNull();
    expect(bibleLanguageToUiLocale(undefined)).toBeNull();
  });

  it("never maps two Bible codes to conflicting locales within one build", () => {
    const map = buildBibleLanguageToUiLocale();
    // Every value must be a non-empty string; the map is a function (1 value
    // per key) by construction.
    for (const [code, locale] of map.entries()) {
      expect(code).toBeTruthy();
      expect(locale).toBeTruthy();
    }
  });
});

describe("buildChapterUrl", () => {
  it("builds a canonical chapter URL with a UI locale", () => {
    expect(
      buildChapterUrl(ORIGIN, {
        translationId: "spa_onbv",
        bookId: "GEN",
        chapter: 1,
        uiLocale: "es",
      })
    ).toBe("https://seedbible.org/es/spa_onbv/genesis/1");
  });

  it("uses the human-readable book slug, not the USFM code", () => {
    expect(
      buildChapterUrl(ORIGIN, {
        translationId: "AAB",
        bookId: "SNG",
        chapter: 2,
        uiLocale: "en",
      })
    ).toBe("https://seedbible.org/en/AAB/song-of-solomon/2");
  });

  it("falls back to the default language when no UI locale is given", () => {
    // A translation whose Bible language maps to no supported UI locale still
    // needs a URL that resolves without redirecting.
    expect(
      buildChapterUrl(ORIGIN, {
        translationId: "xyz_translation",
        bookId: "REV",
        chapter: 22,
      })
    ).toBe("https://seedbible.org/en/xyz_translation/revelation/22");
  });

  it("spells out the language even for the English default translation", () => {
    // `buildReadingPath` would normally omit it here, but that short form is a
    // redirect entry point: a crawler sends no `Accept-Language` and would be
    // 302'd off it. Every sitemap entry has to be a destination.
    expect(
      buildChapterUrl(ORIGIN, {
        translationId: "AAB",
        bookId: "GEN",
        chapter: 1,
        uiLocale: "en",
      })
    ).toBe("https://seedbible.org/en/AAB/genesis/1");
  });

  it("percent-encodes reserved characters in the translation ID", () => {
    const url = buildChapterUrl(ORIGIN, {
      translationId: "eng/esv",
      bookId: "GEN",
      chapter: 1,
      uiLocale: "en",
    });
    // The whole ID is one path segment, so its slash must not become a
    // separator — that would turn a 4-segment path into a 5-segment one.
    expect(url).toBe("https://seedbible.org/en/eng%2Fesv/genesis/1");
  });

  it("works whether or not the origin has a trailing slash", () => {
    const withSlash = buildChapterUrl("https://x.org/", {
      translationId: "t",
      bookId: "GEN",
      chapter: 1,
    });
    const withoutSlash = buildChapterUrl("https://x.org", {
      translationId: "t",
      bookId: "GEN",
      chapter: 1,
    });
    expect(withSlash).toBe(withoutSlash);
    expect(withSlash).toBe("https://x.org/en/t/genesis/1");
  });
});

describe("buildTranslationParam", () => {
  const DEFAULT = "https://vmfnri.helloao.org/";

  it("returns the bare id when the endpoint is the default", () => {
    expect(buildTranslationParam("BSB", DEFAULT, DEFAULT)).toBe("BSB");
  });

  it("ignores trailing-slash differences when comparing endpoints", () => {
    expect(
      buildTranslationParam("BSB", "https://vmfnri.helloao.org", DEFAULT)
    ).toBe("BSB");
  });

  it("returns the full books.json URL for a non-default endpoint", () => {
    expect(
      buildTranslationParam("BSB", "https://bible.helloao.org/", DEFAULT)
    ).toBe("https://bible.helloao.org/api/BSB/books.json");
  });

  it("keeps a slash in the id as a path segment (not percent-encoded), mirroring buildTranslationId", () => {
    // `new URL("api/eng/esv/books.json", base)` treats the "/" as a path
    // separator, so it is NOT percent-encoded here — matching the app's
    // BibleDataManager.buildTranslationId. (Contrast buildChapterUrl, which
    // puts the id in a query param via URLSearchParams and so encodes "/" to
    // "%2F".)
    expect(
      buildTranslationParam("eng/esv", "https://bible.helloao.org/", DEFAULT)
    ).toBe("https://bible.helloao.org/api/eng/esv/books.json");
  });
});

describe("trimTrailingSlash", () => {
  it("removes a single trailing slash", () => {
    expect(trimTrailingSlash("https://x.org/")).toBe("https://x.org");
  });

  it("leaves a slash-free URL untouched", () => {
    expect(trimTrailingSlash("https://x.org")).toBe("https://x.org");
  });
});

describe("chapterUrlsForTranslation", () => {
  const books: BookChapters[] = [
    { bookId: "GEN", firstChapterNumber: 1, numberOfChapters: 3 },
    { bookId: "EXO", firstChapterNumber: 1, numberOfChapters: 2 },
  ];

  it("emits one URL per chapter across all books", () => {
    const urls = chapterUrlsForTranslation(ORIGIN, "t", "en", books);
    expect(urls).toHaveLength(5);
    expect(urls[0]).toBe("https://seedbible.org/en/t/genesis/1");
    expect(urls[2]).toBe("https://seedbible.org/en/t/genesis/3");
    expect(urls[4]).toBe("https://seedbible.org/en/t/exodus/2");
  });

  it("honors a non-1 firstChapterNumber", () => {
    const urls = chapterUrlsForTranslation(ORIGIN, "t", null, [
      { bookId: "PSA", firstChapterNumber: 42, numberOfChapters: 2 },
    ]);
    expect(urls).toEqual([
      "https://seedbible.org/en/t/psalms/42",
      "https://seedbible.org/en/t/psalms/43",
    ]);
  });

  it("skips books with no chapters", () => {
    const urls = chapterUrlsForTranslation(ORIGIN, "t", "en", [
      { bookId: "GEN", firstChapterNumber: 1, numberOfChapters: 0 },
      { bookId: "EXO", firstChapterNumber: 1, numberOfChapters: 1 },
    ]);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain("/exodus/");
  });

  // The sitemap's whole job is to list URLs a crawler can fetch directly, so
  // nothing it emits may redirect. `legacyReadingUrlRedirect` handles
  // corrections for URLs with an explicit language (301); `acceptLanguageRedirect`
  // handles the 3-segment form with no language at all (302) — since the
  // sitemap always spells out the language segment explicitly (see
  // `buildChapterUrl` above), neither should ever fire for its URLs.
  it("emits URLs the server serves directly, with no redirect", () => {
    const urls = chapterUrlsForTranslation(ORIGIN, "AAB", "en", books);
    for (const url of urls) {
      const { pathname } = new URL(url);
      expect(legacyReadingUrlRedirect(pathname, "")).toBeNull();
      expect(acceptLanguageRedirect(pathname, "", [])).toBeNull();
    }
  });
});

describe("escapeXml", () => {
  it("escapes all five predefined entities", () => {
    expect(escapeXml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
  });

  it("escapes the & that separates query params", () => {
    const url = "https://x.org/?a=1&b=2";
    expect(escapeXml(url)).toBe("https://x.org/?a=1&amp;b=2");
  });
});

describe("renderUrlset", () => {
  it("renders well-formed XML", () => {
    const xml = renderUrlset(["https://x.org/en/t/genesis/1"]);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    );
    expect(xml).toContain("<loc>https://x.org/en/t/genesis/1</loc>");
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("escapes a loc that contains XML-significant characters", () => {
    // Reading URLs no longer carry a query string, so the everyday case has
    // nothing to escape. A custom API endpoint can still put arbitrary text
    // in the translation segment, so the escaping has to stay correct.
    const xml = renderUrlset(["https://x.org/en/a&b/genesis/1"]);
    expect(xml).toContain("<loc>https://x.org/en/a&amp;b/genesis/1</loc>");
    // No raw unescaped ampersand should survive.
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
  });
});

describe("renderSitemapIndex", () => {
  it("renders child sitemap entries with optional lastmod", () => {
    const xml = renderSitemapIndex([
      { loc: "https://x.org/sitemaps/a.xml", lastmod: "2026-07-18" },
      { loc: "https://x.org/sitemaps/b.xml" },
    ]);
    expect(xml).toContain(
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    );
    expect(xml).toContain(
      "<sitemap><loc>https://x.org/sitemaps/a.xml</loc><lastmod>2026-07-18</lastmod></sitemap>"
    );
    expect(xml).toContain(
      "<sitemap><loc>https://x.org/sitemaps/b.xml</loc></sitemap>"
    );
    expect(xml.trimEnd().endsWith("</sitemapindex>")).toBe(true);
  });
});

describe("chunk", () => {
  it("splits into chunks of at most the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns a single chunk when under the limit", () => {
    expect(chunk([1, 2, 3])).toEqual([[1, 2, 3]]);
    expect(MAX_URLS_PER_SITEMAP).toBe(50000);
  });

  it("returns an empty array for empty input", () => {
    expect(chunk([])).toEqual([]);
  });

  it("throws on a non-positive size", () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});

describe("sanitizeSitemapName / uniqueSitemapName", () => {
  it("keeps simple IDs unchanged", () => {
    expect(sanitizeSitemapName("eng_kjv")).toBe("eng_kjv");
    expect(sanitizeSitemapName("BSB")).toBe("BSB");
  });

  it("replaces unsafe characters", () => {
    expect(sanitizeSitemapName("eng/esv")).toBe("eng_esv");
    expect(sanitizeSitemapName("a b c")).toBe("a_b_c");
  });

  it("falls back to a default for all-unsafe input", () => {
    expect(sanitizeSitemapName("///")).toBe("translation");
  });

  it("disambiguates names that collide after sanitizing", () => {
    const used = new Set<string>();
    expect(uniqueSitemapName("eng/esv", used)).toBe("eng_esv");
    expect(uniqueSitemapName("eng_esv", used)).toBe("eng_esv-2");
    expect(uniqueSitemapName("eng esv", used)).toBe("eng_esv-3");
  });
});
