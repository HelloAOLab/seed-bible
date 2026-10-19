import { playlistItemLabel } from "@packages/seed-bible/seed-bible/components/playlistItemLabel";
import type {
  Playlist,
  VerseRef,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

const t = (key: string, options?: { defaultValue?: string }) =>
  options?.defaultValue ?? key;

const resolveBookName = (bookId: string) => bookId;

function verseItem(ref: VerseRef): Playlist["items"][number] {
  return { type: "bible-verse", ref };
}

describe("playlistItemLabel", () => {
  it("labels a single verse", () => {
    expect(
      playlistItemLabel(
        verseItem({ bookId: "GEN", chapter: 1, verse: 1 }),
        t,
        resolveBookName
      )
    ).toBe("GEN 1:1");
  });

  it("labels a same-chapter verse range", () => {
    expect(
      playlistItemLabel(
        verseItem({ bookId: "EXO", chapter: 5, verse: 2, endVerse: 5 }),
        t,
        resolveBookName
      )
    ).toBe("EXO 5:2-5");
  });

  it("labels a whole chapter", () => {
    expect(
      playlistItemLabel(
        verseItem({ bookId: "GEN", chapter: 1 }),
        t,
        resolveBookName
      )
    ).toBe("GEN 1");
  });

  it("labels a chapter range", () => {
    expect(
      playlistItemLabel(
        verseItem({ bookId: "JHN", chapter: 1, endChapter: 3 }),
        t,
        resolveBookName
      )
    ).toBe("JHN 1-3");
  });

  it("keeps the end chapter for a cross-chapter verse range", () => {
    expect(
      playlistItemLabel(
        verseItem({
          bookId: "GEN",
          chapter: 1,
          verse: 2,
          endChapter: 3,
          endVerse: 4,
        }),
        t,
        resolveBookName
      )
    ).toBe("GEN 1:2-3:4");
  });

  it("labels a toEndOfChapter fragment (synthesized for cross-chapter playback)", () => {
    expect(
      playlistItemLabel(
        verseItem({
          bookId: "GEN",
          chapter: 1,
          verse: 2,
          toEndOfChapter: true,
        }),
        t,
        resolveBookName
      )
    ).toBe("GEN 1:2-end");
  });

  it("labels a link by its own title, then its preview's title, then its URL", () => {
    const url = "https://example.com/page";
    const preview = { title: "Page title" };
    expect(
      playlistItemLabel(
        { type: "link", url, title: "Mine", preview },
        t,
        resolveBookName
      )
    ).toBe("Mine");
    expect(
      playlistItemLabel({ type: "link", url, preview }, t, resolveBookName)
    ).toBe("Page title");
    expect(playlistItemLabel({ type: "link", url }, t, resolveBookName)).toBe(
      url
    );
  });
});

describe("playlistItemLabel for the newer step kinds", () => {
  it("labels a question by its title, else a short form of its prompt", () => {
    expect(
      playlistItemLabel(
        { type: "question", title: "Think", prompt: "Why?" },
        t,
        resolveBookName
      )
    ).toBe("Think");
    expect(
      playlistItemLabel(
        { type: "question", prompt: "Why?" },
        t,
        resolveBookName
      )
    ).toBe("Why?");
    const long = "x".repeat(100);
    expect(
      playlistItemLabel({ type: "question", prompt: long }, t, resolveBookName)
    ).toBe(`${"x".repeat(80)}…`);
    expect(
      playlistItemLabel({ type: "question", prompt: "  " }, t, resolveBookName)
    ).toBe("Question");
  });

  it("labels a comparison by its title, else its passages", () => {
    const refs: VerseRef[] = [
      { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
      { bookId: "EXO", chapter: 3 },
    ];
    expect(
      playlistItemLabel({ type: "compare", refs }, t, resolveBookName)
    ).toBe("GEN 16:7-13 · EXO 3");
    expect(
      playlistItemLabel(
        { type: "compare", refs, title: "The angel who speaks as God" },
        t,
        resolveBookName
      )
    ).toBe("The angel who speaks as God");
  });

  it("labels a scene by its title", () => {
    expect(
      playlistItemLabel({ type: "scene", title: "Intro" }, t, resolveBookName)
    ).toBe("Intro");
    expect(
      playlistItemLabel({ type: "scene", title: " " }, t, resolveBookName)
    ).toBe("Scene");
  });
});

describe("playlistItemLabel for a step with several passages", () => {
  it("lists every passage, main one first", () => {
    expect(
      playlistItemLabel(
        {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
          refs: [{ bookId: "GEN", chapter: 21, verse: 17, endVerse: 19 }],
        },
        t,
        resolveBookName
      )
    ).toBe("GEN 16:7-13 · GEN 21:17-19");
  });
});
