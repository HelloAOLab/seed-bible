import {
  acceptLanguageRedirect,
  legacyReadingUrlRedirect,
  render,
} from "../../../standalone/entry-ssr";
import { DEFAULT_APP_CONFIG } from "@packages/seed-bible/seed-bible/app/appConfig";
import {
  aabBooks,
  createDefaultManagerResponseMap,
  createResponse,
  makeChapter,
  makeUrl,
} from "../seed-bible/managers/testUtils/mockBibleApiData";
import { buildChapterUrl } from "../../../script/lib/sitemap";

describe("legacyReadingUrlRedirect", () => {
  describe("already the canonical shape", () => {
    it("leaves an already-explicit 4-segment path alone", () => {
      expect(legacyReadingUrlRedirect("/en/NIV/john/3", "")).toBeNull();
      expect(legacyReadingUrlRedirect("/es/spa_onbv/john/3", "")).toBeNull();
    });

    it("declines a 3-segment path — it has no explicit language to correct deterministically", () => {
      // That's `acceptLanguageRedirect`'s job (a 302), even when the book
      // is already an exact match.
      expect(legacyReadingUrlRedirect("/AAB/john/3", "")).toBeNull();
    });

    it("corrects a typo in an already-explicit 4-segment path without disturbing its language", () => {
      expect(legacyReadingUrlRedirect("/en/AAB/luke-skywalker/1", "")).toBe(
        "/en/AAB/luke/1"
      );
      expect(legacyReadingUrlRedirect("/en/AAB/john/3", "")).toBeNull();
    });

    // The review's table. `getBookId`'s `startsWith` fallback resolves all of
    // these, so they used to be served 200 at their own indexable URLs.
    it.each([
      ["/en/AAB/luke-skywalker/1", "/en/AAB/luke/1"],
      ["/en/AAB/genocide/1", "/en/AAB/genesis/1"],
      ["/en/AAB/mark-twain/1", "/en/AAB/mark/1"],
      ["/en/AAB/acts-of-congress/1", "/en/AAB/acts/1"],
      ["/en/AAB/gen/1", "/en/AAB/genesis/1"],
      ["/en/AAB/Genesis/1", "/en/AAB/genesis/1"],
    ])("canonicalizes %s -> %s", (from, to) => {
      expect(legacyReadingUrlRedirect(from, "")).toBe(to);
    });

    it("canonicalizes a zero-padded chapter and a trailing slash", () => {
      expect(legacyReadingUrlRedirect("/en/AAB/john/03", "")).toBe(
        "/en/AAB/john/3"
      );
      expect(legacyReadingUrlRedirect("/en/AAB/john/3/", "")).toBe(
        "/en/AAB/john/3"
      );
    });

    it("lowercases the language segment", () => {
      expect(legacyReadingUrlRedirect("/EN/NIV/john/3", "")).toBe(
        "/en/NIV/john/3"
      );
    });

    it("does not redirect a book it cannot resolve at all", () => {
      // Falls through to render()'s 404 instead of guessing a target.
      expect(legacyReadingUrlRedirect("/en/AAB/notabook/1", "")).toBeNull();
    });

    // Regression for the review at #1547: decodeURIComponent throws a
    // URIError on a malformed percent-escape rather than returning a
    // best-effort string. Same fallthrough as any other unresolved book —
    // no redirect, no thrown exception.
    it("does not throw for a malformed percent-escape, and does not redirect it", () => {
      expect(() => legacyReadingUrlRedirect("/en/AAB/%/1", "")).not.toThrow();
      expect(legacyReadingUrlRedirect("/en/AAB/%/1", "")).toBeNull();
    });

    it("preserves unrelated query params", () => {
      expect(legacyReadingUrlRedirect("/en/AAB/senesis/1?verse=5", "")).toBe(
        "/en/AAB/genesis/1?verse=5"
      );
    });

    it("strips and re-applies the deployment basePath", () => {
      expect(
        legacyReadingUrlRedirect("/b/branch-x/en/AAB/senesis/1", "/b/branch-x")
      ).toBe("/b/branch-x/en/AAB/genesis/1");
      expect(
        legacyReadingUrlRedirect("/b/branch-x/en/AAB/genesis/1", "/b/branch-x")
      ).toBeNull();
    });
  });

  describe("legacy shapes", () => {
    it("declines a legacy shape with no explicit ?lang= — acceptLanguageRedirect negotiates it instead", () => {
      expect(legacyReadingUrlRedirect("/john/3", "")).toBeNull();
      expect(legacyReadingUrlRedirect("/?book=GEN&chapter=2", "")).toBeNull();
      expect(
        legacyReadingUrlRedirect("/?book=MAT&chapter=1&translation=NIV", "")
      ).toBeNull();
    });

    it("folds a legacy ?translation=&?lang= into the path, keeping the explicit language", () => {
      expect(
        legacyReadingUrlRedirect(
          "/?book=MAT&chapter=1&translation=NIV&lang=en",
          ""
        )
      ).toBe("/en/NIV/matthew/1");
    });

    it("folds bare-root legacy query params (with ?lang=) into the path", () => {
      expect(legacyReadingUrlRedirect("/?book=GEN&chapter=2&lang=en", "")).toBe(
        "/en/AAB/genesis/2"
      );
    });

    it("keeps query params that aren't part of the reading position", () => {
      expect(
        legacyReadingUrlRedirect("/?book=GEN&chapter=2&lang=en&verse=5", "")
      ).toBe("/en/AAB/genesis/2?verse=5");
    });

    it("leaves a bare root with no reading params alone", () => {
      expect(legacyReadingUrlRedirect("/", "")).toBeNull();
    });

    it("does not throw for a malformed percent-escape in the legacy 2-segment shape", () => {
      expect(() => legacyReadingUrlRedirect("/%E0/1", "")).not.toThrow();
      expect(legacyReadingUrlRedirect("/%E0/1", "")).toBeNull();
    });
  });

  // The whole rule rests on this: the path it redirects to must itself be
  // canonical, or the server would redirect forever. Every `BOOK_SLUGS` entry
  // round-tripping through `getBookId` is what guarantees it (see
  // BibleDataManager.test.ts) — this checks the property end-to-end.
  it.each([
    "/en/AAB/luke-skywalker/1",
    "/en/AAB/genocide/1",
    "/en/AAB/gen/1",
    "/en/AAB/Genesis/1",
    "/en/AAB/senesis/1",
    "/en/AAB/john/03",
    "/en/AAB/john/3/",
    "/EN/NIV/john/3",
    "/en/AAB/john/3",
    "/es/spa_onbv/john/3",
    "/?book=GEN&chapter=2&lang=en",
  ])("settles after at most one redirect: %s", (from) => {
    const once = legacyReadingUrlRedirect(from, "");
    if (once === null) {
      return;
    }
    expect(legacyReadingUrlRedirect(once, "")).toBeNull();
  });
});

