import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useTodayContent } from "todayScreen.infrastructure.presentation.hooks.useTodayContent";
import { useTodayContext } from "todayScreen.infrastructure.presentation.contexts.today.TodayContext";

jest.mock(
  "todayScreen.infrastructure.presentation.contexts.today.TodayContext",
  () => ({
    useTodayContext: jest.fn(),
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
    jest.clearAllMocks();
  });

  function setup(options: {
    lastReading?: { bookId: string; chapter: number } | undefined;
    bookmarks?: unknown[];
  }) {
    (useTodayContext as jest.Mock).mockReturnValue({
      userLastReading: signal(options.lastReading),
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
    it("is true when there is a last reading", () => {
      const result = setup({ lastReading: { bookId: "GEN", chapter: 1 } });
      expect(result.current.showResumeReading).toBe(true);
    });

    it("is false when there is no last reading", () => {
      const result = setup({ lastReading: undefined });
      expect(result.current.showResumeReading).toBe(false);
    });
  });

  describe("dividedSectionsIds", () => {
    it("includes bookmarks first when there are bookmarks", () => {
      const result = setup({ bookmarks: [{ id: "b1" }] });
      expect(result.current.dividedSectionsIds).toEqual([
        "bookmarks",
        "search",
        "social",
      ]);
    });

    it("omits bookmarks when there are none", () => {
      const result = setup({ bookmarks: [] });
      expect(result.current.dividedSectionsIds).toEqual(["search", "social"]);
    });
  });
});
