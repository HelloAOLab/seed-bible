import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useTodayContent } from "@packages/seed-bible/seed-bible/components/TodayPane/useTodayContent";
import { todayStub } from "../../testUtils/todayStubs";

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
    const today = todayStub({ readingHistory });
    const bookmarks = signal(options.bookmarks ?? []) as never;
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useTodayContent({ today, bookmarks });
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
