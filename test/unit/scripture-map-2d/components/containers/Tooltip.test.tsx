import { render } from "preact";
import { act } from "preact/test-utils";
import {
  Tooltip,
  type TooltipProps,
  type TooltipContentData,
} from "scriptureMap2D.components.containers.Tooltip";
import { useTooltip } from "scriptureMap2D.hooks.useTooltip";

jest.mock("scriptureMap2D.hooks.useTooltip", () => ({
  useTooltip: jest.fn(),
}));

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    tooltipRef: { current: null },
    tooltipClass: "tooltip tooltip-up",
    style: {} as React.CSSProperties,
    ...overrides,
  };
}

function makeAnchor() {
  return { x: 100, y: 200, width: 50, height: 20 };
}

function makeProps(overrides: Partial<TooltipProps> = {}): TooltipProps {
  return {
    contentsData: [],
    anchor: makeAnchor(),
    ...overrides,
  };
}

describe("Tooltip", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useTooltip as jest.Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(propOverrides: Partial<TooltipProps> = {}) {
    const props = makeProps(propOverrides);
    act(() => render(<Tooltip {...props} />, container));
    return container;
  }

  function tooltipEl() {
    return container.querySelector<HTMLSpanElement>(".tooltip");
  }

  describe("structure", () => {
    it("renders the tooltip span with the class from the hook", () => {
      setup();
      expect(container.querySelector(".tooltip.tooltip-up")).not.toBeNull();
    });

    it("applies the style from the hook", () => {
      (useTooltip as jest.Mock).mockReturnValue(
        makeHookResult({ style: { top: "42px" } })
      );
      setup();
      expect(tooltipEl()!.style.top).toBe("42px");
    });

    it("renders no content when contentsData is empty", () => {
      setup({ contentsData: [] });
      expect(tooltipEl()!.children).toHaveLength(0);
    });
  });

  describe("hook args", () => {
    it("passes anchor and offsetY to useTooltip", () => {
      const anchor = { x: 10, y: 20, width: 5, height: 5 };
      setup({ anchor, offsetY: 8 });
      expect(useTooltip).toHaveBeenCalledWith({ anchor, offsetY: 8 });
    });

    it("passes offsetY=0 by default", () => {
      const anchor = makeAnchor();
      setup({ anchor });
      expect(useTooltip).toHaveBeenCalledWith({ anchor, offsetY: 0 });
    });
  });

  describe("text content", () => {
    it("renders text content inline", () => {
      setup({ contentsData: [{ type: "text", content: "Hello tooltip" }] });
      expect(tooltipEl()!.textContent).toContain("Hello tooltip");
    });

    it("renders multiple text items", () => {
      setup({
        contentsData: [
          { type: "text", content: "First" },
          { type: "text", content: "Second" },
        ],
      });
      expect(tooltipEl()!.textContent).toContain("First");
      expect(tooltipEl()!.textContent).toContain("Second");
    });
  });

  describe("readingHistory content", () => {
    function makeReadingHistoryItem(
      overrides: Record<string, unknown> = {}
    ): TooltipContentData {
      return {
        type: "readingHistory",
        fixedContent: "1 min",
        userName: "Alice",
        dotStyle: { backgroundColor: "#ff0000" },
        ...overrides,
      } as TooltipContentData;
    }

    it("renders the .tooltip-reading-history-content span", () => {
      setup({ contentsData: [makeReadingHistoryItem()] });
      expect(
        tooltipEl()!.querySelector(".tooltip-reading-history-content")
      ).not.toBeNull();
    });

    it("renders the userName", () => {
      setup({ contentsData: [makeReadingHistoryItem({ userName: "Bob" })] });
      expect(
        tooltipEl()!.querySelector(".tooltip-reading-history-content")!
          .textContent
      ).toContain("Bob");
    });

    it("renders the fixedContent", () => {
      setup({
        contentsData: [makeReadingHistoryItem({ fixedContent: "5 min" })],
      });
      expect(
        tooltipEl()!.querySelector(".tooltip-reading-history-content")!
          .textContent
      ).toContain("5 min");
    });

    it("applies dotStyle to the dot span", () => {
      setup({
        contentsData: [
          makeReadingHistoryItem({ dotStyle: { backgroundColor: "#00ff00" } }),
        ],
      });
      const dot = tooltipEl()!.querySelector<HTMLSpanElement>(
        ".tooltip-reading-history-content span[style]"
      );
      expect(dot).not.toBeNull();
      expect(dot!.style.backgroundColor).toBe("rgb(0, 255, 0)");
    });
  });

  describe("userPresence content", () => {
    function makeUserPresenceItem(
      overrides: Record<string, unknown> = {}
    ): TooltipContentData {
      return {
        type: "userPresence",
        colors: ["#ff0000", "#00ff00"],
        labelText: "2 users",
        ...overrides,
      } as TooltipContentData;
    }

    it("renders the .user-presence-tooltip-content span", () => {
      setup({ contentsData: [makeUserPresenceItem()] });
      expect(
        tooltipEl()!.querySelector(".user-presence-tooltip-content")
      ).not.toBeNull();
    });

    it("renders the labelText", () => {
      setup({ contentsData: [makeUserPresenceItem({ labelText: "3 users" })] });
      expect(
        tooltipEl()!.querySelector(".user-presence-tooltip-content")!
          .textContent
      ).toContain("3 users");
    });

    it("renders a color dot for each of up to 3 colors", () => {
      setup({
        contentsData: [
          makeUserPresenceItem({ colors: ["#f00", "#0f0", "#00f"] }),
        ],
      });
      const dotsWrapper = tooltipEl()!.querySelector(
        ".user-presence-tooltip-content > div"
      )!;
      expect(dotsWrapper.children).toHaveLength(3);
    });

    it("renders only 3 color dots when more than 3 colors are given", () => {
      setup({
        contentsData: [
          makeUserPresenceItem({
            colors: ["#f00", "#0f0", "#00f", "#ff0", "#f0f"],
          }),
        ],
      });
      const dotsWrapper = tooltipEl()!.querySelector(
        ".user-presence-tooltip-content > div"
      )!;
      // 3 color dots + 1 overflow div
      expect(dotsWrapper.children).toHaveLength(4);
    });

    it("shows +N overflow label when more than 3 colors", () => {
      setup({
        contentsData: [
          makeUserPresenceItem({
            colors: ["#f00", "#0f0", "#00f", "#ff0", "#f0f"],
          }),
        ],
      });
      const dotsWrapper = tooltipEl()!.querySelector(
        ".user-presence-tooltip-content > div"
      )!;
      expect(dotsWrapper.lastElementChild!.textContent).toBe("+2");
    });

    it("does not show overflow label when 3 or fewer colors", () => {
      setup({
        contentsData: [
          makeUserPresenceItem({ colors: ["#f00", "#0f0", "#00f"] }),
        ],
      });
      const dotsWrapper = tooltipEl()!.querySelector(
        ".user-presence-tooltip-content > div"
      )!;
      expect(dotsWrapper.children).toHaveLength(3);
    });
  });

  describe("readingHistoryHeader content", () => {
    function makeHeaderItem(
      overrides: Record<string, unknown> = {}
    ): TooltipContentData {
      return {
        type: "readingHistoryHeader",
        monthName: "January",
        dayOfTheMonth: 15,
        year: 2024,
        minutesCount: 30,
        ...overrides,
      } as TooltipContentData;
    }

    it("renders the date string in .tooltip-reading-history-title", () => {
      setup({ contentsData: [makeHeaderItem()] });
      expect(
        tooltipEl()!.querySelector(".tooltip-reading-history-title")!
          .textContent
      ).toBe("January 15, 2024");
    });

    it("renders the minutes count when minutesCount > 0", () => {
      setup({ contentsData: [makeHeaderItem({ minutesCount: 45 })] });
      expect(
        tooltipEl()!.querySelector(".tooltip-reading-history-count")!
          .textContent
      ).toBe("45 Minutes of reading");
    });

    it("renders a .horizontal-divider when minutesCount > 0", () => {
      setup({ contentsData: [makeHeaderItem({ minutesCount: 10 })] });
      expect(tooltipEl()!.querySelector(".horizontal-divider")).not.toBeNull();
    });

    it("does not render the minutes count when minutesCount is 0", () => {
      setup({ contentsData: [makeHeaderItem({ minutesCount: 0 })] });
      expect(
        tooltipEl()!.querySelector(".tooltip-reading-history-count")
      ).toBeNull();
    });

    it("does not render .horizontal-divider when minutesCount is 0", () => {
      setup({ contentsData: [makeHeaderItem({ minutesCount: 0 })] });
      expect(tooltipEl()!.querySelector(".horizontal-divider")).toBeNull();
    });
  });

  describe("mixed content", () => {
    it("renders multiple content items of different types", () => {
      setup({
        contentsData: [
          {
            type: "readingHistoryHeader",
            monthName: "March",
            dayOfTheMonth: 1,
            year: 2023,
            minutesCount: 0,
          },
          { type: "text", content: "Summary" },
          {
            type: "readingHistory",
            fixedContent: "2 min",
            userName: "Carol",
            dotStyle: {},
          },
        ],
      });
      expect(
        tooltipEl()!.querySelector(".tooltip-reading-history-title")
      ).not.toBeNull();
      expect(
        tooltipEl()!.querySelector(".tooltip-reading-history-content")
      ).not.toBeNull();
      expect(tooltipEl()!.textContent).toContain("Summary");
    });
  });
});
