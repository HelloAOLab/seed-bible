import { render } from "preact";
import { act } from "preact/test-utils";
import { useTimeProvider } from "scriptureMap.contexts.Time.useTimeProvider";

describe("useTimeProvider", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    jest.useRealTimers();
  });

  function setup() {
    const result = {
      current: null as unknown as ReturnType<typeof useTimeProvider>,
    };

    function TestComponent() {
      result.current = useTimeProvider();
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("tick is initialized to Date.now()", () => {
    const startTime = 1716134400000;
    jest.setSystemTime(startTime);
    const result = setup();
    expect(result.current.tick).toBe(startTime);
  });

  it("tick updates after the 10-second interval fires", () => {
    const startTime = 1716134400000;
    jest.setSystemTime(startTime);
    const result = setup();
    act(() => jest.advanceTimersByTime(10000));
    expect(result.current.tick).toBe(startTime + 10000);
  });

  it("tick does not update before the interval fires", () => {
    const startTime = 1716134400000;
    jest.setSystemTime(startTime);
    const result = setup();
    act(() => jest.advanceTimersByTime(9999));
    expect(result.current.tick).toBe(startTime);
  });

  it("calls setInterval with 10000ms", () => {
    const spy = jest.spyOn(globalThis, "setInterval");
    setup();
    expect(spy).toHaveBeenCalledWith(expect.any(Function), 10000);
    spy.mockRestore();
  });

  it("clears the interval on unmount", () => {
    const spy = jest.spyOn(globalThis, "clearInterval");
    setup();
    act(() => render(null, container));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("tick advances on each consecutive interval", () => {
    const startTime = 1716134400000;
    jest.setSystemTime(startTime);
    const result = setup();
    act(() => jest.advanceTimersByTime(10000));
    expect(result.current.tick).toBe(startTime + 10000);
    act(() => jest.advanceTimersByTime(10000));
    expect(result.current.tick).toBe(startTime + 20000);
  });
});
