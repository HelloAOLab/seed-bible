import { render } from "preact";
import { act } from "preact/test-utils";
import { ReadingHistoryTimeline } from "scriptureMap2D.components.containers.ReadingHistoryTimeline";
import { useReadingHistoryTimeline } from "scriptureMap2D.hooks.useReadingHistoryTimeline";

jest.mock("scriptureMap2D.hooks.useReadingHistoryTimeline", () => ({
  useReadingHistoryTimeline: jest.fn(),
}));

jest.mock("scriptureMap2D.components.containers.Tooltip", () => ({
  Tooltip: ({ anchor }: { anchor: unknown; contentsData: unknown[] }) => (
    <div data-testid="tooltip" data-anchor={JSON.stringify(anchor)} />
  ),
}));

type Range = { start: number; end: number };

type ItemData = {
  type: "item";
  key: string;
  id: string;
  style: React.CSSProperties;
  tooltipContentsData: unknown[];
  handleItemClick: jest.Mock;
  range: Range;
  readingHistoryRangeSeconds: Range | null;
  isUpcoming: boolean;
};

type LabelData = {
  type: "label";
  key: string;
  gridRow: string;
  gridColumn: string;
  isDay: boolean;
  children: preact.ComponentChildren;
};

function makeItem(overrides: Partial<ItemData> = {}): ItemData {
  const defaultRange: Range = { start: 0, end: 86400 };
  return {
    type: "item",
    key: "item-1",
    id: "day-0-0",
    style: { backgroundColor: "#aabbcc" },
    tooltipContentsData: [],
    handleItemClick: jest.fn(),
    range: defaultRange,
    readingHistoryRangeSeconds: null,
    isUpcoming: false,
    ...overrides,
  };
}

function makeLabel(overrides: Partial<LabelData> = {}): LabelData {
  return {
    type: "label",
    key: "label-1",
    gridRow: "1",
    gridColumn: "2",
    isDay: true,
    children: "Mon",
    ...overrides,
  };
}

function makeHookResult(
  itemsData: (ItemData | LabelData)[] = [],
  timelineRef: { current: HTMLDivElement | null } = { current: null }
) {
  return { itemsData, timelineRef };
}

