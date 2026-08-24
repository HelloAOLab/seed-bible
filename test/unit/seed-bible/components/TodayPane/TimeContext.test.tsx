import { render } from "preact";
import { act } from "preact/test-utils";
import {
  TICK_INTERVAL_MS,
  TimeProvider,
  useTimeContext,
  type TimeContextType,
} from "@packages/seed-bible/seed-bible/components/TodayPane/TimeContext";

const T0 = 1_700_000_000_000;

describe("TimeContext", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Renders a consumer inside the provider and exposes the value it receives. */
  function setup() {
    const received = { current: null as TimeContextType | null };

    function Consumer() {
      received.current = useTimeContext();
      return null;
    }

    act(() =>
      render(
        <TimeProvider>
          <Consumer />
          <div data-testid="child" />
        </TimeProvider>,
        container
      )
    );

    return received;
  }

  it("renders its children", () => {
    setup();
    expect(container.querySelector("[data-testid='child']")).not.toBeNull();
  });

  it("provides the current time to consumers", () => {
    const received = setup();
    expect(received.current!.tick).toBe(T0);
  });

  it("advances the tick when the interval fires", () => {
    const received = setup();

    // Advancing the fake timers also advances `Date.now()`.
    act(() => void vi.advanceTimersByTime(TICK_INTERVAL_MS));

    expect(received.current!.tick).toBe(T0 + TICK_INTERVAL_MS);
  });

  it("keeps ticking on each interval", () => {
    const received = setup();

    act(() => void vi.advanceTimersByTime(TICK_INTERVAL_MS));
    expect(received.current!.tick).toBe(T0 + TICK_INTERVAL_MS);

    act(() => void vi.advanceTimersByTime(TICK_INTERVAL_MS));
    expect(received.current!.tick).toBe(T0 + TICK_INTERVAL_MS * 2);
  });

  it("does not tick before the interval elapses", () => {
    const received = setup();

    act(() => void vi.advanceTimersByTime(9999));

    expect(received.current!.tick).toBe(T0);
  });

  it("clears the interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    setup();

    act(() => render(null, container));

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("stops ticking after unmount", () => {
    const received = setup();
    act(() => render(null, container));
    const lastTick = received.current!.tick;

    vi.setSystemTime(T0 + 30000);
    act(() => void vi.advanceTimersByTime(30000));

    expect(received.current!.tick).toBe(lastTick);
  });

  it("throws when used outside of a provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    function OrphanConsumer() {
      useTimeContext();
      return null;
    }

    expect(() => act(() => render(<OrphanConsumer />, container))).toThrow(
      "useTimeContext must be used within a TimeContext"
    );

    consoleError.mockRestore();
  });
});
