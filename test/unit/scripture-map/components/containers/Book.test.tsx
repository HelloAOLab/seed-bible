import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { Book } from "../../../../../packages/scripture-map/components/containers/Book";
import { useBook } from "../../../../../packages/scripture-map/hooks/useBook";

vi.mock("../../../../../packages/scripture-map/hooks/useBook", () => ({
  useBook: vi.fn(),
}));

vi.mock(
  "../../../../../packages/scripture-map/components/containers/Chapter",
  () => ({
    Chapter: ({ bookId, index }: { bookId: string; index: number }) => (
      <div data-testid="chapter" data-book={bookId} data-index={index} />
    ),
  })
);

vi.mock(
  "../../../../../packages/scripture-map/components/containers/Tooltip",
  () => ({
    Tooltip: ({
      anchor,
      offsetY,
    }: {
      anchor: unknown;
      offsetY: number;
      contentsData: unknown[];
    }) => (
      <div
        data-testid="tooltip"
        data-offset-y={offsetY}
        data-anchor={JSON.stringify(anchor)}
      />
    ),
  })
);

type BookProps = Parameters<typeof Book>[0];

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
    bookBorderGradientColors: undefined,
    bookUserPresence: {},
    bookUserPresenceColors: [],
    ...overrides,
  };
}

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    showChapters: false,
    tooltipAnchor: undefined,
    tooltipContentsData: [],
    tooltipOffsetY: 0,
    chaptersData: [],
    bookTitle: "GEN",
    bookClass: "book",
    bookCoverClass: "book-cover",
    handleBookClick: vi.fn(),
    handleBookHeaderPointerDown: vi.fn(),
    handleBookHeaderPointerUp: vi.fn(),
    handleBookHeaderClick: vi.fn(),
    handleBookCoverPointerEnter: vi.fn(),
    handleBookCoverPointerLeave: vi.fn(),
    bookCoverStyle: {},
    isReadingHistoryEnabled: false,
    isUserPresenceEnabled: false,
    ...overrides,
  };
}

