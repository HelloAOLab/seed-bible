import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { BookmarksSection } from "@packages/seed-bible/seed-bible/components/TodayPane/BookmarksSection";
import type { TranslationBooks } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { Bookmark } from "@packages/seed-bible/seed-bible/managers/BookmarksManager";
import { todayStub } from "../../testUtils/todayStubs";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

function books(entries: { id: string; name: string }[]): TranslationBooks {
  return { books: entries } as unknown as TranslationBooks;
}

function bookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: "b1",
    bookId: "GEN",
    chapterNumber: 3,
    translationId: "T1",
    category: "Favorites",
    ...overrides,
  } as unknown as Bookmark;
}

class MockResizeObserver {
  constructor(public cb: () => void) {}
  observe() {}
  disconnect() {}
}

// jsdom does not lay out, so `offsetTop` is driven from here. With `wrapChips`
// on, every chip after the first reports a lower position — which is how the
// component detects a strip that has wrapped onto a second line.
let wrapChips = false;

describe("BookmarksSection", () => {
  let container: HTMLDivElement;
  let onOpenPassage: Mock;
  let onShowBookmarksList: Mock;
  let getTranslationBooks: Mock;
  let isMobile: Signal<boolean>;
  let offsetTopDesc: PropertyDescriptor | undefined;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onOpenPassage = vi.fn();
    onShowBookmarksList = vi.fn();
    getTranslationBooks = vi.fn(async () => books([]));
    isMobile = signal(false);
    wrapChips = false;

    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      MockResizeObserver;

    offsetTopDesc = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetTop"
    );
    Object.defineProperty(HTMLElement.prototype, "offsetTop", {
      configurable: true,
      get(this: HTMLElement) {
        if (!wrapChips) return 0;
        const parent = this.parentElement;
        if (!parent) return 0;
        const index = Array.prototype.indexOf.call(parent.children, this);
        return index > 0 ? 20 : 0;
      },
    });
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    if (offsetTopDesc) {
      Object.defineProperty(HTMLElement.prototype, "offsetTop", offsetTopDesc);
    } else {
      delete (HTMLElement.prototype as { offsetTop?: number }).offsetTop;
    }
    delete (globalThis as unknown as { ResizeObserver?: unknown })
      .ResizeObserver;
    vi.clearAllMocks();
  });

  function setup(options: { bookmarks?: Signal<Bookmark[]> } = {}) {
    const bookmarks = options.bookmarks ?? signal<Bookmark[]>([bookmark()]);
    act(() =>
      render(
        <BookmarksSection
          today={todayStub({ getTranslationBooks })}
          bookmarks={bookmarks}
          isMobile={isMobile}
          onOpenPassage={onOpenPassage}
          onShowBookmarksList={onShowBookmarksList}
        />,
        container
      )
    );
    return bookmarks;
  }

  async function flush() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  const heading = () =>
    container.querySelector(".sb-today-titled-section-header > h5")!
      .textContent;
  const moreButton = () =>
    container.querySelector<HTMLButtonElement>(
      ".sb-today-titled-section-header > button"
    );
  const categoryLabels = () =>
    Array.from(
      container.querySelectorAll(".sb-today-bookmarks-section-label")
    ).map((el) => el.textContent);
  const chipTexts = (categoryIndex = 0) => {
    const strips = container.querySelectorAll(
      ".sb-today-bookmarks-section-container"
    );
    const chips = strips[categoryIndex]!.querySelectorAll(
      ".sb-today-bookmarks-section-bookmark"
    );
    return Array.from(chips).map((el) => el.textContent);
  };
  const firstChip = () =>
    container.querySelector<HTMLButtonElement>(
      ".sb-today-bookmarks-section-bookmark"
    )!;

  describe("the section heading", () => {
    it("translates the bookmarks title", () => {
      setup();
      expect(heading()).toBe("BOOKMARKS");
    });
  });

  describe("the chip's bookmark glyph", () => {
    // The glyph is shared with the tab sidebar, which draws it filled and
    // thinner. The chip's chunky outline only survives because it overrides
    // both, and nothing else here would notice if it stopped.
    it("draws a heavier outline than the shared default", () => {
      setup();
      const icon = firstChip().querySelector("svg")!;
      expect(icon.getAttribute("stroke-width")).toBe("3");
      expect(icon.getAttribute("fill")).toBe("none");
    });

    it("takes its colour from the chip so the theme reaches it", () => {
      setup();
      const icon = firstChip().querySelector("svg")!;
      expect(icon.getAttribute("stroke")).toBe("currentColor");
    });
  });

  describe("categories", () => {
    it("groups bookmarks by their category, in first-appearance order", () => {
      setup({
        bookmarks: signal([
          bookmark({ id: "b1", category: "Favorites" }),
          bookmark({ id: "b2", category: "Favorites" }),
          bookmark({ id: "b3", category: "To Read" }),
        ]),
      });

      expect(categoryLabels()).toEqual(["Favorites:", "To Read:"]);
      expect(chipTexts(0)).toHaveLength(2);
      expect(chipTexts(1)).toHaveLength(1);
    });

    it("preserves first-appearance order for numeric-looking category names", () => {
      setup({
        bookmarks: signal([
          bookmark({ id: "b1", category: "Favorites" }),
          bookmark({ id: "b2", category: "2024" }),
        ]),
      });

      // A plain object would hoist the integer-like "2024" to the front.
      expect(categoryLabels()).toEqual(["Favorites:", "2024:"]);
    });

    it("renders no categories when there are no bookmarks", () => {
      setup({ bookmarks: signal([]) });
      expect(categoryLabels()).toEqual([]);
    });
  });

  describe("chip labels", () => {
    it("falls back to the bookId before the translation books load", () => {
      setup();
      expect(chipTexts()).toEqual(["GEN 3"]);
    });

    it("resolves the book name once the translation books load", async () => {
      getTranslationBooks = vi.fn(async () =>
        books([{ id: "GEN", name: "Genesis" }])
      );
      setup();

      await flush();

      expect(chipTexts()).toEqual(["Genesis 3"]);
    });

    it("keeps the bookId when the book is not in the loaded translation", async () => {
      getTranslationBooks = vi.fn(async () =>
        books([{ id: "GEN", name: "Genesis" }])
      );
      setup({ bookmarks: signal([bookmark({ bookId: "XYZ" })]) });

      await flush();

      expect(chipTexts()).toEqual(["XYZ 3"]);
    });
  });

  describe("opening a bookmark", () => {
    it("opens the bookmark's own translation, book and chapter", () => {
      setup();

      act(() => firstChip().click());

      expect(onOpenPassage).toHaveBeenCalledWith({
        bookId: "GEN",
        chapter: 3,
        translationId: "T1",
      });
    });
  });

  describe("the translation books cache", () => {
    it("fetches each distinct translation once", () => {
      setup({
        bookmarks: signal([
          bookmark({ id: "b1", bookId: "GEN", translationId: "T1" }),
          bookmark({ id: "b2", bookId: "EXO", translationId: "T1" }),
          bookmark({
            id: "b3",
            bookId: "MAT",
            translationId: "T2",
            category: "To Read",
          }),
        ]),
      });

      expect(getTranslationBooks).toHaveBeenCalledTimes(2);
      expect(getTranslationBooks).toHaveBeenCalledWith("T1");
      expect(getTranslationBooks).toHaveBeenCalledWith("T2");
    });

    it("does not refetch a translation that is already cached", async () => {
      getTranslationBooks = vi.fn(async () =>
        books([{ id: "GEN", name: "Genesis" }])
      );
      const bookmarks = setup();
      await flush();
      expect(getTranslationBooks).toHaveBeenCalledTimes(1);

      act(() => {
        bookmarks.value = [
          ...bookmarks.value,
          bookmark({ id: "b2", bookId: "EXO", chapterNumber: 2 }),
        ];
      });
      await flush();

      expect(getTranslationBooks).toHaveBeenCalledTimes(1);
    });
  });

  describe("the view-more button", () => {
    const twoChips = () =>
      signal([bookmark({ id: "b1" }), bookmark({ id: "b2" })]);

    it("is absent when no category strip wraps to a new line", () => {
      setup({ bookmarks: twoChips() });
      expect(moreButton()).toBeNull();
    });

    it("appears, translated, once a strip wraps to a new line", () => {
      wrapChips = true;
      setup({ bookmarks: twoChips() });

      expect(moreButton()).not.toBeNull();
      expect(moreButton()!.textContent).toBe("VIEW MORE");
    });

    it("reveals the full bookmarks list when clicked", () => {
      wrapChips = true;
      setup({ bookmarks: twoChips() });

      act(() => moreButton()!.click());

      expect(onShowBookmarksList).toHaveBeenCalledTimes(1);
    });

    // On mobile the strips scroll horizontally instead, so there is nothing
    // hidden for a "view more" to reveal.
    it("stays hidden on mobile even when a strip wraps", () => {
      wrapChips = true;
      isMobile.value = true;
      setup({ bookmarks: twoChips() });

      expect(moreButton()).toBeNull();
    });

    it("disappears when the viewport crosses to mobile", () => {
      wrapChips = true;
      setup({ bookmarks: twoChips() });
      expect(moreButton()).not.toBeNull();

      act(() => {
        isMobile.value = true;
      });

      expect(moreButton()).toBeNull();
    });
  });
});
