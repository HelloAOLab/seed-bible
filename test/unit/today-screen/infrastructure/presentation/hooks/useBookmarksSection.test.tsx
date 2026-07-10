import type { Mock } from "vitest";
import { render, type ComponentChildren } from "preact";
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
}

function books(entries: { id: string; name: string }[]): TranslationBooks {
  return { books: entries } as unknown as TranslationBooks;
}

type UseBookmarksResult = ReturnType<typeof useBookmarksSection>;

class MockResizeObserver {
  constructor(public cb: () => void) {}
  observe() {}
  disconnect() {}
}

describe("useBookmarksSection", () => {
  let container: HTMLDivElement;
  const addTab = vi.fn();
  const closeToday = vi.fn();
  let offsetTopDescriptor: PropertyDescriptor | undefined;

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

    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      MockResizeObserver;

    // Drive offsetTop from a data attribute so overflow can be simulated.
    offsetTopDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetTop"
    );
    Object.defineProperty(HTMLElement.prototype, "offsetTop", {
      configurable: true,
      get(this: HTMLElement) {
        if (this.hasAttribute("data-undef-top")) return undefined;
        const t = this.getAttribute("data-top");
        return t === null ? 0 : Number(t);
      },
    });
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    if (offsetTopDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        "offsetTop",
        offsetTopDescriptor
      );
    }
    delete (globalThis as unknown as { ResizeObserver?: unknown })
      .ResizeObserver;
    vi.clearAllMocks();
  });

  function setup(
    options: Parameters<typeof configure>[0] = {},
    children?: ComponentChildren
  ) {
    const ctx = configure(options);
    const result = { current: null as unknown as UseBookmarksResult };
    function TestComponent() {
      const r = useBookmarksSection();
      result.current = r;
      return children ? <div ref={r.containerRef}>{children}</div> : null;
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

  describe("bookmarksData", () => {
    const bookmark: FakeBookmark = {
      id: "b1",
      bookId: "GEN",
      chapterNumber: 3,
      translationId: "T1",
    };

    it("falls back to the bookId before the translation books load", () => {
      const { result } = setup({
        bookmarks: signal<FakeBookmark[]>([bookmark]),
      });
      expect(result.current.bookmarksData.value[0]!.text).toBe("GEN 3");
      expect(result.current.bookmarksData.value[0]!.key).toBe("b1");
    });

    it("resolves the book name once the translation books load", async () => {
      const { result } = setup({
        bookmarks: signal<FakeBookmark[]>([bookmark]),
        getTranslationBooks: vi.fn(async () =>
          books([{ id: "GEN", name: "Genesis" }])
        ),
      });
      await flush();
      expect(result.current.bookmarksData.value[0]!.text).toBe("Genesis 3");
    });

    it("keeps the bookId when the book is not in the loaded translation", async () => {
      const { result } = setup({
        bookmarks: signal<FakeBookmark[]>([{ ...bookmark, bookId: "XYZ" }]),
        getTranslationBooks: vi.fn(async () =>
          books([{ id: "GEN", name: "Genesis" }])
        ),
      });
      await flush();
      expect(result.current.bookmarksData.value[0]!.text).toBe("XYZ 3");
    });

    it("opens a tab for the bookmark location on click", () => {
      const { result } = setup({
        bookmarks: signal<FakeBookmark[]>([bookmark]),
      });
      act(() => result.current.bookmarksData.value[0]!.handleClick());
      expect(addTab).toHaveBeenCalledWith("GEN", 3, "T1");
    });

    it("closes the Today screen on click", () => {
      const { result } = setup({
        bookmarks: signal<FakeBookmark[]>([bookmark]),
      });
      act(() => result.current.bookmarksData.value[0]!.handleClick());
      expect(closeToday).toHaveBeenCalledTimes(1);
    });
  });

  describe("translation books cache", () => {
    it("fetches each distinct translation once", () => {
      const getTranslationBooks = vi.fn(async () => books([]));
      setup({
        bookmarks: signal<FakeBookmark[]>([
          { id: "b1", bookId: "GEN", chapterNumber: 1, translationId: "T1" },
          { id: "b2", bookId: "EXO", chapterNumber: 1, translationId: "T1" },
          { id: "b3", bookId: "MAT", chapterNumber: 1, translationId: "T2" },
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
        { id: "b1", bookId: "GEN", chapterNumber: 1, translationId: "T1" },
      ]);
      setup({ bookmarks, getTranslationBooks });
      await flush();
      expect(getTranslationBooks).toHaveBeenCalledTimes(1);

      // Adding another bookmark for the same (now cached) translation.
      act(() => {
        bookmarks.value = [
          ...bookmarks.value,
          { id: "b2", bookId: "EXO", chapterNumber: 2, translationId: "T1" },
        ];
      });
      await flush();
      expect(getTranslationBooks).toHaveBeenCalledTimes(1);
    });
  });

  describe("moreButtonData / overflow", () => {
    it("is undefined when there is no container", () => {
      const { result } = setup();
      expect(result.current.moreButtonData.value).toBeUndefined();
    });

    it("is undefined when the rows do not overflow", () => {
      const { result } = setup({}, [
        <button data-top="0" key="a" />,
        <button data-top="0" key="b" />,
      ]);
      expect(result.current.moreButtonData.value).toBeUndefined();
    });

    it("is undefined when the container has no children", () => {
      const { result } = setup({}, <Fragmentless />);
      expect(result.current.moreButtonData.value).toBeUndefined();
    });

    it("is undefined when the first row's offset cannot be measured", () => {
      const { result } = setup({}, [<button data-undef-top key="a" />]);
      expect(result.current.moreButtonData.value).toBeUndefined();
    });

    it("is defined (with a translated label) when the rows overflow", () => {
      const { result } = setup({ translate: vi.fn((key) => `[${key}]`) }, [
        <button data-top="0" key="a" />,
        <button data-top="20" key="b" />,
      ]);
      const more = result.current.moreButtonData.value;
      expect(more).toBeDefined();
      expect(more!.text).toBe("[VIEW-MORE]");
    });

    it("logs when the more button is clicked", () => {
      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
      const { result } = setup({}, [
        <button data-top="0" key="a" />,
        <button data-top="20" key="b" />,
      ]);
      act(() => result.current.moreButtonData.value!.handleClick());
      expect(consoleLog).toHaveBeenCalled();
      consoleLog.mockRestore();
    });
  });
});

// Renders nothing — used to give the container zero element children.
function Fragmentless() {
  return null;
}
