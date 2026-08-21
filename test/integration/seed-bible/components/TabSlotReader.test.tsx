import { render } from "preact";
import { act } from "preact/test-utils";
import { batch, computed, signal, type Signal } from "@preact/signals";
import {
  PANEL_PCT,
  TabSlotReader,
} from "@packages/seed-bible/seed-bible/components/TabsLayout";
import type {
  BibleReadingState,
  SelectedFootnote,
  VerseDecoration,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import type { BibleSelectorState } from "@packages/seed-bible/seed-bible/managers/BibleSelectorManager";
import type { TabSlot } from "@packages/seed-bible/seed-bible/managers/TabsLayoutManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { TranslationBookChapter } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { createBibleToolsManager } from "@packages/seed-bible/seed-bible/managers/BibleToolsManager";
import type { Mock } from "vitest";
import type { ReadingExtensionRuntime } from "@packages/seed-bible/seed-bible/managers";
import type { BrandingConfig } from "@packages/seed-bible/seed-bible/app/appConfig";

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

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } =
    await import("../../../unit/seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});
const testBranding: BrandingConfig = {
  appName: "Test App",
  shortName: "Test",
  logo: "",
  icon: "",
  websiteUrl: "https://example.com",
  disabledToolbarTools: [],
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
    retryLoad: vi.fn(async () => undefined),
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
    hasNext: computed(() => !!chapterData.value?.nextChapterApiLink),
    hasPrevious: computed(() => !!chapterData.value?.previousChapterApiLink),
    getAdjacentChapter: vi.fn(async () => null),
    selectTranslationAndChapter: vi.fn(async () => undefined),
    highlights,
    defaultTranslation: { id: "BSB", language: "en" },
    chapterDataPromise: Promise.resolve(),
    initialChapterLoadSettled: signal(true),
    isChapterContentStale: computed(() => chapterData.value === null),
    discoveredContent: signal([]),
    discoveredCrossReferences: signal([]),
    discoveredStudyNotes: signal([]),
    disableExtension: vi.fn(async () => undefined),
    enableExtension: vi.fn(async () => undefined),
    isShared: signal(false),
    dispose: vi.fn(async () => undefined),
    enabledExtensions: signal<ReadingExtensionRuntime[]>([]),
    isExtensionEnabled: vi.fn(() => false),
    getUrlQueryParams: vi.fn(() => ({})),
    onNavigate: vi.fn(() => () => {}),
    shortSubTitle: signal<string>(""),
    shortTitle: signal<string>(""),
    subTitle: signal<string>(""),
    title: signal<string>(""),
    selectionAnnotations: signal([]),
    pendingAnnotationScrollVerse: signal<number | null>(null),
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
      openSettingsToView: vi.fn(),
    },
    login: {
      userId: signal<string | null>(null),
      profile: signal<{ name?: string; pictureUrl?: string } | null>(null),
    },
    os: {
      connectionId: "test-connection",
    },
    tools: createBibleToolsManager(testBranding),
    bookmarks: createBookmarksStub(),
    tabs: {} as any,
    panes: {} as any,
    playlists: {
      playing: signal(null),
    },
    features: {
      isFeatureEnabled: vi.fn(() => signal(true)),
    },
    annotations: {
      getAnnotationsForChapter: vi.fn(() => signal([])),
    },
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
    tools: createBibleToolsManager(testBranding),
    bookmarks: createBookmarksStub(),
    tabs: {} as any,
    panes: {} as any,
    playlists: {
      playing: signal(null),
    },
    features: {
      isFeatureEnabled: vi.fn(() => signal(true)),
    },
    annotations: {
      getAnnotationsForChapter: vi.fn(() => signal([])),
    },
  } as any as SeedBibleState;
}

function renderTabSlotReader(
  slot: TabSlot,
  readingState: BibleReadingState,
  state: SeedBibleState,
  container: HTMLDivElement
) {
  act(() => {
    render(
      <TabSlotReader
        tab={{
          id: "tab-1",
          title: "Tab 1",
          readingState,
          sharedSession: null,
          sharedChat: null,
        }}
        state={state}
        slot={slot}
      />,
      container
    );
  });
}

