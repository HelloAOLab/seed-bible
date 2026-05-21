import { render } from "preact";
import { act } from "preact/test-utils";
import { ScriptureMap2DWrapper } from "scriptureMap2D.components.containers.ScriptureMap2DWrapper";
import { useScriptureMap2DWrapper } from "scriptureMap2D.hooks.useScriptureMap2DWrapper";

jest.mock("scriptureMap2D.hooks.useScriptureMap2DWrapper", () => ({
  useScriptureMap2DWrapper: jest.fn(),
}));

jest.mock("scriptureMap2D.components.containers.Settings", () => ({
  Settings: () => <div data-testid="settings" />,
}));

jest.mock("scriptureMap2D.components.containers.Container", () => ({
  Container: () => <div data-testid="container" />,
}));

jest.mock("scriptureMap2D.components.containers.Controls", () => ({
  Controls: () => <div data-testid="controls" />,
}));

function makeHookResult(style: React.CSSProperties = {}) {
  return { style };
}

describe("ScriptureMap2DWrapper", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useScriptureMap2DWrapper as jest.Mock).mockReturnValue(makeHookResult());
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(style: React.CSSProperties = {}) {
    (useScriptureMap2DWrapper as jest.Mock).mockReturnValue(
      makeHookResult(style)
    );
    act(() => render(<ScriptureMap2DWrapper />, container));
    return container;
  }

  function wrapper() {
    return container.querySelector<HTMLDivElement>(".scripture-map-2d-wrapper");
  }

  describe("structure", () => {
    it("renders the .scripture-map-2d-wrapper div", () => {
      setup();
      expect(wrapper()).not.toBeNull();
    });

    it("renders Settings inside the wrapper", () => {
      setup();
      expect(
        wrapper()!.querySelector("[data-testid='settings']")
      ).not.toBeNull();
    });

    it("renders Container inside the wrapper", () => {
      setup();
      expect(
        wrapper()!.querySelector("[data-testid='container']")
      ).not.toBeNull();
    });

    it("renders Controls inside the wrapper", () => {
      setup();
      expect(
        wrapper()!.querySelector("[data-testid='controls']")
      ).not.toBeNull();
    });
  });

  describe("style", () => {
    it("applies paddingBottom from hook style to the wrapper", () => {
      setup({ paddingBottom: "40px" });
      expect(wrapper()!.style.paddingBottom).toBe("40px");
    });

    it("applies a different paddingBottom when hook returns a different value", () => {
      setup({ paddingBottom: "16px" });
      expect(wrapper()!.style.paddingBottom).toBe("16px");
    });

    it("applies no paddingBottom when hook style omits it", () => {
      setup({});
      expect(wrapper()!.style.paddingBottom).toBe("");
    });
  });
});
