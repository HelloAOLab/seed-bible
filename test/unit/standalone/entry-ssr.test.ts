import {
  legacyReadingUrlRedirect,
  render,
} from "../../../standalone/entry-ssr";
import { DEFAULT_APP_CONFIG } from "@packages/seed-bible/seed-bible/app/appConfig";
import { createDefaultManagerResponseMap } from "../seed-bible/managers/testUtils/mockBibleApiData";
import { buildChapterUrl } from "../../../script/lib/sitemap";

describe("legacyReadingUrlRedirect", () => {
  describe("already the canonical shape", () => {
    it("leaves an already-explicit 4-segment path alone", () => {
      expect(legacyReadingUrlRedirect("/en/NIV/john/3", "")).toBeNull();
      expect(legacyReadingUrlRedirect("/es/spa_onbv/john/3", "")).toBeNull();
    });

    it("promotes a 3-segment path to the translation's own language", () => {
      // AAB is the hardcoded default English translation, so its language is
      // known without a network call.
      expect(legacyReadingUrlRedirect("/AAB/john/3", "")).toBe(
        "/en/AAB/john/3"
      );
    });

    it("falls back to English when the translation isn't a known language default", () => {
      // NIV isn't any language's hardcoded default, so its language can't be
      // determined without fetching the catalog — falls back to English
      // rather than paying for a network round trip on every redirect.
      expect(legacyReadingUrlRedirect("/NIV/john/3", "")).toBe(
        "/en/NIV/john/3"
      );
    });

    it("corrects a close typo in the book segment, promoting the language too", () => {
      // "senesis" shares no prefix with any book name, so it only resolves
      // through the fuzzy fallback.
      expect(legacyReadingUrlRedirect("/AAB/senesis/1", "")).toBe(
        "/en/AAB/genesis/1"
      );
    });

    // The review's table. `getBookId`'s `startsWith` fallback resolves all of
    // these, so they used to be served 200 at their own indexable URLs.
    it.each([
      ["/AAB/luke-skywalker/1", "/en/AAB/luke/1"],
      ["/AAB/genocide/1", "/en/AAB/genesis/1"],
      ["/AAB/mark-twain/1", "/en/AAB/mark/1"],
      ["/AAB/acts-of-congress/1", "/en/AAB/acts/1"],
      ["/AAB/gen/1", "/en/AAB/genesis/1"],
      ["/AAB/Genesis/1", "/en/AAB/genesis/1"],
    ])("canonicalizes %s -> %s", (from, to) => {
      expect(legacyReadingUrlRedirect(from, "")).toBe(to);
    });

    it("canonicalizes a zero-padded chapter and a trailing slash", () => {
      expect(legacyReadingUrlRedirect("/AAB/john/03", "")).toBe(
        "/en/AAB/john/3"
      );
      expect(legacyReadingUrlRedirect("/AAB/john/3/", "")).toBe(
        "/en/AAB/john/3"
      );
    });

    it("lowercases the language segment", () => {
      expect(legacyReadingUrlRedirect("/EN/NIV/john/3", "")).toBe(
        "/en/NIV/john/3"
      );
    });

    it("corrects a typo in an already-explicit 4-segment path without disturbing its language", () => {
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
        "/en/AAB/genesis/1?verse=5"
      );
    });

    it("strips and re-applies the deployment basePath", () => {
      expect(
        legacyReadingUrlRedirect("/b/branch-x/AAB/senesis/1", "/b/branch-x")
      ).toBe("/b/branch-x/en/AAB/genesis/1");
      expect(
        legacyReadingUrlRedirect("/b/branch-x/AAB/genesis/1", "/b/branch-x")
      ).toBe("/b/branch-x/en/AAB/genesis/1");
      expect(
        legacyReadingUrlRedirect("/b/branch-x/en/AAB/genesis/1", "/b/branch-x")
      ).toBeNull();
    });
  });

  describe("legacy shapes", () => {
    it("upgrades the prior /{book}/{chapter} path format", () => {
      expect(legacyReadingUrlRedirect("/john/3", "")).toBe("/en/AAB/john/3");
    });

    it("folds bare-root legacy query params into the path", () => {
      expect(legacyReadingUrlRedirect("/?book=GEN&chapter=2", "")).toBe(
        "/en/AAB/genesis/2"
      );
    });

    it("folds a legacy ?translation= and ?lang= into the path", () => {
      expect(
        legacyReadingUrlRedirect("/?book=MAT&chapter=1&translation=NIV", "")
      ).toBe("/en/NIV/matthew/1");
    });

    it("keeps query params that aren't part of the reading position", () => {
      expect(legacyReadingUrlRedirect("/?book=GEN&chapter=2&verse=5", "")).toBe(
        "/en/AAB/genesis/2?verse=5"
      );
    });

    it("leaves a bare root with no reading params alone", () => {
      expect(legacyReadingUrlRedirect("/", "")).toBeNull();
    });
  });

  // The whole rule rests on this: the path it redirects to must itself be
  // canonical, or the server would redirect forever. Every `BOOK_SLUGS` entry
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

describe("render() redirect wiring", () => {
  // These resolve before any network call (the redirect checks run ahead of
  // `createSeedBibleState`), so no fetch mocking is needed.

  it("returns a 302 for a 3-segment URL promoted to its translation's language", async () => {
    const result = await render({
      path: "/AAB/john/3",
      config: DEFAULT_APP_CONFIG,
      html: "",
    });

    expect(result).toEqual({
      redirectTo: "/en/AAB/john/3",
      redirectStatus: 302,
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
    });
  });

  it("returns a plain 301 (no redirectStatus) for a correction that already has an explicit language", async () => {
    const result = await render({
      path: "/en/AAB/senesis/3",
      config: DEFAULT_APP_CONFIG,
      html: "",
    });

    expect(result).toEqual({ redirectTo: "/en/AAB/genesis/3" });
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
