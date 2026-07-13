import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useBook } from "../../../../packages/scripture-map/hooks/useBook";
import { useScriptureMapContext } from "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext";
import { useTestamentContext } from "../../../../packages/scripture-map/contexts/Testament/TestamentContext";
import { useReadingHistoryContext } from "../../../../packages/scripture-map/contexts/ReadingHistory/ReadingHistoryContext";
import { calculateReadingHistorySummary } from "../../../../packages/seed-bible/seed-bible/managers/ReadingHistoryManager";

vi.mock(
  "../../../../packages/scripture-map/contexts/ScriptureMap/ScriptureMapContext",
  () => ({
    useScriptureMapContext: vi.fn(),
  })
);

vi.mock(
  "../../../../packages/scripture-map/contexts/Testament/TestamentContext",
  () => ({
    useTestamentContext: vi.fn(),
  })
);

vi.mock(
  "../../../../packages/scripture-map/contexts/ReadingHistory/ReadingHistoryContext",
  () => ({
    useReadingHistoryContext: vi.fn(),
  })
);

// calculateReadingHistorySummary is called by useBook directly
vi.mock(
  "../../../../packages/seed-bible/seed-bible/managers/ReadingHistoryManager",
  () => ({
    calculateReadingHistorySummary: vi.fn(() => ({
      totalTimeSpentReading: 0,
      users: {},
    })),
  })
);

type BookProps = Parameters<typeof useBook>[0];

function makeProps(overrides: Partial<BookProps> = {}): BookProps {
  return {
    book: "Genesis",
    bookId: "GEN",
    numberOfChapters: 3,
    chaptersVerseCount: [31, 25, 24],
    isSubset: false,
    subsetStartIndex: undefined,
    bookCoverBackgroundColor: "#ff0000",
    sectionName: "Law",
    readingEvents: [],
    readingSummary: { totalTimeSpentReading: 0, users: {} } as never,
    bookUserPresence: {},
    bookUserPresenceColors: [],
    bookBorderGradientColors: undefined,
    ...overrides,
  };
}

function makeScriptureMapCtx(overrides: Record<string, unknown> = {}) {
  return {
    scaleFactor: 1,
    showingAllChapters: false,
    openBookOverrides: {},
    setBookOpen: vi.fn(),
    isUserPresenceEnabled: false,
    isReadingHistoryEnabled: false,
    content: new Map(),
    userPresence: new Map(),
    usersColors: [],
    selection: undefined,
    onBookNameClickAndHold: undefined,
    onBookNameClickAndHoldDependencies: undefined,
    chapterGap: 3,
    chapterHeight: 32,
    BASE_BACKGROUND_COLOR: "#dfdede",
    showingBooksColors: false,
    activeTab: undefined,
    translate: (key: string) => key,
    userColorStore: { getUserColor: vi.fn(() => "#000000") },
    readingHistoryService: {
      getColorByReadingTime: vi.fn(() => "#aabbcc"),
      getColorByRecency: vi.fn(() => "#aabbcc"),
    },
    GetTextColorBasedOnBackground: vi.fn(() => "#000000"),
    IsValueBetween: vi.fn(() => false),
    ComputeRawGradientColors: vi.fn(() => "linear-gradient()"),
    ComputeLinearGradient: vi.fn(() => "linear-gradient()"),
    layoutConfigProvider: {
      getLayoutMeasurement: vi.fn(() => 5),
    },
    readingHistoryConfigProvider: {
      getRecencyThresholdTimeSeconds: vi.fn(() => 0),
    },
    ...overrides,
  };
}

function makeTestamentCtx(testamentName = "OT") {
  return {
    testament: { name: testamentName, sections: [] },
    testamentIndex: 0,
  };
}

function makeReadingHistoryCtx(overrides: Record<string, unknown> = {}) {
  return {
    readingHistoryRangeSeconds: null,
    MS_PER_SECOND: 1000,
    SEC_PER_DAY: 86400,
    SEC_PER_HOUR: 3600,
    SEC_PER_MINUTE: 60,
    myAuthBotId: "me",
    ...overrides,
  };
}

