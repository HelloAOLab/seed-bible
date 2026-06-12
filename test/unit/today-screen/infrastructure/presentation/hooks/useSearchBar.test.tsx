import { render } from "preact";
import { act } from "preact/test-utils";
import { useSearchBar } from "todayScreen.infrastructure.presentation.hooks.useSearchBar";
import { useTodayContext } from "todayScreen.infrastructure.presentation.contexts.today.TodayContext";
import type { VerseSearchResult } from "@packages/today-screen/todayScreen/domain/models/search";

jest.mock(
  "todayScreen.infrastructure.presentation.contexts.today.TodayContext",
  () => ({
    useTodayContext: jest.fn(),
  })
);

const MaterialIcon = ({ children }: { children: string }) => (
  <span className="material-icon">{children}</span>
);

const addTab = jest.fn();
const DEBOUNCE_MS = 180;

function makeResult(
  overrides: Partial<VerseSearchResult> = {}
): VerseSearchResult {
  return {
    id: "1",
    translationId: "AAB",
    bookId: "JHN",
    chapterNumber: 3,
    verseNumber: 16,
    reference: "John 3:16",
    text: "For God so loved...",
    ...overrides,
  };
}

type Hook = ReturnType<typeof useSearchBar>;

describe("useSearchBar", () => {
  let container: HTMLDivElement;
  let searchVerses: jest.Mock;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    jest.useFakeTimers();
    searchVerses = jest.fn(async () => [] as VerseSearchResult[]);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  function setup() {
    (useTodayContext as jest.Mock).mockReturnValue({
      searchVerses,
      addTab,
      translate: jest.fn((key: string) => key),
      MaterialIcon,
    });
    const result = { current: null as unknown as Hook };
    function TestComponent() {
      const r = useSearchBar();
      result.current = r;
      return <div ref={r.containerRef} />;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  describe("initial state", () => {
    it("starts empty and closed with a translated placeholder", () => {
      const result = setup();
      expect(result.current.query.value).toBe("");
      expect(result.current.isOpen.value).toBe(false);
      expect(result.current.results.value).toEqual([]);
      expect(result.current.placeholder).toBe("search-verses");
      expect(result.current.MaterialIcon).toBe(MaterialIcon);
    });
  });

  describe("runSearch", () => {
    it("opens the dropdown and stores the query", () => {
      const result = setup();
      act(() => result.current.runSearch("gen"));
      expect(result.current.query.value).toBe("gen");
      expect(result.current.isOpen.value).toBe(true);
      expect(result.current.loading.value).toBe(true);
    });

    it("clears results without searching for a blank query", () => {
      const result = setup();
      act(() => result.current.runSearch("   "));
      expect(result.current.results.value).toEqual([]);
      expect(result.current.loading.value).toBe(false);
      expect(result.current.error.value).toBeNull();
      act(() => jest.advanceTimersByTime(DEBOUNCE_MS));
      expect(searchVerses).not.toHaveBeenCalled();
    });

    it("debounces and resolves results after the delay", async () => {
      const found = [makeResult({ id: "a" })];
      searchVerses.mockResolvedValue(found);
      const result = setup();
      act(() => result.current.runSearch("gen"));

      await act(async () => {
        await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });

      expect(searchVerses).toHaveBeenCalledWith("gen");
      expect(result.current.results.value).toEqual(found);
      expect(result.current.loading.value).toBe(false);
    });

    it("coalesces rapid keystrokes into a single search", async () => {
      searchVerses.mockResolvedValue([]);
      const result = setup();
      act(() => result.current.runSearch("g"));
      act(() => jest.advanceTimersByTime(50)); // before the debounce fires
      act(() => result.current.runSearch("ge")); // clears the pending timeout

      await act(async () => {
        await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });

      expect(searchVerses).toHaveBeenCalledTimes(1);
      expect(searchVerses).toHaveBeenCalledWith("ge");
    });

    it("surfaces the error message when the search rejects with an Error", async () => {
      searchVerses.mockRejectedValue(new Error("network down"));
      const result = setup();
      act(() => result.current.runSearch("gen"));

      await act(async () => {
        await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });

      expect(result.current.error.value).toBe("network down");
      expect(result.current.results.value).toEqual([]);
      expect(result.current.loading.value).toBe(false);
    });

    it("uses a generic message when the rejection is not an Error", async () => {
      searchVerses.mockRejectedValue("oops");
      const result = setup();
      act(() => result.current.runSearch("gen"));

      await act(async () => {
        await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });

      expect(result.current.error.value).toBe("Unable to search verses.");
    });

    it("ignores a stale (superseded) response", async () => {
      const staleResult = [makeResult({ id: "stale" })];
      const freshResult = [makeResult({ id: "fresh" })];
      searchVerses
        .mockResolvedValueOnce(staleResult)
        .mockResolvedValueOnce(freshResult);

      const result = setup();
      act(() => result.current.runSearch("a"));
      // Fire the first debounce → searchVerses("a") is now pending.
      act(() => jest.advanceTimersByTime(DEBOUNCE_MS));
      // Supersede it before it resolves → bumps the request id.
      act(() => result.current.runSearch("b"));

      await act(async () => {
        await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });

      // The stale "a" result is discarded; only "b" wins.
      expect(result.current.results.value).toEqual(freshResult);
    });

    it("ignores a stale rejection without surfacing its error", async () => {
      const freshResult = [makeResult({ id: "fresh" })];
      searchVerses
        .mockRejectedValueOnce(new Error("stale failure"))
        .mockResolvedValueOnce(freshResult);

      const result = setup();
      act(() => result.current.runSearch("a"));
      // Fire the first debounce → searchVerses("a") (which rejects) is pending.
      act(() => jest.advanceTimersByTime(DEBOUNCE_MS));
      // Supersede it before it rejects → bumps the request id.
      act(() => result.current.runSearch("b"));

      await act(async () => {
        await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
      });

      // The stale rejection is swallowed; no error surfaces and "b" wins.
      expect(result.current.error.value).toBeNull();
      expect(result.current.results.value).toEqual(freshResult);
    });
  });

  describe("handleFocus", () => {
    it("opens the dropdown", () => {
      const result = setup();
      act(() => result.current.handleFocus());
      expect(result.current.isOpen.value).toBe(true);
    });
  });

  describe("handleSelect", () => {
    it("opens the verse in a tab (with verse) and closes the dropdown", () => {
      const result = setup();
      act(() => result.current.handleFocus());
      act(() =>
        result.current.handleSelect(
          makeResult({ bookId: "GEN", chapterNumber: 1, verseNumber: 5 })
        )
      );
      expect(addTab).toHaveBeenCalledWith("GEN", 1, "AAB", 5);
      expect(result.current.query.value).toBe("");
      expect(result.current.isOpen.value).toBe(false);
    });

    it("passes undefined when the result has no verse number", () => {
      const result = setup();
      act(() =>
        result.current.handleSelect(
          makeResult({ bookId: "PSA", chapterNumber: 23, verseNumber: null })
        )
      );
      expect(addTab).toHaveBeenCalledWith("PSA", 23, "AAB", undefined);
    });
  });

  describe("click outside", () => {
    it("closes the dropdown when clicking outside the search bar", () => {
      const result = setup();
      act(() => result.current.handleFocus());
      expect(result.current.isOpen.value).toBe(true);

      const outside = document.createElement("div");
      document.body.appendChild(outside);
      act(() => {
        outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });
      expect(result.current.isOpen.value).toBe(false);
      outside.remove();
    });
  });

  describe("cleanup", () => {
    it("clears a pending debounce timeout on unmount", () => {
      const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");
      const result = setup();
      act(() => result.current.runSearch("gen")); // schedules a timeout
      act(() => render(null, container)); // unmount → cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
