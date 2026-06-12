import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { useMicroGrid } from "todayScreen.infrastructure.presentation.hooks.useMicroGrid";

class MockResizeObserver {
  callback: () => void;
  observed: Element[] = [];
  disconnected = false;

  constructor(cb: () => void) {
    this.callback = cb;
    observers.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  disconnect() {
    this.disconnected = true;
  }
  trigger() {
    this.callback();
  }
}

let observers: MockResizeObserver[];

describe("useMicroGrid", () => {
  let container: HTMLDivElement;
  let widthDescriptor: PropertyDescriptor | undefined;
  let heightDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    observers = [];

    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      MockResizeObserver;

    // Drive offsetWidth/offsetHeight from data attributes.
    widthDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetWidth"
    );
    heightDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetHeight"
    );
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get(this: HTMLElement) {
        return Number(this.getAttribute("data-w") ?? 0);
      },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get(this: HTMLElement) {
        return Number(this.getAttribute("data-h") ?? 0);
      },
    });
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    if (widthDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        "offsetWidth",
        widthDescriptor
      );
    }
    if (heightDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        "offsetHeight",
        heightDescriptor
      );
    }
    delete (globalThis as unknown as { ResizeObserver?: unknown })
      .ResizeObserver;
    jest.clearAllMocks();
  });

  function setup(options: {
    children?: ComponentChildren;
    dependency?: unknown;
    attach?: boolean;
  }) {
    const ref = { current: null as HTMLDivElement | null };
    function TestComponent() {
      useMicroGrid(ref, options.dependency);
      return options.attach === false ? null : (
        <div ref={ref}>{options.children}</div>
      );
    }
    act(() => render(<TestComponent />, container));
    return ref;
  }

  it("does nothing when the container ref is not attached", () => {
    setup({ attach: false });
    expect(observers).toHaveLength(0);
  });

  it("snaps each child to a column/row span based on its size", () => {
    const ref = setup({
      children: [
        <div data-w="24" data-h="40" key="a" />, // spanX=2, spanY=3
        <div data-w="8" data-h="8" key="b" />, //   spanX=1, spanY=1
      ],
    });
    const children = Array.from(ref.current!.children) as HTMLElement[];
    expect(children[0]!.style.gridColumnEnd).toBe("span 2");
    expect(children[0]!.style.gridRowEnd).toBe("span 3");
    expect(children[1]!.style.gridColumnEnd).toBe("span 1");
    expect(children[1]!.style.gridRowEnd).toBe("span 1");
  });

  it("observes the container and each child", () => {
    const ref = setup({
      children: [<div data-w="8" data-h="8" key="a" />],
    });
    expect(observers).toHaveLength(1);
    // container + 1 child
    expect(observers[0]!.observed).toHaveLength(2);
    expect(observers[0]!.observed).toContain(ref.current);
  });

  it("re-applies spans when the observer fires after a size change", () => {
    const ref = setup({
      children: [<div data-w="8" data-h="8" key="a" />],
    });
    const child = ref.current!.children[0] as HTMLElement;
    expect(child.style.gridColumnEnd).toBe("span 1");

    child.setAttribute("data-w", "120"); // spanX = ceil(128/16) = 8
    act(() => observers[0]!.trigger());
    expect(child.style.gridColumnEnd).toBe("span 8");
  });

  it("does not rewrite the span when the size is unchanged", () => {
    const ref = setup({
      children: [<div data-w="24" data-h="24" key="a" />],
    });
    const child = ref.current!.children[0] as HTMLElement;
    const before = child.style.gridColumnEnd;
    // Firing again with the same size hits the no-op guard branch.
    act(() => observers[0]!.trigger());
    expect(child.style.gridColumnEnd).toBe(before);
  });

  it("disconnects the observer on unmount", () => {
    setup({ children: [<div data-w="8" data-h="8" key="a" />] });
    act(() => render(null, container));
    expect(observers[0]!.disconnected).toBe(true);
  });

  it("re-runs (new observer) when the dependency changes", () => {
    const ref = { current: null as HTMLDivElement | null };
    function Comp({ dep }: { dep: number }) {
      useMicroGrid(ref, dep);
      return (
        <div ref={ref}>
          <div data-w="8" data-h="8" />
        </div>
      );
    }
    act(() => render(<Comp dep={1} />, container));
    expect(observers).toHaveLength(1);

    act(() => render(<Comp dep={2} />, container));
    expect(observers).toHaveLength(2);
    expect(observers[0]!.disconnected).toBe(true);
  });
});
