import type { Mock } from "vitest";
import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { TodayPane } from "@packages/seed-bible/seed-bible/components/TodayPane/TodayPane";
import { TodayContainer } from "@packages/seed-bible/seed-bible/components/TodayPane/TodayContainer";
import { todayScreenPropsStub } from "../../testUtils/todayStubs";

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
    const props = todayScreenPropsStub();
    act(() => render(<TodayPane {...props} />, container));
    return props;
  }

  it("nests the container inside the time provider", () => {
    setup();
    const timeProvider = container.querySelector(
      "[data-testid='time-provider']"
    )!;
    expect(
      timeProvider.querySelector("[data-testid='today-container']")
    ).not.toBeNull();
  });

  // The screen's managers and handlers reach every section through the
  // container, so a dropped prop here would blank the whole tree.
  it("hands the whole screen prop bundle to the container", () => {
    const props = setup();
    expect((TodayContainer as Mock).mock.calls[0]![0]).toMatchObject(props);
  });
});
