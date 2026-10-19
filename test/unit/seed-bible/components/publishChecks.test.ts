import { publishChecks } from "@packages/seed-bible/seed-bible/components/PlaylistEditor/publishChecks";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { PlaylistItemData } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { useI18n } from "@packages/seed-bible/seed-bible/i18n/I18nManager";

const t = ((key: string, options?: Record<string, unknown>) =>
  String(options?.defaultValue ?? key).replace(
    /\{\{(\w+)\}\}/g,
    (_match, name: string) => String(options?.[name] ?? "")
  )) as ReturnType<typeof useI18n>["t"];

const books = [
  { id: "GEN", name: "Genesis", commonName: "Genesis", numberOfChapters: 50 },
  { id: "EXO", name: "Exodus", commonName: "Exodus", numberOfChapters: 40 },
] as unknown as TranslationBook[];
const resolveBookName = (id: string) =>
  books.find((book) => book.id === id)?.name ?? id;

const messages = (items: PlaylistItemData[]) =>
  publishChecks(items, books, t, resolveBookName).map((check) => [
    check.ok,
    check.message,
  ]);

describe("publishChecks", () => {
  it("asks for a step before anything else", () => {
    expect(messages([{ type: "scene", title: "Intro" }])).toEqual([
      [false, "Add at least one step before publishing."],
    ]);
  });

  it("confirms every passage is in the translation, and counts notes and questions", () => {
    expect(
      messages([
        {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 16 },
          note: "<p>Look</p>",
        },
        { type: "question", prompt: "Why?" },
      ])
    ).toEqual([
      [true, "All passages found in this translation"],
      [true, "1 notes, 1 questions"],
    ]);
  });

  it("points at passages the translation doesn't have", () => {
    expect(
      messages([
        { type: "bible-verse", ref: { bookId: "TOB", chapter: 1 } },
        {
          type: "compare",
          refs: [
            { bookId: "GEN", chapter: 1 },
            { bookId: "EXO", chapter: 41 },
          ],
        },
      ])
    ).toEqual([
      [false, "TOB 1 isn't in this translation."],
      [false, "Exodus 41 isn't in this translation."],
    ]);
  });

  it("flags the same passage shown twice in a row, by step number", () => {
    const checks = publishChecks(
      [
        { type: "scene", title: "Intro" },
        {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
        },
        {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
        },
        {
          type: "bible-verse",
          ref: { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
        },
      ],
      books,
      t,
      resolveBookName
    );
    const repeated = checks.filter((check) =>
      check.message.includes("same passage")
    );
    expect(repeated.map((check) => [check.message, check.itemIndex])).toEqual([
      ["Steps 1 and 2 show the same passage.", 2],
      ["Steps 2 and 3 show the same passage.", 3],
    ]);
  });

  it("flags a scene with nothing under it", () => {
    const checks = publishChecks(
      [
        { type: "scene", title: "Empty" },
        { type: "scene", title: "Full" },
        { type: "bible-verse", ref: { bookId: "GEN", chapter: 1 } },
        { type: "scene", title: "Trailing" },
      ],
      books,
      t,
      resolveBookName
    );
    expect(
      checks
        .filter((check) => check.message.includes("has no steps"))
        .map((check) => check.message)
    ).toEqual([
      "The scene “Empty” has no steps in it.",
      "The scene “Trailing” has no steps in it.",
    ]);
  });
});
