import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import {
  SelectionOptions,
  type SelectionOptionsProps,
} from "../../../../../packages/scripture-map/components/containers/SelectionOptions";
import { useSelectionOptions } from "../../../../../packages/scripture-map/hooks/useSelectionOptions";

vi.mock(
  "../../../../../packages/scripture-map/hooks/useSelectionOptions",
  () => ({
    useSelectionOptions: vi.fn(),
  })
);

function makeHookResult(overrides: Record<string, unknown> = {}) {
  return {
    clearSelectionContent: "Clear selection",
    acceptSelectionContent: "Done",
    ...overrides,
  };
}

function makeProps(
  overrides: Partial<SelectionOptionsProps> = {}
): SelectionOptionsProps {
  return {
    handleClearSelectionClick: vi.fn(),
    handleDoneClick: vi.fn(),
    ...overrides,
  };
}

describe("SelectionOptions", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useSelectionOptions as Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(propOverrides: Partial<SelectionOptionsProps> = {}) {
    const props = makeProps(propOverrides);
    act(() => render(<SelectionOptions {...props} />, container));
    return container;
  }

  function selectionOptions() {
    return container.querySelector<HTMLDivElement>(".selection-options");
  }

  function buttons() {
    return selectionOptions()!.querySelectorAll<HTMLButtonElement>("button");
  }

  describe("structure", () => {
    it("renders the .selection-options wrapper", () => {
      setup();
      expect(selectionOptions()).not.toBeNull();
    });

    it("renders two buttons", () => {
      setup();
      expect(buttons()).toHaveLength(2);
    });

    it("renders a .divider between the buttons", () => {
      setup();
      expect(selectionOptions()!.querySelector(".divider")).not.toBeNull();
    });
  });

  describe("clear button", () => {
    it("renders clearSelectionContent text", () => {
      (useSelectionOptions as Mock).mockReturnValue(
        makeHookResult({ clearSelectionContent: "Limpiar selección" })
      );
      setup();
      expect(buttons()[0]!.textContent).toContain("Limpiar selección");
    });

    it("renders the close icon", () => {
      setup();
      const icon = buttons()[0]!.querySelector(".material-symbols-outlined");
      expect(icon).not.toBeNull();
      expect(icon!.textContent).toBe("close");
    });

    it("calls handleClearSelectionClick when clicked", () => {
      const handleClearSelectionClick = vi.fn();
      setup({ handleClearSelectionClick });
      act(() => {
        buttons()[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleClearSelectionClick).toHaveBeenCalledTimes(1);
    });

    it("does not call handleDoneClick when clear button is clicked", () => {
      const handleDoneClick = vi.fn();
      setup({ handleDoneClick });
      act(() => {
        buttons()[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleDoneClick).not.toHaveBeenCalled();
    });
  });

  describe("done button", () => {
    it("renders acceptSelectionContent text", () => {
      (useSelectionOptions as Mock).mockReturnValue(
        makeHookResult({ acceptSelectionContent: "Aceptar" })
      );
      setup();
      expect(buttons()[1]!.textContent).toContain("Aceptar");
    });

    it("renders the check icon", () => {
      setup();
      const icon = buttons()[1]!.querySelector(".material-symbols-outlined");
      expect(icon).not.toBeNull();
      expect(icon!.textContent).toBe("check");
    });

    it("calls handleDoneClick when clicked", () => {
      const handleDoneClick = vi.fn();
      setup({ handleDoneClick });
      act(() => {
        buttons()[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleDoneClick).toHaveBeenCalledTimes(1);
    });

    it("does not call handleClearSelectionClick when done button is clicked", () => {
      const handleClearSelectionClick = vi.fn();
      setup({ handleClearSelectionClick });
      act(() => {
        buttons()[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
      expect(handleClearSelectionClick).not.toHaveBeenCalled();
    });
  });
});
