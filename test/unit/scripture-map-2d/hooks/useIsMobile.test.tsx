import { render } from "preact";
import { act } from "preact/test-utils";
import { useIsMobile } from "scriptureMap2D.hooks.useIsMobile";

type MediaQueryListener = (e: MediaQueryListEvent) => void;

function mockMatchMedia(initialMatches: boolean) {
  const listeners: MediaQueryListener[] = [];
  const mql = {
    matches: initialMatches,
    addEventListener: jest.fn((_: string, listener: MediaQueryListener) => {
      listeners.push(listener);
    }),
    removeEventListener: jest.fn(),
  };
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn(() => mql),
  });
  return {
    mql,
    triggerChange: (matches: boolean) => {
      listeners.forEach((l) => l({ matches } as MediaQueryListEvent));
    },
  };
}

describe("useIsMobile", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function setup(breakpoint = 768) {
    const result = { current: false };

    function TestComponent() {
      result.current = useIsMobile(breakpoint);
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("returns false when matchMedia does not match initially", () => {
    mockMatchMedia(false);
    const result = setup();
    expect(result.current).toBe(false);
  });

  it("returns true when matchMedia matches initially", () => {
    mockMatchMedia(true);
    const result = setup();
    expect(result.current).toBe(true);
  });

  it("updates to true when the media query fires a match", () => {
    const { triggerChange } = mockMatchMedia(false);
    const result = setup();

    act(() => triggerChange(true));

    expect(result.current).toBe(true);
  });

  it("updates to false when the media query fires a non-match", () => {
    const { triggerChange } = mockMatchMedia(true);
    const result = setup();

    act(() => triggerChange(false));

    expect(result.current).toBe(false);
  });

  it("calls matchMedia with the correct breakpoint query", () => {
    mockMatchMedia(false);
    setup(480);

    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 480px)");
  });

  it("defaults to 768px breakpoint", () => {
    mockMatchMedia(false);
    setup();

    expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 768px)");
  });

  it("removes the media query listener on unmount", () => {
    const { mql } = mockMatchMedia(false);
    setup();

    act(() => render(null, container));

    expect(mql.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });
});
