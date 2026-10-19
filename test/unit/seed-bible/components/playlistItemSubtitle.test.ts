import { playlistItemSubtitle } from "@packages/seed-bible/seed-bible/components/playlistItemSubtitle";
import type { useI18n } from "@packages/seed-bible/seed-bible/i18n/I18nManager";

const t = ((_key: string, options?: { defaultValue?: string }) =>
  options?.defaultValue ?? _key) as ReturnType<typeof useI18n>["t"];

describe("playlistItemSubtitle", () => {
  it("names scripture by its kind alone, since the title is the reference", () => {
    expect(
      playlistItemSubtitle(
        { type: "bible-verse", ref: { bookId: "GEN", chapter: 1 } },
        t
      )
    ).toBe("Scripture");
  });

  it("follows a text item's kind with a one-line excerpt", () => {
    expect(
      playlistItemSubtitle(
        { type: "html", html: "<p>Read <b>slowly</b></p><p>Then pray.</p>" },
        t
      )
    ).toBe("Text · Read slowly Then pray.");
  });

  it("gives an empty text item its kind alone", () => {
    expect(playlistItemSubtitle({ type: "html", html: "<p></p>" }, t)).toBe(
      "Text"
    );
  });

  it("follows a link's kind with its host, and calls a video link a video", () => {
    expect(
      playlistItemSubtitle(
        { type: "link", url: "https://www.example.com/page" },
        t
      )
    ).toBe("Link · example.com");
    expect(
      playlistItemSubtitle(
        { type: "link", url: "https://www.youtube.com/watch?v=abc123" },
        t
      )
    ).toBe("Video · youtube.com");
  });
});
