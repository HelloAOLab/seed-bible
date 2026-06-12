import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useTodayContainer } from "todayScreen.infrastructure.presentation.hooks.useTodayContainer";
import { useTodayContext } from "todayScreen.infrastructure.presentation.contexts.today.TodayContext";
import { TodayContent } from "todayScreen.infrastructure.presentation.components.containers.TodayContent";
import { Welcome } from "todayScreen.infrastructure.presentation.components.containers.Welcome";

jest.mock(
  "todayScreen.infrastructure.presentation.contexts.today.TodayContext",
  () => ({
    useTodayContext: jest.fn(),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.containers.TodayContent",
  () => ({
    TodayContent: () => null,
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.containers.Welcome",
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
    jest.clearAllMocks();
  });

  function setup(options: {
    userId?: string | undefined;
    lastReading?: { bookId: string; chapter: number } | undefined;
  }) {
    (useTodayContext as jest.Mock).mockReturnValue({
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

  it("shows Welcome (safe-centered) when there is no user", () => {
    const result = setup({
      userId: undefined,
      lastReading: { bookId: "GEN", chapter: 1 },
    });
    expect(result.current.Component).toBe(Welcome);
    expect(result.current.style).toEqual({ alignItems: "safe center" });
  });

  it("shows Welcome when the user has no last reading", () => {
    const result = setup({ userId: "user-1", lastReading: undefined });
    expect(result.current.Component).toBe(Welcome);
    expect(result.current.style).toEqual({ alignItems: "safe center" });
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
