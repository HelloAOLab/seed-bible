import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { useBookmarksSection } from "../../../../../../packages/today-screen/infrastructure/presentation/hooks/useBookmarksSection";
import { useTodayContext } from "../../../../../../packages/today-screen/infrastructure/presentation/contexts/today/TodayContext";
import type { TranslationBooks } from "../../../../../../packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

vi.mock(
  "../../../../../../packages/today-screen/infrastructure/presentation/contexts/today/TodayContext",
  () => ({
    useTodayContext: vi.fn(),
  })
);

interface FakeBookmark {
  id: string;
  bookId: string;
  chapterNumber: number;
  translationId: string;
  category: string;
}

function books(entries: { id: string; name: string }[]): TranslationBooks {
  return { books: entries } as unknown as TranslationBooks;
}

type UseBookmarksResult = ReturnType<typeof useBookmarksSection>;

describe("useBookmarksSection", () => {
  let container: HTMLDivElement;
  const addTab = vi.fn();
  const closeToday = vi.fn();

  function configure(
    options: {
      bookmarks?: ReturnType<typeof signal<FakeBookmark[]>>;
      translate?: Mock;
      getTranslationBooks?: Mock;
    } = {}
  ) {
    const ctx = {
      bookmarks: options.bookmarks ?? signal<FakeBookmark[]>([]),
      addTab,
      closeToday,
      translate: options.translate ?? vi.fn((key: string) => key),
      getTranslationBooks:
        options.getTranslationBooks ?? vi.fn(async () => books([])),
    };
    (useTodayContext as Mock).mockReturnValue(ctx);
    return ctx;
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(options: Parameters<typeof configure>[0] = {}) {
    const ctx = configure(options);
    const result = { current: null as unknown as UseBookmarksResult };
    function TestComponent() {
      result.current = useBookmarksSection();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return { result, ctx };
  }

  async function flush() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  describe("label", () => {
    it("translates the BOOKMARKS key", () => {
      const { result } = setup({ translate: vi.fn((key) => `[${key}]`) });
      expect(result.current.label.value).toBe("[BOOKMARKS]");
    });
  });

  describe("categorizedBookmarks", () => {
    const bookmark: FakeBookmark = {
      id: "b1",
      bookId: "GEN",
      chapterNumber: 3,
      translationId: "T1",
      category: "Favorites",
    };

    function firstIn(
      result: { current: UseBookmarksResult },
      category: string
    ) {
      return result.current.categorizedBookmarks.value[category]![0]!;
    }

    it("groups bookmarks by their category", () => {
      const { result } = setup({
        bookmarks: signal<FakeBookmark[]>([
          { ...bookmark, id: "b1", category: "Favorites" },
          { ...bookmark, id: "b2", category: "Favorites" },
          { ...bookmark, id: "b3", category: "To Read" },
        ]),
      });
      const categorized = result.current.categorizedBookmarks.value;
      expect(Object.keys(categorized)).toEqual(["Favorites", "To Read"]);
      expect(categorized["Favorites"]).toHaveLength(2);
      expect(categorized["To Read"]).toHaveLength(1);
    });

    it("falls back to the bookId before the translation books load", () => {
      const { result } = setup({
        bookmarks: signal<FakeBookmark[]>([bookmark]),
      });
      expect(firstIn(result, "Favorites").text).toBe("GEN 3");
      expect(firstIn(result, "Favorites").key).toBe("b1");
    });

    it("resolves the book name once the translation books load", async () => {
      const { result } = setup({
        bookmarks: signal<FakeBookmark[]>([bookmark]),
        getTranslationBooks: vi.fn(async () =>
          books([{ id: "GEN", name: "Genesis" }])
        ),
      });
      await flush();
      expect(firstIn(result, "Favorites").text).toBe("Genesis 3");
    });

    it("keeps the bookId when the book is not in the loaded translation", async () => {
      const { result } = setup({
        bookmarks: signal<FakeBookmark[]>([{ ...bookmark, bookId: "XYZ" }]),
        getTranslationBooks: vi.fn(async () =>
          books([{ id: "GEN", name: "Genesis" }])
        ),
      });
      await flush();
      expect(firstIn(result, "Favorites").text).toBe("XYZ 3");
    });

    it("opens a tab for the bookmark location on click", () => {
      const { result } = setup({
        bookmarks: signal<FakeBookmark[]>([bookmark]),
      });
      act(() => firstIn(result, "Favorites").handleClick());
      expect(addTab).toHaveBeenCalledWith("GEN", 3, "T1");
    });

    it("closes the Today screen on click", () => {
      const { result } = setup({
        bookmarks: signal<FakeBookmark[]>([bookmark]),
      });
      act(() => firstIn(result, "Favorites").handleClick());
      expect(closeToday).toHaveBeenCalledTimes(1);
    });
  });

  describe("translation books cache", () => {
    it("fetches each distinct translation once", () => {
      const getTranslationBooks = vi.fn(async () => books([]));
      setup({
        bookmarks: signal<FakeBookmark[]>([
          {
            id: "b1",
            bookId: "GEN",
            chapterNumber: 1,
            translationId: "T1",
            category: "Favorites",
          },
          {
            id: "b2",
            bookId: "EXO",
            chapterNumber: 1,
            translationId: "T1",
            category: "Favorites",
          },
          {
            id: "b3",
            bookId: "MAT",
            chapterNumber: 1,
            translationId: "T2",
            category: "To Read",
          },
        ]),
        getTranslationBooks,
      });
      expect(getTranslationBooks).toHaveBeenCalledTimes(2);
      expect(getTranslationBooks).toHaveBeenCalledWith("T1");
      expect(getTranslationBooks).toHaveBeenCalledWith("T2");
    });

    it("does not refetch a translation that is already cached", async () => {
      const getTranslationBooks = vi.fn(async () =>
        books([{ id: "GEN", name: "Genesis" }])
      );
      const bookmarks = signal<FakeBookmark[]>([
        {
          id: "b1",
          bookId: "GEN",
          chapterNumber: 1,
          translationId: "T1",
          category: "Favorites",
        },
      ]);
      setup({ bookmarks, getTranslationBooks });
      await flush();
      expect(getTranslationBooks).toHaveBeenCalledTimes(1);

      // Adding another bookmark for the same (now cached) translation.
      act(() => {
        bookmarks.value = [
          ...bookmarks.value,
          {
            id: "b2",
            bookId: "EXO",
            chapterNumber: 2,
            translationId: "T1",
            category: "Favorites",
          },
        ];
      });
      await flush();
      expect(getTranslationBooks).toHaveBeenCalledTimes(1);
    });
  });
});
