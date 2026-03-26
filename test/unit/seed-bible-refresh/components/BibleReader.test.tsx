/** @jest-environment ./test/env/CasualOSEnvironment.ts */

import { render } from "preact";
import { act } from "preact/test-utils";
import { computed, signal, type Signal } from "@preact/signals";
import { BibleReader } from "@packages/seed-bible-refresh/seed-bible/components/BibleReader";
import {
  type BibleReadingState,
  type SelectedFootnote,
} from "@packages/seed-bible-refresh/seed-bible/managers/BibleReadingManager";
import type { BibleSelectorState } from "@packages/seed-bible-refresh/seed-bible/managers/BibleSelectorManager";
import type { Pane } from "@packages/seed-bible-refresh/seed-bible/managers/PanesManager";
import type { TranslationBookChapter } from "@packages/seed-bible-refresh/seed-bible/managers/FreeUseBibleAPI";

type ReaderFixture = {
  pane: Pane;
  selectorState: BibleSelectorState;
  readingState: BibleReadingState;
  chapterData: Signal<TranslationBookChapter | null>;
  selectedVerses: BibleReadingState["selectedVerses"];
  selectedFootnote: Signal<SelectedFootnote | null>;
  selectVerse: jest.Mock;
  selectFootnote: jest.Mock;
  setOpen: jest.Mock;
};

function createFixture(): ReaderFixture {
  const chapterData = signal<TranslationBookChapter | null>({
    translation: {
      id: "BSB",
      name: "Berean Standard Bible",
      englishName: "Berean Standard Bible",
      website: "https://example.com",
      licenseUrl: "https://example.com/license",
      shortName: "BSB",
      language: "eng",
      textDirection: "ltr",
      availableFormats: ["json"],
      listOfBooksApiLink: "/api/BSB/books.json",
      numberOfBooks: 66,
      totalNumberOfChapters: 1189,
      totalNumberOfVerses: 31102,
    },
    book: {
      id: "GEN",
      name: "Genesis",
      commonName: "Genesis",
      title: null,
      order: 1,
      numberOfChapters: 50,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/BSB/GEN/1.json",
      lastChapterNumber: 50,
      lastChapterApiLink: "/api/BSB/GEN/50.json",
      totalNumberOfVerses: 1533,
    },
    thisChapterLink: "/api/BSB/GEN/1.json",
    thisChapterAudioLinks: {},
    nextChapterApiLink: "/api/BSB/GEN/2.json",
    nextChapterAudioLinks: {},
    previousChapterApiLink: null,
    previousChapterAudioLinks: null,
    numberOfVerses: 2,
    chapter: {
      number: 1,
      content: [
        { type: "heading", content: ["Creation"] },
        {
          type: "hebrew_subtitle",
          content: ["To the choirmaster."],
        },
        { type: "line_break" },
        {
          type: "verse",
          number: 1,
          content: [
            "In the beginning ",
            { text: "I am the light", wordsOfJesus: true },
            { lineBreak: true },
            { noteId: 7 },
            "God created.",
          ],
        },
        {
          type: "verse",
          number: 2,
          content: [
            { text: "Poetry A", poem: 2 },
            { lineBreak: true },
            { text: "Poetry B", poem: 1 },
          ],
        },
      ],
      footnotes: [{ noteId: 7, text: "Footnote text", caller: "+" }],
    },
  });

  const selectedVerses = signal<BibleReadingState["selectedVerses"]["value"]>(
    []
  );
  const selectedFootnote = signal<SelectedFootnote | null>(null);
  const selectVerse = jest.fn();
  const selectFootnote = jest.fn();
  const setOpen = jest.fn(async () => undefined);

  const currentTranslation = computed(
    () => chapterData.value?.translation ?? null
  );

  const readingState = {
    translationId: signal("BSB"),
    bookId: signal("GEN"),
    chapterNumber: signal(1),
    availableTranslations: signal({
      translations: [chapterData.value!.translation],
    }),
    translationBooks: signal({
      translation: chapterData.value!.translation,
      books: [chapterData.value!.book],
    }),
    translation: currentTranslation,
    chapterData,
    selectedVerses,
    selectedFootnote,
    loading: signal(false),
    error: signal<string | null>(null),
    selectVerse,
    selectFootnote,
    clearSelectedVerses: jest.fn(),
    selectTranslation: jest.fn(async () => undefined),
    selectBook: jest.fn(async () => undefined),
    selectChapter: jest.fn(async () => undefined),
    loadPreviousChapter: jest.fn(async () => undefined),
    loadNextChapter: jest.fn(async () => undefined),
  } as BibleReadingState;

  const selectorState = {
    setOpen,
  } as any as BibleSelectorState;

  const pane = {
    id: "pane-1",
  } as Pane;

  return {
    pane,
    selectorState,
    readingState,
    chapterData,
    selectedVerses,
    selectedFootnote,
    selectVerse,
    selectFootnote,
    setOpen,
  };
}

