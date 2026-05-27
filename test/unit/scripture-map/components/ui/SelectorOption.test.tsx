import { render } from "preact";
import { act } from "preact/test-utils";
import {
  SelectorOption,
  SelectorOptionClasses,
  type SelectorOptionProps,
} from "scriptureMap.components.ui.SelectorOption";

function makeProps(
  overrides: Partial<SelectorOptionProps> = {}
): SelectorOptionProps {
  return {
    content: { title: "All" },
    onClick: jest.fn(),
    selected: false,
    className: SelectorOptionClasses.UserFilter,
    ...overrides,
  };
}

describe("SelectorOption", () => {
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

  function setup(overrides: Partial<SelectorOptionProps> = {}) {
    act(() => render(<SelectorOption {...makeProps(overrides)} />, container));
    return container;
  }

  function spanEl() {
    return container.querySelector<HTMLSpanElement>(".project-state-button");
  }

  describe("structure", () => {
    it("renders a .project-state-button span", () => {
      setup();
      expect(spanEl()).not.toBeNull();
    });

    it("includes the className prop in the span's class list", () => {
      setup({ className: SelectorOptionClasses.ProjectState });
      expect(
        spanEl()!.classList.contains(SelectorOptionClasses.ProjectState)
      ).toBe(true);
    });

    it("renders content.title as text", () => {
      setup({ content: { title: "Viewers" } });
      expect(spanEl()!.textContent).toContain("Viewers");
    });
  });

  describe("selected class", () => {
    it("adds selected class when selected is true", () => {
      setup({ selected: true });
      expect(spanEl()!.classList.contains("selected")).toBe(true);
    });

    it("does not add selected class when selected is false", () => {
      setup({ selected: false });
      expect(spanEl()!.classList.contains("selected")).toBe(false);
    });

    it("does not add selected class when selected is omitted", () => {
      const { selected: _omit, ...rest } = makeProps();
      act(() => render(<SelectorOption {...rest} />, container));
      expect(spanEl()!.classList.contains("selected")).toBe(false);
    });
  });

  describe("icon", () => {
    it("renders .filter-option-icon when content.iconStyle is provided", () => {
      setup({
        content: { title: "A", iconStyle: { backgroundColor: "#f00" } },
      });
      expect(spanEl()!.querySelector(".filter-option-icon")).not.toBeNull();
    });

    it("applies iconStyle to the icon div", () => {
      setup({
        content: { title: "A", iconStyle: { backgroundColor: "#00ff00" } },
      });
      const icon = spanEl()!.querySelector<HTMLDivElement>(
        ".filter-option-icon"
      )!;
      expect(icon.style.backgroundColor).toBe("rgb(0, 255, 0)");
    });

    it("does not render .filter-option-icon when content.iconStyle is absent", () => {
      setup({ content: { title: "A" } });
      expect(spanEl()!.querySelector(".filter-option-icon")).toBeNull();
    });
  });

  describe("onClick", () => {
    it("calls onClick when the span is clicked", () => {
      const onClick = jest.fn();
      setup({ onClick });
      act(() => {
        spanEl()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
