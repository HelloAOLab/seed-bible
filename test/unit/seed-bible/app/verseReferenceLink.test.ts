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

  // Regression: annotating John 3:9 puts `?verse=9` on the URL. A note that
  // mentions "Jonah 2" is naming a whole chapter, not verse 9 of Jonah 2.
  it("does not copy the page's current verse onto a chapter-only reference", () => {
    jsdom.reconfigure({ url: "https://example.test/en/AAB/john/3?verse=9" });

    expect(getVerseReferenceLinkHref(ref({ book: "JON", chapter: 2 }))).toBe(
      "https://example.test/en/AAB/jonah/2"
    );
  });

  it("does not copy the page's verse onto a chapter range", () => {
    jsdom.reconfigure({ url: "https://example.test/en/AAB/john/3?verse=9" });

    const url = new URL(
      getVerseReferenceLinkHref(ref({ book: "JON", chapter: 2, endChapter: 3 }))
    );
    expect(url.pathname).toBe("/en/AAB/jonah/2");
    expect(url.searchParams.get("verse")).toBeNull();
  });

  it("drops the page's verse when the chapter-only reference is the chapter already open", () => {
    jsdom.reconfigure({ url: "https://example.test/en/AAB/john/3?verse=9" });

    expect(getVerseReferenceLinkHref(ref())).toBe(
      "https://example.test/en/AAB/john/3"
    );
  });

  it.each(["9-11", "1,3", ""])(
    "drops the page's ?verse=%s from a chapter-only reference",
    (verse) => {
      jsdom.reconfigure({
        url: `https://example.test/en/AAB/john/3?verse=${verse}`,
      });

      const url = new URL(
        getVerseReferenceLinkHref(ref({ book: "JON", chapter: 2 }))
      );
      expect(url.pathname).toBe("/en/AAB/jonah/2");
      expect(url.searchParams.get("verse")).toBeNull();
    }
  );

  it("replaces the page's current verse with the referenced verse", () => {
    jsdom.reconfigure({ url: "https://example.test/en/AAB/john/3?verse=9" });

    expect(getVerseReferenceLinkHref(ref({ verse: 16 }))).toBe(
      "https://example.test/en/AAB/john/3?verse=16"
    );
    expect(getVerseReferenceLinkHref(ref({ verse: 16, endVerse: 18 }))).toBe(
      "https://example.test/en/AAB/john/3?verse=16-18"
    );
  });

  // A saved note must not hardcode the page's session (or any other param a
  // future screen might add). Asserting the key list — not just sessionId —
  // is what keeps that from quietly coming back.
  it("keeps only the reference's own verse query param", () => {
    jsdom.reconfigure({
      url: "https://example.test/en/AAB/john/3?verse=9&sessionId=abc&chatFirst=true&utm_source=x",
    });

    const chapterOnly = new URL(
      getVerseReferenceLinkHref(ref({ book: "JON", chapter: 2 }))
    );
    expect(chapterOnly.pathname).toBe("/en/AAB/jonah/2");
    expect([...chapterOnly.searchParams.keys()]).toEqual([]);

    const withVerse = new URL(getVerseReferenceLinkHref(ref({ verse: 16 })));
    expect(withVerse.pathname).toBe("/en/AAB/john/3");
    expect([...withVerse.searchParams.keys()]).toEqual(["verse"]);
    expect(withVerse.searchParams.get("verse")).toBe("16");
  });

  it("falls back to the legacy params when the page isn't on a reading path", () => {
    // Nothing in the URL names a translation, so there is no path to build.
    // The legacy form still works — the server redirects it to the canonical
    // one — which beats emitting a link to the wrong place. Page params such
    // as sessionId still must not come along.
    jsdom.reconfigure({ url: "https://example.test/?sessionId=abc" });

    const url = new URL(getVerseReferenceLinkHref(ref({ verse: 16 })));
    expect(url.searchParams.get("book")).toBe("JHN");
    expect(url.searchParams.get("chapter")).toBe("3");
    expect(url.searchParams.get("verse")).toBe("16");
    expect([...url.searchParams.keys()].sort()).toEqual([
      "book",
      "chapter",
      "verse",
    ]);
  });

  it("drops the page's current verse on a chapter-only reference without a reading path", () => {
    jsdom.reconfigure({
      url: "https://example.test/?verse=9&sessionId=abc",
    });

    const url = new URL(getVerseReferenceLinkHref(ref()));
    expect(url.searchParams.get("book")).toBe("JHN");
    expect(url.searchParams.get("chapter")).toBe("3");
    expect(url.searchParams.get("verse")).toBeNull();
    expect([...url.searchParams.keys()].sort()).toEqual(["book", "chapter"]);
  });
});
