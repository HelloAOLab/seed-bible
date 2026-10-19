import { playlistItemSubtitle } from "@packages/seed-bible/seed-bible/components/playlistItemSubtitle";
import type { useI18n } from "@packages/seed-bible/seed-bible/i18n/I18nManager";

const t = ((key: string, options?: Record<string, unknown>) =>
  String(options?.defaultValue ?? key).replace(
    /\{\{(\w+)\}\}/g,
    (_match, name: string) => String(options?.[name] ?? "")
  )) as ReturnType<typeof useI18n>["t"];

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

describe("playlistItemSubtitle for the newer step kinds", () => {
  it("calls a passage with a note 'Note + Scripture' and shows the note's title", () => {
    expect(
      playlistItemSubtitle(
        {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 16 },
          note: "<p>Look</p>",
          noteTitle: "Hagar and the Angel",
        },
        t
      )
    ).toBe("Note + Scripture · Hagar and the Angel");
    expect(
      playlistItemSubtitle(
        {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 16 },
          note: "<p>Look</p>",
        },
        t
      )
    ).toBe("Note + Scripture");
  });

  it("shows a titled question's prompt, a comparison's passages, and a scene's kind", () => {
    expect(
      playlistItemSubtitle(
        { type: "question", title: "Think", prompt: "Why?" },
        t
      )
    ).toBe("Question · Why?");
    expect(playlistItemSubtitle({ type: "question", prompt: "Why?" }, t)).toBe(
      "Question"
    );
    expect(
      playlistItemSubtitle(
        {
          type: "compare",
          refs: [
            { bookId: "GEN", chapter: 16 },
            { bookId: "EXO", chapter: 3 },
          ],
        },
        t,
        (id) => ({ GEN: "Genesis", EXO: "Exodus" })[id] ?? id
      )
    ).toBe("Compare · Genesis 16 · Exodus 3");
    expect(playlistItemSubtitle({ type: "scene", title: "Intro" }, t)).toBe(
      "Scene"
    );
  });
});

describe("playlistItemSubtitle for a step with several passages", () => {
  it("counts the passages when the step has no note title", () => {
    expect(
      playlistItemSubtitle(
        {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 16 },
          refs: [
            { bookId: "GEN", chapter: 21 },
            { bookId: "EXO", chapter: 3 },
          ],
        },
        t
      )
    ).toBe("Scripture · 3 passages");
  });
});
