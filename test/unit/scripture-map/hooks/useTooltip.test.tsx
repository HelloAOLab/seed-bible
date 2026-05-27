import { render } from "preact";
import { act } from "preact/test-utils";
import { useTooltip } from "scriptureMap.hooks.useTooltip";

describe("useTooltip", () => {
  let container: HTMLDivElement;

  function mockRect(overrides: Partial<DOMRect> = {}) {
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...overrides,
    } as DOMRect);
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    mockRect();
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    jest.restoreAllMocks();
  });

  function setup(
    anchor: { x: number; y: number; height: number; width: number },
    offsetY: number
  ) {
    const result = {
      current: null as unknown as ReturnType<typeof useTooltip>,
    };

    function TestComponent() {
      result.current = useTooltip({ anchor, offsetY });
      return <span ref={result.current.tooltipRef} />;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("tooltipClass is 'tooltip tooltip-up' when there is enough space above", () => {
    const result = setup({ x: 200, y: 100, height: 0, width: 0 }, 10);
    // With height=0: anchor.y - 0 - 8 = 92 > 0, stays up
    expect(result.current.tooltipClass).toBe("tooltip tooltip-up");
  });

  it("tooltipClass becomes 'tooltip tooltip-down' when anchor.y is near the top", () => {
    const result = setup({ x: 200, y: 5, height: 0, width: 0 }, 10);
    // With height=0: anchor.y - 0 - 8 = -3 < 0, flips to down
    expect(result.current.tooltipClass).toBe("tooltip tooltip-down");
  });

  it("tooltipClass stays up even with tall tooltip when there is room above", () => {
    mockRect({ width: 0, height: 10 });
    const result = setup({ x: 200, y: 100, height: 0, width: 0 }, 10);
    // anchor.y - 10 - 8 = 82 > 0, stays up
    expect(result.current.tooltipClass).toBe("tooltip tooltip-up");
  });

  it("tooltipClass flips to down when tooltip height does not fit above anchor", () => {
    mockRect({ width: 0, height: 80 });
    const result = setup({ x: 200, y: 50, height: 0, width: 0 }, 10);
    // anchor.y - 80 - 8 = -38 < 0, flips to down
    expect(result.current.tooltipClass).toBe("tooltip tooltip-down");
  });

  it("style initially includes the anchor position", () => {
    // After the layout effect with zero-dimension rect and sufficient y, the
    // style reflects the computed top/left based on anchor.
    const result = setup({ x: 300, y: 100, width: 0, height: 0 }, 10);
    expect(result.current.style.left).toBe(300);
  });

  it("style --arrowLeft defaults to 50% when no horizontal clamping is needed", () => {
    const result = setup({ x: 512, y: 100, width: 0, height: 0 }, 10);
    expect(result.current.style["--arrowLeft"]).toBe("50%");
  });
});
