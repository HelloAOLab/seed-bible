import { render } from "preact";
import { act } from "preact/test-utils";
import { useClickAndHold } from "../../../../packages/scripture-map/hooks/useClickAndHold";

type Handlers = ReturnType<typeof useClickAndHold>;

describe("useClickAndHold", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.useRealTimers();
  });

  function setup(holdTime?: number) {
    const holdComplete = vi.fn();
    const holdCancel = vi.fn();
    const handlers = { current: null as unknown as Handlers };

    function TestComponent() {
      handlers.current = useClickAndHold({
        holdTime,
        holdCompleteCallback: holdComplete,
        holdCancelCallback: holdCancel,
      });
      return null;
    }

    act(() => render(<TestComponent />, container));
    return { holdComplete, holdCancel, handlers };
  }

  it("calls holdCompleteCallback after holdTime elapses", () => {
    const { holdComplete, holdCancel, handlers } = setup(500);
    const fakeEvent = {} as PointerEvent;

    act(() => handlers.current.onHoldStart(fakeEvent as any));
    expect(holdComplete).not.toHaveBeenCalled();

    act(() => void vi.advanceTimersByTime(500));

    expect(holdComplete).toHaveBeenCalledWith(fakeEvent);
    expect(holdCancel).not.toHaveBeenCalled();
  });

  it("does not call holdCompleteCallback before holdTime elapses", () => {
    const { holdComplete, handlers } = setup(500);

    act(() => handlers.current.onHoldStart({} as any));
    act(() => void vi.advanceTimersByTime(499));

    expect(holdComplete).not.toHaveBeenCalled();
  });

  it("calls holdCancelCallback when onHoldEnd fires before the timer", () => {
    const { holdComplete, holdCancel, handlers } = setup(500);
    const fakeEvent = {} as PointerEvent;

    act(() => handlers.current.onHoldStart(fakeEvent as any));
    act(() => handlers.current.onHoldEnd(fakeEvent as any));
    act(() => void vi.advanceTimersByTime(1000));

    expect(holdCancel).toHaveBeenCalledWith(fakeEvent);
    expect(holdComplete).not.toHaveBeenCalled();
  });

  it("does not call holdCancelCallback when onHoldEnd fires with no active timer", () => {
    const { holdCancel, handlers } = setup(500);

    act(() => handlers.current.onHoldEnd({} as any));

    expect(holdCancel).not.toHaveBeenCalled();
  });

  it("uses default holdTime of 1ms when not provided", () => {
    const { holdComplete, handlers } = setup();

    act(() => handlers.current.onHoldStart({} as any));
    act(() => void vi.advanceTimersByTime(1));

    expect(holdComplete).toHaveBeenCalled();
  });

  it("does not call holdCompleteCallback a second time if onHoldEnd is called after completion", () => {
    const { holdComplete, holdCancel, handlers } = setup(100);
    const fakeEvent = {} as PointerEvent;

    act(() => handlers.current.onHoldStart(fakeEvent as any));
    act(() => void vi.advanceTimersByTime(100));
    expect(holdComplete).toHaveBeenCalledTimes(1);

    act(() => handlers.current.onHoldEnd(fakeEvent as any));

    expect(holdComplete).toHaveBeenCalledTimes(1);
    expect(holdCancel).not.toHaveBeenCalled();
  });
});