describe("useBook", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    (useScriptureMapContext as Mock).mockReturnValue(makeScriptureMapCtx());
    (useTestamentContext as Mock).mockReturnValue(makeTestamentCtx());
    (useReadingHistoryContext as Mock).mockReturnValue(makeReadingHistoryCtx());
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.clearAllMocks();
  });

  function setup(props: Partial<BookProps> = {}) {
    const result = {
      current: null as unknown as ReturnType<typeof useBook>,
    };

    function TestComponent() {
      result.current = useBook(makeProps(props));
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  describe("bookTitle", () => {
    it("returns the full book name when scaleFactor > 0.5", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ scaleFactor: 1 })
      );
      const result = setup({ book: "Genesis" });
      expect(result.current.bookTitle).toBe("Genesis");
    });

    it("returns abbreviated uppercase title when scaleFactor <= 0.5", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ scaleFactor: 0.5 })
      );
      const result = setup({ book: "Genesis" });
      expect(result.current.bookTitle).toBe("GEN");
    });

    it("uses getFirstNonSpaceChars for abbreviated title, skipping spaces", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ scaleFactor: 0.25 })
      );
      const result = setup({ book: "1 Kings" });
      expect(result.current.bookTitle).toBe("1KI");
    });
  });

  describe("bookClass", () => {
    it("is 'book-container pointable' when showChapters is false", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ showingAllChapters: false })
      );
      const result = setup();
      expect(result.current.bookClass).toBe("book-container pointable");
    });

    it("is 'book-container' when showChapters is true", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ showingAllChapters: true })
      );
      const result = setup();
      expect(result.current.bookClass).toBe("book-container");
    });
  });

  describe("bookCoverClass", () => {
    it("is 'book-cover' when chapters are hidden and no user presence", () => {
      const result = setup({ bookBorderGradientColors: undefined });
      expect(result.current.bookCoverClass).toBe("book-cover");
    });

    it("is 'book-cover invisible' when chapters are shown", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ showingAllChapters: true })
      );
      const result = setup();
      expect(result.current.bookCoverClass).toBe("book-cover invisible");
    });

    it("is 'book-cover show-user-presence' when user presence is enabled and border colors exist", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ isUserPresenceEnabled: true })
      );
      const result = setup({
        bookBorderGradientColors: "linear-gradient(#f00, #00f)",
      });
      expect(result.current.bookCoverClass).toBe(
        "book-cover show-user-presence"
      );
    });

    it("is 'book-cover' when user presence is enabled but border colors are absent", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ isUserPresenceEnabled: true })
      );
      const result = setup({ bookBorderGradientColors: undefined });
      expect(result.current.bookCoverClass).toBe("book-cover");
    });
  });

  describe("showChapters", () => {
    it("starts as false when showingAllChapters is false and no override", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ showingAllChapters: false })
      );
      const result = setup();
      expect(result.current.showChapters).toBe(false);
    });

    it("starts as true when showingAllChapters is true and no override", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ showingAllChapters: true })
      );
      const result = setup();
      expect(result.current.showChapters).toBe(true);
    });

    it("a per-book override in openBookOverrides wins over showingAllChapters", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          showingAllChapters: false,
          openBookOverrides: { GEN: true },
        })
      );
      const result = setup({ bookId: "GEN" });
      expect(result.current.showChapters).toBe(true);
    });

    it("handleBookClick calls setBookOpen(bookId, true) when it was false", () => {
      const setBookOpen = vi.fn();
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ showingAllChapters: false, setBookOpen })
      );
      const result = setup({ bookId: "GEN" });
      act(() => result.current.handleBookClick());
      expect(setBookOpen).toHaveBeenCalledWith("GEN", true);
    });

    it("handleBookClick does not call setBookOpen when it was already true", () => {
      const setBookOpen = vi.fn();
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ showingAllChapters: true, setBookOpen })
      );
      const result = setup({ bookId: "GEN" });
      act(() => result.current.handleBookClick());
      expect(setBookOpen).not.toHaveBeenCalled();
    });

    it("a quick click-and-hold release toggles the book via setBookOpen", () => {
      const setBookOpen = vi.fn();
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ showingAllChapters: false, setBookOpen })
      );
      const result = setup({ bookId: "GEN" });
      const fakeEvent = { stopPropagation: vi.fn() } as unknown as PointerEvent;

      act(() => result.current.handleBookHeaderPointerDown(fakeEvent as any));
      act(() => void vi.advanceTimersByTime(200));
      act(() => result.current.handleBookHeaderPointerUp(fakeEvent as any));

      expect(setBookOpen).toHaveBeenCalledWith("GEN", true);
    });
  });

  describe("tooltipOffsetY", () => {
    it("is 0 when isUserPresenceEnabled is false", () => {
      const result = setup({ bookBorderGradientColors: "linear-gradient()" });
      expect(result.current.tooltipOffsetY).toBe(0);
    });

    it("is 0 when bookBorderGradientColors is undefined", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ isUserPresenceEnabled: true })
      );
      const result = setup({ bookBorderGradientColors: undefined });
      expect(result.current.tooltipOffsetY).toBe(0);
    });

    it("is scaleFactor * 6 when user presence is enabled and border colors exist", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ isUserPresenceEnabled: true, scaleFactor: 2 })
      );
      const result = setup({ bookBorderGradientColors: "linear-gradient()" });
      expect(result.current.tooltipOffsetY).toBe(12);
    });
  });

  describe("tooltipAnchor", () => {
    it("is undefined initially", () => {
      const result = setup();
      expect(result.current.tooltipAnchor).toBeUndefined();
    });

    it("is set when handleBookCoverPointerEnter is called", () => {
      const result = setup();
      const fakeEl = document.createElement("div");
      vi.spyOn(fakeEl, "getBoundingClientRect").mockReturnValue({
        left: 100,
        top: 200,
        width: 150,
        height: 50,
        right: 250,
        bottom: 250,
        x: 100,
        y: 200,
        toJSON: () => ({}),
      } as DOMRect);

      act(() => {
        result.current.handleBookCoverPointerEnter({
          currentTarget: fakeEl,
        } as never);
      });

      expect(result.current.tooltipAnchor).toEqual({
        x: 175, // left + width/2
        y: 200,
        width: 150,
        height: 50,
      });
    });

    it("is cleared when handleBookCoverPointerLeave is called", () => {
      const result = setup();
      const fakeEl = document.createElement("div");
      vi.spyOn(fakeEl, "getBoundingClientRect").mockReturnValue({
        left: 100,
        top: 200,
        width: 150,
        height: 50,
        right: 250,
        bottom: 250,
        x: 100,
        y: 200,
        toJSON: () => ({}),
      } as DOMRect);

      act(() =>
        result.current.handleBookCoverPointerEnter({
          currentTarget: fakeEl,
        } as never)
      );
      expect(result.current.tooltipAnchor).toBeDefined();

      act(() => result.current.handleBookCoverPointerLeave());
      expect(result.current.tooltipAnchor).toBeUndefined();
    });
  });

  describe("chaptersData", () => {
    it("is empty when showChapters is false", () => {
      const result = setup();
      expect(result.current.chaptersData).toHaveLength(0);
    });

    it("has numberOfChapters entries when showChapters is true", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ showingAllChapters: true })
      );
      const result = setup({ numberOfChapters: 3 });
      expect(result.current.chaptersData).toHaveLength(3);
    });

    it("each entry key is bookId-chapter", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ showingAllChapters: true })
      );
      const result = setup({ bookId: "GEN", numberOfChapters: 2 });
      expect(result.current.chaptersData[0]).toBeDefined();
      expect(result.current.chaptersData[1]).toBeDefined();
      expect(result.current.chaptersData[0]!.key).toBe("GEN-1");
      expect(result.current.chaptersData[1]!.key).toBe("GEN-2");
    });

    it("chapter numbers are 1-based", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ showingAllChapters: true })
      );
      const result = setup({ numberOfChapters: 3 });
      expect(result.current.chaptersData[0]).toBeDefined();
      expect(result.current.chaptersData[2]).toBeDefined();
      expect(result.current.chaptersData[0]!.chapter).toBe(1);
      expect(result.current.chaptersData[2]!.chapter).toBe(3);
    });
  });

  describe("bookCoverStyle", () => {
    it("sets bookCoverBackgroundColor as background when showingBooksColors is true and reading history is disabled", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          showingBooksColors: true,
          isReadingHistoryEnabled: false,
        })
      );
      const result = setup({ bookCoverBackgroundColor: "#ff0000" });
      expect(result.current.bookCoverStyle.background).toBe("#ff0000");
    });

    it("background is undefined when showingBooksColors is false and history is disabled", () => {
      const result = setup();
      expect(result.current.bookCoverStyle.background).toBeUndefined();
    });
  });

  describe("useClickAndHold", () => {
    it("fires holdCompleteCallback if user clicks and hold over 500ms", () => {
      const mockClickAndHold = vi.fn();

      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ onBookNameClickAndHold: mockClickAndHold })
      );
      const result = setup({ bookId: "GEN", sectionName: "Law" });
      const fakeEvent = { stopPropagation: vi.fn } as unknown as PointerEvent;

      act(() => result.current.handleBookHeaderPointerDown(fakeEvent as any));

      act(() => void vi.advanceTimersByTime(500));

      expect(mockClickAndHold).toHaveBeenCalledTimes(1);
    });

    it("doesn't fires holdCompleteCallback if user clicks and hold below 500ms", () => {
      const mockClickAndHold = vi.fn();

      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ onBookNameClickAndHold: mockClickAndHold })
      );
      const result = setup({ bookId: "GEN", sectionName: "Law" });
      const fakeEvent = { stopPropagation: vi.fn } as unknown as PointerEvent;

      act(() => result.current.handleBookHeaderPointerDown(fakeEvent as any));

      act(() => void vi.advanceTimersByTime(400));

      expect(mockClickAndHold).not.toHaveBeenCalled();
    });

    it("doesn't fires holdCompleteCallback if user clicks and releases before 500ms", () => {
      const mockClickAndHold = vi.fn();

      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          onBookNameClickAndHold: mockClickAndHold,
        })
      );
      const result = setup({ bookId: "GEN", sectionName: "Law" });
      const fakeEvent = {
        stopPropagation: vi.fn(),
      } as unknown as PointerEvent;

      act(() => result.current.handleBookHeaderPointerDown(fakeEvent as any));

      act(() => void vi.advanceTimersByTime(400));

      act(() => result.current.handleBookHeaderPointerUp(fakeEvent as any));

      expect(mockClickAndHold).not.toHaveBeenCalled();

      act(() => void vi.advanceTimersByTime(200));

      expect(mockClickAndHold).not.toHaveBeenCalled();
    });
  });

  describe("handleBookHeaderClick", () => {
    it("calls stopPropagation", () => {
      const result = setup();
      const fakeEvent = { stopPropagation: vi.fn() };
      act(() => result.current.handleBookHeaderClick(fakeEvent as never));
      expect(fakeEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe("tooltipContentsData - user presence", () => {
    it("includes userPresence entry when isUserPresenceEnabled and colors non-empty", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ isUserPresenceEnabled: true })
      );
      const result = setup({ bookUserPresenceColors: ["#ff0000", "#00ff00"] });
      const entry = result.current.tooltipContentsData.find(
        (d: { type: string }) => d.type === "userPresence"
      );
      expect(entry).toBeDefined();
      expect((entry as { colors: string[] }).colors).toEqual([
        "#ff0000",
        "#00ff00",
      ]);
    });

    it("no userPresence entry when bookUserPresenceColors is empty", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({ isUserPresenceEnabled: true })
      );
      const result = setup({ bookUserPresenceColors: [] });
      const entry = result.current.tooltipContentsData.find(
        (d: { type: string }) => d.type === "userPresence"
      );
      expect(entry).toBeUndefined();
    });
  });

  describe("tooltipContentsData - reading history (range-based)", () => {
    function makeRangeCtx(readingTimeSeconds: number) {
      const translate = vi.fn((key: string) => key);
      const ctx = makeScriptureMapCtx({
        isReadingHistoryEnabled: true,
        translate,
        userColorStore: { getUserColor: vi.fn(() => "#aabbcc") },
        readingHistoryService: {
          getColorByReadingTime: vi.fn(() => "#aabbcc"),
          getColorByRecency: vi.fn(() => "#aabbcc"),
        },
        ComputeLinearGradient: vi.fn(() => "linear-gradient(#aabbcc)"),
      });
      const readingSummary = {
        totalTimeSpentReading: readingTimeSeconds,
        users: {
          me: { totalTimeSpentReading: readingTimeSeconds, books: {} },
        },
      };
      return { ctx, translate, readingSummary };
    }

    it("uses minutes-spent translation when reading time < 1 hour", () => {
      const { ctx, translate, readingSummary } = makeRangeCtx(120);
      (useScriptureMapContext as Mock).mockReturnValue(ctx);
      (useReadingHistoryContext as Mock).mockReturnValue(
        makeReadingHistoryCtx({
          readingHistoryRangeSeconds: { start: 0, end: 99999999 },
        })
      );
      setup({ readingSummary: readingSummary as never });
      expect(translate).toHaveBeenCalledWith("minutes-spent", { count: 2 });
    });

    it("uses minute-spent (singular) when minutesCount is 1", () => {
      const { ctx, translate, readingSummary } = makeRangeCtx(61);
      (useScriptureMapContext as Mock).mockReturnValue(ctx);
      (useReadingHistoryContext as Mock).mockReturnValue(
        makeReadingHistoryCtx({
          readingHistoryRangeSeconds: { start: 0, end: 99999999 },
        })
      );
      setup({ readingSummary: readingSummary as never });
      expect(translate).toHaveBeenCalledWith("minute-spent", { count: 1 });
    });

    it("uses hours-spent translation when reading time >= 1 hour", () => {
      const { ctx, translate, readingSummary } = makeRangeCtx(7200);
      (useScriptureMapContext as Mock).mockReturnValue(ctx);
      (useReadingHistoryContext as Mock).mockReturnValue(
        makeReadingHistoryCtx({
          readingHistoryRangeSeconds: { start: 0, end: 99999999 },
        })
      );
      setup({ readingSummary: readingSummary as never });
      expect(translate).toHaveBeenCalledWith("hours-spent", { count: 2 });
    });

    it("uses hour-spent (singular) when hoursCount is 1", () => {
      const { ctx, translate, readingSummary } = makeRangeCtx(3600);
      (useScriptureMapContext as Mock).mockReturnValue(ctx);
      (useReadingHistoryContext as Mock).mockReturnValue(
        makeReadingHistoryCtx({
          readingHistoryRangeSeconds: { start: 0, end: 99999999 },
        })
      );
      setup({ readingSummary: readingSummary as never });
      expect(translate).toHaveBeenCalledWith("hour-spent", { count: 1 });
    });

    it("sets fixedBackground to ComputeLinearGradient result when colors exist", () => {
      const mockGradient = vi.fn(() => "linear-gradient(red, blue)");
      const readingSummary = {
        totalTimeSpentReading: 120,
        users: { me: { totalTimeSpentReading: 120, books: {} } },
      };
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          isReadingHistoryEnabled: true,
          userColorStore: { getUserColor: vi.fn(() => "#aabbcc") },
          readingHistoryService: {
            getColorByReadingTime: vi.fn(() => "#aabbcc"),
            getColorByRecency: vi.fn(() => "#aabbcc"),
          },
          ComputeLinearGradient: mockGradient,
        })
      );
      (useReadingHistoryContext as Mock).mockReturnValue(
        makeReadingHistoryCtx({
          readingHistoryRangeSeconds: { start: 0, end: 99999999 },
        })
      );
      const result = setup({ readingSummary: readingSummary as never });
      expect(result.current.bookCoverStyle.background).toBe(
        "linear-gradient(red, blue)"
      );
    });

    it("uses guest translation for non-self users", () => {
      const translate = vi.fn((key: string) => key);
      const readingSummary = {
        totalTimeSpentReading: 120,
        users: { other_user: { totalTimeSpentReading: 120, books: {} } },
      };
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          isReadingHistoryEnabled: true,
          translate,
          userColorStore: { getUserColor: vi.fn(() => "#aabbcc") },
          readingHistoryService: {
            getColorByReadingTime: vi.fn(() => "#aabbcc"),
            getColorByRecency: vi.fn(() => "#aabbcc"),
          },
          ComputeLinearGradient: vi.fn(() => "linear-gradient()"),
        })
      );
      (useReadingHistoryContext as Mock).mockReturnValue(
        makeReadingHistoryCtx({
          readingHistoryRangeSeconds: { start: 0, end: 99999999 },
        })
      );
      setup({ readingSummary: readingSummary as never });
      expect(translate).toHaveBeenCalledWith("guest");
    });
  });

  describe("tooltipContentsData - reading history (recency-based)", () => {
    // nowSeconds = 1_000_000 (os.localTime = 1_000_000_000 ms)
    const NOW_SECONDS = 1_000_000;

    function makeRecencyCtx(endSeconds: number) {
      const translate = vi.fn((key: string) => key);
      const ctx = makeScriptureMapCtx({
        isReadingHistoryEnabled: true,
        translate,
        userColorStore: { getUserColor: vi.fn(() => "#aabbcc") },
        readingHistoryService: {
          getColorByReadingTime: vi.fn(() => "#aabbcc"),
          getColorByRecency: vi.fn(() => "#aabbcc"),
        },
        ComputeLinearGradient: vi.fn(() => "linear-gradient()"),
      });
      // Event spans 9000s so end-start >= 60 (noticeable), end >= 0 (recentEnough)
      const readingSummary = {
        totalTimeSpentReading: 120,
        users: {
          me: {
            totalTimeSpentReading: 120,
            books: {
              GEN: {
                chapters: {
                  "1": [
                    { start: endSeconds - 9000, end: endSeconds, chapter: 1 },
                  ],
                },
              },
            },
          },
        },
      };
      return { ctx, translate, readingSummary };
    }

    beforeEach(() => {
      // Source reads the current time via Date.now(); with fake timers active
      // (set in the outer beforeEach) we pin "now" to NOW_SECONDS.
      vi.setSystemTime(NOW_SECONDS * 1000);
    });

    it("uses read-minutes-ago when recency < 1 hour", () => {
      // recency = 1_000_000 - 999_000 = 1_000s (< 3600, > 60)
      const { ctx, translate, readingSummary } = makeRecencyCtx(999_000);
      (useScriptureMapContext as Mock).mockReturnValue(ctx);
      setup({ bookId: "GEN", readingSummary: readingSummary as never });
      expect(translate).toHaveBeenCalledWith(
        "read-minutes-ago",
        expect.any(Object)
      );
    });

    it("uses read-minute-ago (singular) when recency is between 60 and 119 seconds", () => {
      // recency = 1_000_000 - 999_939 = 61s
      const { ctx, translate, readingSummary } = makeRecencyCtx(999_939);
      (useScriptureMapContext as Mock).mockReturnValue(ctx);
      setup({ bookId: "GEN", readingSummary: readingSummary as never });
      expect(translate).toHaveBeenCalledWith(
        "read-minute-ago",
        expect.any(Object)
      );
    });

    it("uses read-hours-ago when recency is 1-24 hours", () => {
      // recency = 1_000_000 - 990_000 = 10_000s (> 3600, < 86400)
      const { ctx, translate, readingSummary } = makeRecencyCtx(990_000);
      (useScriptureMapContext as Mock).mockReturnValue(ctx);
      setup({ bookId: "GEN", readingSummary: readingSummary as never });
      expect(translate).toHaveBeenCalledWith(
        "read-hours-ago",
        expect.any(Object)
      );
    });

    it("uses read-hour-ago (singular) when recency is 1 hour exactly", () => {
      // recency = 1_000_000 - 996_400 = 3_600s exactly
      const { ctx, translate, readingSummary } = makeRecencyCtx(996_400);
      (useScriptureMapContext as Mock).mockReturnValue(ctx);
      setup({ bookId: "GEN", readingSummary: readingSummary as never });
      expect(translate).toHaveBeenCalledWith(
        "read-hour-ago",
        expect.any(Object)
      );
    });

    it("uses read-days-ago when recency >= 1 day", () => {
      // recency = 1_000_000 - 750_000 = 250_000s (> 86400, daysCount=2)
      const { ctx, translate, readingSummary } = makeRecencyCtx(750_000);
      (useScriptureMapContext as Mock).mockReturnValue(ctx);
      setup({ bookId: "GEN", readingSummary: readingSummary as never });
      expect(translate).toHaveBeenCalledWith(
        "read-days-ago",
        expect.any(Object)
      );
    });

    it("uses read-day-ago (singular) when recency is exactly 1 day", () => {
      // recency = 1_000_000 - 913_600 = 86_400s exactly
      const { ctx, translate, readingSummary } = makeRecencyCtx(913_600);
      (useScriptureMapContext as Mock).mockReturnValue(ctx);
      setup({ bookId: "GEN", readingSummary: readingSummary as never });
      expect(translate).toHaveBeenCalledWith(
        "read-day-ago",
        expect.any(Object)
      );
    });
  });

  describe("chapterReadingHistorySummaryMap", () => {
    it("calls calculateReadingHistorySummary for events that pass IsValueBetween", () => {
      (calculateReadingHistorySummary as Mock).mockReturnValue({
        totalTimeSpentReading: 0,
        users: {},
      });
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          showingAllChapters: true,
          IsValueBetween: vi.fn(() => true),
        })
      );
      const readingEvents = [{ chapter: 1, start: 100, end: 9999 }];
      setup({ numberOfChapters: 2, readingEvents: readingEvents as never });
      expect(calculateReadingHistorySummary).toHaveBeenCalledWith([
        { chapter: 1, start: 100, end: 9999 },
      ]);
    });

    it("does not call calculateReadingHistorySummary when IsValueBetween returns false", () => {
      (calculateReadingHistorySummary as Mock).mockReturnValue({
        totalTimeSpentReading: 0,
        users: {},
      });
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          showingAllChapters: true,
          IsValueBetween: vi.fn(() => false),
        })
      );
      const readingEvents = [{ chapter: 1, start: 100, end: 9999 }];
      setup({ numberOfChapters: 2, readingEvents: readingEvents as never });
      expect(calculateReadingHistorySummary).not.toHaveBeenCalled();
    });
  });

  describe("chaptersData - reading history per chapter", () => {
    it("sets historyBackground on chapter via ComputeLinearGradient when range is set", () => {
      const mockGradient = vi.fn(() => "linear-gradient(chapter-color)");
      (calculateReadingHistorySummary as Mock).mockReturnValue({
        totalTimeSpentReading: 120,
        users: { me: { totalTimeSpentReading: 120, books: {} } },
      });
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          showingAllChapters: true,
          isReadingHistoryEnabled: true,
          IsValueBetween: vi.fn(() => true),
          userColorStore: { getUserColor: vi.fn(() => "#aabbcc") },
          readingHistoryService: {
            getColorByReadingTime: vi.fn(() => "#aabbcc"),
            getColorByRecency: vi.fn(() => "#aabbcc"),
          },
          ComputeLinearGradient: mockGradient,
          GetTextColorBasedOnBackground: vi.fn(() => "#000000"),
        })
      );
      (useReadingHistoryContext as Mock).mockReturnValue(
        makeReadingHistoryCtx({
          readingHistoryRangeSeconds: { start: 0, end: 99999 },
        })
      );
      const readingEvents = [{ chapter: 1, start: 100, end: 9999 }];
      const result = setup({
        numberOfChapters: 3,
        readingEvents: readingEvents as never,
      });
      expect(result.current.chaptersData[0]!.historyBackground).toBe(
        "linear-gradient(chapter-color)"
      );
      expect(result.current.chaptersData[1]!.historyBackground).toBeUndefined();
    });

    it("sets chapter historyBackground using recency color when no range (days)", () => {
      // nowSeconds = 1_000_000 (Date.now()=1e9), end=900_000 → recency=100_000 > SEC_PER_DAY
      vi.setSystemTime(1_000_000_000);
      (calculateReadingHistorySummary as Mock).mockReturnValue({
        totalTimeSpentReading: 120,
        users: {
          me: {
            totalTimeSpentReading: 120,
            books: {
              GEN: {
                chapters: { 1: [{ start: 891_000, end: 900_000, chapter: 1 }] },
              },
            },
          },
        },
      });
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          showingAllChapters: true,
          isReadingHistoryEnabled: true,
          IsValueBetween: vi.fn(() => true),
          userColorStore: { getUserColor: vi.fn(() => "#aabbcc") },
          readingHistoryService: {
            getColorByReadingTime: vi.fn(() => "#aabbcc"),
            getColorByRecency: vi.fn(() => "#recency-color"),
          },
          ComputeLinearGradient: vi.fn(() => "linear-gradient(recency)"),
          GetTextColorBasedOnBackground: vi.fn(() => "#000000"),
        })
      );
      const readingEvents = [{ chapter: 1, start: 891_000, end: 900_000 }];
      const result = setup({
        bookId: "GEN",
        numberOfChapters: 2,
        readingEvents: readingEvents as never,
      });
      expect(result.current.chaptersData[0]!.historyBackground).toBe(
        "linear-gradient(recency)"
      );
    });

    it("uses hours-spent translation for chapter when range is set and time >= 1 hour", () => {
      const translate = vi.fn((key: string) => key);
      (calculateReadingHistorySummary as Mock).mockReturnValue({
        totalTimeSpentReading: 7200,
        users: { me: { totalTimeSpentReading: 7200, books: {} } },
      });
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          showingAllChapters: true,
          isReadingHistoryEnabled: true,
          IsValueBetween: vi.fn(() => true),
          translate,
          userColorStore: { getUserColor: vi.fn(() => "#aabbcc") },
          readingHistoryService: {
            getColorByReadingTime: vi.fn(() => "#aabbcc"),
            getColorByRecency: vi.fn(() => "#aabbcc"),
          },
          ComputeLinearGradient: vi.fn(() => "linear-gradient()"),
          GetTextColorBasedOnBackground: vi.fn(() => "#000000"),
        })
      );
      (useReadingHistoryContext as Mock).mockReturnValue(
        makeReadingHistoryCtx({
          readingHistoryRangeSeconds: { start: 0, end: 99999 },
        })
      );
      const readingEvents = [{ chapter: 1, start: 100, end: 9999 }];
      setup({
        bookId: "GEN",
        numberOfChapters: 2,
        readingEvents: readingEvents as never,
      });
      expect(translate).toHaveBeenCalledWith("hours-spent", { count: 2 });
    });

    it("uses read-hours-ago for chapter recency when recency is 1-24 hours", () => {
      // nowSeconds = 1_000_000, end = 990_000 → recencySeconds = 10_000
      vi.setSystemTime(1_000_000_000);
      const translate = vi.fn((key: string) => key);
      (calculateReadingHistorySummary as Mock).mockReturnValue({
        totalTimeSpentReading: 120,
        users: {
          me: {
            totalTimeSpentReading: 120,
            books: {
              GEN: {
                chapters: { 1: [{ start: 981_000, end: 990_000, chapter: 1 }] },
              },
            },
          },
        },
      });
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          showingAllChapters: true,
          isReadingHistoryEnabled: true,
          IsValueBetween: vi.fn(() => true),
          translate,
          userColorStore: { getUserColor: vi.fn(() => "#aabbcc") },
          readingHistoryService: {
            getColorByReadingTime: vi.fn(() => "#aabbcc"),
            getColorByRecency: vi.fn(() => "#aabbcc"),
          },
          ComputeLinearGradient: vi.fn(() => "linear-gradient()"),
          GetTextColorBasedOnBackground: vi.fn(() => "#000000"),
        })
      );
      const readingEvents = [{ chapter: 1, start: 981_000, end: 990_000 }];
      setup({
        bookId: "GEN",
        numberOfChapters: 2,
        readingEvents: readingEvents as never,
      });
      expect(translate).toHaveBeenCalledWith(
        "read-hours-ago",
        expect.any(Object)
      );
    });

    it("uses read-minutes-ago for chapter recency when recency < 1 hour", () => {
      // nowSeconds = 1_000_000, end = 999_000 → recencySeconds = 1_000
      vi.setSystemTime(1_000_000_000);
      const translate = vi.fn((key: string) => key);
      (calculateReadingHistorySummary as Mock).mockReturnValue({
        totalTimeSpentReading: 120,
        users: {
          me: {
            totalTimeSpentReading: 120,
            books: {
              GEN: {
                chapters: { 1: [{ start: 990_000, end: 999_000, chapter: 1 }] },
              },
            },
          },
        },
      });
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          showingAllChapters: true,
          isReadingHistoryEnabled: true,
          IsValueBetween: vi.fn(() => true),
          translate,
          userColorStore: { getUserColor: vi.fn(() => "#aabbcc") },
          readingHistoryService: {
            getColorByReadingTime: vi.fn(() => "#aabbcc"),
            getColorByRecency: vi.fn(() => "#aabbcc"),
          },
          ComputeLinearGradient: vi.fn(() => "linear-gradient()"),
          GetTextColorBasedOnBackground: vi.fn(() => "#000000"),
        })
      );
      const readingEvents = [{ chapter: 1, start: 990_000, end: 999_000 }];
      setup({
        bookId: "GEN",
        numberOfChapters: 2,
        readingEvents: readingEvents as never,
      });
      expect(translate).toHaveBeenCalledWith(
        "read-minutes-ago",
        expect.any(Object)
      );
    });
  });

  describe("chaptersData - isSubset and user presence per chapter", () => {
    it("matches bookUserPresence using offset chapter when isSubset=true", () => {
      const mockRawGradient = vi.fn(() => "linear-gradient(presence)");
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          showingAllChapters: true,
          isUserPresenceEnabled: true,
          ComputeRawGradientColors: mockRawGradient,
        })
      );
      // displayedChapter 1 + subsetStartIndex 10 = chapter 11 → matches bookUserPresence
      const result = setup({
        numberOfChapters: 2,
        isSubset: true,
        subsetStartIndex: 10,
        bookUserPresence: {
          user1: { chapter: 11, borderColor: "#ff0000" },
        },
      });
      expect(result.current.chaptersData[0]!.borderGradientColors).toBe(
        "linear-gradient(presence)"
      );
      expect(
        result.current.chaptersData[1]!.borderGradientColors
      ).toBeUndefined();
    });

    it("sets borderGradientColors on matching chapter when isUserPresenceEnabled", () => {
      const mockRawGradient = vi.fn(() => "linear-gradient(chapter-border)");
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          showingAllChapters: true,
          isUserPresenceEnabled: true,
          ComputeRawGradientColors: mockRawGradient,
        })
      );
      const result = setup({
        numberOfChapters: 3,
        bookUserPresence: {
          user1: { chapter: 2, borderColor: "#ff0000" },
        },
      });
      expect(
        result.current.chaptersData[0]!.borderGradientColors
      ).toBeUndefined();
      expect(result.current.chaptersData[1]!.borderGradientColors).toBe(
        "linear-gradient(chapter-border)"
      );
      expect(
        result.current.chaptersData[2]!.borderGradientColors
      ).toBeUndefined();
    });

    it("adds userPresence entry to chapter tooltipContentsData for matching chapter", () => {
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          showingAllChapters: true,
          isUserPresenceEnabled: true,
          translate: (key: string) => key,
          ComputeRawGradientColors: vi.fn(() => "linear-gradient()"),
        })
      );
      const result = setup({
        numberOfChapters: 2,
        bookUserPresence: {
          user1: { chapter: 1, borderColor: "#ff0000" },
        },
      });
      const ch1 = result.current.chaptersData[0]!;
      const entry = (ch1.tooltipContentsData as { type: string }[])?.find(
        (d) => d.type === "userPresence"
      );
      expect(entry).toBeDefined();

      const ch2 = result.current.chaptersData[1]!;
      const entry2 = (ch2.tooltipContentsData as { type: string }[])?.find(
        (d) => d.type === "userPresence"
      );
      expect(entry2).toBeUndefined();
    });
  });

  describe("checked", () => {
    it("should be true with matching selection and all chapters true", () => {
      const mockClickAndHold = vi.fn();
      const testamentName = "Old Testament";
      const bookId = "GEN";
      const sectionName = "Law";

      (useTestamentContext as Mock).mockReturnValue(
        makeTestamentCtx(testamentName)
      );
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          onBookNameClickAndHold: mockClickAndHold,
          selection: {
            [testamentName]: {
              [sectionName]: {
                [bookId]: [true, true],
              },
            },
          },
        })
      );
      const result = setup({ bookId, sectionName });
      const fakeEvent = {
        stopPropagation: vi.fn(),
      } as unknown as PointerEvent;

      act(() => result.current.handleBookHeaderPointerDown(fakeEvent as any));

      act(() => void vi.advanceTimersByTime(500));

      expect(mockClickAndHold).toHaveBeenCalledWith(
        false,
        {
          testamentName,
          sectionName,
          bookId,
        },
        true
      );
    });

    it("should be false with matching selection and all chapters false", () => {
      const mockClickAndHold = vi.fn();
      const testamentName = "Old Testament";
      const bookId = "GEN";
      const sectionName = "Law";

      (useTestamentContext as Mock).mockReturnValue(
        makeTestamentCtx(testamentName)
      );
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          onBookNameClickAndHold: mockClickAndHold,
          selection: {
            [testamentName]: {
              [sectionName]: {
                [bookId]: [false, false],
              },
            },
          },
        })
      );
      const result = setup({ bookId, sectionName });
      const fakeEvent = {
        stopPropagation: vi.fn(),
      } as unknown as PointerEvent;

      act(() => result.current.handleBookHeaderPointerDown(fakeEvent as any));

      act(() => void vi.advanceTimersByTime(500));

      expect(mockClickAndHold).toHaveBeenCalledWith(
        false,
        {
          testamentName,
          sectionName,
          bookId,
        },
        false
      );
    });

    it("should be false with matching selection and no chapters", () => {
      const mockClickAndHold = vi.fn();
      const testamentName = "Old Testament";
      const bookId = "GEN";
      const sectionName = "Law";

      (useTestamentContext as Mock).mockReturnValue(
        makeTestamentCtx(testamentName)
      );
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          onBookNameClickAndHold: mockClickAndHold,
          selection: {
            [testamentName]: {
              [sectionName]: {
                [bookId]: [],
              },
            },
          },
        })
      );
      const result = setup({ bookId, sectionName });
      const fakeEvent = {
        stopPropagation: vi.fn(),
      } as unknown as PointerEvent;

      act(() => result.current.handleBookHeaderPointerDown(fakeEvent as any));

      act(() => void vi.advanceTimersByTime(500));

      expect(mockClickAndHold).toHaveBeenCalledWith(
        false,
        {
          testamentName,
          sectionName,
          bookId,
        },
        false
      );
    });

    it("should be false with no matching selection", () => {
      const mockClickAndHold = vi.fn();

      const testamentName = "Old Testament";
      const sectionName = "Law";
      const bookId = "GEN";

      const selection = {
        [testamentName]: {
          [sectionName]: {
            EXO: [true, true],
          },
          History: {
            GEN: [true, true],
          },
        },
        "New Testament": {
          [sectionName]: {
            [bookId]: [true, true],
          },
        },
      };

      (useTestamentContext as Mock).mockReturnValue(
        makeTestamentCtx(testamentName)
      );
      (useScriptureMapContext as Mock).mockReturnValue(
        makeScriptureMapCtx({
          onBookNameClickAndHold: mockClickAndHold,
          selection,
        })
      );
      const result = setup({ bookId, sectionName });
      const fakeEvent = {
        stopPropagation: vi.fn(),
      } as unknown as PointerEvent;

      act(() => result.current.handleBookHeaderPointerDown(fakeEvent as any));

      act(() => void vi.advanceTimersByTime(500));

      expect(mockClickAndHold).toHaveBeenCalledWith(
        false,
        {
          testamentName,
          sectionName,
          bookId,
        },
        false
      );
    });
  });
});
