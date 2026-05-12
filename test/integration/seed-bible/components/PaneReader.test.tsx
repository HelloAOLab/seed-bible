import { render } from "preact";
import { act } from "preact/test-utils";
import { computed, signal, type Signal } from "@preact/signals";
import { PaneReader } from "@packages/seed-bible/seed-bible/components/PaneLayout";
import type {
  BibleReadingState,
  SelectedFootnote,
  VerseDecoration,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { BibleSelectorState } from "@packages/seed-bible/seed-bible/managers/BibleSelectorManager";
import type { Pane } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { TranslationBookChapter } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

type ReaderFixture = {
  pane: Pane;
  selectorState: BibleSelectorState;
  readingState: BibleReadingState;
  chapterData: Signal<TranslationBookChapter | null>;
  highlights: Signal<BibleReadingState["highlights"]["value"]>;
  decorations: Signal<VerseDecoration[]>;
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
        {
          type: "verse",
          number: 1,
          content: ["In the beginning God created."],
        },
      ],
      footnotes: [],
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
    decorations,
    loading: signal(false),
    scrollPosition: signal(0),
    scrollToVerse: signal<number | null>(null),
    error: signal<string | null>(null),
    selectVerse,
    selectFootnote,
    highlightSelectedVerses: jest.fn(async () => undefined),
    unhighlightSelectedVerses: jest.fn(async () => undefined),
    decorateVerses: jest.fn(() => "decoration-1"),
    removeDecoration: jest.fn(),
    clearSelectedVerses: jest.fn(),
    selectTranslation: jest.fn(async () => undefined),
    selectBook: jest.fn(async () => undefined),
    selectChapter: jest.fn(async () => undefined),
    loadPreviousChapter: jest.fn(async () => undefined),
    loadNextChapter: jest.fn(async () => undefined),
    selectTranslationAndChapter: jest.fn(async () => undefined),
    highlights,
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
    selector: {
      selectingTranslation: signal(false),
      setOpen: jest.fn(async () => undefined),
    },
    bibleData: {
      getPreviousChapter: jest.fn(async () => null),
      getNextChapter: jest.fn(async () => null),
    },
    sidebar: {
      openSettings: jest.fn(),
      openSidebar: jest.fn(),
    },
    tools: {
      getReaderTools: jest.fn(() => []),
    },
    tabs: {} as any,
    panes: {} as any,
  } as any as SeedBibleState;
}

function createDesktopState(): SeedBibleState {
  return {
    app: {
      isMobile: signal(false),
    },
    selector: {
      selectingTranslation: signal(false),
      setOpen: jest.fn(async () => undefined),
    },
    bibleData: {
      getPreviousChapter: jest.fn(async () => null),
      getNextChapter: jest.fn(async () => null),
    },
    sidebar: {
      openSettings: jest.fn(),
      openSidebar: jest.fn(),
    },
    tools: {
      getReaderTools: jest.fn(() => []),
    },
    tabs: {} as any,
    panes: {} as any,
  } as any as SeedBibleState;
}

function renderPaneReader(
  pane: Pane,
  readingState: BibleReadingState,
  state: SeedBibleState,
  container: HTMLDivElement
) {
  act(() => {
    render(
      <PaneReader
        tab={{
          id: "tab-1",
          title: "Tab 1",
          readingState,
          sharedSession: null,
        }}
        state={state}
        pane={pane}
        displayBelowReaderToolbar={false}
      />,
      container
    );
  });
}

describe("PaneReader integration", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("saves scroll position in non-mobile layout", () => {
    const { pane, readingState } = createFixture();
    const state = createDesktopState();

    renderPaneReader(pane, readingState, state, container);

    const scroller = container.querySelector(
      ".sb-pane-reader"
    ) as HTMLDivElement | null;
    expect(scroller).not.toBeNull();

    act(() => {
      if (!scroller) {
        return;
      }
      scroller.scrollTop = 64;
      scroller.dispatchEvent(new Event("scroll"));
    });

    expect(readingState.scrollPosition.value).toBe(64);
  });

  it("saves scroll position in mobile layout", () => {
    const { pane, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };

    renderPaneReader(pane, readingState, state, container);

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

  it("restores pane scroll position in non-mobile layout", () => {
    const { pane, readingState } = createFixture();
    const state = createDesktopState();
    readingState.scrollPosition.value = 245;

    renderPaneReader(pane, readingState, state, container);

    const scroller = container.querySelector(
      ".sb-pane-reader"
    ) as HTMLDivElement | null;
    expect(scroller).not.toBeNull();
    expect(scroller?.scrollTop).toBe(245);
  });

  it("restores pane scroll position in mobile layout", () => {
    const { pane, readingState, chapterData } = createFixture();
    const state = createMobileState();
    readingState.scrollPosition.value = 133;

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };

    renderPaneReader(pane, readingState, state, container);

    const scroller = container.querySelector(
      ".sb-reader-swipe-panel-current"
    ) as HTMLDivElement | null;
    expect(scroller).not.toBeNull();
    expect(scroller?.scrollTop).toBe(133);
  });
});
