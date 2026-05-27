import { render } from "preact";
import { act } from "preact/test-utils";
import {
  ReadingHistoryProvider,
  useReadingHistoryContext,
} from "scriptureMap.contexts.ReadingHistory.ReadingHistoryContext";
import { useReadingHistoryProvider } from "scriptureMap.contexts.ReadingHistory.useReadingHistoryProvider";

jest.mock(
  "scriptureMap.contexts.ReadingHistory.useReadingHistoryProvider",
  () => ({
    useReadingHistoryProvider: jest.fn(() => ({})),
  })
);

describe("ReadingHistoryContext", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  describe("useReadingHistoryContext", () => {
    it("throws when called outside a provider", () => {
      function TestComponent() {
        useReadingHistoryContext();
        return null;
      }

      expect(() => {
        act(() => render(<TestComponent />, container));
      }).toThrow(
        "useReadingHistoryContext must be used within a ReadingHistoryContext"
      );
    });

    it("returns the context value when called inside a provider", () => {
      const contextValue = { myAuthBotId: "user-1" };
      (useReadingHistoryProvider as jest.Mock).mockReturnValue(contextValue);

      let receivedContext: unknown;

      function Consumer() {
        receivedContext = useReadingHistoryContext();
        return null;
      }

      act(() =>
        render(
          <ReadingHistoryProvider>
            <Consumer />
          </ReadingHistoryProvider>,
          container
        )
      );

      expect(receivedContext).toBe(contextValue);
    });
  });

  describe("ReadingHistoryProvider", () => {
    it("renders its children", () => {
      act(() =>
        render(
          <ReadingHistoryProvider>
            <div data-testid="child" />
          </ReadingHistoryProvider>,
          container
        )
      );

      expect(container.querySelector("[data-testid='child']")).not.toBeNull();
    });

    it("calls useReadingHistoryProvider to obtain the context value", () => {
      act(() =>
        render(
          <ReadingHistoryProvider>
            <span />
          </ReadingHistoryProvider>,
          container
        )
      );

      expect(useReadingHistoryProvider).toHaveBeenCalledTimes(1);
    });

    it("passes the value from useReadingHistoryProvider to consumers", () => {
      const contextValue = {
        SEC_PER_MINUTE: 60,
        shouldShowReadingHistory: true,
      };
      (useReadingHistoryProvider as jest.Mock).mockReturnValue(contextValue);

      let receivedContext: unknown;

      function Consumer() {
        receivedContext = useReadingHistoryContext();
        return null;
      }

      act(() =>
        render(
          <ReadingHistoryProvider>
            <Consumer />
          </ReadingHistoryProvider>,
          container
        )
      );

      expect(receivedContext).toBe(contextValue);
    });
  });
});
