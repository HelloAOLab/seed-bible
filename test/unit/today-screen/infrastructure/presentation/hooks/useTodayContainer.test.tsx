import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useTodayContainer } from "../../../../../../packages/today-screen/infrastructure/presentation/hooks/useTodayContainer";
import { useTodayContext } from "../../../../../../packages/today-screen/infrastructure/presentation/contexts/today/TodayContext";
import { TodayContent } from "../../../../../../packages/today-screen/infrastructure/presentation/components/containers/TodayContent";
import { Welcome } from "../../../../../../packages/today-screen/infrastructure/presentation/components/containers/Welcome";

vi.mock(
  "../../../../../../packages/today-screen/infrastructure/presentation/contexts/today/TodayContext",
  () => ({
    useTodayContext: vi.fn(),
  })
);

vi.mock(
  "../../../../../../packages/today-screen/infrastructure/presentation/components/containers/TodayContent",
  () => ({
    TodayContent: () => null,
  })
);

vi.mock(
  "../../../../../../packages/today-screen/infrastructure/presentation/components/containers/Welcome",
  () => ({
    Welcome: () => null,
  })
);

type Result = ReturnType<typeof useTodayContainer>;

describe("useTodayContainer", () => {
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

  function setup(options: {
    userId?: string | undefined;
    lastReading?: { bookId: string; chapter: number } | undefined;
  }) {
    (useTodayContext as Mock).mockReturnValue({
      userId: options.userId,
      userLastReading: signal(options.lastReading),
    });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useTodayContainer();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  it("shows Welcome (safe-centered) when there is neither user nor last reading", () => {
    const result = setup({ userId: undefined, lastReading: undefined });
    expect(result.current.Component).toBe(Welcome);
    expect(result.current.style).toEqual({ alignItems: "safe center" });
  });

  it("shows TodayContent when there is no user but there is a last reading", () => {
    const result = setup({
      userId: undefined,
      lastReading: { bookId: "GEN", chapter: 1 },
    });
    expect(result.current.Component).toBe(TodayContent);
    expect(result.current.style).toEqual({ alignItems: "flex-start" });
  });

  it("shows TodayContent when the user has no last reading yet", () => {
    const result = setup({ userId: "user-1", lastReading: undefined });
    expect(result.current.Component).toBe(TodayContent);
    expect(result.current.style).toEqual({ alignItems: "flex-start" });
  });

  it("shows TodayContent (top-aligned) when the user has a last reading", () => {
    const result = setup({
      userId: "user-1",
      lastReading: { bookId: "JHN", chapter: 3 },
    });
    expect(result.current.Component).toBe(TodayContent);
    expect(result.current.style).toEqual({ alignItems: "flex-start" });
  });
});