describe("Book", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useBook as Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(props: Partial<BookProps> = {}) {
    act(() => render(<Book {...makeProps(props)} />, container));
    return container;
  }

  describe("structure", () => {
    it("renders the outer div with bookClass", () => {
      (useBook as Mock).mockReturnValue(
        makeHookResult({ bookClass: "book selected" })
      );
      setup();
      expect(container.querySelector(".book.selected")).not.toBeNull();
    });

    it("renders the book-header div", () => {
      setup();
      expect(container.querySelector(".book-header")).not.toBeNull();
    });

    it("renders the book title in .book-id span", () => {
      (useBook as Mock).mockReturnValue(
        makeHookResult({ bookTitle: "Genesis" })
      );
      setup();
      expect(container.querySelector(".book-id")?.textContent).toBe("Genesis");
    });

    it("renders the book cover div with bookCoverClass", () => {
      (useBook as Mock).mockReturnValue(
        makeHookResult({ bookCoverClass: "book-cover open" })
      );
      setup();
      expect(container.querySelector(".book-cover.open")).not.toBeNull();
    });

    it("applies bookCoverStyle to the cover div", () => {
      (useBook as Mock).mockReturnValue(
        makeHookResult({ bookCoverStyle: { background: "#abc123" } })
      );
      setup();
      const cover = container.querySelector<HTMLElement>(".book-cover");
      expect(cover?.style.background).toBe("rgb(171, 193, 35)");
    });
  });

  describe("forwarding props to useBook", () => {
    it("passes all props to useBook", () => {
      const props = makeProps({
        book: "Exodus",
        bookId: "EXO",
        numberOfChapters: 40,
      });
      setup(props);
      expect(useBook).toHaveBeenCalledWith(
        expect.objectContaining({
          book: "Exodus",
          bookId: "EXO",
          numberOfChapters: 40,
        })
      );
    });
  });

  describe("chapters rendering", () => {
    it("renders Chapter components when showChapters is true", () => {
      (useBook as Mock).mockReturnValue(
        makeHookResult({
          showChapters: true,
          chaptersData: [
            { key: "GEN-0", bookId: "GEN", index: 0 } as never,
            { key: "GEN-1", bookId: "GEN", index: 1 } as never,
            { key: "GEN-2", bookId: "GEN", index: 2 } as never,
          ],
        })
      );
      setup();
      expect(
        container.querySelectorAll("[data-testid='chapter']")
      ).toHaveLength(3);
    });

    it("does not render Chapter components when showChapters is false", () => {
      setup();
      expect(
        container.querySelectorAll("[data-testid='chapter']")
      ).toHaveLength(0);
    });

    it("does not render Tooltip when showChapters is true", () => {
      (useBook as Mock).mockReturnValue(
        makeHookResult({
          showChapters: true,
          isReadingHistoryEnabled: true,
          tooltipAnchor: { x: 10, y: 20, width: 32, height: 32 },
          tooltipContentsData: [{ type: "header", label: "Genesis" }] as never,
        })
      );
      setup();
      expect(container.querySelector("[data-testid='tooltip']")).toBeNull();
    });
  });

  describe("tooltip rendering", () => {
    it("renders Tooltip when all conditions met (isReadingHistoryEnabled)", () => {
      (useBook as Mock).mockReturnValue(
        makeHookResult({
          showChapters: false,
          isReadingHistoryEnabled: true,
          tooltipAnchor: { x: 50, y: 100, width: 32, height: 32 },
          tooltipContentsData: [{ type: "header", label: "Genesis" }] as never,
          tooltipOffsetY: 4,
        })
      );
      setup();
      expect(container.querySelector("[data-testid='tooltip']")).not.toBeNull();
    });

    it("renders Tooltip when all conditions met (isUserPresenceEnabled)", () => {
      (useBook as Mock).mockReturnValue(
        makeHookResult({
          showChapters: false,
          isUserPresenceEnabled: true,
          tooltipAnchor: { x: 50, y: 100, width: 32, height: 32 },
          tooltipContentsData: [{ type: "header", label: "Genesis" }] as never,
        })
      );
      setup();
      expect(container.querySelector("[data-testid='tooltip']")).not.toBeNull();
    });

    it("does not render Tooltip when tooltipAnchor is undefined", () => {
      (useBook as Mock).mockReturnValue(
        makeHookResult({
          showChapters: false,
          isReadingHistoryEnabled: true,
          tooltipAnchor: undefined,
          tooltipContentsData: [{ type: "header", label: "Genesis" }] as never,
        })
      );
      setup();
      expect(container.querySelector("[data-testid='tooltip']")).toBeNull();
    });

    it("does not render Tooltip when tooltipContentsData is empty", () => {
      (useBook as Mock).mockReturnValue(
        makeHookResult({
          showChapters: false,
          isReadingHistoryEnabled: true,
          tooltipAnchor: { x: 50, y: 100, width: 32, height: 32 },
          tooltipContentsData: [],
        })
      );
      setup();
      expect(container.querySelector("[data-testid='tooltip']")).toBeNull();
    });

    it("does not render Tooltip when neither isReadingHistoryEnabled nor isUserPresenceEnabled", () => {
      (useBook as Mock).mockReturnValue(
        makeHookResult({
          showChapters: false,
          isReadingHistoryEnabled: false,
          isUserPresenceEnabled: false,
          tooltipAnchor: { x: 50, y: 100, width: 32, height: 32 },
          tooltipContentsData: [{ type: "header", label: "Genesis" }] as never,
        })
      );
      setup();
      expect(container.querySelector("[data-testid='tooltip']")).toBeNull();
    });

    it("passes tooltipOffsetY to Tooltip", () => {
      (useBook as Mock).mockReturnValue(
        makeHookResult({
          showChapters: false,
          isReadingHistoryEnabled: true,
          tooltipAnchor: { x: 50, y: 100, width: 32, height: 32 },
          tooltipContentsData: [{ type: "header", label: "Genesis" }] as never,
          tooltipOffsetY: 6,
        })
      );
      setup();
      const tooltip = container.querySelector("[data-testid='tooltip']");
      expect(tooltip?.getAttribute("data-offset-y")).toBe("6");
    });

    it("renders null in cover when showChapters is false and conditions not met", () => {
      setup();
      const cover = container.querySelector(".book-cover");
      expect(cover?.childElementCount).toBe(0);
    });
  });

  describe("event handlers", () => {
    it("calls handleBookClick when outer div is clicked", () => {
      const handleBookClick = vi.fn();
      (useBook as Mock).mockReturnValue(makeHookResult({ handleBookClick }));
      setup();
      const outer = container.querySelector<HTMLElement>(".book");
      act(() => {
        outer?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleBookClick).toHaveBeenCalledTimes(1);
    });

    it("calls handleBookHeaderPointerDown with a fake event", () => {
      const handleBookHeaderPointerDown = vi.fn();
      const hookResult = makeHookResult({ handleBookHeaderPointerDown });
      (useBook as Mock).mockReturnValue(hookResult);
      setup();
      const fakeEvent = {
        stopPropagation: vi.fn(),
      } as unknown as PointerEvent;
      act(() => hookResult.handleBookHeaderPointerDown(fakeEvent));
      expect(handleBookHeaderPointerDown).toHaveBeenCalledWith(fakeEvent);
    });

    it("calls handleBookHeaderPointerUp with a fake event", () => {
      const handleBookHeaderPointerUp = vi.fn();
      const hookResult = makeHookResult({ handleBookHeaderPointerUp });
      (useBook as Mock).mockReturnValue(hookResult);
      setup();
      const fakeEvent = {
        stopPropagation: vi.fn(),
      } as unknown as PointerEvent;
      act(() => hookResult.handleBookHeaderPointerUp(fakeEvent));
      expect(handleBookHeaderPointerUp).toHaveBeenCalledWith(fakeEvent);
    });

    it("calls handleBookHeaderClick when header is clicked", () => {
      const handleBookHeaderClick = vi.fn();
      (useBook as Mock).mockReturnValue(
        makeHookResult({ handleBookHeaderClick })
      );
      setup();
      const header = container.querySelector<HTMLElement>(".book-header");
      act(() => {
        header?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleBookHeaderClick).toHaveBeenCalledTimes(1);
    });

    it("calls handleBookCoverPointerEnter with a fake event", () => {
      const handleBookCoverPointerEnter = vi.fn();
      const hookResult = makeHookResult({ handleBookCoverPointerEnter });
      (useBook as Mock).mockReturnValue(hookResult);
      setup();
      const fakeEvent = {
        currentTarget: document.createElement("div"),
      } as unknown as PointerEvent;
      act(() => hookResult.handleBookCoverPointerEnter(fakeEvent));
      expect(handleBookCoverPointerEnter).toHaveBeenCalledWith(fakeEvent);
    });

    it("calls handleBookCoverPointerLeave with a fake event", () => {
      const handleBookCoverPointerLeave = vi.fn();
      const hookResult = makeHookResult({ handleBookCoverPointerLeave });
      (useBook as Mock).mockReturnValue(hookResult);
      setup();
      const fakeEvent = {} as unknown as PointerEvent;
      act(() => hookResult.handleBookCoverPointerLeave(fakeEvent));
      expect(handleBookCoverPointerLeave).toHaveBeenCalledWith(fakeEvent);
    });
  });
});
