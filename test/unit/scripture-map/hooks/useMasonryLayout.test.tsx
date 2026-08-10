import { render } from "preact";
import { act } from "preact/test-utils";
import { useRef } from "preact/hooks";
import {
  clearContainerStyles,
  clearItemStyles,
  computeColumnCount,
  computeMasonryPositions,
  useMasonryLayout,
} from "../../../../packages/scripture-map/hooks/useMasonryLayout";

describe("computeColumnCount", () => {
  it("returns 1 when the container is narrower than one column", () => {
    expect(computeColumnCount(100, 180, 12)).toBe(1);
  });

  it("fits as many columns as width allows", () => {
    // 180 + 12 + 180 = 372 → 2 columns; 180*3 + 12*2 = 564 → 3
    expect(computeColumnCount(400, 180, 12)).toBe(2);
    expect(computeColumnCount(564, 180, 12)).toBe(3);
    expect(computeColumnCount(750, 180, 12)).toBe(3);
  });

  it("returns 1 for non-positive column width", () => {
    expect(computeColumnCount(800, 0, 12)).toBe(1);
    expect(computeColumnCount(800, -10, 12)).toBe(1);
  });
});

describe("computeMasonryPositions", () => {
  it("assigns items round-robin so left-to-right order is preserved", () => {
    const heights = [100, 80, 60, 40, 50, 70];
    const { positions } = computeMasonryPositions(heights, 180, 12, 3);

    // Top row: items 0,1,2 in columns 0,1,2
    expect(positions[0]).toEqual({ left: 0, top: 0, width: 180 });
    expect(positions[1]).toEqual({ left: 192, top: 0, width: 180 });
    expect(positions[2]).toEqual({ left: 384, top: 0, width: 180 });

    // Second row: items 3,4,5 under columns 0,1,2
    expect(positions[3]).toEqual({ left: 0, top: 112, width: 180 }); // 100+12
    expect(positions[4]).toEqual({ left: 192, top: 92, width: 180 }); // 80+12
    expect(positions[5]).toEqual({ left: 384, top: 72, width: 180 }); // 60+12
  });

  it("sets container height to the tallest column without trailing gap", () => {
    const { containerHeight } = computeMasonryPositions(
      [100, 50, 50],
      180,
      12,
      3
    );
    expect(containerHeight).toBe(100);
  });

  it("stacks a single column when columnCount is 1", () => {
    const { positions, containerHeight } = computeMasonryPositions(
      [40, 50, 60],
      180,
      12,
      1
    );
    expect(positions.map((p) => p.left)).toEqual([0, 0, 0]);
    expect(positions.map((p) => p.top)).toEqual([0, 52, 114]);
    expect(containerHeight).toBe(40 + 12 + 50 + 12 + 60);
  });
});

describe("clearItemStyles / clearContainerStyles", () => {
  it("clears inline styles applied by the layout", () => {
    const item = document.createElement("div");
    item.style.position = "absolute";
    item.style.left = "10px";
    item.style.top = "20px";
    item.style.width = "180px";

    const container = document.createElement("div");
    container.style.height = "400px";

    clearItemStyles(item);
    clearContainerStyles(container);

    expect(item.style.position).toBe("");
    expect(item.style.left).toBe("");
    expect(item.style.top).toBe("");
    expect(item.style.width).toBe("");
    expect(container.style.height).toBe("");
  });
});

describe("useMasonryLayout", () => {
  let host: HTMLDivElement;
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    originalResizeObserver = globalThis.ResizeObserver;
    // Force the no-ResizeObserver path so layout runs synchronously.
    // @ts-expect-error -- deleting for the test
    delete globalThis.ResizeObserver;
  });

  afterEach(() => {
    act(() => render(null, host));
    host.remove();
    if (originalResizeObserver) {
      globalThis.ResizeObserver = originalResizeObserver;
    } else {
      // @ts-expect-error -- restore absence
      delete globalThis.ResizeObserver;
    }
  });

  it("positions books in round-robin columns and clears styles on unmount", () => {
    let containerEl: HTMLDivElement | null = null;
    const bookWidth = 180;
    const bookHeight = 80;
    const gap = 12;

    function Test() {
      const ref = useRef<HTMLDivElement>(null);
      useMasonryLayout(ref, true);
      return (
        <div
          ref={(node) => {
            ref.current = node;
            containerEl = node;
            if (node) {
              Object.defineProperty(node, "clientWidth", {
                configurable: true,
                get: () => 600,
              });
            }
          }}
          style={{ "--scale-factor": "1" } as React.CSSProperties}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              data-testid={`book-${i}`}
              ref={(el) => {
                if (!el) return;
                Object.defineProperty(el, "offsetWidth", {
                  configurable: true,
                  get: () => bookWidth,
                });
                Object.defineProperty(el, "offsetHeight", {
                  configurable: true,
                  get: () => bookHeight,
                });
              }}
            />
          ))}
        </div>
      );
    }

    act(() => render(<Test />, host));

    const books = [0, 1, 2, 3].map(
      (i) => host.querySelector(`[data-testid="book-${i}"]`) as HTMLElement
    );

    // 600px fits 3 columns: 180*3 + 12*2 = 564
    expect(books[0]!.style.left).toBe("0px");
    expect(books[1]!.style.left).toBe(`${bookWidth + gap}px`);
    expect(books[2]!.style.left).toBe(`${2 * (bookWidth + gap)}px`);
    expect(books[3]!.style.left).toBe("0px");
    expect(books[3]!.style.top).toBe(`${bookHeight + gap}px`);

    for (const book of books) {
      expect(book!.style.position).toBe("absolute");
      expect(book!.style.width).toBe(`${bookWidth}px`);
    }

    expect(containerEl!.style.height).not.toBe("");

    const laidOutContainer = containerEl!;
    act(() => render(null, host));

    for (const book of books) {
      expect(book!.style.position).toBe("");
      expect(book!.style.left).toBe("");
      expect(book!.style.top).toBe("");
      expect(book!.style.width).toBe("");
    }
    expect(laidOutContainer.style.height).toBe("");
  });
});
