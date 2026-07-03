import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import {
  TimeProvider,
  useTimeContext,
  type TimeContextType,
} from "../../../../../../../packages/today-screen/infrastructure/presentation/contexts/time/TimeContext";
import { useTimeProvider } from "../../../../../../../packages/today-screen/infrastructure/presentation/contexts/time/useTimeProvider";

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/contexts/time/useTimeProvider",
  () => ({
    useTimeProvider: vi.fn(),
  })
);

describe("TimeContext", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useTimeProvider as Mock).mockReturnValue({ tick: 0 });
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  it("provides the value from useTimeProvider to consumers", () => {
    const value: TimeContextType = { tick: 7 };
    (useTimeProvider as Mock).mockReturnValue(value);
    const captured = { current: null as TimeContextType | null };

    function Consumer() {
      captured.current = useTimeContext();
      return null;
    }

    act(() =>
      render(
        <TimeProvider>
          <Consumer />
        </TimeProvider>,
        container
      )
    );

    expect(captured.current).toBe(value);
    expect(captured.current!.tick).toBe(7);
  });

  it("renders its children", () => {
    act(() =>
      render(
        <TimeProvider>
          <div data-testid="child" />
        </TimeProvider>,
        container
      )
    );

    expect(container.querySelector("[data-testid='child']")).not.toBeNull();
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
