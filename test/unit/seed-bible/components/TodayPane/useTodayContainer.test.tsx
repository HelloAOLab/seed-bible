import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useTodayContainer } from "@packages/seed-bible/seed-bible/components/TodayPane/useTodayContainer";
import { todayStub } from "../../testUtils/todayStubs";

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
    status: "loading" | "empty" | "ready";
    lastReading?: { bookId: string; chapter: number };
  }) {
    const readingHistory =
      options.status === "ready"
        ? signal({
            status: "ready" as const,
            lastReading: options.lastReading ?? { bookId: "JHN", chapter: 3 },
          })
        : signal({ status: options.status });
    const today = todayStub({ readingHistory });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useTodayContainer(today);
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  it("shows Welcome (safe-centered) when history is empty", () => {
    const result = setup({ status: "empty" });
    expect(result.current.showWelcome).toBe(true);
    expect(result.current.style).toEqual({ alignItems: "safe center" });
  });

  it("shows TodayContent (top-aligned) while history is loading", () => {
    const result = setup({ status: "loading" });
    expect(result.current.showWelcome).toBe(false);
    expect(result.current.style).toEqual({ alignItems: "flex-start" });
  });

  it("shows TodayContent (top-aligned) when history is ready", () => {
    const result = setup({
      status: "ready",
      lastReading: { bookId: "JHN", chapter: 3 },
    });
    expect(result.current.showWelcome).toBe(false);
    expect(result.current.style).toEqual({ alignItems: "flex-start" });
  });
});
