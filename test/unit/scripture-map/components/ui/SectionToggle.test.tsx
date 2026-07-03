import { render } from "preact";
import { act } from "preact/test-utils";
import {
  SectionToggle,
  type SectionToggleProps,
} from "../../../../../packages/scripture-map/components/ui/SectionToggle";
import type { SectionInfo } from "../../../../../packages/seed-bible-utils/domain/models/arrangement";

function makeSection(overrides: Partial<SectionInfo> = {}): SectionInfo {
  return {
    name: "Law",
    color: "#ff0000",
    books: [],
    path: { arrangementName: "default", testamentIndex: 0, sectionIndex: 0 },
    ...overrides,
  } as SectionInfo;
}

function makeProps(
  overrides: Partial<SectionToggleProps> = {}
): SectionToggleProps {
  return {
    toggleShowSection: vi.fn(),
    showingContent: false,
    section: makeSection(),
    style: {},
    sectionKey: "section-0",
    ...overrides,
  };
}

describe("SectionToggle (ui)", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(overrides: Partial<SectionToggleProps> = {}) {
    act(() => render(<SectionToggle {...makeProps(overrides)} />, container));
    return container;
  }

  function toggleEl() {
    return container.querySelector<HTMLDivElement>(".toggle-section");
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
    it("renders section.name in .toggle-title", () => {
      setup({ section: makeSection({ name: "Prophets" }) });
      expect(toggleEl()!.querySelector(".toggle-title")!.textContent).toBe(
        "Prophets"
      );
    });

    it("renders keyboard_arrow_up in .toggle-arrow when showingContent is true", () => {
      setup({ showingContent: true });
      expect(toggleEl()!.querySelector(".toggle-arrow")!.textContent).toBe(
        "keyboard_arrow_up"
      );
    });

    it("renders keyboard_arrow_down in .toggle-arrow when showingContent is false", () => {
      setup({ showingContent: false });
      expect(toggleEl()!.querySelector(".toggle-arrow")!.textContent).toBe(
        "keyboard_arrow_down"
      );
    });

    it("renders keyboard_arrow_down in .toggle-arrow when showingContent is undefined", () => {
      setup({ showingContent: undefined });
      expect(toggleEl()!.querySelector(".toggle-arrow")!.textContent).toBe(
        "keyboard_arrow_down"
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
      const toggleShowSection = vi.fn();
      setup({ toggleShowSection, sectionKey: "my-key" });
      act(() => {
        toggleEl()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(toggleShowSection).toHaveBeenCalledWith("my-key");
    });

    it("calls toggleShowSection exactly once per click", () => {
      const toggleShowSection = vi.fn();
      setup({ toggleShowSection });
      act(() => {
        toggleEl()!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(toggleShowSection).toHaveBeenCalledTimes(1);
    });
  });
});
