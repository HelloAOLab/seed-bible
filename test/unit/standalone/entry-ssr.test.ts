import {
  acceptLanguageRedirect,
  legacyReadingUrlRedirect,
  render,
} from "../../../standalone/entry-ssr";
import { DEFAULT_APP_CONFIG } from "@packages/seed-bible/seed-bible/app/appConfig";
import { createDefaultManagerResponseMap } from "../seed-bible/managers/testUtils/mockBibleApiData";
import { buildChapterUrl } from "../../../script/lib/sitemap";

describe("legacyReadingUrlRedirect", () => {
  describe("already the canonical shape", () => {
    it("leaves a fully canonical path alone", () => {
      expect(legacyReadingUrlRedirect("/AAB/john/3", "")).toBeNull();
      expect(legacyReadingUrlRedirect("/en/NIV/john/3", "")).toBeNull();
      expect(legacyReadingUrlRedirect("/es/spa_onbv/john/3", "")).toBeNull();
    });

    it("corrects a close typo in the book segment", () => {
      // "senesis" shares no prefix with any book name, so it only resolves
      // through the fuzzy fallback.
      expect(legacyReadingUrlRedirect("/AAB/senesis/1", "")).toBe(
        "/AAB/genesis/1"
      );
    });

    // The review's table. `getBookId`'s `startsWith` fallback resolves all of
    // these, so they used to be served 200 at their own indexable URLs.
    it.each([
      ["/AAB/luke-skywalker/1", "/AAB/luke/1"],
      ["/AAB/genocide/1", "/AAB/genesis/1"],
      ["/AAB/mark-twain/1", "/AAB/mark/1"],
      ["/AAB/acts-of-congress/1", "/AAB/acts/1"],
      ["/AAB/gen/1", "/AAB/genesis/1"],
      ["/AAB/Genesis/1", "/AAB/genesis/1"],
    ])("canonicalizes %s -> %s", (from, to) => {
      expect(legacyReadingUrlRedirect(from, "")).toBe(to);
    });

    it("canonicalizes a zero-padded chapter and a trailing slash", () => {
      expect(legacyReadingUrlRedirect("/AAB/john/03", "")).toBe("/AAB/john/3");
      expect(legacyReadingUrlRedirect("/AAB/john/3/", "")).toBe("/AAB/john/3");
    });

    it("lowercases the language segment", () => {
      expect(legacyReadingUrlRedirect("/EN/NIV/john/3", "")).toBe(
        "/en/NIV/john/3"
      );
    });

    it("keeps the request's 3-vs-4 segment shape when correcting", () => {
      // Collapsing the explicit form to the short one would hand it to
      // `acceptLanguageRedirect`, which sends it straight back — a loop.
      expect(legacyReadingUrlRedirect("/en/AAB/luke-skywalker/1", "")).toBe(
        "/en/AAB/luke/1"
      );
      expect(legacyReadingUrlRedirect("/en/AAB/john/3", "")).toBeNull();
    });

    it("does not redirect a book it cannot resolve at all", () => {
      // Falls through to render()'s 404 instead of guessing a target.
      expect(legacyReadingUrlRedirect("/AAB/notabook/1", "")).toBeNull();
    });

    it("preserves unrelated query params", () => {
      expect(legacyReadingUrlRedirect("/AAB/senesis/1?verse=5", "")).toBe(
        "/AAB/genesis/1?verse=5"
      );
    });

    it("strips and re-applies the deployment basePath", () => {
      expect(
        legacyReadingUrlRedirect("/b/branch-x/AAB/senesis/1", "/b/branch-x")
      ).toBe("/b/branch-x/AAB/genesis/1");
      expect(
        legacyReadingUrlRedirect("/b/branch-x/AAB/genesis/1", "/b/branch-x")
      ).toBeNull();
    });
  });

  describe("legacy shapes", () => {
    it("upgrades the prior /{book}/{chapter} path format", () => {
      expect(legacyReadingUrlRedirect("/john/3", "")).toBe("/AAB/john/3");
    });

    it("folds bare-root legacy query params into the path", () => {
      expect(legacyReadingUrlRedirect("/?book=GEN&chapter=2", "")).toBe(
        "/AAB/genesis/2"
      );
    });

    it("folds a legacy ?translation= and ?lang= into the path", () => {
      expect(
        legacyReadingUrlRedirect("/?book=MAT&chapter=1&translation=NIV", "")
      ).toBe("/en/NIV/matthew/1");
    });

    it("keeps query params that aren't part of the reading position", () => {
      expect(legacyReadingUrlRedirect("/?book=GEN&chapter=2&verse=5", "")).toBe(
        "/AAB/genesis/2?verse=5"
      );
    });

    it("leaves a bare root with no reading params alone", () => {
      expect(legacyReadingUrlRedirect("/", "")).toBeNull();
    });
  });

  // The whole rule rests on this: the path it redirects to must itself be
  // canonical, or the server would 301 forever. Every `BOOK_SLUGS` entry
  // round-tripping through `getBookId` is what guarantees it (see
  // BibleDataManager.test.ts) — this checks the property end-to-end.
  it.each([
    "/AAB/luke-skywalker/1",
    "/AAB/genocide/1",
    "/AAB/gen/1",
    "/AAB/Genesis/1",
    "/AAB/senesis/1",
    "/AAB/john/03",
    "/AAB/john/3/",
    "/EN/NIV/john/3",
    "/en/AAB/john/3",
    "/AAB/john/3",
    "/AAB/tob/1",
    "/es/spa_onbv/john/3",
    "/john/3",
    "/?book=GEN&chapter=2",
  ])("settles after at most one redirect: %s", (from) => {
    const once = legacyReadingUrlRedirect(from, "");
    if (once === null) {
      return;
    }
    expect(legacyReadingUrlRedirect(once, "")).toBeNull();
  });
});