describe("acceptLanguageRedirect", () => {
  describe("translation given (3-segment path, or ?translation= on a bare root)", () => {
    it("uses the hardcoded per-language-default table without consulting Accept-Language", () => {
      // AAB is English's hardcoded default translation, so this is
      // deterministic regardless of the header.
      expect(acceptLanguageRedirect("/AAB/john/3", "", ["fr-FR"])).toBe(
        "/en/AAB/john/3"
      );
      expect(acceptLanguageRedirect("/AAB/john/3", "", [])).toBe(
        "/en/AAB/john/3"
      );
    });

    it("falls back to Accept-Language when the translation isn't a known language default", () => {
      // NIV isn't any language's hardcoded default.
      expect(acceptLanguageRedirect("/NIV/john/3", "", ["fr-FR"])).toBe(
        "/fr/NIV/john/3"
      );
    });

    it("falls back to English when neither the table nor Accept-Language resolves it", () => {
      expect(acceptLanguageRedirect("/NIV/john/3", "", [])).toBe(
        "/en/NIV/john/3"
      );
      expect(acceptLanguageRedirect("/NIV/john/3", "", ["xx-XX"])).toBe(
        "/en/NIV/john/3"
      );
    });

    it("also corrects a typo in the book segment, in the same redirect", () => {
      // "senesis" only resolves via the fuzzy fallback (see
      // ReadingUrlPath.test.ts) — unlike the old design, this function
      // handles fuzzy matches too, so there's no second redirect.
      expect(acceptLanguageRedirect("/AAB/senesis/1", "", [])).toBe(
        "/en/AAB/genesis/1"
      );
    });

    it("folds ?translation= (no ?lang=) on a bare root the same way", () => {
      expect(
        acceptLanguageRedirect("/?book=MAT&chapter=1&translation=NIV", "", [
          "fr-FR",
        ])
      ).toBe("/fr/NIV/matthew/1");
    });

    it("preserves other query params and the deployment basePath", () => {
      expect(acceptLanguageRedirect("/AAB/john/3?verse=5", "", [])).toBe(
        "/en/AAB/john/3?verse=5"
      );
      expect(
        acceptLanguageRedirect("/d/branch-x/AAB/john/3", "/d/branch-x", [])
      ).toBe("/d/branch-x/en/AAB/john/3");
    });
  });

  describe("no translation given (legacy /{book}/{chapter} path, or a bare root with no ?translation=)", () => {
    it("picks the language from Accept-Language, then that language's default translation", () => {
      expect(acceptLanguageRedirect("/genesis/1", "", ["es-ES"])).toBe(
        "/es/spa_onbv/genesis/1"
      );
      expect(
        acceptLanguageRedirect("/?book=GEN&chapter=1", "", ["es-ES"])
      ).toBe("/es/spa_onbv/genesis/1");
    });

    it("falls back to English/AAB when nothing in Accept-Language is supported", () => {
      expect(acceptLanguageRedirect("/genesis/1", "", [])).toBe(
        "/en/AAB/genesis/1"
      );
      expect(acceptLanguageRedirect("/genesis/1", "", ["xx-XX"])).toBe(
        "/en/AAB/genesis/1"
      );
      expect(acceptLanguageRedirect("/?book=GEN&chapter=1", "", [])).toBe(
        "/en/AAB/genesis/1"
      );
    });
  });

  it("does not redirect anything that already has an explicit language", () => {
    expect(acceptLanguageRedirect("/en/AAB/john/3", "", ["fr-FR"])).toBeNull();
    expect(
      acceptLanguageRedirect("/?book=GEN&chapter=1&lang=en", "", ["fr-FR"])
    ).toBeNull();
  });

  it("does not redirect an unresolved book", () => {
    expect(acceptLanguageRedirect("/AAB/notabook/3", "", ["fr-FR"])).toBeNull();
    expect(acceptLanguageRedirect("/notabook/3", "", ["fr-FR"])).toBeNull();
    expect(
      acceptLanguageRedirect("/?book=notabook&chapter=3", "", ["fr-FR"])
    ).toBeNull();
  });

  it("leaves a bare root with no reading params alone", () => {
    expect(acceptLanguageRedirect("/", "", ["fr-FR"])).toBeNull();
  });

  it("does not throw for a malformed percent-escape, in either shape", () => {
    expect(() =>
      acceptLanguageRedirect("/AAB/%/1", "", ["fr-FR"])
    ).not.toThrow();
    expect(() => acceptLanguageRedirect("/%E0/1", "", ["fr-FR"])).not.toThrow();
  });

  // Mirrors `legacyReadingUrlRedirect`'s own property: the target this
  // returns must be something neither function redirects again.
  it.each([
    "/AAB/john/3",
    "/NIV/john/3",
    "/AAB/senesis/1",
    "/genesis/1",
    "/?book=GEN&chapter=1",
    "/?book=MAT&chapter=1&translation=NIV",
  ])("settles after at most one redirect: %s", (from) => {
    const once = acceptLanguageRedirect(from, "", []);
    if (once === null) {
      return;
    }
    expect(legacyReadingUrlRedirect(once, "")).toBeNull();
    expect(acceptLanguageRedirect(once, "", [])).toBeNull();
  });
});

