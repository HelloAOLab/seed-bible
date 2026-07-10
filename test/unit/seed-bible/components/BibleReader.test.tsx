import { render } from "preact";
import { act, setupRerender, teardown } from "preact/test-utils";
import { computed, signal, type Signal } from "@preact/signals";
import { BibleReader } from "@packages/seed-bible/seed-bible/components/BibleReader/BibleReader";
import { TabSlotReader } from "@packages/seed-bible/seed-bible/components/TabsLayout";
import {
  type BibleReadingState,
  type SelectedFootnote,
  type VerseDecoration,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { BibleSelectorState } from "@packages/seed-bible/seed-bible/managers/BibleSelectorManager";
import type { TabSlot } from "@packages/seed-bible/seed-bible/managers/TabsLayoutManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { TranslationBookChapter } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { createBibleToolsManager } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import { vi, type Mock } from "vitest";
import { createPlaylistManager } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { pl } from "zod/locales";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
    }),
  };
});

type ReaderFixture = {
  slot: TabSlot;
  selectorState: BibleSelectorState;
  readingState: BibleReadingState;
  chapterData: Signal<TranslationBookChapter | null>;
  highlights: Signal<BibleReadingState["highlights"]["value"]>;
  decorations: Signal<VerseDecoration[]>;
  selectedVerses: BibleReadingState["selectedVerses"];
  selectedFootnote: Signal<SelectedFootnote | null>;
  selectVerse: Mock;
  selectFootnote: Mock;
  setOpen: Mock;
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
  const highlights = signal<BibleReadingState["highlights"]["value"]>({
    highlights: [],
  });
  const decorations = signal<VerseDecoration[]>([]);
  const selectedFootnote = signal<SelectedFootnote | null>(null);
  const selectVerse = vi.fn();
  const selectFootnote = vi.fn();
  const setOpen = vi.fn(async () => undefined);

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
    decorations,
    loading: signal(false),
    scrollPosition: signal(0),
    scrollToVerse: signal<number | null>(null),
    error: signal<string | null>(null),
    selectVerse,
    selectFootnote,
    highlightSelectedVerses: vi.fn(async () => undefined),
    unhighlightSelectedVerses: vi.fn(async () => undefined),
    decorateVerses: vi.fn(() => "decoration-1"),
    removeDecoration: vi.fn(),
    clearSelectedVerses: vi.fn(),
    selectTranslation: vi.fn(async () => undefined),
    selectBook: vi.fn(async () => undefined),
    selectChapter: vi.fn(async () => undefined),
    loadPreviousChapter: vi.fn(async () => undefined),
    loadNextChapter: vi.fn(async () => undefined),
    selectTranslationAndChapter: vi.fn(async () => undefined),
    highlights,
    chapterDataPromise: Promise.resolve(),
    defaultTranslation: { id: "BSB", language: "en" },
    discoveredContent: signal([]),
    discoveredCrossReferences: signal([]),
    discoveredStudyNotes: signal([]),
  } as BibleReadingState;

  const selectorState = {
    setOpen,
  } as any as BibleSelectorState;

  const slot: TabSlot = {
    id: "slot-1",
    tab: null,
  };

  return {
    slot,
    selectorState,
    readingState,
    chapterData,
    highlights,
    decorations,
    selectedVerses,
    selectedFootnote,
    selectVerse,
    selectFootnote,
    setOpen,
  };
}

function createMobileState(): SeedBibleState {
  return {
    app: {
      isMobile: signal(true),
    },
    bibleData: {
      getPreviousChapter: vi.fn(async () => null),
      getNextChapter: vi.fn(async () => null),
    },
    sidebar: {
      openSettings: vi.fn(),
      openSidebar: vi.fn(),
      openSettingsToView: vi.fn(),
    },
    bookmarks: {
      isLocationBookmarked: vi.fn(() => false),
      toggleBookmarkAtLocation: vi.fn(async () => {}),
    },
    login: {
      userId: signal<string | null>(null),
      profile: signal<{ name?: string; pictureUrl?: string } | null>(null),
    },
    os: {
      connectionId: "test-connection",
    },
    tools: createBibleToolsManager(),
    playlists: {
      playing: signal(null),
    },
    features: {
      isFeatureEnabled: vi.fn(() => true),
    },
  } as any as SeedBibleState;
}

