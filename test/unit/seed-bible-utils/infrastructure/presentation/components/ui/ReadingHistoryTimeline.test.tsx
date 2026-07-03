import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { ReadingHistoryTimeline } from "../../../../../../../packages/seed-bible-utils/infrastructure/presentation/components/ui/ReadingHistoryTimeline";

const Tooltip = ({ anchor }: { anchor: unknown; contentsData: unknown[] }) => (
  <div data-testid="tooltip" data-anchor={JSON.stringify(anchor)} />
);

type Range = { start: number; end: number };

type ItemData = {
  type: "item";
  key: string;
  id: string;
  style: React.CSSProperties;
  tooltipContentsData: unknown[];
  handleItemClick: Mock;
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
    handleItemClick: vi.fn(),
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

describe("ReadingHistoryTimeline (shared, presentational)", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(itemsData: (ItemData | LabelData)[] = []) {
    act(() =>
      render(
        <ReadingHistoryTimeline
          itemsData={itemsData}
          timelineRef={{ current: null }}
          Tooltip={Tooltip}
        />,
        container
      )
    );
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
      const handleItemClick = vi.fn();
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
      const handleItemClick = vi.fn();
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

  describe("footer (legend + year selector)", () => {
    type Footer = {
      legendSquaresData: { key: number; style: React.CSSProperties }[];
      lessText: string;
      moreText: string;
      yearSelectorLabelTextContent: string;
      yearSelectorOptionsData: {
        key: number;
        className: string;
        onClick: () => void;
        content: number;
      }[];
    };

    function makeFooter(overrides: Partial<Footer> = {}): Footer {
      return {
        legendSquaresData: [
          { key: 0, style: { backgroundColor: "#aaa" } },
          { key: 1, style: { backgroundColor: "#bbb" } },
          { key: 2, style: { backgroundColor: "#ccc" } },
        ],
        lessText: "Less",
        moreText: "More",
        yearSelectorLabelTextContent: "Year: 2024",
        yearSelectorOptionsData: [
          {
            key: 0,
            className: "year-selector-option",
            onClick: vi.fn(),
            content: 2023,
          },
          {
            key: 1,
            className: "year-selector-option",
            onClick: vi.fn(),
            content: 2024,
          },
        ],
        ...overrides,
      };
    }

    function setupWithFooter(footer?: Footer) {
      act(() =>
        render(
          <ReadingHistoryTimeline
            itemsData={[]}
            timelineRef={{ current: null }}
            footer={footer}
          />,
          container
        )
      );
      return container;
    }

    it("does not render the footer when footer prop is omitted", () => {
      setupWithFooter(undefined);
      expect(
        container.querySelector(".reading-history-timeline-footer")
      ).toBeNull();
    });

    it("renders the footer when footer prop is provided", () => {
      setupWithFooter(makeFooter());
      expect(
        container.querySelector(".reading-history-timeline-footer")
      ).not.toBeNull();
    });

    it("renders legend lessText and moreText", () => {
      setupWithFooter(makeFooter({ lessText: "Poco", moreText: "Mucho" }));
      const legend = container.querySelector(".legend")!;
      expect(legend.textContent).toContain("Poco");
      expect(legend.textContent).toContain("Mucho");
    });

    it("renders one legend square per legendSquaresData entry", () => {
      setupWithFooter(makeFooter());
      const legend = container.querySelector(".legend")!;
      expect(legend.querySelectorAll("span[style]")).toHaveLength(3);
    });

    it("renders the year selector label text", () => {
      setupWithFooter(
        makeFooter({ yearSelectorLabelTextContent: "Year: 2023" })
      );
      expect(
        container.querySelector(".year-selector-label")!.textContent
      ).toContain("Year: 2023");
    });

    it("toggles the year selector options on label click", () => {
      setupWithFooter(makeFooter());
      expect(container.querySelector(".year-selector-options")).toBeNull();
      act(() => {
        container
          .querySelector(".year-selector-label")!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(container.querySelector(".year-selector-options")).not.toBeNull();
      expect(container.querySelectorAll(".year-selector-option")).toHaveLength(
        2
      );
    });
  });
});
