import { render } from "preact";
import { act } from "preact/test-utils";
import { ProjectStateSetter } from "scriptureMap.components.containers.ProjectStateSetter";
import { useProjectStateSetter } from "scriptureMap.hooks.useProjectStateSetter";

jest.mock("scriptureMap.hooks.useProjectStateSetter", () => ({
  useProjectStateSetter: jest.fn(),
}));

jest.mock("scriptureMap.components.containers.SelectionOptions", () => ({
  SelectionOptions: ({
    handleClearSelectionClick,
    handleDoneClick,
  }: {
    handleClearSelectionClick: () => void;
    handleDoneClick: () => void;
  }) => (
    <div
      data-testid="selection-options"
      data-clear={String(typeof handleClearSelectionClick === "function")}
      data-done={String(typeof handleDoneClick === "function")}
    />
  ),
}));

type SelectorOptionData = {
  key: string;
  content: { title: string; iconStyle?: React.CSSProperties };
  onClick: jest.Mock;
  selected?: boolean;
  className: string;
};

function makeOptionData(
  overrides: Partial<SelectorOptionData> = {}
): SelectorOptionData {
  return {
    key: "opt-1",
    content: { title: "Completed" },
    onClick: jest.fn(),
    selected: false,
    className: "project-state-setter-option",
    ...overrides,
  };
}

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    checkboxIconClass: "checkbox-icon",
    handleCheckboxIconClick: jest.fn(),
    checkboxIconContent: "check_box_outline_blank",
    checkboxTextContent: "Select chapters",
    isInSelectionMode: false,
    handleClearSelectionClick: undefined as (() => void) | undefined,
    handleDoneClick: undefined as (() => void) | undefined,
    selectionLabel: "Set state",
    stateSetterOptionsData: [] as SelectorOptionData[],
    ...overrides,
  };
}

