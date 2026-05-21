import { render } from "preact";
import { act } from "preact/test-utils";
import {
  TestamentToggle,
  type TestamentToggleProps,
} from "scriptureMap2D.components.containers.TestamentToggle";
import { useTestamentToggle } from "scriptureMap2D.hooks.useTestamentToggle";

jest.mock("scriptureMap2D.hooks.useTestamentToggle", () => ({
  useTestamentToggle: jest.fn(),
}));

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    toggleTitleContent: "Old Testament",
    toggleDescriptionContent: "39 books",
    toggleArrowContent: "keyboard_arrow_down",
    ...overrides,
  };
}

function makeProps(
  overrides: Partial<TestamentToggleProps> = {}
): TestamentToggleProps {
  return {
    toggleshowContent: jest.fn(),
    showingContent: false,
    ...overrides,
  };
}

describe("TestamentToggle", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useTestamentToggle as jest.Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(propOverrides: Partial<TestamentToggleProps> = {}) {
    const props = makeProps(propOverrides);
    act(() => render(<TestamentToggle {...props} />, container));
    return container;
  }

  function toggleEl() {
    return container.querySelector<HTMLDivElement>(".toggle-testament");
  }

  describe("structure", () => {
    it("renders the .toggle.toggle-testament wrapper", () => {
      setup();
      expect(
        container.querySelector(".toggle.toggle-testament")
      ).not.toBeNull();
    });

    it("renders .toggle-title span", () => {
      setup();
      expect(toggleEl()!.querySelector(".toggle-title")).not.toBeNull();
    });

    it("renders .toggle-description span", () => {
      setup();
      expect(toggleEl()!.querySelector(".toggle-description")).not.toBeNull();
    });

    it("renders .toggle-arrow span", () => {
      setup();
      expect(toggleEl()!.querySelector(".toggle-arrow")).not.toBeNull();
    });
  });

  describe("content from hook", () => {
    it("renders toggleTitleContent in .toggle-title", () => {
      (useTestamentToggle as jest.Mock).mockReturnValue(
        makeHookResult({ toggleTitleContent: "New Testament" })
      );
      setup();
      expect(toggleEl()!.querySelector(".toggle-title")!.textContent).toBe(
        "New Testament"
      );
    });

    it("renders toggleDescriptionContent in .toggle-description", () => {
      (useTestamentToggle as jest.Mock).mockReturnValue(
        makeHookResult({ toggleDescriptionContent: "27 books" })
      );
      setup();
      expect(
        toggleEl()!.querySelector(".toggle-description")!.textContent
      ).toBe("27 books");
    });

    it("renders toggleArrowContent in .toggle-arrow", () => {
      (useTestamentToggle as jest.Mock).mockReturnValue(
        makeHookResult({ toggleArrowContent: "keyboard_arrow_up" })
      );
      setup();
      expect(toggleEl()!.querySelector(".toggle-arrow")!.textContent).toBe(
        "keyboard_arrow_up"
      );
    });
  });

  describe("onClick", () => {
    it("calls toggleshowContent when the wrapper is clicked", () => {
      const toggleshowContent = jest.fn();
      setup({ toggleshowContent });
      act(() => {
        toggleEl()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(toggleshowContent).toHaveBeenCalledTimes(1);
    });
  });

  describe("hook args", () => {
    it("passes showingContent to useTestamentToggle", () => {
      setup({ showingContent: true });
      expect(useTestamentToggle).toHaveBeenCalledWith({ showingContent: true });
    });

    it("passes showingContent=false to useTestamentToggle when false", () => {
      setup({ showingContent: false });
      expect(useTestamentToggle).toHaveBeenCalledWith({
        showingContent: false,
      });
    });
  });
});