function dispatchTouch(
  element: Element,
  type: "touchstart" | "touchmove" | "touchend",
  touchPoints: Array<{ clientX: number; clientY: number }>
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    configurable: true,
    value: touchPoints,
  });
  element.dispatchEvent(event);
}

function renderMobileReader(
  fixture: Pick<ReaderFixture, "slot" | "selectorState" | "readingState">,
  state: SeedBibleState,
  container: HTMLDivElement
) {
  act(() => {
    render(
      <TabSlotReader
        tab={{
          id: "tab-1",
          title: "Tab 1",
          readingState: fixture.readingState,
          sharedSession: null,
          sharedChat: null,
        }}
        state={state}
        slot={fixture.slot}
      />,
      container
    );
  });
}

beforeEach(() => {
  setupRerender();
});

afterEach(() => {
  teardown();
});

describe("BibleReader", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    // render(null, container);
    container.remove();
  });

  it("opens the selector when the title is clicked", () => {
    const { slot, selectorState, readingState, setOpen } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
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

    expect(setOpen).toHaveBeenCalledWith(true, slot);
  });

  it("updates the displayed book name when the current book changes", () => {
    const { slot, selectorState, readingState } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-bible-reader-book")?.textContent).toBe(
      "Genesis"
    );

    const exodus = {
      ...readingState.translationBooks.value!.books[0]!,
      id: "EXO",
      name: "Exodus",
      commonName: "Exodus",
      order: 2,
    };

    act(() => {
      (
        readingState.translationBooks as Signal<
          BibleReadingState["translationBooks"]["value"]
        >
      ).value = {
        translation: readingState.translationBooks.value!.translation,
        books: [exodus],
      };
      readingState.bookId.value = "EXO";
    });

    expect(container.querySelector(".sb-bible-reader-book")?.textContent).toBe(
      "Exodus"
    );
  });

  it("shows the new book when the reading state is replaced with one for a different book", () => {
    const first = createFixture();
    const second = createFixture();

    // Point the second reading state at a different book entirely, so that
    // re-rendering with it must recompute the current book rather than keep
    // the first reading state's value.
    const exodus = {
      ...second.readingState.translationBooks.value!.books[0]!,
      id: "EXO",
      name: "Exodus",
      commonName: "Exodus",
      order: 2,
    };
    (
      second.readingState.translationBooks as Signal<
        BibleReadingState["translationBooks"]["value"]
      >
    ).value = {
      translation: second.readingState.translationBooks.value!.translation,
      books: [exodus],
    };
    second.readingState.bookId.value = "EXO";

    act(() => {
      render(
        <BibleReader
          currentSlot={first.slot}
          selectorState={first.selectorState}
          readingState={first.readingState}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-bible-reader-book")?.textContent).toBe(
      "Genesis"
    );

    act(() => {
      render(
        <BibleReader
          currentSlot={second.slot}
          selectorState={second.selectorState}
          readingState={second.readingState}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-bible-reader-book")?.textContent).toBe(
      "Exodus"
    );
  });

  it("clicking a verse selects it with event coordinates", () => {
    const { slot, selectorState, readingState, selectVerse } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
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
    const { slot, selectorState, readingState, selectFootnote, selectVerse } =
      createFixture();

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
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
    const { slot, selectorState, readingState, selectedVerses } =
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
          currentSlot={slot}
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

  it("applies sb-highlight-{colorId} class for color-id highlights", () => {
    const { slot, selectorState, readingState, highlights } = createFixture();

    highlights.value = {
      highlights: [
        {
          verse: 1,
          colorId: "yellow",
        },
      ],
    };

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const verses = container.querySelectorAll(".sb-verse");
    const firstVerse = verses[0] as HTMLElement | undefined;
    expect(firstVerse).toBeDefined();
    const firstDecorator = firstVerse?.querySelector(
      ".sb-verse-decorator"
    ) as HTMLElement | null;
    expect(firstDecorator).not.toBeNull();
    expect(firstDecorator?.classList.contains("sb-highlight-yellow")).toBe(
      true
    );
  });

  it("applies inline custom highlight colors when highlight uses a custom color", () => {
    const { slot, selectorState, readingState, highlights } = createFixture();

    highlights.value = {
      highlights: [
        {
          verse: [1, 2],
          colorId: "custom",
          customColor: "#123456",
          customFontColor: "#abcdef",
        },
      ],
    };

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const verses = container.querySelectorAll(".sb-verse");
    const firstVerse = verses[0] as HTMLElement | undefined;
    expect(firstVerse).toBeDefined();
    const firstDecorator = firstVerse?.querySelector(
      ".sb-verse-decorator"
    ) as HTMLElement | null;
    expect(firstDecorator).not.toBeNull();
    expect(firstDecorator?.classList.contains("sb-highlight-yellow")).toBe(
      false
    );
    expect(firstDecorator?.style.backgroundColor).toBe("rgb(18, 52, 86)");
    expect(firstDecorator?.style.color).toBe("rgb(171, 205, 239)");
  });

  it("reacts to highlight signal changes for the current chapter", () => {
    const { slot, selectorState, readingState, highlights } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    let verses = container.querySelectorAll(".sb-verse");
    let firstVerse = verses[0] as HTMLElement | undefined;
    let firstDecorator = firstVerse?.querySelector(
      ".sb-verse-decorator"
    ) as HTMLElement | null;
    expect(firstDecorator?.classList.contains("sb-highlight-yellow")).toBe(
      false
    );

    act(() => {
      highlights.value = {
        highlights: [
          {
            verse: 1,
            colorId: "yellow",
          },
        ],
      };
    });

    verses = container.querySelectorAll(".sb-verse");
    firstVerse = verses[0] as HTMLElement | undefined;
    firstDecorator = firstVerse?.querySelector(
      ".sb-verse-decorator"
    ) as HTMLElement | null;
    expect(firstDecorator?.classList.contains("sb-highlight-yellow")).toBe(
      true
    );
  });

  it("applies verse decorations and lets decoration styles override highlight styles", () => {
    const { slot, selectorState, readingState, highlights, decorations } =
      createFixture();

    highlights.value = {
      highlights: [
        {
          verse: 1,
          colorId: "custom",
          customColor: "#123456",
          customFontColor: "#abcdef",
        },
      ],
    };
    decorations.value = [
      {
        id: "decoration-1",
        translationId: "BSB",
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        className: "sb-test-decoration sb-extra-decoration",
        style: {
          color: "rgb(255, 0, 0)",
          borderBottom: "2px solid blue",
        },
      },
    ];

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const verses = container.querySelectorAll(".sb-verse");
    const firstVerse = verses[0] as HTMLElement | undefined;
    expect(firstVerse).toBeDefined();
    const firstDecorator = firstVerse?.querySelector(
      ".sb-verse-decorator"
    ) as HTMLElement | null;
    expect(firstDecorator).not.toBeNull();
    expect(firstDecorator?.classList.contains("sb-test-decoration")).toBe(true);
    expect(firstDecorator?.classList.contains("sb-extra-decoration")).toBe(
      true
    );
    expect(firstDecorator?.style.backgroundColor).toBe("rgb(18, 52, 86)");
    expect(firstDecorator?.style.color).toBe("rgb(255, 0, 0)");
    expect(firstDecorator?.style.borderBottom).toBe("2px solid blue");
  });

  it("displays decorations for any translation when decoration translationId is null", () => {
    const { slot, selectorState, readingState, decorations } = createFixture();

    decorations.value = [
      {
        id: "decoration-any-translation",
        translationId: null,
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        className: "sb-any-translation-decoration",
      },
    ];

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const firstVerse = container.querySelectorAll(".sb-verse")[0] as
      | HTMLElement
      | undefined;
    const firstDecorator = firstVerse?.querySelector(
      ".sb-verse-decorator"
    ) as HTMLElement | null;

    expect(firstDecorator).not.toBeNull();
    expect(
      firstDecorator?.classList.contains("sb-any-translation-decoration")
    ).toBe(true);
  });

  it("displays multiple decorations on a single verse", () => {
    const { slot, selectorState, readingState, decorations } = createFixture();

    decorations.value = [
      {
        id: "decoration-one",
        translationId: "BSB",
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        className: "sb-decoration-one",
        style: {
          borderBottom: "1px solid red",
        },
      },
      {
        id: "decoration-two",
        translationId: "BSB",
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        className: "sb-decoration-two",
        style: {
          textDecoration: "underline",
        },
      },
    ];

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const firstVerse = container.querySelectorAll(".sb-verse")[0] as
      | HTMLElement
      | undefined;
    const firstDecorator = firstVerse?.querySelector(
      ".sb-verse-decorator"
    ) as HTMLElement | null;

    expect(firstDecorator).not.toBeNull();
    expect(firstDecorator?.classList.contains("sb-decoration-one")).toBe(true);
    expect(firstDecorator?.classList.contains("sb-decoration-two")).toBe(true);
    expect(firstDecorator?.style.borderBottom).toBe("1px solid red");
    expect(firstDecorator?.style.textDecoration).toBe("underline");
  });

  it("merges decoration classes together for a single verse", () => {
    const { slot, selectorState, readingState, decorations } = createFixture();

    decorations.value = [
      {
        id: "decoration-class-a",
        translationId: "BSB",
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        className: "sb-decoration-class-a",
      },
      {
        id: "decoration-class-b",
        translationId: "BSB",
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        className: "sb-decoration-class-b",
      },
    ];

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const firstVerse = container.querySelectorAll(".sb-verse")[0] as
      | HTMLElement
      | undefined;
    const firstDecorator = firstVerse?.querySelector(
      ".sb-verse-decorator"
    ) as HTMLElement | null;

    expect(firstDecorator).not.toBeNull();
    expect(firstDecorator?.classList.contains("sb-decoration-class-a")).toBe(
      true
    );
    expect(firstDecorator?.classList.contains("sb-decoration-class-b")).toBe(
      true
    );
  });

  it("displays decorations and highlights together for a single verse", () => {
    const { slot, selectorState, readingState, highlights, decorations } =
      createFixture();

    highlights.value = {
      highlights: [
        {
          verse: 1,
          colorId: "yellow",
        },
      ],
    };
    decorations.value = [
      {
        id: "decoration-highlight-combo",
        translationId: "BSB",
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        className: "sb-decoration-with-highlight",
      },
    ];

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const firstVerse = container.querySelectorAll(".sb-verse")[0] as
      | HTMLElement
      | undefined;
    const firstDecorator = firstVerse?.querySelector(
      ".sb-verse-decorator"
    ) as HTMLElement | null;

    expect(firstDecorator).not.toBeNull();
    expect(firstDecorator?.classList.contains("sb-highlight-yellow")).toBe(
      true
    );
    expect(
      firstDecorator?.classList.contains("sb-decoration-with-highlight")
    ).toBe(true);
  });

  it("wraps inline verse groups in a verse decorator span", () => {
    const { slot, selectorState, readingState } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const firstVerse = container.querySelectorAll(".sb-verse")[0] as
      | HTMLElement
      | undefined;
    const firstDecorator = firstVerse?.querySelector(
      ".sb-verse-decorator"
    ) as HTMLElement | null;

    expect(firstDecorator).not.toBeNull();
    expect(firstDecorator?.querySelector(".sb-verse-number")?.textContent).toBe(
      "1"
    );
    expect(firstDecorator?.textContent).toContain("In the beginning");
  });

  it("wraps poetry lines in verse decorator spans", () => {
    const { slot, selectorState, readingState } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const poetryVerse = container.querySelector(
      ".sb-verse-poetry"
    ) as HTMLElement | null;
    expect(poetryVerse).not.toBeNull();

    const poetryLines = poetryVerse?.querySelectorAll(".sb-verse-line");
    expect(poetryLines?.length).toBe(2);

    const poetryDecorators = poetryVerse?.querySelectorAll(
      ".sb-verse-line > .sb-verse-decorator"
    );
    expect(poetryDecorators?.length).toBe(2);
    expect(
      poetryDecorators?.[0]?.querySelector(".sb-verse-number")?.textContent
    ).toBe("2");
  });

  it("applies targetContent decorations only to the matching text", () => {
    const { slot, selectorState, readingState, decorations } = createFixture();

    decorations.value = [
      {
        id: "decoration-piece",
        translationId: "BSB",
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        targetContent: "God created",
        className: "sb-piece-decoration",
        style: {
          backgroundColor: "rgb(1, 2, 3)",
        },
      },
    ];

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const firstVerse = container.querySelectorAll(".sb-verse")[0] as
      | HTMLElement
      | undefined;
    const firstVerseDecorator = firstVerse?.querySelector(
      ".sb-verse-decorator"
    ) as HTMLElement | null;

    expect(firstVerseDecorator).not.toBeNull();
    expect(firstVerseDecorator?.classList.contains("sb-piece-decoration")).toBe(
      false
    );

    const piece = firstVerse?.querySelector(
      ".sb-piece-decoration"
    ) as HTMLElement | null;
    expect(piece).not.toBeNull();
    expect(piece?.textContent).toBe("God created");
    expect(piece?.style.backgroundColor).toBe("rgb(1, 2, 3)");
  });

  it("applies targetContent only within start/end indexes", () => {
    const { slot, selectorState, readingState, decorations } = createFixture();

    decorations.value = [
      {
        id: "decoration-indexed-target",
        translationId: "BSB",
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        targetContent: "created",
        startIndex: 31,
        endIndex: 43,
        className: "sb-indexed-target-decoration",
      },
    ];

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const decoratedPieces = Array.from(
      container.querySelectorAll(".sb-indexed-target-decoration")
    ) as HTMLElement[];
    expect(decoratedPieces).toHaveLength(1);
    expect(decoratedPieces[0]?.textContent).toBe("created");
  });

  it("applies start/end-only decoration to just that index range", () => {
    const { slot, selectorState, readingState, decorations } = createFixture();

    decorations.value = [
      {
        id: "decoration-index-range",
        translationId: "BSB",
        bookId: "GEN",
        chapterNumber: 1,
        verses: [1],
        startIndex: 31,
        endIndex: 42,
        className: "sb-index-range-decoration",
      },
    ];

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const decoratedPieces = Array.from(
      container.querySelectorAll(".sb-index-range-decoration")
    ) as HTMLElement[];
    expect(decoratedPieces).toHaveLength(1);
    expect(decoratedPieces[0]?.textContent).toBe("God created");

    const firstVerseDecorator = container
      .querySelectorAll(".sb-verse")[0]
      ?.querySelector(".sb-verse-decorator") as HTMLElement | null;
    expect(firstVerseDecorator).not.toBeNull();
    expect(
      firstVerseDecorator?.classList.contains("sb-index-range-decoration")
    ).toBe(false);
  });

  it("renders chapter content parts and inline markers", () => {
    const { slot, selectorState, readingState } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
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

  it("hides chapter headings when scriptureElements.showHeadings is false", () => {
    const { slot, selectorState, readingState } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
          scriptureElements={{
            showHeadings: false,
            showVerseNumbers: true,
            showFootnotes: true,
            showHighlights: true,
            showRedLettering: true,
          }}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-chapter-heading")).toBeNull();
  });

  it("hides verse numbers when scriptureElements.showVerseNumbers is false", () => {
    const { slot, selectorState, readingState } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
          scriptureElements={{
            showHeadings: true,
            showVerseNumbers: false,
            showFootnotes: true,
            showHighlights: true,
            showRedLettering: true,
          }}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-verse-number")).toBeNull();
  });

  it("hides inline footnote buttons and the footnote modal when scriptureElements.showFootnotes is false", () => {
    const { slot, selectorState, readingState, selectedFootnote, chapterData } =
      createFixture();

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
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
          scriptureElements={{
            showHeadings: true,
            showVerseNumbers: true,
            showFootnotes: false,
            showHighlights: true,
            showRedLettering: true,
          }}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-inline-footnote-button")).toBeNull();
    expect(container.querySelector(".sb-footnote-modal")).toBeNull();
  });

  it("hides highlight classes/styles when scriptureElements.showHighlights is false", () => {
    const { slot, selectorState, readingState, highlights } = createFixture();

    highlights.value = {
      highlights: [
        {
          verse: 1,
          colorId: "custom",
          customColor: "#123456",
          customFontColor: "#abcdef",
        },
      ],
    };

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
          scriptureElements={{
            showHeadings: true,
            showVerseNumbers: true,
            showFootnotes: true,
            showHighlights: false,
            showRedLettering: true,
          }}
        />,
        container
      );
    });

    const firstVerse = container.querySelectorAll(".sb-verse")[0] as
      | HTMLElement
      | undefined;
    const firstDecorator = firstVerse?.querySelector(
      ".sb-verse-decorator"
    ) as HTMLElement | null;

    expect(firstDecorator).not.toBeNull();
    expect(firstDecorator?.className).not.toContain("sb-highlight-");
    expect(firstDecorator?.style.backgroundColor).toBe("");
    expect(firstDecorator?.style.color).toBe("");
  });

  it("omits sb-words-of-jesus class when scriptureElements.showRedLettering is false", () => {
    const { slot, selectorState, readingState } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
          scriptureElements={{
            showHeadings: true,
            showVerseNumbers: true,
            showFootnotes: true,
            showHighlights: true,
            showRedLettering: false,
          }}
        />,
        container
      );
    });

    expect(container.querySelector(".sb-words-of-jesus")).toBeNull();
  });

  it("applies sb-words-of-jesus class when scriptureElements.showRedLettering is true", () => {
    const { slot, selectorState, readingState } = createFixture();

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
          scriptureElements={{
            showHeadings: true,
            showVerseNumbers: true,
            showFootnotes: true,
            showHighlights: true,
            showRedLettering: true,
          }}
        />,
        container
      );
    });

    const wordsOfJesus = container.querySelector(".sb-words-of-jesus");
    expect(wordsOfJesus).not.toBeNull();
    expect(wordsOfJesus?.textContent).toContain("I am the light");
  });

  it("renders an open footnote modal and closes it", () => {
    const {
      slot,
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
          currentSlot={slot}
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

  it("shows translation license notice and website when licenseNotice is present", () => {
    const { slot, selectorState, readingState, chapterData } = createFixture();

    chapterData.value = {
      ...chapterData.value!,
      translation: {
        ...chapterData.value!.translation,
        licenseNotice: "Used by permission. All rights reserved.",
        website: "https://example.org/translation",
      },
    };

    act(() => {
      render(
        <BibleReader
          currentSlot={slot}
          selectorState={selectorState}
          readingState={readingState}
        />,
        container
      );
    });

    const notice = container.querySelector(".sb-translation-license-notice");
    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain(
      "Used by permission. All rights reserved."
    );

    const websiteLink = container.querySelector(
      ".sb-translation-website a"
    ) as HTMLAnchorElement | null;
    expect(websiteLink).not.toBeNull();
    expect(websiteLink?.textContent).toBe("https://example.org/translation");
    expect(websiteLink?.getAttribute("href")).toBe(
      "https://example.org/translation"
    );
  });

  it("updates readingState.scrollPosition when the chapter scroller scrolls", () => {
    const { slot, selectorState, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };

    renderMobileReader({ slot, selectorState, readingState }, state, container);

    const scroller = container.querySelector(
      ".sb-reader-swipe-panel-current"
    ) as HTMLDivElement | null;
    expect(scroller).not.toBeNull();

    act(() => {
      if (!scroller) {
        return;
      }
      scroller.scrollTop = 87;
      scroller.dispatchEvent(new Event("scroll"));
    });

    expect(readingState.scrollPosition.value).toBe(87);
  });

  it("sets the scroller scrollTop from readingState.scrollPosition", () => {
    const { slot, selectorState, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };
    readingState.scrollPosition.value = 123;

    renderMobileReader({ slot, selectorState, readingState }, state, container);

    const scroller = container.querySelector(
      ".sb-reader-swipe-panel-current"
    ) as HTMLDivElement | null;
    expect(scroller).not.toBeNull();
    expect(scroller?.scrollTop).toBe(123);
  });

  it("scrolls a requested verse into view when readingState.scrollToVerse is set", () => {
    const { slot, selectorState, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };
    readingState.scrollToVerse.value = 1;

    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      });
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoViewSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewSpy,
    });

    try {
      renderMobileReader(
        { slot, selectorState, readingState },
        state,
        container
      );
    } finally {
      rafSpy.mockRestore();
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
    }

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({
      block: "center",
      inline: "nearest",
    });
    expect(readingState.scrollToVerse.value).toBeNull();
  });

  it("does not update readingState.scrollPosition when reading state points at a different chapter", () => {
    const { slot, selectorState, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };

    renderMobileReader({ slot, selectorState, readingState }, state, container);

    const scroller = container.querySelector(
      ".sb-reader-swipe-panel-current"
    ) as HTMLDivElement | null;
    expect(scroller).not.toBeNull();

    readingState.chapterNumber.value = 2;

    act(() => {
      if (!scroller) {
        return;
      }
      scroller.scrollTop = 211;
      scroller.dispatchEvent(new Event("scroll"));
    });

    expect(readingState.scrollPosition.value).toBe(0);
  });

  it("registers the scroll listener as passive", () => {
    const { slot, selectorState, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };

    const originalAddEventListener = HTMLElement.prototype.addEventListener;
    const addEventListenerSpy = vi.fn(function (
      this: HTMLElement,
      ...args: Parameters<HTMLElement["addEventListener"]>
    ) {
      return originalAddEventListener.apply(this, args);
    });
    Object.defineProperty(HTMLElement.prototype, "addEventListener", {
      configurable: true,
      value: addEventListenerSpy,
    });

    try {
      renderMobileReader(
        { slot, selectorState, readingState },
        state,
        container
      );
    } finally {
      Object.defineProperty(HTMLElement.prototype, "addEventListener", {
        configurable: true,
        value: originalAddEventListener,
      });
    }

    expect(addEventListenerSpy.mock.calls).toContainEqual([
      "scroll",
      expect.any(Function),
      { passive: true },
    ]);
  });

  it("applies and removes the mobile hidden-header class based on scroll direction and threshold", () => {
    const { slot, selectorState, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };

    renderMobileReader({ slot, selectorState, readingState }, state, container);

    const scroller = container.querySelector(
      ".sb-reader-swipe-panel-current"
    ) as HTMLDivElement | null;
    expect(scroller).not.toBeNull();

    const mobileHeaderSelector = ".sb-bible-reader-mobile-header";

    act(() => {
      if (!scroller) {
        return;
      }
      scroller.scrollTop = 60;
      scroller.dispatchEvent(new Event("scroll"));
    });

    expect(
      container
        .querySelector(mobileHeaderSelector)
        ?.classList.contains("sb-bible-reader-mobile-header-hidden")
    ).toBe(true);

    act(() => {
      if (!scroller) {
        return;
      }
      scroller.scrollTop = 40;
      scroller.dispatchEvent(new Event("scroll"));
    });

    expect(
      container
        .querySelector(mobileHeaderSelector)
        ?.classList.contains("sb-bible-reader-mobile-header-hidden")
    ).toBe(false);
  });

  it("renders the book name and chapter number as a heading at the top of the mobile content", () => {
    const { slot, selectorState, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };

    renderMobileReader({ slot, selectorState, readingState }, state, container);

    const title = container.querySelector(
      ".sb-reader-swipe-panel-current .sb-bible-reader-mobile-content-title"
    );
    expect(title).not.toBeNull();
    expect(title?.querySelector(".sb-bible-reader-book")?.textContent).toBe(
      "Genesis"
    );
    expect(title?.querySelector(".sb-bible-reader-chapter")?.textContent).toBe(
      "1"
    );
  });

  it("swiping left on mobile loads the next chapter", async () => {
    const { slot, selectorState, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      previousChapterApiLink: null,
    };

    vi.useFakeTimers();
    try {
      renderMobileReader(
        { slot, selectorState, readingState },
        state,
        container
      );

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement | null;
      expect(viewport).not.toBeNull();

      act(() => {
        if (!viewport) {
          return;
        }
        dispatchTouch(viewport, "touchstart", [{ clientX: 200, clientY: 30 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 80, clientY: 30 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(251);
      });

      await Promise.resolve();

      expect(readingState.clearSelectedVerses).toHaveBeenCalledTimes(1);
      expect(readingState.loadNextChapter).toHaveBeenCalledTimes(1);
      expect(readingState.loadPreviousChapter).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("swiping right on mobile loads the previous chapter", async () => {
    const { slot, selectorState, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: "/api/BSB/GEN/0.json",
    };

    vi.useFakeTimers();
    try {
      renderMobileReader(
        { slot, selectorState, readingState },
        state,
        container
      );

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement | null;
      expect(viewport).not.toBeNull();

      act(() => {
        if (!viewport) {
          return;
        }
        dispatchTouch(viewport, "touchstart", [{ clientX: 80, clientY: 24 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 220, clientY: 24 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(251);
      });

      await Promise.resolve();

      expect(readingState.clearSelectedVerses).toHaveBeenCalledTimes(1);
      expect(readingState.loadPreviousChapter).toHaveBeenCalledTimes(1);
      expect(readingState.loadNextChapter).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
