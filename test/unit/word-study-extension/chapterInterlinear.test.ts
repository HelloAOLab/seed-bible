import { signal } from "@preact/signals";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleSelectedVerse } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import {
  chapterPositionOf,
  createInterlinearLines,
  readerVerseOf,
} from "@packages/word-study-extension/ext_WordStudy/chapterInterlinear";
import { createSettings } from "./settings";

type CurrentReadingState =
  SeedBibleState["app"]["currentReadingState"]["value"];

function readingAt(options: {
  bookId?: string | null;
  chapterNumber?: number | null;
  selected?: number[];
  firstVisible?: number;
}): CurrentReadingState {
  const selectedVerses: BibleSelectedVerse[] = (options.selected ?? []).map(
    (number) => ({
      bookId: "JHN",
      chapterNumber: 3,
      verse: { type: "verse", number, content: [] },
      translationId: "BSB",
    })
  );
  return {
    translationId: "BSB",
    bookId: options.bookId === undefined ? "JHN" : options.bookId,
    chapterNumber:
      options.chapterNumber === undefined ? 3 : options.chapterNumber,
    tab: {
      readingState: {
        translationBooks: signal({
          books: [{ id: "JHN", name: "John", commonName: "John" }],
        }),
        selectedVerses: signal(selectedVerses),
        visibleVerseRange: signal(
          options.firstVisible === undefined
            ? null
            : { first: options.firstVisible, last: options.firstVisible + 5 }
        ),
      },
    },
  } as unknown as CurrentReadingState;
}

describe("chapterPositionOf", () => {
  it("names the reader's book in their translation", () => {
    expect(chapterPositionOf(readingAt({}))).toEqual({
      bookId: "JHN",
      bookName: "John",
      chapter: 3,
    });
  });

  it("is null while no chapter is open", () => {
    expect(chapterPositionOf(null)).toBeNull();
    expect(chapterPositionOf(readingAt({ bookId: null }))).toBeNull();
  });
});

describe("readerVerseOf", () => {
  it("prefers the first selected verse", () => {
    expect(
      readerVerseOf(readingAt({ selected: [16, 14], firstVisible: 1 }))
    ).toBe(14);
  });

  it("falls back to the first verse on screen, then the top", () => {
    expect(readerVerseOf(readingAt({ firstVisible: 9 }))).toBe(9);
    expect(readerVerseOf(readingAt({}))).toBeNull();
  });
});

describe("createInterlinearLines", () => {
  it("shows every line until the reader hides one", () => {
    const lines = createInterlinearLines(
      "word-study-extension",
      createSettings({ isSignedIn: false })
    );

    expect(lines.isShown("transliteration")).toBe(true);
    expect(lines.isShown("parsing")).toBe(true);
  });

  it("keeps a signed-out reader's choice for the session", async () => {
    const lines = createInterlinearLines(
      "word-study-extension",
      createSettings({ isSignedIn: false })
    );

    await lines.setShown("gloss", false);

    expect(lines.isShown("gloss")).toBe(false);
  });

  it("saves a signed-in reader's choice and then follows the setting", async () => {
    const settings = createSettings({ isSignedIn: true });
    const lines = createInterlinearLines("word-study-extension", settings);

    await lines.setShown("strongs", false);
    expect(settings.getValue("word-study-extension", "showStrongs")).toBe(
      false
    );

    // Changed later in Settings, or on another device.
    settings.store("showStrongs", true);

    expect(lines.isShown("strongs")).toBe(true);
  });
});
