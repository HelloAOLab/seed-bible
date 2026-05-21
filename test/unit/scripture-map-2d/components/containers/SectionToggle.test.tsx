import { render } from "preact";
import { act } from "preact/test-utils";
import {
  SectionToggle,
  type SectionToggleProps,
} from "scriptureMap2D.components.containers.SectionToggle";
import { useSectionToggle } from "scriptureMap2D.hooks.useSectionToggle";
import type { SectionInfo } from "bibleVizUtils.domain.models.arrangement";

jest.mock("scriptureMap2D.hooks.useSectionToggle", () => ({
  useSectionToggle: jest.fn(),
}));

function makeSection(overrides: Partial<SectionInfo> = {}): SectionInfo {
  return {
    name: "Law",
    color: "#ff0000",
    books: [],
    path: { arrangementName: "default", testamentIndex: 0, sectionIndex: 0 },
    ...overrides,
  } as SectionInfo;
}

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    toggleTitleContent: "Law",
    toggleArrowContent: "keyboard_arrow_down",
    ...overrides,
  };
}

function makeProps(
  overrides: Record<string, unknown> = {}
): SectionToggleProps {
  return {
    toggleShowSection: jest.fn(),
    showingContent: false as boolean | undefined,
    section: makeSection(),
    style: {} as React.CSSProperties,
    sectionKey: "section-0",
    ...overrides,
  };
}

describe("SectionToggle", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useSectionToggle as jest.Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(propOverrides: Record<string, unknown> = {}) {
    const props = makeProps(propOverrides);
    act(() => render(<SectionToggle {...props} />, container));
    return container;
  }

  function toggleEl() {
    return container.querySelector<HTMLDivElement>(".toggle");
  }

  describe("structure", () => {
    it("renders the .toggle.toggle-section wrapper", () => {
      setup();
      expect(container.querySelector(".toggle.toggle-section")).not.toBeNull();
    });

    it("renders .toggle-title span", () => {
      setup();
      expect(toggleEl()!.querySelector(".toggle-title")).not.toBeNull();
    });

    it("renders .toggle-arrow span", () => {
      setup();
      expect(toggleEl()!.querySelector(".toggle-arrow")).not.toBeNull();
    });
  });

  describe("CSS class toggle", () => {
    it("adds toggle-section-enabled when showingContent is true", () => {
      setup({ showingContent: true });
      expect(toggleEl()!.classList.contains("toggle-section-enabled")).toBe(
        true
      );
    });

    it("does not add toggle-section-enabled when showingContent is false", () => {
      setup({ showingContent: false });
      expect(toggleEl()!.classList.contains("toggle-section-enabled")).toBe(
        false
      );
    });

    it("does not add toggle-section-enabled when showingContent is undefined", () => {
      setup({ showingContent: undefined });
      expect(toggleEl()!.classList.contains("toggle-section-enabled")).toBe(
        false
      );
    });
  });

  describe("content", () => {
    it("renders toggleTitleContent in .toggle-title", () => {
      (useSectionToggle as jest.Mock).mockReturnValue(
        makeHookResult({ toggleTitleContent: "History" })
      );
      setup();
      expect(toggleEl()!.querySelector(".toggle-title")!.textContent).toBe(
        "History"
      );
    });

    it("renders toggleArrowContent in .toggle-arrow", () => {
      (useSectionToggle as jest.Mock).mockReturnValue(
        makeHookResult({ toggleArrowContent: "keyboard_arrow_up" })
      );
      setup();
      expect(toggleEl()!.querySelector(".toggle-arrow")!.textContent).toBe(
        "keyboard_arrow_up"
      );
    });
  });

  describe("style", () => {
    it("applies style prop to the wrapper div", () => {
      setup({ style: { paddingLeft: "8px" } });
      expect(toggleEl()!.style.paddingLeft).toBe("8px");
    });
  });

  describe("onClick", () => {
    it("calls toggleShowSection with sectionKey when clicked", () => {
      const toggleShowSection = jest.fn();
      setup({ toggleShowSection, sectionKey: "my-section" });
      act(() => {
        toggleEl()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(toggleShowSection).toHaveBeenCalledWith("my-section");
    });

    it("calls toggleShowSection exactly once per click", () => {
      const toggleShowSection = jest.fn();
      setup({ toggleShowSection });
      act(() => {
        toggleEl()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(toggleShowSection).toHaveBeenCalledTimes(1);
    });
  });

  describe("hook args", () => {
    it("passes section and showingContent to useSectionToggle", () => {
      const section = makeSection({ name: "Prophets" });
      setup({ section, showingContent: true });
      expect(useSectionToggle).toHaveBeenCalledWith({
        section,
        showingContent: true,
      });
    });
  });
});
