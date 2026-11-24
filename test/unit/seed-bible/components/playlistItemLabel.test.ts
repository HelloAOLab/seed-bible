import { playlistItemLabel } from "@packages/seed-bible/seed-bible/components/playlistItemLabel";
import type {
  Playlist,
  VerseRef,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

const t = (key: string, options?: Record<string, unknown>) =>
  String(options?.defaultValue ?? key).replace(/{{(\w+)}}/g, (_, name) =>
    String(options?.[name] ?? "")
  );

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

  it("labels an untitled question as a question, not an HTML snippet", () => {
    expect(
      playlistItemLabel(
        { type: "html", html: "<p>Why?</p>", question: {} },
        t,
        resolveBookName
      )
    ).toBe("Question");
  });

  it("labels a question by its title when it has one", () => {
    expect(
      playlistItemLabel(
        { type: "html", title: "Light", html: "<p>Why?</p>", question: {} },
        t,
        resolveBookName
      )
    ).toBe("Light");
  });

  it("labels a compare step with both of its passages", () => {
    expect(
      playlistItemLabel(
        {
          type: "bible-verse",
          ref: { bookId: "JHN", chapter: 1, verse: 1, endVerse: 5 },
          compare: { ref: { bookId: "GEN", chapter: 1 } },
        },
        t,
        resolveBookName
      )
    ).toBe("Compare JHN 1:1-5 to GEN 1");
  });
});