describe("render() redirect wiring", () => {
  // These resolve before any network call (the redirect checks run ahead of
  // `createSeedBibleState`), so no fetch mocking is needed.

  it("returns a 302 with Vary: Accept-Language for a negotiated redirect", async () => {
    const result = await render({
      path: "/AAB/john/3",
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: ["fr-FR"] },
      html: "",
    });

    expect(result).toEqual({
      redirectTo: "/en/AAB/john/3",
      redirectStatus: 302,
      vary: "Accept-Language",
    });
  });

  it("returns a 302 for a 3-segment URL even when it also needed a typo correction", async () => {
    const result = await render({
      path: "/AAB/senesis/3",
      config: DEFAULT_APP_CONFIG,
      html: "",
    });

    expect(result).toEqual({
      redirectTo: "/en/AAB/genesis/3",
      redirectStatus: 302,
      vary: "Accept-Language",
    });
  });

  it("returns a plain 301 (no redirectStatus/vary) for a correction that already has an explicit language", async () => {
    const result = await render({
      path: "/en/AAB/senesis/3",
      config: DEFAULT_APP_CONFIG,
      html: "",
    });

    expect(result).toEqual({ redirectTo: "/en/AAB/genesis/3" });
  });

  it("returns a plain 301 for a legacy query-param URL that already names an explicit ?lang=", async () => {
    const result = await render({
      path: "/?translation=AAB&book=GEN&chapter=1&lang=en",
      config: DEFAULT_APP_CONFIG,
      html: "",
    });

    expect(result).toEqual({ redirectTo: "/en/AAB/genesis/1" });
  });

  it("returns a 302 for the legacy /{book}/{chapter} shape, Accept-Language driven", async () => {
    const result = await render({
      path: "/genesis/1",
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: ["es-ES"] },
      html: "",
    });

    expect(result).toEqual({
      redirectTo: "/es/spa_onbv/genesis/1",
      redirectStatus: 302,
      vary: "Accept-Language",
    });
  });

  it("returns a 302 for a bare root with legacy query params and no translation", async () => {
    const result = await render({
      path: "/?book=GEN&chapter=1",
      config: DEFAULT_APP_CONFIG,
      html: "",
    });

    expect(result).toEqual({
      redirectTo: "/en/AAB/genesis/1",
      redirectStatus: 302,
      vary: "Accept-Language",
    });
  });

  it("returns a 302 for a bare root with an explicit ?translation= and no ?lang=", async () => {
    const result = await render({
      path: "/?translation=AAB&book=GEN&chapter=1",
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: ["fr-FR"] },
      html: "",
    });

    expect(result).toEqual({
      // AAB is the hardcoded English default, so Accept-Language is never
      // consulted even though a header was sent.
      redirectTo: "/en/AAB/genesis/1",
      redirectStatus: 302,
      vary: "Accept-Language",
    });
  });
});

