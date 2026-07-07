import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import {
  TimeProvider,
  useTimeContext,
} from "../../../../packages/scripture-map/contexts/Time/TimeContext";
import { useTimeProvider } from "../../../../packages/scripture-map/contexts/Time/useTimeProvider";

vi.mock(
  "../../../../packages/scripture-map/contexts/Time/useTimeProvider",
  () => ({
    useTimeProvider: vi.fn(() => ({ tick: 0 })),
  })
);

describe("TimeContext", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  describe("useTimeContext", () => {
    it("throws when called outside a provider", () => {
      function TestComponent() {
        useTimeContext();
        return null;
      }

      expect(() => {
        act(() => render(<TestComponent />, container));
      }).toThrow("useTimeContext must be used within a TimeContext");
    });

    it("returns the context value when called inside a provider", () => {
      const contextValue = { tick: 42 };
      (useTimeProvider as Mock).mockReturnValue(contextValue);

      let receivedContext: unknown;

      function Consumer() {
        receivedContext = useTimeContext();
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

      expect(receivedContext).toBe(contextValue);
    });
  });

  describe("TimeProvider", () => {
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

    it("calls useTimeProvider to obtain the context value", () => {
      act(() =>
        render(
          <TimeProvider>
            <span />
          </TimeProvider>,
          container
        )
      );

      expect(useTimeProvider).toHaveBeenCalledTimes(1);
    });

    it("passes the value from useTimeProvider to consumers", () => {
      const contextValue = { tick: 7 };
      (useTimeProvider as Mock).mockReturnValue(contextValue);

      let receivedContext: unknown;

      function Consumer() {
        receivedContext = useTimeContext();
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

      expect(receivedContext).toBe(contextValue);
    });
  });
});
