import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { Chapter } from "../../../../../packages/scripture-map/components/containers/Chapter";
import { useChapter } from "../../../../../packages/scripture-map/hooks/useChapter";

vi.mock("../../../../../packages/scripture-map/hooks/useChapter", () => ({
  useChapter: vi.fn(),
}));

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

type ChapterProps = Parameters<typeof Chapter>[0];

function makeProps(overrides: Partial<ChapterProps> = {}): ChapterProps {
  return {
    index: 0,
    bookId: "GEN",
    sectionName: "Law",
    historyBackground: undefined,
    historyColor: undefined,
    tooltipContentsData: [],
    chapter: 1,
    borderGradientColors: undefined,
    ...overrides,
  };
}

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    chapterClass: "chapter",
    chapterStyle: {},
    isReadingHistoryEnabled: false,
    isUserPresenceEnabled: false,
    tooltipAnchor: undefined,
    tooltipOffsetY: 0,
    handleChapterPointerEnter: vi.fn(),
    handleChapterPointerLeave: vi.fn(),
    handleChapterPointerDown: vi.fn(),
    handleChapterPointerUp: vi.fn(),
    ...overrides,
  };
}

describe("Chapter", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useChapter as Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(props: Partial<ChapterProps> = {}) {
    act(() => render(<Chapter {...makeProps(props)} />, container));
    return container;
  }

  describe("structure", () => {
    it("renders a div with chapterClass", () => {
      (useChapter as Mock).mockReturnValue(
        makeHookResult({ chapterClass: "chapter show-user-presence" })
      );
      setup();
      expect(
        container.querySelector(".chapter.show-user-presence")
      ).not.toBeNull();
    });

    it("applies chapterStyle to the div", () => {
      (useChapter as Mock).mockReturnValue(
        makeHookResult({
          chapterStyle: { background: "#aabbcc", borderStyle: "solid" },
        })
      );
      setup();
      const div = container.querySelector<HTMLElement>(".chapter");
      expect(div?.style.borderStyle).toBe("solid");
    });

    it("renders the chapter number as text content", () => {
      setup({ chapter: 5 });
      const div = container.querySelector(".chapter");
      expect(div?.textContent).toContain("5");
    });

    it("renders chapter 1 by default", () => {
      setup();
      const div = container.querySelector(".chapter");
      expect(div?.textContent).toContain("1");
    });
  });

  describe("forwarding props to useChapter", () => {
    it("passes all relevant props to useChapter", () => {
      setup({
        index: 3,
        bookId: "EXO",
        sectionName: "History",
        historyBackground: "#ff0000",
        historyColor: "#ffffff",
        borderGradientColors: "linear-gradient(red, blue)",
      });
      expect(useChapter).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 3,
          bookId: "EXO",
          sectionName: "History",
          historyBackground: "#ff0000",
          historyColor: "#ffffff",
          borderGradientColors: "linear-gradient(red, blue)",
        })
      );
    });

    it("does not forward chapter or tooltipContentsData to useChapter", () => {
      setup({ chapter: 7, tooltipContentsData: [{ type: "header" } as never] });
      const call = (useChapter as Mock).mock.calls[0][0];
      expect(call).not.toHaveProperty("chapter");
      expect(call).not.toHaveProperty("tooltipContentsData");
    });
  });

  describe("tooltip rendering", () => {
    it("renders Tooltip when isReadingHistoryEnabled, anchor, and data are present", () => {
      (useChapter as Mock).mockReturnValue(
        makeHookResult({
          isReadingHistoryEnabled: true,
          tooltipAnchor: { x: 50, y: 100, width: 32, height: 32 },
          tooltipOffsetY: 2,
        })
      );
      setup({
        tooltipContentsData: [{ type: "header", label: "Genesis 1" } as never],
      });
      expect(container.querySelector("[data-testid='tooltip']")).not.toBeNull();
    });

    it("renders Tooltip when isUserPresenceEnabled, anchor, and data are present", () => {
      (useChapter as Mock).mockReturnValue(
        makeHookResult({
          isUserPresenceEnabled: true,
          tooltipAnchor: { x: 50, y: 100, width: 32, height: 32 },
        })
      );
      setup({
        tooltipContentsData: [{ type: "header", label: "Genesis 1" } as never],
      });
      expect(container.querySelector("[data-testid='tooltip']")).not.toBeNull();
    });

    it("does not render Tooltip when tooltipAnchor is undefined", () => {
      (useChapter as Mock).mockReturnValue(
        makeHookResult({
          isReadingHistoryEnabled: true,
          tooltipAnchor: undefined,
        })
      );
      setup({
        tooltipContentsData: [{ type: "header", label: "Genesis 1" } as never],
      });
      expect(container.querySelector("[data-testid='tooltip']")).toBeNull();
    });

    it("does not render Tooltip when tooltipContentsData is empty", () => {
      (useChapter as Mock).mockReturnValue(
        makeHookResult({
          isReadingHistoryEnabled: true,
          tooltipAnchor: { x: 50, y: 100, width: 32, height: 32 },
        })
      );
      setup({ tooltipContentsData: [] });
      expect(container.querySelector("[data-testid='tooltip']")).toBeNull();
    });

    it("does not render Tooltip when neither isReadingHistoryEnabled nor isUserPresenceEnabled", () => {
      (useChapter as Mock).mockReturnValue(
        makeHookResult({
          isReadingHistoryEnabled: false,
          isUserPresenceEnabled: false,
          tooltipAnchor: { x: 50, y: 100, width: 32, height: 32 },
        })
      );
      setup({
        tooltipContentsData: [{ type: "header", label: "Genesis 1" } as never],
      });
      expect(container.querySelector("[data-testid='tooltip']")).toBeNull();
    });

    it("passes tooltipOffsetY to Tooltip", () => {
      (useChapter as Mock).mockReturnValue(
        makeHookResult({
          isReadingHistoryEnabled: true,
          tooltipAnchor: { x: 50, y: 100, width: 32, height: 32 },
          tooltipOffsetY: 6,
        })
      );
      setup({
        tooltipContentsData: [{ type: "header", label: "Genesis 1" } as never],
      });
      const tooltip = container.querySelector("[data-testid='tooltip']");
      expect(tooltip?.getAttribute("data-offset-y")).toBe("6");
    });

    it("passes tooltipAnchor to Tooltip", () => {
      const anchor = { x: 10, y: 20, width: 32, height: 32 };
      (useChapter as Mock).mockReturnValue(
        makeHookResult({
          isReadingHistoryEnabled: true,
          tooltipAnchor: anchor,
        })
      );
      setup({
        tooltipContentsData: [{ type: "header", label: "Genesis 1" } as never],
      });
      const tooltip = container.querySelector("[data-testid='tooltip']");
      expect(JSON.parse(tooltip?.getAttribute("data-anchor") ?? "{}")).toEqual(
        anchor
      );
    });
  });

  describe("event handlers", () => {
    it("calls handleChapterPointerEnter with a fake event", () => {
      const handleChapterPointerEnter = vi.fn();
      const hookResult = makeHookResult({ handleChapterPointerEnter });
      (useChapter as Mock).mockReturnValue(hookResult);
      setup();
      const fakeEvent = {
        currentTarget: document.createElement("div"),
      } as unknown as PointerEvent;
      act(() => hookResult.handleChapterPointerEnter(fakeEvent));
      expect(handleChapterPointerEnter).toHaveBeenCalledWith(fakeEvent);
    });

    it("calls handleChapterPointerLeave with a fake event", () => {
      const handleChapterPointerLeave = vi.fn();
      const hookResult = makeHookResult({ handleChapterPointerLeave });
      (useChapter as Mock).mockReturnValue(hookResult);
      setup();
      const fakeEvent = {} as unknown as PointerEvent;
      act(() => hookResult.handleChapterPointerLeave(fakeEvent));
      expect(handleChapterPointerLeave).toHaveBeenCalledWith(fakeEvent);
    });

    it("calls handleChapterPointerDown with a fake event", () => {
      const handleChapterPointerDown = vi.fn();
      const hookResult = makeHookResult({ handleChapterPointerDown });
      (useChapter as Mock).mockReturnValue(hookResult);
      setup();
      const fakeEvent = {
        stopPropagation: vi.fn(),
      } as unknown as PointerEvent;
      act(() => hookResult.handleChapterPointerDown(fakeEvent));
      expect(handleChapterPointerDown).toHaveBeenCalledWith(fakeEvent);
    });

    it("calls handleChapterPointerUp with a fake event", () => {
      const handleChapterPointerUp = vi.fn();
      const hookResult = makeHookResult({ handleChapterPointerUp });
      (useChapter as Mock).mockReturnValue(hookResult);
      setup();
      const fakeEvent = {
        stopPropagation: vi.fn(),
      } as unknown as PointerEvent;
      act(() => hookResult.handleChapterPointerUp(fakeEvent));
      expect(handleChapterPointerUp).toHaveBeenCalledWith(fakeEvent);
    });
  });
});