describe("ReadingHistoryTimeline", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useReadingHistoryTimeline as jest.Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(itemsData: (ItemData | LabelData)[] = []) {
    (useReadingHistoryTimeline as jest.Mock).mockReturnValue(
      makeHookResult(itemsData)
    );
    act(() => render(<ReadingHistoryTimeline />, container));
    return container;
  }

  describe("structure", () => {
    it("renders .reading-history-timeline-container", () => {
      setup();
      expect(
        container.querySelector(".reading-history-timeline-container")
      ).not.toBeNull();
    });

    it("renders .reading-history-timeline inside the container", () => {
      setup();
      const outer = container.querySelector(
        ".reading-history-timeline-container"
      );
      expect(outer?.querySelector(".reading-history-timeline")).not.toBeNull();
    });

    it("renders nothing inside the timeline when itemsData is empty", () => {
      setup();
      const timeline = container.querySelector(".reading-history-timeline");
      expect(timeline?.childElementCount).toBe(0);
    });
  });

  describe("Label rendering", () => {
    it("renders a label element for type='label'", () => {
      setup([makeLabel()]);
      expect(
        container.querySelector(".reading-history-timeline-label")
      ).not.toBeNull();
    });

    it("applies day class when isDay is true", () => {
      setup([makeLabel({ isDay: true })]);
      expect(
        container.querySelector(".reading-history-timeline-label-day")
      ).not.toBeNull();
      expect(
        container.querySelector(".reading-history-timeline-label-month")
      ).toBeNull();
    });

    it("applies month class when isDay is false", () => {
      setup([makeLabel({ isDay: false })]);
      expect(
        container.querySelector(".reading-history-timeline-label-month")
      ).not.toBeNull();
      expect(
        container.querySelector(".reading-history-timeline-label-day")
      ).toBeNull();
    });

    it("applies gridRow and gridColumn as inline styles", () => {
      setup([makeLabel({ gridRow: "3", gridColumn: "5" })]);
      const el = container.querySelector<HTMLElement>(
        ".reading-history-timeline-label"
      );
      expect(el?.style.gridRow).toBe("3");
      expect(el?.style.gridColumn).toBe("5");
    });

    it("renders children text content", () => {
      setup([makeLabel({ children: "Wed" })]);
      const el = container.querySelector(".reading-history-timeline-label");
      expect(el?.textContent).toBe("Wed");
    });

    it("renders multiple labels", () => {
      setup([
        makeLabel({ key: "l1", children: "Mon" }),
        makeLabel({ key: "l2", children: "Wed", isDay: false }),
      ]);
      expect(
        container.querySelectorAll(".reading-history-timeline-label")
      ).toHaveLength(2);
    });
  });

  describe("Item rendering", () => {
    it("renders an item element for type='item'", () => {
      setup([makeItem()]);
      expect(
        container.querySelector(".reading-history-timeline-item")
      ).not.toBeNull();
    });

    it("applies the id attribute", () => {
      setup([makeItem({ id: "day-3-7" })]);
      expect(container.querySelector("#day-3-7")).not.toBeNull();
    });

    it("applies inline style from the data", () => {
      setup([makeItem({ style: { backgroundColor: "#ff0000" } })]);
      const el = container.querySelector<HTMLElement>(
        ".reading-history-timeline-item"
      );
      expect(el?.style.backgroundColor).toBe("rgb(255, 0, 0)");
    });

    it("does not have 'selected' class when range !== readingHistoryRangeSeconds", () => {
      setup([
        makeItem({
          range: { start: 0, end: 1 },
          readingHistoryRangeSeconds: { start: 2, end: 3 },
        }),
      ]);
      const el = container.querySelector(".reading-history-timeline-item");
      expect(el?.classList.contains("selected")).toBe(false);
    });

    it("has 'selected' class when range === readingHistoryRangeSeconds (same reference)", () => {
      const sharedRange: Range = { start: 0, end: 86400 };
      setup([
        makeItem({
          range: sharedRange,
          readingHistoryRangeSeconds: sharedRange,
        }),
      ]);
      const el = container.querySelector(".reading-history-timeline-item");
      expect(el?.classList.contains("selected")).toBe(true);
    });

    it("has 'upcoming' class when isUpcoming is true", () => {
      setup([makeItem({ isUpcoming: true })]);
      const el = container.querySelector(".reading-history-timeline-item");
      expect(el?.classList.contains("upcoming")).toBe(true);
    });

    it("does not have 'upcoming' class when isUpcoming is false", () => {
      setup([makeItem({ isUpcoming: false })]);
      const el = container.querySelector(".reading-history-timeline-item");
      expect(el?.classList.contains("upcoming")).toBe(false);
    });

    it("renders multiple items", () => {
      setup([makeItem({ key: "i1" }), makeItem({ key: "i2" })]);
      expect(
        container.querySelectorAll(".reading-history-timeline-item")
      ).toHaveLength(2);
    });
  });

  describe("Item click handler", () => {
    it("calls handleItemClick with range when item is not selected", () => {
      const handleItemClick = jest.fn();
      const range: Range = { start: 0, end: 86400 };
      setup([
        makeItem({
          handleItemClick,
          range,
          readingHistoryRangeSeconds: null,
        }),
      ]);
      const el = container.querySelector<HTMLElement>(
        ".reading-history-timeline-item"
      );
      act(() => {
        el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleItemClick).toHaveBeenCalledWith(range);
    });

    it("calls handleItemClick with null when item is selected", () => {
      const handleItemClick = jest.fn();
      const sharedRange: Range = { start: 0, end: 86400 };
      setup([
        makeItem({
          handleItemClick,
          range: sharedRange,
          readingHistoryRangeSeconds: sharedRange,
        }),
      ]);
      const el = container.querySelector<HTMLElement>(
        ".reading-history-timeline-item"
      );
      act(() => {
        el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleItemClick).toHaveBeenCalledWith(null);
    });
  });

  describe("mixed label and item rendering", () => {
    it("renders both labels and items from itemsData", () => {
      setup([makeLabel({ key: "lbl" }), makeItem({ key: "itm" })]);
      expect(
        container.querySelector(".reading-history-timeline-label")
      ).not.toBeNull();
      expect(
        container.querySelector(".reading-history-timeline-item")
      ).not.toBeNull();
    });
  });
});
