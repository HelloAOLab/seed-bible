import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { SearchSection } from "@packages/seed-bible/seed-bible/components/TodayPane/SearchSection";
import type { BibleTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import type { VerseSearchResult } from "@packages/seed-bible/seed-bible/managers/TodayManager";
import { todayStub } from "../../testUtils/todayStubs";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

const DEBOUNCE_MS = 180;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeVerse(
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

describe("SearchSection", () => {
  let container: HTMLDivElement;
  let searchVerses: Mock;
  let onOpenBookSelector: Mock;
  let onOpenPassage: Mock;
  let theme: Signal<BibleTheme>;
  let isMobile: Signal<boolean>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    vi.useFakeTimers();
    searchVerses = vi.fn(async () => [] as VerseSearchResult[]);
    onOpenBookSelector = vi.fn();
    onOpenPassage = vi.fn();
    theme = signal({
      variables: { secondaryFontColor: "#112233" },
    } as unknown as BibleTheme);
    isMobile = signal(false);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  function setup() {
    act(() =>
      render(
        <SearchSection
          today={todayStub({ searchVerses })}
          theme={theme}
          isMobile={isMobile}
          onOpenBookSelector={onOpenBookSelector}
          onOpenPassage={onOpenPassage}
        />,
        container
      )
    );
  }

  const q = <T extends Element = Element>(sel: string) =>
    container.querySelector<T>(sel);
  const qa = (sel: string) => container.querySelectorAll(sel);
  const input = () => container.querySelector<HTMLInputElement>("input")!;
  const dropdown = () => q(".sb-today-searchbar-dropdown");
  const status = () => q(".sb-today-searchbar-status");

  const resultRefs = () =>
    Array.from(qa(".sb-today-searchbar-result-ref")).map(
      (el) => el.textContent
    );

  /** Types into the box without letting the debounce fire. */
  function typeQuery(text: string) {
    input().value = text;
    act(() => {
      input().dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  /**
   * Drains the promise chain. A bare `await act(async () => {})` advances the
   * microtask queue by one tick, which is enough to reach a `.then` but not the
   * `.catch` behind it — so a rejection test would silently never run its
   * handler.
   */
  const flush = () =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

  /** Types into the box and lets the debounce fire. */
  async function search(text: string) {
    typeQuery(text);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
  }

  describe("the section chrome", () => {
    it("renders the titled section with its heading", () => {
      setup();
      expect(q(".sb-today-titled-section h5")!.textContent).toBe(
        "GO SOMEWHERE NEW"
      );
    });

    it("renders the book selector button with its label", () => {
      setup();
      expect(q(".sb-today-book-selector-button")!.textContent).toBe("Books");
    });

    it("opens the book selector when that button is clicked", () => {
      setup();
      act(() =>
        q<HTMLButtonElement>(".sb-today-book-selector-button")!.click()
      );
      expect(onOpenBookSelector).toHaveBeenCalledTimes(1);
    });

    it("colours the seed-bible icon from the theme", () => {
      setup();
      expect(q<SVGSVGElement>(".sb-today-seed-bible-icon")!.style.fill).toBe(
        "rgb(17, 34, 51)"
      );
    });

    it("recolours the icon when the theme changes", () => {
      setup();

      act(() => {
        theme.value = {
          variables: { secondaryFontColor: "#445566" },
        } as unknown as BibleTheme;
      });

      expect(q<SVGSVGElement>(".sb-today-seed-bible-icon")!.style.fill).toBe(
        "rgb(68, 85, 102)"
      );
    });

    it("uses a smaller icon on mobile", () => {
      isMobile.value = true;
      setup();
      expect(q<SVGSVGElement>(".sb-today-seed-bible-icon")!.style.width).toBe(
        "1.25rem"
      );
    });

    it("resizes the icon when the viewport crosses the breakpoint", () => {
      setup();
      expect(q<SVGSVGElement>(".sb-today-seed-bible-icon")!.style.width).toBe(
        "1.5rem"
      );

      act(() => {
        isMobile.value = true;
      });

      expect(q<SVGSVGElement>(".sb-today-seed-bible-icon")!.style.width).toBe(
        "1.25rem"
      );
    });
  });

  describe("the search box", () => {
    it("renders the search icon and a translated placeholder", () => {
      setup();
      expect(
        q(".sb-today-searchbar .material-symbols-outlined")!.textContent
      ).toBe("search");
      expect(input().placeholder).toBe("Search books, chapters, verses...");
      expect(input().value).toBe("");
    });

    it("keeps the dropdown closed until the box is used", () => {
      setup();
      expect(dropdown()).toBeNull();
    });

    it("opens an empty dropdown on focus once there is a query", async () => {
      setup();
      await search("gen");

      act(() => {
        input().dispatchEvent(new FocusEvent("focus"));
      });

      expect(dropdown()).not.toBeNull();
    });

    it("keeps the dropdown closed for a whitespace-only query", async () => {
      setup();
      await search("   ");
      expect(dropdown()).toBeNull();
    });

    it("closes the dropdown when clicking outside", async () => {
      setup();
      await search("gen");
      expect(dropdown()).not.toBeNull();

      const outside = document.createElement("div");
      document.body.appendChild(outside);
      act(() => {
        outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      });

      expect(dropdown()).toBeNull();
      outside.remove();
    });
  });

  describe("searching", () => {
    it("shows a searching status while the request is in flight", () => {
      setup();
      input().value = "gen";
      act(() => {
        input().dispatchEvent(new Event("input", { bubbles: true }));
      });

      expect(status()!.textContent).toBe("Searching...");
      expect(searchVerses).not.toHaveBeenCalled();
    });

    it("does not search a blank query", async () => {
      setup();
      await search("   ");
      expect(searchVerses).not.toHaveBeenCalled();
    });

    it("renders a result row per hit, with its reference and text", async () => {
      searchVerses.mockResolvedValue([
        makeVerse({ id: "1", reference: "John 3:16", text: "For God..." }),
        makeVerse({ id: "2", reference: "Genesis 1:1", text: "In the..." }),
      ]);
      setup();

      await search("gen");

      const rows = qa(".sb-today-searchbar-result");
      expect(rows).toHaveLength(2);
      expect(
        rows[0]!.querySelector(".sb-today-searchbar-result-ref")!.textContent
      ).toBe("John 3:16");
      expect(
        rows[0]!.querySelector(".sb-today-searchbar-result-text")!.textContent
      ).toBe("For God...");
      expect(status()).toBeNull();
    });

    it("shows the empty status when nothing matches", async () => {
      searchVerses.mockResolvedValue([]);
      setup();

      await search("zzz");

      expect(status()!.textContent).toBe("No matching verses.");
    });

    it("coalesces rapid keystrokes into a single search", async () => {
      searchVerses.mockResolvedValue([]);
      setup();

      input().value = "g";
      act(() => {
        input().dispatchEvent(new Event("input", { bubbles: true }));
      });
      act(() => void vi.advanceTimersByTime(50)); // before the debounce fires
      await search("ge");

      expect(searchVerses).toHaveBeenCalledTimes(1);
      expect(searchVerses).toHaveBeenCalledWith("ge");
    });

    it("surfaces the message when the search rejects with an Error", async () => {
      searchVerses.mockRejectedValue(new Error("network down"));
      setup();

      await search("gen");

      expect(q(".sb-today-searchbar-status-error")!.textContent).toBe(
        "network down"
      );
      expect(qa(".sb-today-searchbar-result")).toHaveLength(0);
    });

    it("uses a generic message when the rejection is not an Error", async () => {
      searchVerses.mockRejectedValue("oops");
      setup();

      await search("gen");

      expect(q(".sb-today-searchbar-status-error")!.textContent).toBe(
        "Unable to search verses."
      );
    });

    // Both stale tests settle the *superseded* request last. Letting the two
    // settle in one flush lets the later write win by ordering alone, which
    // passes even with the request-id guard removed — the shape these tests had
    // before they were mutation-checked.
    it("ignores a stale (superseded) response", async () => {
      const stale = deferred<VerseSearchResult[]>();
      const fresh = deferred<VerseSearchResult[]>();
      searchVerses
        .mockReturnValueOnce(stale.promise)
        .mockReturnValueOnce(fresh.promise);
      setup();

      // Type "a" and fire its debounce → searchVerses("a") is pending.
      typeQuery("a");
      act(() => void vi.advanceTimersByTime(DEBOUNCE_MS));
      // Supersede it → bumps the request id; fire that debounce too.
      typeQuery("b");
      act(() => void vi.advanceTimersByTime(DEBOUNCE_MS));

      fresh.resolve([makeVerse({ reference: "Fresh" })]);
      await flush();
      stale.resolve([makeVerse({ reference: "Stale" })]);
      await flush();

      expect(resultRefs()).toEqual(["Fresh"]);
    });

    it("ignores a stale rejection without surfacing its error", async () => {
      const stale = deferred<VerseSearchResult[]>();
      const fresh = deferred<VerseSearchResult[]>();
      searchVerses
        .mockReturnValueOnce(stale.promise)
        .mockReturnValueOnce(fresh.promise);
      setup();

      typeQuery("a");
      act(() => void vi.advanceTimersByTime(DEBOUNCE_MS));
      typeQuery("b");
      act(() => void vi.advanceTimersByTime(DEBOUNCE_MS));

      fresh.resolve([makeVerse({ reference: "Fresh" })]);
      await flush();
      stale.reject(new Error("stale failure"));
      await flush();

      expect(q(".sb-today-searchbar-status-error")).toBeNull();
      expect(resultRefs()).toEqual(["Fresh"]);
    });

    it("clears a pending debounce timeout on unmount", () => {
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
      setup();
      input().value = "gen";
      act(() => {
        input().dispatchEvent(new Event("input", { bubbles: true }));
      });

      act(() => render(null, container));

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe("choosing a result", () => {
    it("opens the verse and clears the box", async () => {
      searchVerses.mockResolvedValue([
        makeVerse({ bookId: "GEN", chapterNumber: 1, verseNumber: 5 }),
      ]);
      setup();
      await search("gen");

      act(() => q<HTMLButtonElement>(".sb-today-searchbar-result")!.click());

      expect(onOpenPassage).toHaveBeenCalledWith({
        bookId: "GEN",
        chapter: 1,
        verse: 5,
        translationId: "AAB",
      });
      expect(input().value).toBe("");
      expect(dropdown()).toBeNull();
    });

    it("leaves the verse unset when the hit has no verse number", async () => {
      searchVerses.mockResolvedValue([
        makeVerse({ bookId: "PSA", chapterNumber: 23, verseNumber: null }),
      ]);
      setup();
      await search("psa");

      act(() => q<HTMLButtonElement>(".sb-today-searchbar-result")!.click());

      expect(onOpenPassage).toHaveBeenCalledWith({
        bookId: "PSA",
        chapter: 23,
        verse: undefined,
        translationId: "AAB",
      });
    });
  });
});