describe("BibleReader", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("opens the selector when the title is clicked", () => {
    const { pane, selectorState, readingState, setOpen } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentPane={pane}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const title = container.querySelector(".sb-bible-reader-title");
    expect(title).not.toBeNull();

    act(() => {
      title?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(setOpen).toHaveBeenCalledWith(true, pane);
  });

  it("clicking a verse selects it with event coordinates", () => {
    const { pane, selectorState, readingState, selectVerse } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentPane={pane}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const verse = container.querySelector(".sb-verse") as HTMLElement | null;
    expect(verse).not.toBeNull();

    act(() => {
      verse?.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          clientX: 12,
          clientY: 34,
        })
      );
    });

    expect(selectVerse).toHaveBeenCalledTimes(1);
    expect(selectVerse).toHaveBeenCalledWith(
      expect.objectContaining({
        bookId: "GEN",
        chapterNumber: 1,
        translationId: "BSB",
        verse: expect.objectContaining({ number: 1 }),
      }),
      12,
      34
    );
  });

  it("clicking a footnote button opens the matching note", () => {
    const { pane, selectorState, readingState, selectFootnote, selectVerse } =
      createFixture();

    act(() => {
      render(
        <BibleReader
          currentPane={pane}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const footnoteButton = container.querySelector(
      '.sb-inline-footnote-button[aria-label="Open footnote 7"]'
    ) as HTMLButtonElement | null;
    expect(footnoteButton).not.toBeNull();

    act(() => {
      footnoteButton?.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          clientX: 99,
          clientY: 77,
        })
      );
    });

    expect(selectFootnote).toHaveBeenCalledWith(7);
    expect(selectVerse).not.toHaveBeenCalled();
  });

  it("marks selected and poetry verses with their CSS classes", () => {
    const { pane, selectorState, readingState, selectedVerses } =
      createFixture();

    selectedVerses.value = [
      {
        bookId: "GEN",
        chapterNumber: 1,
        translationId: "BSB",
        verse: {
          type: "verse",
          number: 2,
          content: [{ text: "Poetry A", poem: 2 }],
        },
      },
    ];

    act(() => {
      render(
        <BibleReader
          currentPane={pane}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const poetryVerse = container.querySelector(".sb-verse-poetry");
    expect(poetryVerse).not.toBeNull();
    expect(poetryVerse?.classList.contains("sb-verse-selected")).toBe(true);
  });

  it("renders chapter content parts and inline markers", () => {
    const { pane, selectorState, readingState } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentPane={pane}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const heading = container.querySelector(".sb-chapter-heading");
    expect(heading?.textContent).toContain("Creation");

    const verseNumbers = Array.from(
      container.querySelectorAll(".sb-verse-number")
    ).map((element) => element.textContent?.trim());
    expect(verseNumbers).toContain("1");
    expect(verseNumbers).toContain("2");

    const footnoteIndicator = container.querySelector(
      '.sb-inline-footnote-button[aria-label="Open footnote 7"]'
    );
    expect(footnoteIndicator).not.toBeNull();

    expect(container.querySelector(".sb-line-break")).not.toBeNull();

    const verseBreaks = container.querySelectorAll(".sb-verse br");
    expect(verseBreaks.length).toBeGreaterThan(0);

    const subtitle = container.querySelector(".sb-subtitle");
    expect(subtitle?.textContent).toContain("To the choirmaster.");

    const poemLines = container.querySelectorAll(".sb-verse-line");
    expect(poemLines.length).toBe(2);
    expect(container.querySelector(".sb-verse-poetry")?.textContent).toContain(
      "Poetry A"
    );
    expect(container.querySelector(".sb-verse-poetry")?.textContent).toContain(
      "Poetry B"
    );

    const wordsOfJesus = container.querySelector(".sb-words-of-jesus");
    expect(wordsOfJesus).not.toBeNull();
    expect(wordsOfJesus?.textContent).toContain("I am the light");
  });

  it("renders an open footnote modal and closes it", () => {
    const {
      pane,
      selectorState,
      readingState,
      selectedFootnote,
      selectFootnote,
      chapterData,
    } = createFixture();

    selectedFootnote.value = {
      chapter: chapterData.value!,
      verse: {
        type: "verse",
        number: 1,
        content: ["Text"],
      },
      note: { noteId: 7, text: "Footnote text", caller: "+" },
    };

    act(() => {
      render(
        <BibleReader
          currentPane={pane}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    expect(
      container.querySelector(".sb-footnote-modal-title")?.textContent
    ).toContain("Genesis 1:1");
    expect(
      container.querySelector(".sb-footnote-modal-content")?.textContent
    ).toContain("Footnote text");

    const closeButton = container.querySelector(
      ".sb-footnote-modal-close"
    ) as HTMLButtonElement | null;
    expect(closeButton).not.toBeNull();

    act(() => {
      closeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(selectFootnote).toHaveBeenCalledWith(null);
  });
});
