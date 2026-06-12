import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import {
  Today,
  type TodayConfig,
} from "todayScreen.infrastructure.presentation.components.Today";
import { TodayProvider } from "todayScreen.infrastructure.presentation.contexts.today.TodayContext";

jest.mock(
  "todayScreen.infrastructure.presentation.contexts.today.TodayContext",
  () => ({
    TodayProvider: jest.fn(
      ({ children }: { config: unknown; children: ComponentChildren }) => (
        <div data-testid="today-provider">{children}</div>
      )
    ),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.contexts.time.TimeContext",
  () => ({
    TimeProvider: jest.fn(({ children }: { children: ComponentChildren }) => (
      <div data-testid="time-provider">{children}</div>
    )),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.containers.TodayContainer",
  () => ({
    TodayContainer: jest.fn(() => <div data-testid="today-container" />),
  })
);

// The config is opaque to this component (it just forwards it), so a stub is fine.
const config = {} as unknown as TodayConfig;

describe("Today", () => {
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

  function setup(customCSS?: string) {
    act(() =>
      render(<Today config={config} customCSS={customCSS} />, container)
    );
    return container;
  }

  describe("composition", () => {
    it("renders the TodayProvider", () => {
      setup();
      expect(
        container.querySelector("[data-testid='today-provider']")
      ).not.toBeNull();
    });

    it("nests the TimeProvider inside the TodayProvider", () => {
      setup();
      const provider = container.querySelector(
        "[data-testid='today-provider']"
      )!;
      expect(
        provider.querySelector("[data-testid='time-provider']")
      ).not.toBeNull();
    });

    it("nests the TodayContainer inside the TimeProvider", () => {
      setup();
      const timeProvider = container.querySelector(
        "[data-testid='time-provider']"
      )!;
      expect(
        timeProvider.querySelector("[data-testid='today-container']")
      ).not.toBeNull();
    });

    it("forwards the config to the TodayProvider", () => {
      setup();
      expect((TodayProvider as jest.Mock).mock.calls[0]![0].config).toBe(
        config
      );
    });
  });

  describe("customCSS", () => {
    it("renders a <style> tag with the provided CSS", () => {
      const css = ".today-container { color: red; }";
      setup(css);
      const style = container.querySelector("style");
      expect(style).not.toBeNull();
      expect(style!.textContent).toBe(css);
    });

    it("does not render a <style> tag when no CSS is provided", () => {
      setup();
      expect(container.querySelector("style")).toBeNull();
    });

    it("does not render a <style> tag when CSS is an empty string", () => {
      setup("");
      expect(container.querySelector("style")).toBeNull();
    });
  });
});
