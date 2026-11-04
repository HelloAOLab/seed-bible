import { render } from "preact";
import { act } from "preact/test-utils";
import { useState } from "preact/hooks";
import { useDragReorder } from "@packages/seed-bible/seed-bible/components/useDragReorder";

const ROW_HEIGHT = 40;

function Harness(props: {
  itemCount: number;
  onReorder: (from: number, to: number) => void;
}) {
  const { getRowClassName, getHandleProps } = useDragReorder({
    itemCount: props.itemCount,
    onReorder: props.onReorder,
  });

  return (
    <ul>
      {Array.from({ length: props.itemCount }).map((_, index) => (
        <li key={index} className={"row" + getRowClassName(index)}>
          <button className="handle" {...getHandleProps(index)}>
            handle
          </button>
        </li>
      ))}
    </ul>
  );
}

describe("useDragReorder", () => {
  let container: HTMLDivElement;
  let offsetHeightSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    // jsdom doesn't lay out real geometry, so stub every row's rendered
    // height to a fixed value the drag math can divide by.
    offsetHeightSpy = vi
      .spyOn(HTMLLIElement.prototype, "offsetHeight", "get")
      .mockReturnValue(ROW_HEIGHT);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    offsetHeightSpy.mockRestore();
  });

  function handle(index: number): HTMLButtonElement {
    return container.querySelectorAll<HTMLButtonElement>(".handle")[index]!;
  }

  function row(index: number): HTMLLIElement {
    return container.querySelectorAll<HTMLLIElement>("li")[index]!;
  }

  it("moves the item forward as the pointer crosses a row boundary", () => {
    const onReorder = vi.fn();
    act(() => {
      render(<Harness itemCount={4} onReorder={onReorder} />, container);
    });

    act(() => {
      handle(0).dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerId: 1,
          clientY: 0,
        })
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 1, clientY: 45 })
      );
    });

    expect(onReorder).toHaveBeenCalledWith(0, 1);
  });

  it("moves the item backward when dragging upward", () => {
    const onReorder = vi.fn();
    act(() => {
      render(<Harness itemCount={4} onReorder={onReorder} />, container);
    });

    act(() => {
      handle(2).dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerId: 1,
          clientY: 100,
        })
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 1, clientY: 55 })
      );
    });

    expect(onReorder).toHaveBeenCalledWith(2, 1);
  });

  it("clamps the target index to the start and end of the list", () => {
    const onReorder = vi.fn();
    act(() => {
      render(<Harness itemCount={3} onReorder={onReorder} />, container);
    });

    act(() => {
      handle(0).dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerId: 1,
          clientY: 0,
        })
      );
      // Far past the end of a 3-item list.
      window.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 1, clientY: 1000 })
      );
    });

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith(0, 2);
  });

  it("moves incrementally, using the new position as the base for the next move", () => {
    const onReorder = vi.fn();
    act(() => {
      render(<Harness itemCount={5} onReorder={onReorder} />, container);
    });

    act(() => {
      handle(0).dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerId: 1,
          clientY: 0,
        })
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 1, clientY: 45 })
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 1, clientY: 90 })
      );
    });

    expect(onReorder).toHaveBeenNthCalledWith(1, 0, 1);
    expect(onReorder).toHaveBeenNthCalledWith(2, 1, 2);
  });

  it("ignores pointermove events from an unrelated pointer", () => {
    const onReorder = vi.fn();
    act(() => {
      render(<Harness itemCount={4} onReorder={onReorder} />, container);
    });

    act(() => {
      handle(0).dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerId: 1,
          clientY: 0,
        })
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 2, clientY: 45 })
      );
    });

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("stops reordering after pointerup", () => {
    const onReorder = vi.fn();
    act(() => {
      render(<Harness itemCount={4} onReorder={onReorder} />, container);
    });

    act(() => {
      handle(0).dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerId: 1,
          clientY: 0,
        })
      );
      window.dispatchEvent(
        new PointerEvent("pointerup", { pointerId: 1, clientY: 45 })
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 1, clientY: 90 })
      );
    });

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("applies the dragging class only to the row currently being dragged", () => {
    const onReorder = vi.fn();
    act(() => {
      render(<Harness itemCount={4} onReorder={onReorder} />, container);
    });

    act(() => {
      handle(1).dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerId: 1,
          clientY: 0,
        })
      );
    });

    expect(row(1).className).toContain("sb-discover-item--dragging");
    expect(row(0).className).not.toContain("sb-discover-item--dragging");

    act(() => {
      window.dispatchEvent(
        new PointerEvent("pointerup", { pointerId: 1, clientY: 0 })
      );
    });

    expect(row(1).className).not.toContain("sb-discover-item--dragging");
  });

  it("keeps the row under the pointer when the pointer moves in small steps", () => {
    const onReorder = vi.fn();
    act(() => {
      render(<Harness itemCount={5} onReorder={onReorder} />, container);
    });

    act(() => {
      handle(0).dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerId: 1,
          clientY: 0,
        })
      );
      // Half a row at a time, a row and a half in all.
      for (const clientY of [20, 40, 60]) {
        window.dispatchEvent(
          new PointerEvent("pointermove", { pointerId: 1, clientY })
        );
      }
    });

    expect(onReorder.mock.calls).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });

  it("moves a row with the arrow keys and keeps the focus on its handle", () => {
    function ListHarness() {
      const [items, setItems] = useState(["a", "b", "c"]);
      const { getHandleProps } = useDragReorder({
        itemCount: items.length,
        onReorder: (from, to) =>
          setItems((current) => {
            const next = [...current];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved!);
            return next;
          }),
      });
      return (
        <ul>
          {items.map((item, index) => (
            <li key={index}>
              <button className="handle" {...getHandleProps(index)}>
                {item}
              </button>
            </li>
          ))}
        </ul>
      );
    }
    act(() => {
      render(<ListHarness />, container);
    });
    const order = () =>
      Array.from(container.querySelectorAll(".handle")).map(
        (button) => button.textContent
      );

    handle(0).focus();
    act(() => {
      handle(0).dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
      );
    });
    expect(order()).toEqual(["b", "a", "c"]);
    expect(document.activeElement?.textContent).toBe("a");

    act(() => {
      handle(1).dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })
      );
    });
    expect(order()).toEqual(["a", "b", "c"]);
    expect(document.activeElement?.textContent).toBe("a");

    // Already first: nothing moves.
    act(() => {
      handle(0).dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })
      );
    });
    expect(order()).toEqual(["a", "b", "c"]);
  });
});
