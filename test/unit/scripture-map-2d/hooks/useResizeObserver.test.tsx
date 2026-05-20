import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import { useResizeObserver } from "scriptureMap2D.hooks.useResizeObserver";

type ResizeObserverSize = { width: number; height: number };

describe("useResizeObserver", () => {
  let container: HTMLDivElement;
  let lastObserverCallback: ResizeObserverCallback;
  let observeSpy: jest.Mock;
  let disconnectSpy: jest.Mock;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    observeSpy = jest.fn();
    disconnectSpy = jest.fn();

    global.ResizeObserver = jest.fn((callback: ResizeObserverCallback) => {
      lastObserverCallback = callback;
      return { observe: observeSpy, disconnect: disconnectSpy };
    }) as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function setup() {
    const ref = createRef<HTMLElement>();
    const size = { current: { width: 0, height: 0 } as ResizeObserverSize };

    function TestComponent() {
      size.current = useResizeObserver(ref);
      return <div ref={ref} />;
    }

    act(() => render(<TestComponent />, container));

    function triggerResize(width: number, height: number) {
      act(() => {
        lastObserverCallback(
          [{ contentRect: { width, height } }] as ResizeObserverEntry[],
          {} as ResizeObserver
        );
      });
    }

    return { size, triggerResize };
  }

  it("returns { width: 0, height: 0 } as the initial size", () => {
    const { size } = setup();
    expect(size.current).toEqual({ width: 0, height: 0 });
  });

  it("updates the size when ResizeObserver fires", () => {
    const { size, triggerResize } = setup();

    triggerResize(320, 240);

    expect(size.current).toEqual({ width: 320, height: 240 });
  });

  it("reflects the latest size after multiple resize events", () => {
    const { size, triggerResize } = setup();

    triggerResize(100, 50);
    expect(size.current).toEqual({ width: 100, height: 50 });

    triggerResize(800, 600);
    expect(size.current).toEqual({ width: 800, height: 600 });
  });

  it("calls observe on the ref element after mounting", () => {
    setup();
    expect(observeSpy).toHaveBeenCalledTimes(1);
  });

  it("calls disconnect when the component unmounts", () => {
    setup();

    act(() => render(null, container));

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it("does not call observe when ref has no element", () => {
    const result = { current: { width: 0, height: 0 } as ResizeObserverSize };

    function TestComponent() {
      const ref = createRef<HTMLElement>();
      result.current = useResizeObserver(ref);
      return null;
    }

    act(() => render(<TestComponent />, container));

    expect(observeSpy).not.toHaveBeenCalled();
  });
});
