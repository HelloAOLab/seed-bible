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
import { createBibleToolsManager } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import type { Mock } from "vitest";

type ReaderFixture = {
  pane: Pane;
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
    defaultTranslation: { id: "BSB", language: "en" },
    chapterDataPromise: Promise.resolve(),
    discoveredContent: signal([]),
    discoveredCrossReferences: signal([]),
    discoveredStudyNotes: signal([]),
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

function createBookmarksStub() {
  return {
    isLocationBookmarked: vi.fn(() => false),
    toggleBookmarkAtLocation: vi.fn(async () => undefined),
  };
}

function createMobileState(): SeedBibleState {
  return {
    app: {
      isMobile: signal(true),
    },
    selector: {
      selectingTranslation: signal(false),
      setOpen: vi.fn(async () => undefined),
    },
    bibleData: {
      getPreviousChapter: vi.fn(async () => null),
      getNextChapter: vi.fn(async () => null),
    },
    sidebar: {
      openSettings: vi.fn(),
      openSidebar: vi.fn(),
    },
    tools: createBibleToolsManager(),
    bookmarks: createBookmarksStub(),
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
      setOpen: vi.fn(async () => undefined),
    },
    bibleData: {
      getPreviousChapter: vi.fn(async () => null),
      getNextChapter: vi.fn(async () => null),
    },
    sidebar: {
      openSettings: vi.fn(),
      openSidebar: vi.fn(),
    },
    tools: createBibleToolsManager(),
    bookmarks: createBookmarksStub(),
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

  it("scroll-to-verse scrolls to the specified verse in non-mobile layout", () => {
    const { pane, readingState } = createFixture();
    const state = createDesktopState();
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
      renderPaneReader(pane, readingState, state, container);
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

  it("scroll-to-verse scrolls to the specified verse in mobile layout", () => {
    const { pane, readingState, chapterData } = createFixture();
    const state = createMobileState();
    readingState.scrollToVerse.value = 1;

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };

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
      renderPaneReader(pane, readingState, state, container);
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

  it("the user can swipe to the right to go to the previous chapter in mobile layout for left-to-right text", () => {
    vi.useFakeTimers();
    const { pane, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      previousChapterApiLink: "/api/BSB/GEN/0.json",
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      translation: {
        ...chapterData.value!.translation,
        textDirection: "ltr",
      },
    };

    try {
      renderPaneReader(pane, readingState, state, container);

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement | null;
      expect(viewport).not.toBeNull();

      act(() => {
        if (!viewport) {
          return;
        }
        dispatchTouch(viewport, "touchstart", [{ clientX: 100, clientY: 50 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 220, clientY: 50 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(250);
      });

      expect(readingState.loadPreviousChapter).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("the user can swipe to the left to go to the next chapter in mobile layout for left-to-right text", () => {
    vi.useFakeTimers();
    const { pane, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      previousChapterApiLink: "/api/BSB/GEN/0.json",
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      translation: {
        ...chapterData.value!.translation,
        textDirection: "ltr",
      },
    };

    try {
      renderPaneReader(pane, readingState, state, container);

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement | null;
      expect(viewport).not.toBeNull();

      act(() => {
        if (!viewport) {
          return;
        }
        dispatchTouch(viewport, "touchstart", [{ clientX: 220, clientY: 50 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 100, clientY: 50 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(250);
      });

      expect(readingState.loadNextChapter).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("the user can swipe to the right to go to the next chapter in mobile layout for right-to-left text", () => {
    vi.useFakeTimers();
    const { pane, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      previousChapterApiLink: "/api/BSB/GEN/0.json",
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      translation: {
        ...chapterData.value!.translation,
        textDirection: "rtl",
      },
    };

    try {
      renderPaneReader(pane, readingState, state, container);

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement | null;
      expect(viewport).not.toBeNull();

      act(() => {
        if (!viewport) {
          return;
        }
        dispatchTouch(viewport, "touchstart", [{ clientX: 100, clientY: 50 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 220, clientY: 50 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(250);
      });

      expect(readingState.loadNextChapter).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("the user can swipe to the left to go to the previous chapter in mobile layout for right-to-left text", () => {
    vi.useFakeTimers();
    const { pane, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      previousChapterApiLink: "/api/BSB/GEN/0.json",
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      translation: {
        ...chapterData.value!.translation,
        textDirection: "rtl",
      },
    };

    try {
      renderPaneReader(pane, readingState, state, container);

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement | null;
      expect(viewport).not.toBeNull();

      act(() => {
        if (!viewport) {
          return;
        }
        dispatchTouch(viewport, "touchstart", [{ clientX: 220, clientY: 50 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 100, clientY: 50 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(250);
      });

      expect(readingState.loadPreviousChapter).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not load a previous chapter on right swipe in left-to-right text when no previous chapter exists", () => {
    vi.useFakeTimers();
    const { pane, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      previousChapterApiLink: null,
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      translation: {
        ...chapterData.value!.translation,
        textDirection: "ltr",
      },
    };

    try {
      renderPaneReader(pane, readingState, state, container);

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement | null;
      expect(viewport).not.toBeNull();

      act(() => {
        if (!viewport) {
          return;
        }
        dispatchTouch(viewport, "touchstart", [{ clientX: 100, clientY: 50 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 220, clientY: 50 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(250);
      });

      expect(readingState.loadPreviousChapter).not.toHaveBeenCalled();
      expect(readingState.clearSelectedVerses).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not load a next chapter on left swipe in left-to-right text when no next chapter exists", () => {
    vi.useFakeTimers();
    const { pane, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      previousChapterApiLink: "/api/BSB/GEN/0.json",
      nextChapterApiLink: null,
      translation: {
        ...chapterData.value!.translation,
        textDirection: "ltr",
      },
    };

    try {
      renderPaneReader(pane, readingState, state, container);

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement | null;
      expect(viewport).not.toBeNull();

      act(() => {
        if (!viewport) {
          return;
        }
        dispatchTouch(viewport, "touchstart", [{ clientX: 220, clientY: 50 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 100, clientY: 50 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(250);
      });

      expect(readingState.loadNextChapter).not.toHaveBeenCalled();
      expect(readingState.clearSelectedVerses).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not load a next chapter on right swipe in right-to-left text when no next chapter exists", () => {
    vi.useFakeTimers();
    const { pane, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      previousChapterApiLink: "/api/BSB/GEN/0.json",
      nextChapterApiLink: null,
      translation: {
        ...chapterData.value!.translation,
        textDirection: "rtl",
      },
    };

    try {
      renderPaneReader(pane, readingState, state, container);

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement | null;
      expect(viewport).not.toBeNull();

      act(() => {
        if (!viewport) {
          return;
        }
        dispatchTouch(viewport, "touchstart", [{ clientX: 100, clientY: 50 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 220, clientY: 50 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(250);
      });

      expect(readingState.loadNextChapter).not.toHaveBeenCalled();
      expect(readingState.clearSelectedVerses).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not load a previous chapter on left swipe in right-to-left text when no previous chapter exists", () => {
    vi.useFakeTimers();
    const { pane, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      previousChapterApiLink: null,
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      translation: {
        ...chapterData.value!.translation,
        textDirection: "rtl",
      },
    };

    try {
      renderPaneReader(pane, readingState, state, container);

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement | null;
      expect(viewport).not.toBeNull();

      act(() => {
        if (!viewport) {
          return;
        }
        dispatchTouch(viewport, "touchstart", [{ clientX: 220, clientY: 50 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 100, clientY: 50 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(250);
      });

      expect(readingState.loadPreviousChapter).not.toHaveBeenCalled();
      expect(readingState.clearSelectedVerses).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