describe("ProjectStateSetter", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useProjectStateSetter as jest.Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(hookOverrides: Record<string, unknown> = {}) {
    if (Object.keys(hookOverrides).length > 0) {
      (useProjectStateSetter as jest.Mock).mockReturnValue(
        makeHookResult(hookOverrides)
      );
    }
    act(() => render(<ProjectStateSetter />, container));
    return container;
  }

  describe("structure", () => {
    it("renders .project-state-setter wrapper", () => {
      setup();
      expect(container.querySelector(".project-state-setter")).not.toBeNull();
    });

    it("renders .selection-mode-toggle", () => {
      setup();
      expect(container.querySelector(".selection-mode-toggle")).not.toBeNull();
    });

    it("renders the info icon span", () => {
      setup();
      const infoSpan = container.querySelector(".material-symbols-outlined");
      expect(infoSpan?.textContent).toBe("info");
    });
  });

  describe("checkbox icon span", () => {
    it("renders checkboxIconContent as text", () => {
      setup({ checkboxIconContent: "check_box" });
      const toggle = container.querySelector(".selection-mode-toggle");
      expect(toggle?.textContent).toContain("check_box");
    });

    it("applies checkboxIconClass to the icon span", () => {
      setup({ checkboxIconClass: "custom-icon-class" });
      expect(container.querySelector(".custom-icon-class")).not.toBeNull();
    });

    it("calls handleCheckboxIconClick when the icon span is clicked", () => {
      const handleCheckboxIconClick = jest.fn();
      setup({ handleCheckboxIconClick });
      const iconSpan =
        container.querySelector<HTMLSpanElement>(".checkbox-icon");
      act(() => {
        iconSpan?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleCheckboxIconClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("checkboxTextContent", () => {
    it("renders checkboxTextContent in the toggle", () => {
      setup({ checkboxTextContent: "Select all chapters" });
      const toggle = container.querySelector(".selection-mode-toggle");
      expect(toggle?.textContent).toContain("Select all chapters");
    });
  });

  describe("SelectionOptions visibility", () => {
    it("is not rendered when isInSelectionMode is false", () => {
      setup({ isInSelectionMode: false });
      expect(
        container.querySelector("[data-testid='selection-options']")
      ).toBeNull();
    });

    it("is not rendered when isInSelectionMode is true but handleClearSelectionClick is undefined", () => {
      setup({
        isInSelectionMode: true,
        handleClearSelectionClick: undefined,
        handleDoneClick: jest.fn(),
      });
      expect(
        container.querySelector("[data-testid='selection-options']")
      ).toBeNull();
    });

    it("is not rendered when isInSelectionMode is true but handleDoneClick is undefined", () => {
      setup({
        isInSelectionMode: true,
        handleClearSelectionClick: jest.fn(),
        handleDoneClick: undefined,
      });
      expect(
        container.querySelector("[data-testid='selection-options']")
      ).toBeNull();
    });

    it("is rendered when isInSelectionMode is true and both handlers are defined", () => {
      setup({
        isInSelectionMode: true,
        handleClearSelectionClick: jest.fn(),
        handleDoneClick: jest.fn(),
      });
      expect(
        container.querySelector("[data-testid='selection-options']")
      ).not.toBeNull();
    });

    it("passes handleClearSelectionClick and handleDoneClick to SelectionOptions", () => {
      setup({
        isInSelectionMode: true,
        handleClearSelectionClick: jest.fn(),
        handleDoneClick: jest.fn(),
      });
      const el = container.querySelector("[data-testid='selection-options']");
      expect(el?.getAttribute("data-clear")).toBe("true");
      expect(el?.getAttribute("data-done")).toBe("true");
    });
  });

  describe("state setter section (isInSelectionMode)", () => {
    it("is not rendered when isInSelectionMode is false", () => {
      setup({ isInSelectionMode: false, selectionLabel: "Set state" });
      const spans = container.querySelectorAll<HTMLSpanElement>(
        ".project-state-setter span"
      );
      const texts = Array.from(spans).map((s) => s.textContent);
      expect(texts).not.toContain("Set state");
    });

    it("renders selectionLabel when isInSelectionMode is true", () => {
      setup({ isInSelectionMode: true, selectionLabel: "Apply state" });
      expect(container.textContent).toContain("Apply state");
    });

    it("renders stateSetterOptionsData items when isInSelectionMode is true", () => {
      setup({
        isInSelectionMode: true,
        stateSetterOptionsData: [
          makeOptionData({ key: "a", content: { title: "Completed" } }),
          makeOptionData({ key: "b", content: { title: "Assigned" } }),
        ],
      });
      const options = container.querySelectorAll(".project-state-button");
      expect(options).toHaveLength(2);
    });

    it("renders no options when isInSelectionMode is false even with data", () => {
      setup({
        isInSelectionMode: false,
        stateSetterOptionsData: [makeOptionData({ key: "a" })],
      });
      expect(container.querySelectorAll(".project-state-button")).toHaveLength(
        0
      );
    });

    it("renders option titles correctly", () => {
      setup({
        isInSelectionMode: true,
        stateSetterOptionsData: [
          makeOptionData({ key: "x", content: { title: "In Progress" } }),
        ],
      });
      expect(container.textContent).toContain("In Progress");
    });

    it("calls the option's onClick when an option is clicked", () => {
      const onClick = jest.fn();
      setup({
        isInSelectionMode: true,
        stateSetterOptionsData: [makeOptionData({ key: "x", onClick })],
      });
      const option = container.querySelector<HTMLSpanElement>(
        ".project-state-button"
      );
      act(() => {
        option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("applies 'selected' class to a selected option", () => {
      setup({
        isInSelectionMode: true,
        stateSetterOptionsData: [makeOptionData({ key: "x", selected: true })],
      });
      const option = container.querySelector(".project-state-button");
      expect(option?.classList.contains("selected")).toBe(true);
    });
  });
});
