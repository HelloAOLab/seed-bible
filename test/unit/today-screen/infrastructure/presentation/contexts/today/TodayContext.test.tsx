import { render } from "preact";
import { act } from "preact/test-utils";
import {
  TodayProvider,
  useTodayContext,
  type TodayContextType,
} from "todayScreen.infrastructure.presentation.contexts.today.TodayContext";
import { useTodayProvider } from "todayScreen.infrastructure.presentation.contexts.today.useTodayProvider";
import type { TodayConfig } from "todayScreen.infrastructure.presentation.components.Today";

jest.mock(
  "todayScreen.infrastructure.presentation.contexts.today.useTodayProvider",
  () => ({
    // Echoes the config so the provided context value is observable.
    useTodayProvider: jest.fn((config) => config),
  })
);

const config = { language: "en" } as unknown as TodayConfig;

describe("TodayContext", () => {
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

  it("derives the context value from useTodayProvider(config) and provides it", () => {
    const captured = { current: null as TodayContextType | null };

    function Consumer() {
      captured.current = useTodayContext();
      return null;
    }

    act(() =>
      render(
        <TodayProvider config={config}>
          <Consumer />
        </TodayProvider>,
        container
      )
    );

    expect(useTodayProvider as jest.Mock).toHaveBeenCalledWith(config);
    expect(captured.current).toBe(config);
  });

  it("renders its children", () => {
    act(() =>
      render(
        <TodayProvider config={config}>
          <div data-testid="child" />
        </TodayProvider>,
        container
      )
    );

    expect(container.querySelector("[data-testid='child']")).not.toBeNull();
  });

  it("throws when used outside of a provider", () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    function OrphanConsumer() {
      useTodayContext();
      return null;
    }

    expect(() => act(() => render(<OrphanConsumer />, container))).toThrow(
      "useTodayContext must be used within a ScriptureMapContext"
    );

    consoleError.mockRestore();
  });
});
