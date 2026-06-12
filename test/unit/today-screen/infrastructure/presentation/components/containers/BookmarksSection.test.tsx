import { render } from "preact";
import { act } from "preact/test-utils";
import { BookmarksSection } from "todayScreen.infrastructure.presentation.components.containers.BookmarksSection";
import { useBookmarksSection } from "todayScreen.infrastructure.presentation.hooks.useBookmarksSection";

jest.mock(
  "todayScreen.infrastructure.presentation.hooks.useBookmarksSection",
  () => ({
    useBookmarksSection: jest.fn(),
  })
);

type HookResult = ReturnType<typeof useBookmarksSection>;

interface BookmarkEntry {
  key: string;
  text: string;
  handleClick: () => void;
}

interface MoreButton {
  text: string;
  handleClick: () => void;
}

function makeHookResult(options: {
  label?: string;
  bookmarks?: BookmarkEntry[];
  moreButton?: MoreButton | undefined;
  containerRef?: { current: HTMLDivElement | null };
}): HookResult {
  return {
    label: { value: options.label ?? "BOOKMARKS:" },
    bookmarksData: { value: options.bookmarks ?? [] },
    moreButtonData: { value: options.moreButton },
    containerRef: options.containerRef ?? { current: null },
  } as unknown as HookResult;
}

describe("BookmarksSection", () => {
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

  function setup(options: Parameters<typeof makeHookResult>[0] = {}) {
    const result = makeHookResult(options);
    (useBookmarksSection as jest.Mock).mockReturnValue(result);
    act(() => render(<BookmarksSection />, container));
    return result;
  }

  function bookmarks() {
    return container.querySelectorAll<HTMLButtonElement>(
      ".bookmarks-section-bookmark"
    );
  }

  function moreButton() {
    return container.querySelector<HTMLButtonElement>(
      ".bookmarks-section-more-button"
    );
  }

  describe("label", () => {
    it("renders the label text in the section heading", () => {
      setup({ label: "MARCADORES:" });
      expect(
        container.querySelector(".bookmarks-section-label")!.textContent
      ).toBe("MARCADORES:");
    });
  });

  describe("bookmarks", () => {
    it("renders a bookmark button per entry with its text", () => {
      setup({
        bookmarks: [
          { key: "a", text: "Genesis 1", handleClick: jest.fn() },
          { key: "b", text: "John 3", handleClick: jest.fn() },
        ],
      });
      const items = bookmarks();
      expect(items).toHaveLength(2);
      expect(items[0]!.textContent).toBe("Genesis 1");
      expect(items[1]!.textContent).toBe("John 3");
    });

    it("renders the bookmark icon svg inside each bookmark", () => {
      setup({
        bookmarks: [{ key: "a", text: "Genesis 1", handleClick: jest.fn() }],
      });
      expect(bookmarks()[0]!.querySelector("svg")).not.toBeNull();
    });

    it("renders no bookmark buttons when there are none", () => {
      setup({ bookmarks: [] });
      expect(bookmarks()).toHaveLength(0);
    });

    it("calls the matching handleClick when a bookmark is clicked", () => {
      const handleA = jest.fn();
      const handleB = jest.fn();
      setup({
        bookmarks: [
          { key: "a", text: "Genesis 1", handleClick: handleA },
          { key: "b", text: "John 3", handleClick: handleB },
        ],
      });
      act(() => bookmarks()[1]!.click());
      expect(handleB).toHaveBeenCalledTimes(1);
      expect(handleA).not.toHaveBeenCalled();
    });
  });

  describe("more button", () => {
    it("renders the more button with its text when moreButtonData is present", () => {
      setup({ moreButton: { text: "VIEW MORE", handleClick: jest.fn() } });
      expect(moreButton()).not.toBeNull();
      expect(moreButton()!.textContent).toBe("VIEW MORE");
    });

    it("does not render the more button when moreButtonData is undefined", () => {
      setup({ moreButton: undefined });
      expect(moreButton()).toBeNull();
    });

    it("calls handleClick when the more button is clicked", () => {
      const handleClick = jest.fn();
      setup({ moreButton: { text: "VIEW MORE", handleClick } });
      act(() => moreButton()!.click());
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("containerRef", () => {
    it("attaches the ref to the bookmarks container", () => {
      const containerRef = { current: null as HTMLDivElement | null };
      setup({ containerRef });
      expect(containerRef.current).not.toBeNull();
      expect(containerRef.current!.className).toContain(
        "bookmarks-section-container"
      );
    });
  });
});
