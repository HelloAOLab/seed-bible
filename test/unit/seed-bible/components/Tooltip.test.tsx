import { render } from "preact";
import { act } from "preact/test-utils";
import {
  Tooltip,
  type TooltipProps,
} from "@packages/seed-bible/seed-bible/components/Tooltip/Tooltip";

describe("Tooltip", () => {
  let container: HTMLDivElement;

  /**
   * jsdom reports every element as 0x0, so the flip-and-clamp arithmetic has
   * nothing to work with until the tooltip's own box is faked.
   */
  function mockTooltipBox(width: number, height: number) {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    mockTooltipBox(100, 20);
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
    });
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.restoreAllMocks();
  });

  function props(overrides: Partial<TooltipProps> = {}): TooltipProps {
    return {
      children: "Aug 19, 2026",
      anchor: { x: 512, y: 200, width: 10, height: 30 },
      ...overrides,
    };
  }

  function setup(overrides: Partial<TooltipProps> = {}) {
    act(() => render(<Tooltip {...props(overrides)} />, container));
    return tooltip();
  }

  // The tooltip portals into document.body, so it is never inside `container`.
  function tooltip() {
    const el = document.body.querySelector<HTMLSpanElement>(".sb-tooltip");
    if (!el) throw new Error("tooltip was not rendered");
    return el;
  }

  describe("content", () => {
    it("renders its children, in order", () => {
      const el = setup({ children: ["Aug 19, 2026", "12 minutes"] });

      expect(el.textContent).toBe("Aug 19, 2026" + "12 minutes");
    });

    it("renders element children, not just text", () => {
      // Scripture Map fills this slot with its own content components.
      const el = setup({
        children: <span className="content-probe">rich</span>,
      });

      expect(el.querySelector(".content-probe")!.textContent).toBe("rich");
    });

    it("renders into document.body rather than the parent container", () => {
      setup();

      expect(container.querySelector(".sb-tooltip")).toBeNull();
      expect(document.body.querySelector(".sb-tooltip")).not.toBeNull();
    });
  });

  describe("vertical placement", () => {
    it("sits above the anchor when the tooltip fits there", () => {
      // 200 - 20 (tooltip height) - 8 (edge gap) = 172, so there is room.
      const el = setup({ anchor: { x: 512, y: 200, width: 10, height: 30 } });

      expect(el.className).toBe("sb-tooltip sb-tooltip-up");
      expect(el.style.top).toBe("200px");
    });

    it("flips below the anchor when it would overflow the top edge", () => {
      // 10 - 20 - 8 = -18, so it cannot sit above; it drops by anchor.height.
      const el = setup({ anchor: { x: 512, y: 10, width: 10, height: 30 } });

      expect(el.className).toBe("sb-tooltip sb-tooltip-down");
      expect(el.style.top).toBe("40px");
    });

    it("lifts by offsetY when placed above", () => {
      const el = setup({
        anchor: { x: 512, y: 200, width: 10, height: 30 },
        offsetY: 12,
      });

      expect(el.style.top).toBe("188px");
    });

    it("drops by offsetY when placed below", () => {
      const el = setup({
        anchor: { x: 512, y: 10, width: 10, height: 30 },
        offsetY: 12,
      });

      expect(el.style.top).toBe("52px");
    });
  });

  describe("horizontal clamping", () => {
    it("centres on the anchor when it fits within the viewport", () => {
      const el = setup({ anchor: { x: 512, y: 200, width: 10, height: 30 } });

      expect(el.style.left).toBe("512px");
      expect(el.style.getPropertyValue("--arrowLeft")).toBe("50%");
    });

    it("pushes right off the left edge and walks the arrow back", () => {
      // Half of 100 is 50, so an anchor at 10 would put the left edge at -40.
      const el = setup({ anchor: { x: 10, y: 200, width: 10, height: 30 } });

      expect(el.style.left).toBe("50px");
      // Moved 40px right of the anchor, which is 40% of the tooltip's width.
      expect(el.style.getPropertyValue("--arrowLeft")).toBe("10%");
    });

    it("pulls back from the right edge and walks the arrow back", () => {
      // An anchor at 1000 would put the right edge at 1050, past the 1024 wide
      // viewport, so the body lands at 974 — 26px left of the anchor.
      const el = setup({ anchor: { x: 1000, y: 200, width: 10, height: 30 } });

      expect(el.style.left).toBe("974px");
      expect(el.style.getPropertyValue("--arrowLeft")).toBe("76%");
    });
  });

  describe("reacting to a moved anchor", () => {
    it("repositions when the anchor changes", () => {
      setup({ anchor: { x: 512, y: 200, width: 10, height: 30 } });

      act(() =>
        render(
          <Tooltip
            {...props({ anchor: { x: 300, y: 15, width: 10, height: 30 } })}
          />,
          container
        )
      );

      const el = tooltip();
      expect(el.style.left).toBe("300px");
      expect(el.style.top).toBe("45px");
      expect(el.className).toBe("sb-tooltip sb-tooltip-down");
    });
  });
});
