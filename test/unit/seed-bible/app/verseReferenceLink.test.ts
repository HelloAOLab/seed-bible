import { getVerseReferenceLinkHref } from "@packages/seed-bible/seed-bible/app/verseReferenceLink";
import type { VerseRef } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";

const ref = (over: Partial<VerseRef> = {}): VerseRef =>
  ({ book: "JHN", chapter: 3, ...over }) as VerseRef;

describe("getVerseReferenceLinkHref", () => {
  afterEach(() => {
    jsdom.reconfigure({ url: "https://example.test/" });
  });

  // Regression: this used to set `?book=`/`?chapter=` on top of the current
  // URL. Once the reading position moved into the path, the path won — so a
  // reference to John 3 inside a footnote or chat message quietly reopened
  // whatever chapter the reader was already on.
  it("points at the referenced chapter, not the one currently open", () => {
    jsdom.reconfigure({ url: "https://example.test/en/AAB/genesis/1" });

    const href = getVerseReferenceLinkHref(ref());

    expect(new URL(href).pathname).toBe("/en/AAB/john/3");
    expect(href).not.toContain("book=");
    expect(href).not.toContain("chapter=");
  });

  it("keeps the translation and language the reader is on", () => {
    jsdom.reconfigure({ url: "https://example.test/es/spa_onbv/genesis/1" });

    expect(new URL(getVerseReferenceLinkHref(ref())).pathname).toBe(
      "/es/spa_onbv/john/3"
    );
  });

  it("carries a single verse and a verse range through as ?verse=", () => {
    jsdom.reconfigure({ url: "https://example.test/en/AAB/genesis/1" });

    expect(getVerseReferenceLinkHref(ref({ verse: 16 }))).toBe(
      "https://example.test/en/AAB/john/3?verse=16"
    );
    expect(getVerseReferenceLinkHref(ref({ verse: 16, endVerse: 18 }))).toBe(
      "https://example.test/en/AAB/john/3?verse=16-18"
    );
  });

  it("leaves unrelated query params alone", () => {
    jsdom.reconfigure({
      url: "https://example.test/en/AAB/genesis/1?sessionId=abc",
    });

    const url = new URL(getVerseReferenceLinkHref(ref()));
    expect(url.pathname).toBe("/en/AAB/john/3");
    expect(url.searchParams.get("sessionId")).toBe("abc");
  });

  it("falls back to the legacy params when the page isn't on a reading path", () => {
    // Nothing in the URL names a translation, so there is no path to build.
    // The legacy form still works — the server redirects it to the canonical
    // one — which beats emitting a link to the wrong place.
    jsdom.reconfigure({ url: "https://example.test/" });

    const url = new URL(getVerseReferenceLinkHref(ref({ verse: 16 })));
    expect(url.searchParams.get("book")).toBe("JHN");
    expect(url.searchParams.get("chapter")).toBe("3");
    expect(url.searchParams.get("verse")).toBe("16");
  });
});