function dispatchTouch(
  element: Element,
  type: "touchstart" | "touchmove" | "touchend" | "touchcancel",
  touchPoints: Array<{ clientX: number; clientY: number }>,
  timeStamp?: number
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "touches", {
    configurable: true,
    value: touchPoints,
  });
  if (timeStamp !== undefined) {
    Object.defineProperty(event, "timeStamp", {
      configurable: true,
      value: timeStamp,
    });
  }
  element.dispatchEvent(event);
}

// The transforms that park the track over the centre and next-chapter panels,
// built from the component's own constant so the float formatting matches.
const CENTRE_PANEL_TRANSFORM = `translateX(${-PANEL_PCT}%)`;
const NEXT_PANEL_TRANSFORM = `translateX(${-PANEL_PCT * 2}%)`;

/**
 * Records every write to an element's `scrollTop`. These tests assert on the
 * writes themselves, which the stored value alone cannot reveal.
 */
function recordScrollTopWrites(element: HTMLElement): number[] {
  const writes: number[] = [];
  let stored = 0;
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    get: () => stored,
    set: (value: number) => {
      stored = value;
      writes.push(value);
    },
  });
  return writes;
}

describe("TabSlotReader integration", () => {
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
    const { slot, readingState } = createFixture();
    const state = createDesktopState();

    renderTabSlotReader(slot, readingState, state, container);

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
    const { slot, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };

    renderTabSlotReader(slot, readingState, state, container);

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

  it("restores slot scroll position in non-mobile layout", () => {
    const { slot, readingState } = createFixture();
    const state = createDesktopState();
    readingState.scrollPosition.value = 245;

    renderTabSlotReader(slot, readingState, state, container);

    const scroller = container.querySelector(
      ".sb-pane-reader"
    ) as HTMLDivElement | null;
    expect(scroller).not.toBeNull();
    expect(scroller?.scrollTop).toBe(245);
  });

  it("restores slot scroll position in mobile layout", () => {
    const { slot, readingState, chapterData } = createFixture();
    const state = createMobileState();
    readingState.scrollPosition.value = 133;

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: null,
      previousChapterApiLink: null,
    };

    renderTabSlotReader(slot, readingState, state, container);

    const scroller = container.querySelector(
      ".sb-reader-swipe-panel-current"
    ) as HTMLDivElement | null;
    expect(scroller).not.toBeNull();
    expect(scroller?.scrollTop).toBe(133);
  });

  it("returns the reader to the top the moment navigation starts, before the new text arrives", () => {
    const { slot, readingState } = createFixture();
    const state = createDesktopState();

    renderTabSlotReader(slot, readingState, state, container);

    const scroller = container.querySelector(
      ".sb-pane-reader"
    ) as HTMLDivElement | null;
    expect(scroller).not.toBeNull();

    // The reader is partway down the chapter they're reading.
    act(() => {
      if (!scroller) {
        return;
      }
      scroller.scrollTop = 420;
      scroller.dispatchEvent(new Event("scroll"));
    });
    expect(readingState.scrollPosition.value).toBe(420);

    // Navigate. This is what `applyPosition` writes: the scroll reset and the
    // new position together, in one batch, with no content for it yet.
    act(() => {
      batch(() => {
        readingState.scrollPosition.value = 0;
        readingState.chapterNumber.value = 2;
      });
    });

    // Still showing the old chapter's text, so the reader would otherwise be
    // left mid-page with the new chapter's title scrolled off above.
    expect(readingState.chapterData.value?.chapter.number).toBe(1);
    expect(scroller?.scrollTop).toBe(0);
  });

  it("scroll-to-verse scrolls to the specified verse in non-mobile layout", () => {
    const { slot, readingState } = createFixture();
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
      renderTabSlotReader(slot, readingState, state, container);
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
    const { slot, readingState, chapterData } = createFixture();
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
      renderTabSlotReader(slot, readingState, state, container);
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
    const { slot, readingState, chapterData } = createFixture();
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
      renderTabSlotReader(slot, readingState, state, container);

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
    const { slot, readingState, chapterData } = createFixture();
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
      renderTabSlotReader(slot, readingState, state, container);

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
    const { slot, readingState, chapterData } = createFixture();
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
      renderTabSlotReader(slot, readingState, state, container);

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
    const { slot, readingState, chapterData } = createFixture();
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
      renderTabSlotReader(slot, readingState, state, container);

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
    const { slot, readingState, chapterData } = createFixture();
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
      renderTabSlotReader(slot, readingState, state, container);

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
    const { slot, readingState, chapterData } = createFixture();
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
      renderTabSlotReader(slot, readingState, state, container);

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
    const { slot, readingState, chapterData } = createFixture();
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
      renderTabSlotReader(slot, readingState, state, container);

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
    const { slot, readingState, chapterData } = createFixture();
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
      renderTabSlotReader(slot, readingState, state, container);

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

  // A swipe is the same navigation as a toolbar chevron press and must reach
  // the reading state the same way, with no options of its own. Forcing
  // `replace` here would bypass the coalescing in `emitPositionNavigate` that
  // keeps a fast skim down to one Back press, and — worse — overwrite the
  // entry for the chapter the reader is leaving, so Back skips it entirely.
  it("navigates on swipe exactly as the toolbar chevrons do, without overriding how the URL is written", () => {
    vi.useFakeTimers();
    const { slot, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      translation: {
        ...chapterData.value!.translation,
        textDirection: "ltr",
      },
    };

    try {
      renderTabSlotReader(slot, readingState, state, container);

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

      expect(readingState.loadNextChapter).toHaveBeenCalledWith();
    } finally {
      vi.useRealTimers();
    }
  });

  // Committing the navigation mid-animation swaps the panels' contents under a
  // moving track, which reads as a glaring jump. Nothing about the history
  // entry depends on the timing (see the commitSwipe comment in TabsLayout), so
  // the slide is allowed to finish first.
  it("waits for the slide animation to finish before navigating", () => {
    vi.useFakeTimers();
    const { slot, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      translation: {
        ...chapterData.value!.translation,
        textDirection: "ltr",
      },
    };

    try {
      renderTabSlotReader(slot, readingState, state, container);

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
      });

      // Part-way through the slide, the reader must not have moved yet.
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(readingState.loadNextChapter).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(readingState.loadNextChapter).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  // The browser can claim a gesture part-way through (a system edge gesture, a
  // second finger). `touchend` never arrives, so the track has to be put back
  // by `touchcancel` or it stays parked where the finger left it.
  it("recentres the track and navigates nowhere when the browser cancels the gesture", () => {
    vi.useFakeTimers();
    const { slot, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      translation: {
        ...chapterData.value!.translation,
        textDirection: "ltr",
      },
    };

    try {
      renderTabSlotReader(slot, readingState, state, container);

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement | null;
      const track = container.querySelector(
        ".sb-reader-swipe-track"
      ) as HTMLDivElement | null;
      expect(viewport).not.toBeNull();
      expect(track).not.toBeNull();

      act(() => {
        if (!viewport) {
          return;
        }
        dispatchTouch(viewport, "touchstart", [{ clientX: 220, clientY: 50 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 100, clientY: 50 }]);
        dispatchTouch(viewport, "touchcancel", []);
        vi.advanceTimersByTime(250);
      });

      expect(readingState.loadNextChapter).not.toHaveBeenCalled();
      expect(track?.style.transform).toBe(CENTRE_PANEL_TRANSFORM);
    } finally {
      vi.useRealTimers();
    }
  });

  // Navigation does not wait on the download, so the *centre* panel still holds
  // the outgoing chapter while the new one is in flight. Recentring straight
  // away is what made a swipe flash the chapter the reader just left.
  it("rests on the swiped-to preview until the new chapter's text arrives, instead of recentring onto the outgoing chapter", async () => {
    vi.useFakeTimers();
    const { slot, readingState, chapterData } = createFixture();
    const state = createMobileState();

    let settleNavigation: () => void = () => {};
    readingState.loadNextChapter = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          settleNavigation = resolve;
        })
    );

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
      renderTabSlotReader(slot, readingState, state, container);

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement;
      const track = container.querySelector(
        ".sb-reader-swipe-track"
      ) as HTMLDivElement;

      act(() => {
        dispatchTouch(viewport, "touchstart", [{ clientX: 220, clientY: 50 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 100, clientY: 50 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(250);
      });

      expect(readingState.loadNextChapter).toHaveBeenCalledTimes(1);
      expect(track.style.transform).toBe(NEXT_PANEL_TRANSFORM);

      settleNavigation();
      await act(async () => {
        await Promise.resolve();
      });

      expect(track.style.transform).toBe(CENTRE_PANEL_TRANSFORM);
    } finally {
      vi.useRealTimers();
    }
  });

  // The cap is what keeps the promise of navigation that never waits on a
  // download: a slow chapter must not strand the reader on a static,
  // unscrollable preview panel.
  it("recentres anyway once the settle budget runs out, even if the chapter is still downloading", async () => {
    vi.useFakeTimers();
    const { slot, readingState, chapterData } = createFixture();
    const state = createMobileState();

    // Never resolves — stands in for a chapter still on its way.
    readingState.loadNextChapter = vi.fn(() => new Promise<void>(() => {}));

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
      renderTabSlotReader(slot, readingState, state, container);

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement;
      const track = container.querySelector(
        ".sb-reader-swipe-track"
      ) as HTMLDivElement;

      act(() => {
        dispatchTouch(viewport, "touchstart", [{ clientX: 220, clientY: 50 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 100, clientY: 50 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(250);
      });

      expect(track.style.transform).toBe(NEXT_PANEL_TRANSFORM);

      await act(async () => {
        vi.advanceTimersByTime(250);
        await Promise.resolve();
      });

      expect(track.style.transform).toBe(CENTRE_PANEL_TRANSFORM);
    } finally {
      vi.useRealTimers();
    }
  });

  // A reader who swipes again while the previous chapter is still settling owns
  // the track; the pending commit must not yank it back mid-gesture.
  it("hands the track to a new gesture started while a commit is still waiting", async () => {
    vi.useFakeTimers();
    const { slot, readingState, chapterData } = createFixture();
    const state = createMobileState();

    let settleNavigation: () => void = () => {};
    readingState.loadNextChapter = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          settleNavigation = resolve;
        })
    );

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
      renderTabSlotReader(slot, readingState, state, container);

      const viewport = container.querySelector(
        ".sb-reader-swipe-viewport"
      ) as HTMLDivElement;
      const track = container.querySelector(
        ".sb-reader-swipe-track"
      ) as HTMLDivElement;

      act(() => {
        dispatchTouch(viewport, "touchstart", [{ clientX: 220, clientY: 50 }]);
        dispatchTouch(viewport, "touchmove", [{ clientX: 100, clientY: 50 }]);
        dispatchTouch(viewport, "touchend", []);
        vi.advanceTimersByTime(250);
      });

      expect(track.style.transform).toBe(NEXT_PANEL_TRANSFORM);

      // A second gesture takes over: touching down recentres immediately, then
      // the drag follows the finger from there.
      act(() => {
        dispatchTouch(viewport, "touchstart", [{ clientX: 220, clientY: 50 }]);
      });
      expect(track.style.transform).toBe(CENTRE_PANEL_TRANSFORM);

      act(() => {
        dispatchTouch(viewport, "touchmove", [{ clientX: 180, clientY: 50 }]);
      });
      const draggedTransform = track.style.transform;
      expect(draggedTransform).not.toBe(CENTRE_PANEL_TRANSFORM);

      // The superseded commit settling must not disturb the gesture in flight.
      settleNavigation();
      await act(async () => {
        await Promise.resolve();
      });

      expect(track.style.transform).toBe(draggedTransform);
    } finally {
      vi.useRealTimers();
    }
  });

  // Attaching a scroll listener must never move the reader: when the two shared
  // one effect, every re-render re-attached the scroller and rewrote
  // `scrollTop`, yanking a partly scrolled chapter back to its saved offset.
  it.each([
    ["mobile", createMobileState, ".sb-reader-swipe-panel-current"],
    ["non-mobile", createDesktopState, ".sb-pane-reader"],
  ])(
    "does not move the reader when an ordinary re-render re-attaches the scroller in %s layout",
    (_label, createState, selector) => {
      const { slot, readingState, chapterData } = createFixture();

      renderTabSlotReader(slot, readingState, createState(), container);

      const writes = recordScrollTopWrites(
        container.querySelector(selector) as HTMLDivElement
      );

      // The reader is partway down the chapter.
      readingState.scrollPosition.value = 500;

      // A plain re-render at the same position: same chapter, new object
      // identity. This is what content settling and a preview resolving do.
      act(() => {
        chapterData.value = { ...chapterData.value! };
      });

      expect(writes).toEqual([]);
    }
  );

  it("still restores the saved scroll offset when the reader's position changes", () => {
    const { slot, readingState } = createFixture();

    renderTabSlotReader(slot, readingState, createMobileState(), container);

    const writes = recordScrollTopWrites(
      container.querySelector(
        ".sb-reader-swipe-panel-current"
      ) as HTMLDivElement
    );
    readingState.scrollPosition.value = 120;

    // Navigating is the one thing that should move the scroller on its own.
    act(() => {
      readingState.chapterNumber.value = 2;
    });

    expect(writes).toEqual([120]);
  });

  // Replays a capture from a real device. A touchmove generated during the
  // previous swipe was delivered 1.2s late, in the middle of the next gesture,
  // carrying the coordinate the finger had back then — which threw the track
  // ~200px sideways for a single frame.
  it("ignores a touch sample delivered late from a previous gesture", () => {
    const { slot, readingState, chapterData } = createFixture();
    const state = createMobileState();

    chapterData.value = {
      ...chapterData.value!,
      previousChapterApiLink: "/api/BSB/GEN/0.json",
      nextChapterApiLink: "/api/BSB/GEN/2.json",
      translation: { ...chapterData.value!.translation, textDirection: "ltr" },
    };

    renderTabSlotReader(slot, readingState, state, container);

    const viewport = container.querySelector(
      ".sb-reader-swipe-viewport"
    ) as HTMLDivElement;
    const track = container.querySelector(
      ".sb-reader-swipe-track"
    ) as HTMLDivElement;

    const offsets: number[] = [];
    let transform = "";
    Object.defineProperty(track, "style", {
      configurable: true,
      value: new Proxy(track.style, {
        set(target, prop, value) {
          if (prop === "transform") {
            transform = value;
            const px = /([-\d.]+)px/.exec(value);
            if (px) offsets.push(Number(px[1]));
            return true;
          }
          (target as any)[prop] = value;
          return true;
        },
        get(target, prop) {
          if (prop === "transform") return transform;
          const v = (target as any)[prop];
          return typeof v === "function" ? v.bind(target) : v;
        },
      }),
    });

    act(() => {
      dispatchTouch(
        viewport,
        "touchstart",
        [{ clientX: 381, clientY: 50 }],
        11828
      );
      dispatchTouch(
        viewport,
        "touchmove",
        [{ clientX: 372, clientY: 50 }],
        11860
      );
      // The stale sample: generated at 10638, during the previous gesture.
      dispatchTouch(
        viewport,
        "touchmove",
        [{ clientX: 218, clientY: 50 }],
        10638
      );
      dispatchTouch(
        viewport,
        "touchmove",
        [{ clientX: 369, clientY: 50 }],
        11865
      );
      dispatchTouch(
        viewport,
        "touchmove",
        [{ clientX: 367, clientY: 50 }],
        11870
      );
    });

    // The finger never moved more than 14px from where it started, so nothing
    // near the stale sample's 163px should ever reach the track.
    expect(offsets.every((offset) => Math.abs(offset) <= 14)).toBe(true);
  });
});
