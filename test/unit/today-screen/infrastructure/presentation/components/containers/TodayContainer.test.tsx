import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { TodayContainer } from "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/TodayContainer";
import { useTodayContainer } from "../../../../../../../packages/today-screen/infrastructure/presentation/hooks/useTodayContainer";

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/hooks/useTodayContainer",
  () => ({
    useTodayContainer: vi.fn(),
  })
);

type Result = ReturnType<typeof useTodayContainer>;

function setupResult(overrides: Partial<Result> = {}): Result {
  return {
    Component: () => <div data-testid="inner" />,
    style: {},
    ...overrides,
  } as unknown as Result;
}

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
    (useTodayContainer as Mock).mockReturnValue(setupResult(overrides));
    act(() => render(<TodayContainer />, container));
  }

  const todayContainer = () =>
    container.querySelector<HTMLDivElement>(".today-container");

  it("renders the today-container element", () => {
    setup();
    expect(todayContainer()).not.toBeNull();
  });

  it("renders the resolved Component inside the container", () => {
    setup({ Component: () => <div data-testid="custom-screen" /> });
    expect(
      todayContainer()!.querySelector("[data-testid='custom-screen']")
    ).not.toBeNull();
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
