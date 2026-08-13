import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useTodayContainer } from "../../../../../../packages/seed-bible/seed-bible/components/TodayPane/useTodayContainer";
import { useTodayContext } from "../../../../../../packages/seed-bible/seed-bible/components/TodayPane/TodayContext";
import { TodayContent } from "../../../../../../packages/seed-bible/seed-bible/components/TodayPane/TodayContent";
import { Welcome } from "../../../../../../packages/seed-bible/seed-bible/components/TodayPane/Welcome";

vi.mock(
  "../../../../../../packages/seed-bible/seed-bible/components/TodayPane/TodayContext",
  () => ({
    useTodayContext: vi.fn(),
  })
);

vi.mock(
  "../../../../../../packages/seed-bible/seed-bible/components/TodayPane/TodayContent",
  () => ({
    TodayContent: () => null,
  })
);

vi.mock(
  "../../../../../../packages/seed-bible/seed-bible/components/TodayPane/Welcome",
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
    (useTodayContext as Mock).mockReturnValue({ readingHistory });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useTodayContainer();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  it("shows Welcome (safe-centered) when history is empty", () => {
    const result = setup({ status: "empty" });
    expect(result.current.Component).toBe(Welcome);
    expect(result.current.style).toEqual({ alignItems: "safe center" });
  });

  it("shows TodayContent (top-aligned) while history is loading", () => {
    const result = setup({ status: "loading" });
    expect(result.current.Component).toBe(TodayContent);
    expect(result.current.style).toEqual({ alignItems: "flex-start" });
  });

  it("shows TodayContent (top-aligned) when history is ready", () => {
    const result = setup({
      status: "ready",
      lastReading: { bookId: "JHN", chapter: 3 },
    });
    expect(result.current.Component).toBe(TodayContent);
    expect(result.current.style).toEqual({ alignItems: "flex-start" });
  });
});
