import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { todayScreenPropsStub } from "../../testUtils/todayStubs";
import { TodayContainer } from "@packages/seed-bible/seed-bible/components/TodayPane/TodayContainer";
import { useTodayContainer } from "@packages/seed-bible/seed-bible/components/TodayPane/useTodayContainer";

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/useTodayContainer",
  () => ({
    useTodayContainer: vi.fn(),
  })
);

// Both branches read context of their own, so they are stood in for here — this
// test is about which branch the container picks.
vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/TodayContent",
  () => ({
    TodayContent: () => <div data-testid="today-content" />,
  })
);

vi.mock("@packages/seed-bible/seed-bible/components/TodayPane/Welcome", () => ({
  Welcome: () => <div data-testid="welcome" />,
}));

type Result = ReturnType<typeof useTodayContainer>;

describe("TodayContainer", () => {
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

  function setup(overrides: Partial<Result> = {}) {
    (useTodayContainer as Mock).mockReturnValue({
      showWelcome: false,
      style: {},
      ...overrides,
    });
    act(() =>
      render(<TodayContainer {...todayScreenPropsStub()} />, container)
    );
  }

  const todayContainer = () =>
    container.querySelector<HTMLDivElement>(".today-container");

  it("renders the today-container element", () => {
    setup();
    expect(todayContainer()).not.toBeNull();
  });

  it("renders Welcome (and not the personalized layout) when asked to", () => {
    setup({ showWelcome: true });
    expect(
      todayContainer()!.querySelector("[data-testid='welcome']")
    ).not.toBeNull();
    expect(
      todayContainer()!.querySelector("[data-testid='today-content']")
    ).toBeNull();
  });

  it("renders the personalized layout otherwise", () => {
    setup({ showWelcome: false });
    expect(
      todayContainer()!.querySelector("[data-testid='today-content']")
    ).not.toBeNull();
    expect(
      todayContainer()!.querySelector("[data-testid='welcome']")
    ).toBeNull();
  });

  it("applies the style from the hook to the container", () => {
    setup({ style: { paddingBottom: "40px" } });
    expect(todayContainer()!.style.paddingBottom).toBe("40px");
  });

  it("applies no inline style props when the hook returns an empty style", () => {
    setup({ style: {} });
    expect(todayContainer()!.style.paddingBottom).toBe("");
  });
});
