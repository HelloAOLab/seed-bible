import { render } from "preact";
import { act } from "preact/test-utils";
import { ReadingHistoryUserFiltersSelector } from "scriptureMap2D.components.containers.ReadingHistoryUserFiltersSelector";
import { useReadingHistoryUserFiltersSelector } from "scriptureMap2D.hooks.useReadingHistoryUserFiltersSelector";

jest.mock("scriptureMap2D.hooks.useReadingHistoryUserFiltersSelector", () => ({
  useReadingHistoryUserFiltersSelector: jest.fn(),
}));

type SelectorOptionData = {
  key: string;
  content: { title: string; iconStyle?: React.CSSProperties };
  onClick: jest.Mock;
  selected?: boolean;
  className: string;
};

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    allSelectorOptionContent: { title: "All" },
    allSelectorOptionClick: jest.fn(),
    allSelected: false,
    selectorOptionsData: [] as SelectorOptionData[],
    ...overrides,
  };
}

function makeOptionData(
  overrides: Partial<SelectorOptionData> = {}
): SelectorOptionData {
  return {
    key: "option-1",
    content: { title: "User A" },
    onClick: jest.fn(),
    selected: false,
    className: "project-filters-selector-option",
    ...overrides,
  };
}

describe("ReadingHistoryUserFiltersSelector", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useReadingHistoryUserFiltersSelector as jest.Mock).mockReturnValue(
      makeHookResult()
    );
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(hookOverrides: Record<string, unknown> = {}) {
    if (Object.keys(hookOverrides).length > 0) {
      (useReadingHistoryUserFiltersSelector as jest.Mock).mockReturnValue(
        makeHookResult(hookOverrides)
      );
    }
    act(() => render(<ReadingHistoryUserFiltersSelector />, container));
    return container;
  }

  function allOptions() {
    return container.querySelectorAll<HTMLSpanElement>(".project-state-button");
  }

  describe("structure", () => {
    it("renders .reading-history-user-selector wrapper", () => {
      setup();
      expect(
        container.querySelector(".reading-history-user-selector")
      ).not.toBeNull();
    });

    it("always renders the 'All' option as the first item", () => {
      setup();
      expect(allOptions()).toHaveLength(1);
    });

    it("renders mapped options after the 'All' option", () => {
      setup({
        selectorOptionsData: [
          makeOptionData({ key: "a", content: { title: "User A" } }),
          makeOptionData({ key: "b", content: { title: "User B" } }),
        ],
      });
      expect(allOptions()).toHaveLength(3);
    });
  });

  describe("'All' option", () => {
    it("renders the allSelectorOptionContent title", () => {
      setup({ allSelectorOptionContent: { title: "All users" } });
      expect(allOptions()[0]!.textContent).toContain("All users");
    });

    it("has 'selected' class when allSelected is true", () => {
      setup({ allSelected: true });
      expect(allOptions()[0]!.classList.contains("selected")).toBe(true);
    });

    it("does not have 'selected' class when allSelected is false", () => {
      setup({ allSelected: false });
      expect(allOptions()[0]!.classList.contains("selected")).toBe(false);
    });

    it("calls allSelectorOptionClick when clicked", () => {
      const allSelectorOptionClick = jest.fn();
      setup({ allSelectorOptionClick });
      act(() => {
        allOptions()[0]!.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });
      expect(allSelectorOptionClick).toHaveBeenCalledTimes(1);
    });

    it("renders icon div when allSelectorOptionContent has iconStyle", () => {
      setup({
        allSelectorOptionContent: {
          title: "All",
          iconStyle: { backgroundColor: "#ff0000" },
        },
      });
      expect(
        allOptions()[0]!.querySelector(".filter-option-icon")
      ).not.toBeNull();
    });

    it("does not render icon div when allSelectorOptionContent has no iconStyle", () => {
      setup({ allSelectorOptionContent: { title: "All" } });
      expect(allOptions()[0]!.querySelector(".filter-option-icon")).toBeNull();
    });
  });

  describe("mapped selector options", () => {
    it("renders the title of each mapped option", () => {
      setup({
        selectorOptionsData: [
          makeOptionData({ key: "a", content: { title: "User A" } }),
          makeOptionData({ key: "b", content: { title: "User B" } }),
        ],
      });
      expect(allOptions()[1]!.textContent).toContain("User A");
      expect(allOptions()[2]!.textContent).toContain("User B");
    });

    it("applies 'selected' class to a selected mapped option", () => {
      setup({
        selectorOptionsData: [makeOptionData({ key: "x", selected: true })],
      });
      expect(allOptions()[1]!.classList.contains("selected")).toBe(true);
    });

    it("does not apply 'selected' class to an unselected mapped option", () => {
      setup({
        selectorOptionsData: [makeOptionData({ key: "x", selected: false })],
      });
      expect(allOptions()[1]!.classList.contains("selected")).toBe(false);
    });

    it("calls the option's onClick when a mapped option is clicked", () => {
      const onClick = jest.fn();
      setup({
        selectorOptionsData: [makeOptionData({ key: "x", onClick })],
      });
      act(() => {
        allOptions()[1]!.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("renders icon div for a mapped option with iconStyle", () => {
      setup({
        selectorOptionsData: [
          makeOptionData({
            key: "x",
            content: {
              title: "User A",
              iconStyle: { backgroundColor: "#00ff00" },
            },
          }),
        ],
      });
      expect(
        allOptions()[1]!.querySelector(".filter-option-icon")
      ).not.toBeNull();
    });

    it("does not render icon div for a mapped option without iconStyle", () => {
      setup({
        selectorOptionsData: [
          makeOptionData({ key: "x", content: { title: "User A" } }),
        ],
      });
      expect(allOptions()[1]!.querySelector(".filter-option-icon")).toBeNull();
    });

    it("renders nothing extra when selectorOptionsData is empty", () => {
      setup({ selectorOptionsData: [] });
      expect(allOptions()).toHaveLength(1);
    });
  });
});
