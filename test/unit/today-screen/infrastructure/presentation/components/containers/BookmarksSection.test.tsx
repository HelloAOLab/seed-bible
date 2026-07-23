import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  BookmarksSection,
  type CategorizedBookmarks,
} from "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/BookmarksSection";
import { useBookmarksSection } from "../../../../../../../packages/today-screen/infrastructure/presentation/hooks/useBookmarksSection";
import { BookmarksCategory } from "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/BookmarksCategory";

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/hooks/useBookmarksSection",
  () => ({
    useBookmarksSection: vi.fn(),
  })
);

// Stub the per-category child so this suite covers only how BookmarksSection
// maps categories to children. The real BookmarksCategory pulls its own hook
// (and the Today context), which is out of scope here.
vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/BookmarksCategory",
  () => ({
    BookmarksCategory: vi.fn(
      ({
        label,
        bookmarksData,
      }: {
        label: string;
        bookmarksData: { key: string; text: string }[];
      }) => (
        <div data-testid="category" data-label={label}>
          {bookmarksData.map((b) => (
            <span className="bm" key={b.key}>
              {b.text}
            </span>
          ))}
        </div>
      )
    ),
  })
);

type HookResult = ReturnType<typeof useBookmarksSection>;

function makeHookResult(options: {
  label?: string;
  categorized?: CategorizedBookmarks;
  moreButton?: { label: string; onClick: () => void };
}): HookResult {
  return {
    label: signal(options.label ?? "BOOKMARKS"),
    categorizedBookmarks: signal(options.categorized ?? new Map()),
    moreButtonData: signal(options.moreButton),
    containerRef: { current: null },
  } as unknown as HookResult;
}

describe("BookmarksSection", () => {
  let container: HTMLDivElement;
  const categoryMock = BookmarksCategory as unknown as Mock;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(options: Parameters<typeof makeHookResult>[0] = {}) {
    (useBookmarksSection as Mock).mockReturnValue(makeHookResult(options));
    act(() => render(<BookmarksSection />, container));
  }

  function categories() {
    return container.querySelectorAll<HTMLDivElement>(
      "[data-testid='category']"
    );
  }

  function moreButton() {
    return container.querySelector<HTMLButtonElement>(
      ".titled-section-header > button"
    );
  }

  describe("title", () => {
    it("renders the label in the section heading", () => {
      setup({ label: "MARCADORES" });
      expect(
        container.querySelector(".titled-section-header > h5")!.textContent
      ).toBe("MARCADORES");
    });
  });

  describe("more button", () => {
    it("renders the more button in the header when moreButtonData is present", () => {
      const onClick = vi.fn();
      setup({ moreButton: { label: "VIEW MORE", onClick } });
      expect(moreButton()).not.toBeNull();
      expect(moreButton()!.textContent).toBe("VIEW MORE");
      act(() => moreButton()!.click());
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("does not render the more button when moreButtonData is undefined", () => {
      setup();
      expect(moreButton()).toBeNull();
    });
  });

  describe("categories", () => {
    it("renders one BookmarksCategory per category, preserving order", () => {
      setup({
        categorized: new Map([
          [
            "Favorites",
            [{ key: "a", text: "Genesis 1", handleClick: vi.fn() }],
          ],
          ["To Read", [{ key: "b", text: "John 3", handleClick: vi.fn() }]],
        ]),
      });
      const labels = Array.from(categories()).map((el) =>
        el.getAttribute("data-label")
      );
      expect(labels).toEqual(["Favorites:", "To Read:"]);
    });

    it("passes each category's bookmarks through to its child", () => {
      const favorites = [
        { key: "a", text: "Genesis 1", handleClick: vi.fn() },
        { key: "b", text: "Exodus 2", handleClick: vi.fn() },
      ];
      setup({ categorized: new Map([["Favorites", favorites]]) });

      const texts = Array.from(categories()[0]!.querySelectorAll(".bm")).map(
        (el) => el.textContent
      );
      expect(texts).toEqual(["Genesis 1", "Exodus 2"]);

      // The exact array (handlers included) is forwarded untouched.
      expect(categoryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "Favorites:",
          bookmarksData: favorites,
        }),
        expect.anything()
      );
    });

    it("renders no categories when there are none", () => {
      setup({ categorized: new Map() });
      expect(categories()).toHaveLength(0);
    });
  });
});
