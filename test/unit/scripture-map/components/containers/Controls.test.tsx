import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { Controls } from "../../../../../packages/scripture-map/components/containers/Controls";
import { useControls } from "../../../../../packages/scripture-map/hooks/useControls";

vi.mock("../../../../../packages/scripture-map/hooks/useControls", () => ({
  useControls: vi.fn(),
}));

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    handleZoomOutButtonClick: vi.fn(),
    handleZoomInButtonClick: vi.fn(),
    toggleButtonRef: { current: null },
    toggleButtonClick: vi.fn(),
    currZoom: 100,
    showOptions: false,
    zoomLevelSelectorTitle: "Zoom",
    handleZoomLevelClick: vi.fn(),
    zoomLevelSelectorRef: { current: null },
    handleZoomLevelSelectorClick: vi.fn(),
    scaleFactor: 1,
    ...overrides,
  };
}

describe("Controls", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useControls as Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(hookOverrides: Record<string, unknown> = {}) {
    if (Object.keys(hookOverrides).length > 0) {
      (useControls as Mock).mockReturnValue(makeHookResult(hookOverrides));
    }
    act(() => render(<Controls />, container));
    return container;
  }

  describe("structure", () => {
    it("renders .scripture-map-controls", () => {
      setup();
      expect(container.querySelector(".scripture-map-controls")).not.toBeNull();
    });

    it("renders .zoom-container inside .scripture-map-controls", () => {
      setup();
      const controls = container.querySelector(".scripture-map-controls");
      expect(controls?.querySelector(".zoom-container")).not.toBeNull();
    });

    it("renders 3 buttons in the zoom container", () => {
      setup();
      const buttons = container
        .querySelector(".zoom-container")
        ?.querySelectorAll("button");
      expect(buttons?.length).toBeGreaterThanOrEqual(3);
    });

    it("renders 'remove' icon in the zoom-out button", () => {
      setup();
      const buttons = container.querySelectorAll<HTMLButtonElement>(
        ".zoom-container > button"
      );
      expect(
        buttons[0]!.querySelector(".material-symbols-outlined")?.textContent
      ).toBe("remove");
    });

    it("renders 'add' icon in the zoom-in button", () => {
      setup();
      const buttons = container.querySelectorAll<HTMLButtonElement>(
        ".zoom-container > button"
      );
      expect(
        buttons[buttons.length - 1]!.querySelector(".material-symbols-outlined")
          ?.textContent
      ).toBe("add");
    });

    it("renders currZoom% in the toggle button", () => {
      setup({ currZoom: 75 });
      const buttons = container.querySelectorAll<HTMLButtonElement>(
        ".zoom-container > button"
      );
      expect(buttons[1]!.textContent).toContain("75%");
    });
  });

  describe("zoom level selector", () => {
    it("is hidden when showOptions is false", () => {
      setup({ showOptions: false });
      expect(container.querySelector(".zoom-level-selector")).toBeNull();
    });

    it("is shown when showOptions is true", () => {
      setup({ showOptions: true });
      expect(container.querySelector(".zoom-level-selector")).not.toBeNull();
    });

    it("renders the title inside the selector", () => {
      setup({ showOptions: true, zoomLevelSelectorTitle: "Select Zoom" });
      const selector = container.querySelector(".zoom-level-selector");
      expect(selector?.textContent).toContain("Select Zoom");
    });

    it("renders 6 zoom level option buttons", () => {
      setup({ showOptions: true });
      const selector = container.querySelector(".zoom-level-selector");
      expect(selector?.querySelectorAll("button")).toHaveLength(6);
    });

    it("renders the correct percentage labels [150%, 125%, 100%, 75%, 50%, 25%]", () => {
      setup({ showOptions: true });
      const buttons = container.querySelectorAll<HTMLButtonElement>(
        ".zoom-level-selector button"
      );
      const labels = Array.from(buttons).map(
        (b) => b.querySelector("span")?.textContent
      );
      expect(labels).toEqual([
        "150 %",
        "125 %",
        "100 %",
        "75 %",
        "50 %",
        "25 %",
      ]);
    });

    it("calls handleZoomLevelClick with the correct value when an option is clicked", () => {
      const handleZoomLevelClick = vi.fn();
      setup({ showOptions: true, handleZoomLevelClick });
      const buttons = container.querySelectorAll<HTMLButtonElement>(
        ".zoom-level-selector button"
      );
      act(() => {
        buttons[2]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleZoomLevelClick).toHaveBeenCalledWith(1);
    });

    it("calls handleZoomLevelClick with 0.25 when the last option is clicked", () => {
      const handleZoomLevelClick = vi.fn();
      setup({ showOptions: true, handleZoomLevelClick });
      const buttons = container.querySelectorAll<HTMLButtonElement>(
        ".zoom-level-selector button"
      );
      act(() => {
        buttons[5]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleZoomLevelClick).toHaveBeenCalledWith(0.25);
    });

    it("renders a selected indicator on the option matching scaleFactor", () => {
      setup({ showOptions: true, scaleFactor: 1 });
      const buttons = container.querySelectorAll<HTMLButtonElement>(
        ".zoom-level-selector button"
      );
      // value=1 is at index 2; it should have 2 spans (label + indicator)
      expect(buttons[2]!.querySelectorAll("span")).toHaveLength(2);
    });

    it("does not render a selected indicator on non-matching options", () => {
      setup({ showOptions: true, scaleFactor: 1 });
      const buttons = container.querySelectorAll<HTMLButtonElement>(
        ".zoom-level-selector button"
      );
      // value=1.5 is at index 0; it should have only 1 span (label only)
      expect(buttons[0]!.querySelectorAll("span")).toHaveLength(1);
    });
  });

  describe("click handlers", () => {
    it("calls handleZoomOutButtonClick when the zoom-out button is clicked", () => {
      const handleZoomOutButtonClick = vi.fn();
      setup({ handleZoomOutButtonClick });
      const buttons = container.querySelectorAll<HTMLButtonElement>(
        ".zoom-container > button"
      );
      act(() => {
        buttons[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleZoomOutButtonClick).toHaveBeenCalledTimes(1);
    });

    it("calls toggleButtonClick when the toggle button is clicked", () => {
      const toggleButtonClick = vi.fn();
      setup({ toggleButtonClick });
      const buttons = container.querySelectorAll<HTMLButtonElement>(
        ".zoom-container > button"
      );
      act(() => {
        buttons[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(toggleButtonClick).toHaveBeenCalledTimes(1);
    });

    it("calls handleZoomInButtonClick when the zoom-in button is clicked", () => {
      const handleZoomInButtonClick = vi.fn();
      setup({ handleZoomInButtonClick });
      const buttons = container.querySelectorAll<HTMLButtonElement>(
        ".zoom-container > button"
      );
      act(() => {
        buttons[buttons.length - 1]!.dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
      });
      expect(handleZoomInButtonClick).toHaveBeenCalledTimes(1);
    });
  });
});
