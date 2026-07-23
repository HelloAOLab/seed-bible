import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useTodayContent } from "../../../../../../packages/today-screen/infrastructure/presentation/hooks/useTodayContent";
import { useTodayContext } from "../../../../../../packages/today-screen/infrastructure/presentation/contexts/today/TodayContext";

vi.mock(
  "../../../../../../packages/today-screen/infrastructure/presentation/contexts/today/TodayContext",
  () => ({
    useTodayContext: vi.fn(),
  })
);

type Result = ReturnType<typeof useTodayContent>;

describe("useTodayContent", () => {
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
    status?: "loading" | "empty" | "ready";
    bookmarks?: unknown[];
  }) {
    const status = options.status ?? "ready";
    const readingHistory =
      status === "ready"
        ? signal({
            status: "ready" as const,
            lastReading: { bookId: "GEN", chapter: 1 },
          })
        : signal({ status });
    (useTodayContext as Mock).mockReturnValue({
      readingHistory,
      bookmarks: signal(options.bookmarks ?? []),
    });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useTodayContent();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  describe("showResumeReading", () => {
    it("is true when history is ready", () => {
      const result = setup({ status: "ready" });
      expect(result.current.showResumeReading).toBe(true);
    });

    it("is true (placeholder) while history is loading", () => {
      const result = setup({ status: "loading" });
      expect(result.current.showResumeReading).toBe(true);
    });

    it("is false when history is empty", () => {
      const result = setup({ status: "empty" });
      expect(result.current.showResumeReading).toBe(false);
    });
  });

  describe("showBookmarks", () => {
    it("is true when there are bookmarks", () => {
      const result = setup({ bookmarks: [{ id: "b1" }] });
      expect(result.current.showBookmarks).toBe(true);
    });

    it("is false when there are none", () => {
      const result = setup({ bookmarks: [] });
      expect(result.current.showBookmarks).toBe(false);
    });
  });

  describe("dividedSectionsIds", () => {
    it("lists the standalone sections (bookmarks is not one of them)", () => {
      const result = setup({ bookmarks: [{ id: "b1" }] });
      expect(result.current.dividedSectionsIds).toEqual(["search", "social"]);
    });

    it("is unaffected by whether there are bookmarks", () => {
      const result = setup({ bookmarks: [] });
      expect(result.current.dividedSectionsIds).toEqual(["search", "social"]);
    });
  });
});
