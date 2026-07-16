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
});