// Everything above stops at a redirect, which `render()` decides before it
// builds any state. These go the whole way through to HTML, because the
// canonical link is only wired up at the very end (the meta block in
// `render()`) and a regression there — or in the ordering that lets the meta
// tags render before the chapter suspension settles — would be invisible to a
// test that only reads `state.app.canonicalUrl`.
describe("render() server-rendered meta tags", () => {
  const TEMPLATE = [
    "<!doctype html><html><head>",
    "<!-- META -->",
    '</head><body><script type="application/json" id="app-config"><!-- CONFIG_JSON --></script>',
    '<div id="app"><!-- APP_HTML --></div></body></html>',
  ].join("");

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    // `render()` builds its state against `http://ssr.local<path>`. Real SSR
    // has no `window`, so the URL-writing effects no-op; under jsdom `window`
    // exists, so they try a real history write and jsdom rejects it as
    // cross-origin. Matching the origin lets those writes land harmlessly —
    // the assertions below read the returned HTML, not `window.location`.
    jsdom.reconfigure({ url: "http://ssr.local/" });
    // Same jsdom caveat for stored tab state: real SSR has no `localStorage`,
    // so nothing is restored, but under jsdom one render's persisted tabs would
    // otherwise decide where the next render opens.
    localStorage.clear();
    originalFetch = globalThis.fetch;
    // `?useFreeBibleAPI=true` points the app at the endpoint this map is keyed
    // on (see `getDefaultAPIEndpoint`), so no network is touched.
    const responses = createDefaultManagerResponseMap();
    globalThis.fetch = (async (url: string) => {
      const response = responses[url];
      if (!response) {
        throw new Error(`No mocked response for ${url}`);
      }
      return response;
    }) as typeof globalThis.fetch;
    // The reader only suspends on the chapter load when it believes it is on
    // the server, and that suspension is what makes the meta tags render with
    // content rather than an empty shell.
    import.meta.env.SSR = true;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete import.meta.env.SSR;
  });

  const renderHtml = async (
    path: string,
    config: Partial<typeof DEFAULT_APP_CONFIG> = {}
  ): Promise<string> => {
    const result = (await render({
      path,
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: [], ...config },
      html: TEMPLATE,
    })) as { html: string; notFound?: true; redirectTo?: string };
    if ("redirectTo" in result) {
      throw new Error(`Expected HTML, got a redirect to ${result.redirectTo}`);
    }
    return result.html;
  };

  it("emits the reading position as the canonical URL and og:url", async () => {
    const html = await renderHtml("/en/AAB/genesis/1?useFreeBibleAPI=true");

    // Guards against a silently empty render making the assertions below
    // vacuous: the chapter text has to actually be in the document.
    expect(html).toContain("Verse 1");

    expect(html).toContain('<link rel="canonical" href="/en/AAB/genesis/1"');
    expect(html).toContain(
      '<meta property="og:url" content="/en/AAB/genesis/1"'
    );
    expect(html).not.toContain('<link rel="canonical" href="/"');
  });

  it("includes the deployment basePath in the canonical URL", async () => {
    const html = await renderHtml(
      "/b/branch-x/en/AAB/genesis/1?useFreeBibleAPI=true",
      { basePath: "/b/branch-x" }
    );

    expect(html).toContain(
      '<link rel="canonical" href="/b/branch-x/en/AAB/genesis/1"'
    );
  });

  it("injects the config into the #app-config JSON script tag", async () => {
    const config = { basePath: "/b/branch-x", assetHost: "https://cdn.test" };
    const html = await renderHtml(
      "/b/branch-x/en/AAB/genesis/1?useFreeBibleAPI=true",
      config
    );

    const injected = html.match(
      /<script type="application\/json" id="app-config">([^<]*)<\/script>/
    )?.[1];
    expect(injected).toBeDefined();
    expect(JSON.parse(injected as string)).toMatchObject(config);
  });

  // The review's complaint about the sitemap was not just that its URLs
  // redirected, but that "each one disagrees with its target page's own
  // rel=canonical". Both sides are otherwise pinned to the same literal in two
  // separate test files, which would keep passing if only one drifted. This
  // compares the published URL against the one the served page actually
  // declares.
  it("publishes exactly the URL the served page declares canonical", async () => {
    const origin = "https://seedbible.org";
    const html = await renderHtml("/en/AAB/genesis/1?useFreeBibleAPI=true");

    const served = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    expect(served).toBeDefined();

    expect(
      buildChapterUrl(origin, {
        translationId: "AAB",
        bookId: "GEN",
        chapter: 1,
        uiLocale: "en",
      })
    ).toBe(`${origin}${served}`);
  });

  it("quotes the chapter's own text in the description and og:description", async () => {
    const html = await renderHtml("/en/AAB/genesis/1?useFreeBibleAPI=true");

    // The fixture chapter is two short verses, so the whole excerpt fits inside
    // the snippet budget and no ellipsis is appended.
    const expected = "Genesis 1 (AAB): Verse 1 Verse 2";
    expect(html).toContain(`<meta name="description" content="${expected}"`);
    expect(html).toContain(
      `<meta property="og:description" content="${expected}"`
    );
  });

  it("describes the app, not just its name, when the chapter fails to load", async () => {
    // Genesis 2 is a real chapter the fixture has no response for, so the
    // position resolves but the text never arrives.
    const html = await renderHtml("/en/AAB/genesis/2?useFreeBibleAPI=true");

    expect(html).not.toContain('<meta name="description" content="Seed Bible"');
    expect(html).toContain("study the Bible online");
  });

  it("escapes verse text exactly once", async () => {
    // The i18n layer is configured with `escapeValue: false`, so Preact's
    // renderToStringAsync is the only thing escaping the attribute. Double
    // escaping here would surface as `&amp;quot;` in the served HTML.
    const responses = createDefaultManagerResponseMap();
    responses[makeUrl("/api/AAB/GEN/1.json")] = createResponse(
      makeChapter(aabBooks, "GEN", 1, [
        { type: "verse", number: 1, content: ['He said "peace" & love'] },
      ])
    );
    globalThis.fetch = (async (url: string) => {
      const response = responses[url];
      if (!response) {
        throw new Error(`No mocked response for ${url}`);
      }
      return response;
    }) as typeof globalThis.fetch;

    const html = await renderHtml("/en/AAB/genesis/1?useFreeBibleAPI=true");

    expect(html).toContain(
      '<meta name="description" content="Genesis 1 (AAB): He said &quot;peace&quot; &amp; love"'
    );
    expect(html).not.toContain("&amp;quot;");
  });

  it("emits Twitter card tags and Open Graph tags with the property attribute", async () => {
    const html = await renderHtml("/en/AAB/genesis/1?useFreeBibleAPI=true");

    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image"'
    );
    expect(html).toContain(
      '<meta name="twitter:title" content="Read Genesis 1"'
    );
    expect(html).toContain(
      '<meta name="twitter:description" content="Genesis 1 (AAB):'
    );

    // Open Graph parsers only read `property=`, so these were being ignored.
    expect(html).toContain('<meta property="og:site_name"');
    expect(html).toContain('<meta property="og:locale"');
    expect(html).not.toContain('<meta name="og:site_name"');
    expect(html).not.toContain('<meta name="og:locale"');
  });

  it("still emits the real canonical URL when the chapter fails to load", async () => {
    // Regression for `<link rel="canonical" href="/">` on every SSR'd page.
    // Genesis 2 is a real chapter the fixture has no response for, so the
    // position resolves but the fetch fails — which used to collapse the
    // canonical to the site root and point the whole site at its front page.
    const html = await renderHtml("/en/AAB/genesis/2?useFreeBibleAPI=true");

    expect(html).toContain('<link rel="canonical" href="/en/AAB/genesis/2"');
    expect(html).not.toContain('<link rel="canonical" href="/"');
  });

  it("renders the bare root directly, with no redirect and no notFound", async () => {
    const result = (await render({
      path: "/?useFreeBibleAPI=true",
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: [] },
      html: TEMPLATE,
    })) as { html: string; notFound?: true; redirectTo?: string };

    if ("redirectTo" in result) {
      throw new Error(`Expected HTML, got a redirect to ${result.redirectTo}`);
    }
    expect(result.notFound).toBeFalsy();
    // Guards against a silently empty render: the default reading position
    // (Genesis 1) actually loaded and rendered.
    expect(result.html).toContain("Verse 1");
  });

  it("returns notFound: true (the server's 404 signal) for an unresolved book", async () => {
    const result = (await render({
      path: "/en/AAB/notabook/1?useFreeBibleAPI=true",
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: [] },
      html: TEMPLATE,
    })) as { html: string; notFound?: true; redirectTo?: string };

    if ("redirectTo" in result) {
      throw new Error(`Expected HTML, got a redirect to ${result.redirectTo}`);
    }
    expect(result.notFound).toBe(true);
  });

  // Regression for the review at #1547: a malformed percent-escape (a lone
  // "%") in the book segment used to make decodeURIComponent throw an
  // uncaught URIError, which server/index.ts's try/catch turned into a
  // confusing 200-with-unrendered-shell instead of the clean 404 the rest of
  // this suite exercises above.
  it("returns notFound: true, not a thrown error, for a malformed percent-escape in the book segment", async () => {
    const result = (await render({
      path: "/en/AAB/%/1?useFreeBibleAPI=true",
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: [] },
      html: TEMPLATE,
    })) as { html: string; notFound?: true; redirectTo?: string };

    if ("redirectTo" in result) {
      throw new Error(`Expected HTML, got a redirect to ${result.redirectTo}`);
    }
    expect(result.notFound).toBe(true);
  });
});
