import { playlistItemIcon } from "@packages/seed-bible/seed-bible/components/playlistItemIcon";
import type { Playlist } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

describe("playlistItemIcon", () => {
  it("returns the book icon for a bible-verse item", () => {
    const item: Playlist["items"][number] = {
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 1, verse: 1 },
    };
    expect(playlistItemIcon(item)).toBe("menu_book");
  });

  it("returns the link icon for a link item", () => {
    const item: Playlist["items"][number] = {
      type: "link",
      url: "https://example.com",
    };
    expect(playlistItemIcon(item)).toBe("link");
  });

  it("returns the notes icon for an html item", () => {
    const item: Playlist["items"][number] = {
      type: "html",
      html: "<p>hi</p>",
    };
    expect(playlistItemIcon(item)).toBe("notes");
  });
});
