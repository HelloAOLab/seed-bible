import { render } from "preact";
import { act } from "preact/test-utils";
import { useTimeProvider } from "todayScreen.infrastructure.presentation.contexts.time.useTimeProvider";

const T0 = 1_700_000_000_000;

describe("useTimeProvider", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    jest.useFakeTimers();
    jest.setSystemTime(T0);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  type ProviderResult = ReturnType<typeof useTimeProvider>;

  function setup() {
    const result = { current: null as unknown as ProviderResult };
    function TestComponent() {
      result.current = useTimeProvider();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  it("initializes tick to the current time", () => {
    const result = setup();
    expect(result.current.tick).toBe(T0);
  });

  it("updates tick when the interval fires", () => {
    const result = setup();
    // Advancing the fake timers also advances Date.now().
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(result.current.tick).toBe(T0 + 10000);
  });

  it("keeps ticking on each interval", () => {
    const result = setup();

    act(() => jest.advanceTimersByTime(10000));
    expect(result.current.tick).toBe(T0 + 10000);

    act(() => jest.advanceTimersByTime(10000));
    expect(result.current.tick).toBe(T0 + 20000);
  });

  it("does not update before the interval elapses", () => {
    const result = setup();
    act(() => jest.advanceTimersByTime(9999));
    expect(result.current.tick).toBe(T0);
  });

  it("clears the interval on unmount", () => {
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");
    setup();
    act(() => render(null, container));
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("stops updating tick after unmount", () => {
    const result = setup();
    act(() => render(null, container));
    const lastTick = result.current.tick;

    jest.setSystemTime(T0 + 30000);
    act(() => jest.advanceTimersByTime(30000));

    expect(result.current.tick).toBe(lastTick);
  });
});
