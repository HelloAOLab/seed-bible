import type { Mock } from "vitest";
import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import {
  TodayPane,
  type TodayConfig,
} from "@packages/seed-bible/seed-bible/components/TodayPane/TodayPane";
import { TodayProvider } from "@packages/seed-bible/seed-bible/components/TodayPane/TodayContext";

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/TodayContext",
  () => ({
    TodayProvider: vi.fn(
      ({ children }: { config: unknown; children: ComponentChildren }) => (
        <div data-testid="today-provider">{children}</div>
      )
    ),
  })
);

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/TimeContext",
  () => ({
    TimeProvider: vi.fn(({ children }: { children: ComponentChildren }) => (
      <div data-testid="time-provider">{children}</div>
    )),
  })
);

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/TodayContainer",
  () => ({
    TodayContainer: vi.fn(() => <div data-testid="today-container" />),
  })
);

// The config is opaque to this component (it just forwards it), so a stub is fine.
const config = {} as unknown as TodayConfig;

describe("TodayPane", () => {
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

  function setup() {
    act(() => render(<TodayPane config={config} />, container));
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
      expect((TodayProvider as Mock).mock.calls[0]![0].config).toBe(config);
    });
  });
});
