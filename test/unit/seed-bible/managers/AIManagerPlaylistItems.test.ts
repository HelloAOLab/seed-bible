import {
  AIPlaylistItemSchema,
  convertToAiPlaylistItem,
  convertToPlaylistItem,
} from "@packages/seed-bible/seed-bible/managers/AIManager";
import type { PlaylistItemData } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

describe("AI playlist item conversions", () => {
  const items: PlaylistItemData[] = [
    {
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
      note: "<p>Observe who speaks.</p>",
      noteTitle: "Hagar and the Angel",
    },
    {
      type: "question",
      prompt: "God himself, or a messenger?",
      shareable: true,
    },
    {
      type: "compare",
      title: "The angel who speaks as God",
      refs: [
        { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
        { bookId: "EXO", chapter: 3, verse: 2, endVerse: 6 },
      ],
      description: "Who does each person think they met?",
    },
    { type: "scene", title: "Scene 1 · Hagar" },
  ];

  it.each(items)("survives a round trip through the AI shape: %o", (item) => {
    const aiItem = AIPlaylistItemSchema.parse(convertToAiPlaylistItem(item));
    expect(convertToPlaylistItem(aiItem)).toEqual(item);
  });

  it("fills in nothing for the fields a kind doesn't use", () => {
    expect(convertToAiPlaylistItem({ type: "scene", title: "Intro" })).toEqual({
      type: "scene",
      bibleVerse: null,
      link: null,
      html: null,
      question: null,
      compare: null,
      scene: { title: "Intro" },
    });
  });

  it("refuses a kind whose payload is missing", () => {
    expect(() =>
      convertToPlaylistItem(
        AIPlaylistItemSchema.parse({ type: "question", question: null })
      )
    ).toThrow('Item has type "question" but no question was provided.');
  });
});