describe("acceptLanguageRedirect", () => {
  it("redirects the 3-segment form to the visitor's preferred supported language", () => {
    expect(acceptLanguageRedirect("/AAB/john/3", "", ["fr-FR", "en-US"])).toBe(
      "/fr/AAB/john/3"
    );
  });

  it("picks the first supported language in the Accept-Language list, ignoring unsupported ones ahead of it", () => {
    expect(
      acceptLanguageRedirect("/AAB/john/3", "", ["xx-XX", "de-DE", "fr-FR"])
    ).toBe("/de/AAB/john/3");
  });

  it("preserves other query params on the redirect target", () => {
    expect(acceptLanguageRedirect("/AAB/john/3?verse=5", "", ["fr-FR"])).toBe(
      "/fr/AAB/john/3?verse=5"
    );
  });

  it("prefixes the redirect target with the deployment basePath", () => {
    expect(
      acceptLanguageRedirect("/d/branch-x/AAB/john/3", "/d/branch-x", ["fr-FR"])
    ).toBe("/d/branch-x/fr/AAB/john/3");
  });

  it("does not redirect when the visitor already prefers the default language", () => {
    expect(acceptLanguageRedirect("/AAB/john/3", "", ["en-US"])).toBeNull();
  });

  it("redirects to the explicit English URL when no Accept-Language header was sent", () => {
    expect(acceptLanguageRedirect("/AAB/john/3", "", [])).toBe(
      "/en/AAB/john/3"
    );
  });

  it("does not redirect when none of the visitor's preferences are supported", () => {
    expect(acceptLanguageRedirect("/AAB/john/3", "", ["xx-XX"])).toBeNull();
  });

  it("does not redirect an already-explicit 4-segment URL, even for a different Accept-Language", () => {
    expect(acceptLanguageRedirect("/en/AAB/john/3", "", ["de-DE"])).toBeNull();
  });

  it("does not redirect a fuzzy-matched book (that's legacyReadingUrlRedirect's job)", () => {
    // "senesis" only resolves via the fuzzy fallback, not an exact match (see
    // ReadingUrlPath.test.ts) — this function only ever acts on an exact match.
    expect(acceptLanguageRedirect("/AAB/senesis/3", "", ["fr-FR"])).toBeNull();
  });

  it("does not redirect an unresolved book", () => {
    expect(acceptLanguageRedirect("/AAB/notabook/3", "", ["fr-FR"])).toBeNull();
  });

  it("does not redirect a non-reading-path URL (falls through to legacy handling)", () => {
    expect(acceptLanguageRedirect("/john/3", "", ["fr-FR"])).toBeNull();
    expect(acceptLanguageRedirect("/", "", ["fr-FR"])).toBeNull();
  });
});

describe("render() Accept-Language redirect wiring", () => {
  // Both cases here resolve before any network call (the redirect checks run
  // ahead of `createSeedBibleState`), so no fetch mocking is needed.

  it("returns a 302 with a Vary: Accept-Language header for a language-negotiated redirect", async () => {
    const result = await render({
      path: "/AAB/john/3",
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: ["fr-FR"] },
      html: "",
    });

    expect(result).toEqual({
      redirectTo: "/fr/AAB/john/3",
      redirectStatus: 302,
      vary: "Accept-Language",
    });
  });

  it("returns a 302 with a Vary: Accept-Language header for the no-header English redirect", async () => {
    const result = await render({
      path: "/AAB/john/3",
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: [] },
      html: "",
    });

    expect(result).toEqual({
      redirectTo: "/en/AAB/john/3",
      redirectStatus: 302,
      vary: "Accept-Language",
    });
  });

  it("still returns a plain 301 (no redirectStatus/vary) for the pre-existing fuzzy-match redirect", async () => {
    const result = await render({
      path: "/AAB/senesis/3",
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: ["fr-FR"] },
      html: "",
    });

    expect(result).toEqual({ redirectTo: "/AAB/genesis/3" });
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
    '</head><body><script id="config"><!-- CONFIG_JSON --></script>',
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
    const result = await render({
      path,
      config: { ...DEFAULT_APP_CONFIG, acceptedLanguages: [], ...config },
      html: TEMPLATE,
    });
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

  it("still emits the real canonical URL when the chapter fails to load", async () => {
    // Regression for `<link rel="canonical" href="/">` on every SSR'd page.
    // Genesis 2 is a real chapter the fixture has no response for, so the
    // position resolves but the fetch fails — which used to collapse the
    // canonical to the site root and point the whole site at its front page.
    const html = await renderHtml("/en/AAB/genesis/2?useFreeBibleAPI=true");

    expect(html).toContain('<link rel="canonical" href="/en/AAB/genesis/2"');
    expect(html).not.toContain('<link rel="canonical" href="/"');
  });
});
